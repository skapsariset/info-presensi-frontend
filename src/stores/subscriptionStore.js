import { defineStore } from 'pinia';
import presensiApi, { classifyApiError } from '../api/presensiApi.js';
import pushService from '../services/pushService.js';

function getInitialCachedTargets() {
	try {
		const raw = localStorage.getItem('skapsa_cached_targets');
		return raw ? JSON.parse(raw) : [];
	} catch (e) {
		return [];
	}
}

export const useSubscriptionStore = defineStore('subscription', {
	state: () => {
		const cachedTargets = getInitialCachedTargets();
		return {
			targets: cachedTargets,
			status: cachedTargets.length > 0 ? 'active' : 'inactive', // 'active', 'inactive', 'unsupported', 'denied', 'loading'
			subscriptionId: null,
			deviceToken: localStorage.getItem('skapsa_device_token') || null,
			deviceLabel: '',
			loading: false,
			syncing: false,
			error: null,
			isOfflineCache: false, // Menandakan bahwa data saat ini berasal dari cache lokal karena koneksi ke server terputus
			connectionError: null, // Berisi detail error koneksi jika gagal terhubung
			lastSyncedAt: null,
			capabilities: pushService.getDeviceCapabilities()
		};
	},

	getters: {
		isSubscribed: (state) => state.targets.length > 0 && state.status === 'active',
		targetCount: (state) => state.targets.length,
		targetsByType: (state) => {
			return {
				guru: state.targets.filter(t => t.type === 'guru'),
				karyawan: state.targets.filter(t => t.type === 'karyawan'),
				siswa: state.targets.filter(t => t.type === 'siswa'),
				non_gtk: state.targets.filter(t => t.type === 'non_gtk')
			};
		}
	},

	actions: {
		refreshCapabilities() {
			this.capabilities = pushService.getDeviceCapabilities();
		},

		/**
		 * Sinkronisasi target subscription dari backend
		 * Endpoint: GET /push/subscription/me
		 * Membedakan dengan ketat:
		 * 1. Request Sukses (Status 200): Perbarui state & perbarui offline cache
		 * 2. Respons Ditolak Resmi Server (Status 401): Hapus token & target karena sesi memang sudah tidak ada
		 * 3. Gagal Terhubung ke Server (Network Error / Timeout / 502/503/504 / Routing ISP Terputus):
		 *    JANGAN HAPUS TARGET! Pertahankan cache tersimpan lokal dan beri tanda isOfflineCache = true.
		 */
		async syncSubscription() {
			this.syncing = true;
			this.error = null;
			this.refreshCapabilities();

			try {
				const response = await presensiApi.getMySubscriptionTargets();

				// KASUS 1: REQUEST BERHASIL
				if (response.data && response.data.success) {
					const freshTargets = response.data.data?.subscription_targets || [];
					this.targets = freshTargets;
					this.status = freshTargets.length > 0 ? 'active' : 'inactive';
					this.isOfflineCache = false;
					this.connectionError = null;
					this.lastSyncedAt = new Date().toISOString();

					// Simpan ke offline cache lokal
					localStorage.setItem('skapsa_cached_targets', JSON.stringify(freshTargets));
					localStorage.setItem('skapsa_last_synced_at', this.lastSyncedAt);
					return { success: true, targets: freshTargets, isOffline: false };
				} else {
					throw new Error(response.data?.message || 'Gagal memuat data subscription dari server.');
				}
			} catch (err) {
				const classified = classifyApiError(err);

				// KASUS 2: GAGAL TERHUBUNG KE SERVER (Network Error, Timeout, 502/503/504, Routing ISP Terputus)
				if (classified.isNetworkError) {
					// SANGAT PENTING: JANGAN PERNAH MENGHAPUS TARGET! Pertahankan data lokal terakhir
					this.isOfflineCache = true;
					this.connectionError = classified;
					this.error = classified.message;
					if (this.targets.length > 0) {
						this.status = 'active';
					}
					return {
						success: false,
						isOffline: true,
						classified,
						message: classified.message
					};
				}

				// KASUS 3: SERVER MENOLAK RESMI (HTTP 401 AUTH_REJECTED)
				if (classified.category === 'AUTH_REJECTED') {
					// Hanya jika server resmi merespons bahwa subscription/token memang tidak ada di DB
					this.targets = [];
					this.status = 'inactive';
					this.isOfflineCache = false;
					this.connectionError = null;
					localStorage.removeItem('skapsa_cached_targets');
					localStorage.removeItem('skapsa_device_token');
					return { success: false, isOffline: false, classified };
				}

				// KASUS 4: KESALAHAN LAINNYA (Misal Server Error 500)
				this.error = classified.message;
				if (this.targets.length > 0) {
					this.isOfflineCache = true;
				}
				return { success: false, isOffline: false, classified };
			} finally {
				this.syncing = false;
			}
		},

		/**
		 * Aktifkan push subscription dengan token aktivasi
		 * Endpoint: POST /push/subscription
		 * Kontrak: { activation_token, subscription, device_label }
		 */
		async activateWithToken(activationToken, customLabel) {
			this.loading = true;
			this.error = null;

			try {
				// 1. Minta izin notifikasi browser (hanya terjadi saat konfirmasi)
				const permission = await pushService.requestNotificationPermission();
				this.refreshCapabilities();

				if (permission !== 'granted') {
					throw new Error('Izin notifikasi ditolak oleh pengguna pada browser. Mohon izinkan notifikasi untuk menerima info presensi.');
				}

				// 2. Berlangganan ke PushManager
				const subscription = await pushService.subscribeToPush();

				// 3. Tentukan label perangkat
				const defaultLabel = `${this.capabilities.browserName} (${this.capabilities.isIOS ? 'iOS Device' : 'Perangkat Aktif'})`;
				const deviceLabel = customLabel || defaultLabel;
				this.deviceLabel = deviceLabel;

				// 4. Kirim data ke backend
				const response = await presensiApi.activateSubscription({
					activation_token: activationToken,
					subscription: subscription,
					device_label: deviceLabel
				});

				if (response.data && response.data.success) {
					const resData = response.data.data;
					this.subscriptionId = resData.push_subscription_id || null;
					this.deviceToken = resData.push_device_token || null;
					this.status = 'active';

					// Sinkronisasi target terbaru
					await this.syncSubscription();
					return {
						success: true,
						detail_target: resData.detail_target
					};
				} else {
					throw new Error(response.data?.message || 'Gagal mengaktifkan push subscription');
				}
			} catch (err) {
				const classified = classifyApiError(err);
				let userFriendlyMsg = classified.message;

				if (classified.isNetworkError) {
					userFriendlyMsg = 'Gagal terhubung ke server presensi (Koneksi Terputus/Timeout). Token aktivasi Anda BELUM TERPAKAI dan TIDAK HANGUS. Silakan coba kembali saat jaringan stabil.';
				} else if (classified.category === 'BUSINESS_REJECTED') {
					userFriendlyMsg = classified.message || 'Token aktivasi tidak valid, sudah pernah digunakan, atau kedaluwarsa.';
				}

				this.error = userFriendlyMsg;
				const enhancedError = new Error(userFriendlyMsg);
				enhancedError.classified = classified;
				throw enhancedError;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * Nonaktifkan push subscription beserta semua target subscription
		 * Endpoint: DELETE /push/subscription/me
		 */
		async deactivateSubscription() {
			this.loading = true;
			this.error = null;

			try {
				await presensiApi.deactivateSubscription();
				await pushService.unsubscribeFromPush();
				this.targets = [];
				this.status = 'inactive';
				this.subscriptionId = null;
				this.deviceToken = null;
				localStorage.removeItem('skapsa_cached_targets');
				return true;
			} catch (err) {
				this.error = err.response?.data?.message || 'Gagal menonaktifkan subscription di backend.';
				// Tetap bersihkan lokal jika backend gagal/sudah hilang
				await pushService.unsubscribeFromPush();
				this.targets = [];
				this.status = 'inactive';
				localStorage.removeItem('skapsa_cached_targets');
				throw err;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * Nonaktifkan target subscription (user presensi) tertentu
		 * Endpoint: DELETE /push/subscription/me/target/:user_presensi_id
		 */
		async removeTarget(userPresensiId) {
			this.loading = true;
			this.error = null;

			try {
				const res = await presensiApi.removeSubscriptionTarget(userPresensiId);
				// Hapus dari state lokal
				this.targets = this.targets.filter(t => t.user_presensi_id !== userPresensiId);
				localStorage.setItem('skapsa_cached_targets', JSON.stringify(this.targets));
				if (this.targets.length === 0) {
					this.status = 'inactive';
				}
				return res.data;
			} catch (err) {
				const msg = err.response?.data?.message || 'Gagal menghapus target subscription.';
				this.error = msg;
				throw new Error(msg);
			} finally {
				this.loading = false;
			}
		}
	}
});

export default useSubscriptionStore;
