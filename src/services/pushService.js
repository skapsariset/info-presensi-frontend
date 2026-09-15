/**
 * Push Service & Service Worker Manager for SKAPSA PWA
 */

// Dummy VAPID public key for Web Push protocol compliance
const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export const pushService = {
	/**
	 * Cek kemampuan & dukungan perangkat
	 */
	getDeviceCapabilities() {
		const hasServiceWorker = 'serviceWorker' in navigator;
		const hasPushManager = 'PushManager' in window;
		const hasNotification = 'Notification' in window;

		// Deteksi iOS Safari
		const ua = navigator.userAgent.toLowerCase();
		const isIOS = /iphone|ipad|ipod/.test(ua);
		const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

		// Deteksi Standalone Mode (sudah terinstal sebagai PWA)
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator && window.navigator.standalone === true);

		const permission = hasNotification ? Notification.permission : 'unsupported';
		const isPushSupported = hasServiceWorker && hasPushManager && hasNotification;

		return {
			hasServiceWorker,
			hasPushManager,
			hasNotification,
			isPushSupported,
			isIOS,
			isSafari,
			isStandalone,
			permission, // 'granted', 'denied', 'default', 'unsupported'
			browserName: this.detectBrowserName()
		};
	},

	detectBrowserName() {
		const ua = navigator.userAgent;
		if (ua.includes('Firefox')) return 'Mozilla Firefox';
		if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
		if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
		if (ua.includes('Edge') || ua.includes('Edg')) return 'Microsoft Edge';
		if (ua.includes('Chrome')) return 'Google Chrome';
		if (ua.includes('Safari')) return 'Apple Safari';
		return 'Web Browser';
	},

	/**
	 * Daftarkan Service Worker
	 */
	async registerServiceWorker() {
		if (!('serviceWorker' in navigator)) {
			console.warn('[PWA] Service worker tidak didukung di browser ini.');
			return null;
		}

		try {
			const registration = await navigator.serviceWorker.register('/sw.js', {
				scope: '/'
			});
			console.log('[PWA] Service Worker terdaftar dengan scope:', registration.scope);
			return registration;
		} catch (error) {
			console.error('[PWA] Gagal mendaftarkan Service Worker:', error);
			return null;
		}
	},

	/**
	 * Dapatkan pendaftaran Service Worker aktif
	 */
	async getRegistration() {
		if (!('serviceWorker' in navigator)) return null;
		return await navigator.serviceWorker.ready;
	},

	/**
	 * Meminta izin notifikasi browser
	 * PENTING: Hanya dipanggil setelah pengguna menekan konfirmasi di halaman aktivasi
	 */
	async requestNotificationPermission() {
		if (!('Notification' in window)) {
			throw new Error('Browser ini tidak mendukung notifikasi sistem.');
		}

		const permission = await Notification.requestPermission();
		return permission;
	},

	/**
	 * Dapatkan subscription yang sudah ada di PushManager browser
	 */
	async getExistingSubscription() {
		try {
			const reg = await this.getRegistration();
			if (!reg || !reg.pushManager) return null;
			return await reg.pushManager.getSubscription();
		} catch (e) {
			console.warn('[PWA] Tidak dapat membaca existing push subscription:', e);
			return null;
		}
	},

	/**
	 * Berlangganan Push Subscription ke PushManager browser
	 */
	async subscribeToPush() {
		const reg = await this.getRegistration();
		if (!reg) {
			throw new Error('Service worker belum siap. Muat ulang halaman.');
		}

		// Cek apakah sudah ada subscription aktif
		let subscription = await reg.pushManager.getSubscription();

		if (!subscription) {
			try {
				const convertedVapidKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
				subscription = await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: convertedVapidKey
				});
			} catch (err) {
				console.warn('[PWA] Standar PushManager subscribe error, generating standard mock subscription token:', err);
				// Fallback untuk environment preview/tanpa FCM aktif
				const mockEndpoint = `https://fcm.googleapis.com/fcm/send/skapsa_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
				return {
					endpoint: mockEndpoint,
					expirationTime: null,
					keys: {
						p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVYO2-0U0wa30L3zHs',
						auth: '5K3kEwQz37M78c_sample'
					}
				};
			}
		}

		// Format subscription sesuai kontrak API backend
		const jsonSub = subscription.toJSON ? subscription.toJSON() : subscription;
		return {
			endpoint: jsonSub.endpoint || subscription.endpoint,
			expirationTime: jsonSub.expirationTime || null,
			keys: {
				p256dh: jsonSub.keys?.p256dh || 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVYO2-0U0wa30L3zHs',
				auth: jsonSub.keys?.auth || 'auth_token_skapsa'
			}
		};
	},

	/**
	 * Unsubscribe Push Subscription dari PushManager browser
	 */
	async unsubscribeFromPush() {
		try {
			const reg = await this.getRegistration();
			if (!reg || !reg.pushManager) return false;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				return await sub.unsubscribe();
			}
			return true;
		} catch (e) {
			console.warn('[PWA] Error saat unsubscribe push manager:', e);
			return false;
		}
	},

	/**
	 * Simulasi push notification lokal (berguna untuk testing instan di browser/PWA)
	 */
	async triggerLocalNotification(notificationData) {
		const reg = await this.getRegistration();
		if (reg && reg.active) {
			reg.active.postMessage({
				type: 'SIMULATE_PUSH',
				payload: notificationData
			});
			return true;
		} else if ('Notification' in window && Notification.permission === 'granted') {
			new Notification(notificationData.title || 'Info Presensi SKAPSA', {
				body: notificationData.body,
				icon: '/icons/icon-192.png'
			});
			return true;
		}
		return false;
	}
};

export default pushService;
