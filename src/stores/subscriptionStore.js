import { defineStore } from 'pinia';
import presensiApi from '../api/presensiApi.js';
import pushService from '../services/pushService.js';

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    targets: [],
    status: 'inactive', // 'active', 'inactive', 'unsupported', 'denied', 'loading'
    subscriptionId: null,
    deviceToken: localStorage.getItem('skapsa_device_token') || null,
    deviceLabel: '',
    loading: false,
    syncing: false,
    error: null,
    lastSyncedAt: null,
    capabilities: pushService.getDeviceCapabilities()
  }),

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
     */
    async syncSubscription() {
      this.syncing = true;
      this.error = null;
      this.refreshCapabilities();

      try {
        const response = await presensiApi.getMySubscriptionTargets();
        if (response.data && response.data.success) {
          this.targets = response.data.data.subscription_targets || [];
          this.status = this.targets.length > 0 ? 'active' : 'inactive';
          this.lastSyncedAt = new Date().toISOString();
        }
      } catch (err) {
        // Jika 401 berarti belum ada device token atau subscription belum terdaftar
        if (err.response?.status === 401) {
          this.targets = [];
          this.status = 'inactive';
        } else {
          this.error = err.response?.data?.message || 'Gagal sinkronisasi data subscription dengan backend.';
        }
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
          this.subscriptionId = resData.push_subscription_it || null;
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
        const errorMsg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat aktivasi subscription.';
        this.error = errorMsg;
        throw new Error(errorMsg);
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
        return true;
      } catch (err) {
        this.error = err.response?.data?.message || 'Gagal menonaktifkan subscription di backend.';
        // Tetap bersihkan lokal jika backend gagal/sudah hilang
        await pushService.unsubscribeFromPush();
        this.targets = [];
        this.status = 'inactive';
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
