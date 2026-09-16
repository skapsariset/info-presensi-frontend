// Service Worker for Info Presensi SKAPSA
const CACHE_NAME = 'skapsa-pwa-v6_rev';
const ASSETS_TO_CACHE = [
	'/',
	'/index.html',
	'/manifest.webmanifest',
	'/icons/icon.svg',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
	'/apple-touch-icon.png'
];

const DB_NAME = 'skapsa_presensi_db';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';

// Helper to generate deterministic ID if backend payload does not specify one
function generateNotificationId(data) {
	if (!data) return `local_${Date.now()}`;

	// 1. Prioritas Utama: ID riwayat pengiriman notifikasi dari backend
	const backendId = data.id ?? data.riwayat_id ?? data.notification_id ?? data.id_riwayat ?? data._id;
	if (backendId !== undefined && backendId !== null && String(backendId).trim() !== '') {
		return String(backendId);
	}

	// 2. Jika notifikasi berasal dari uji coba / simulasi lokal
	if (data.is_test || data.type === 'test' || (typeof data.title === 'string' && data.title.toLowerCase().includes('uji'))) {
		const timestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
		const suffix = Math.random().toString(36).substring(2, 8);
		return `test_${timestamp}_${suffix}`;
	}

	// 3. Fallback deterministik berbasis fingerprint payload jika tidak ada ID
	const user = data.user_presensi_id || data.detail_target?.user_presensi_id || data.nama || 'USER';
	const status = data.status_presensi || 'HADIR';
	const waktu = data.waktu_presensi || '';

	let timeKey = '';
	if (data.timestamp) {
		const t = new Date(data.timestamp).getTime();
		if (!isNaN(t)) {
			timeKey = Math.floor(t / 10000); // 10-second bucket for clock skew tolerance
		}
	}
	if (!timeKey) {
		timeKey = Math.floor(Date.now() / 10000);
	}

	const title = (data.title || '').trim();
	const rawKey = `${user}_${status}_${waktu}_${timeKey}_${title}`;
	return 'notif_' + rawKey.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

// Helper to open IndexedDB in Service Worker
function openDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
				store.createIndex('timestamp', 'timestamp', { unique: false });
				store.createIndex('read', 'read', { unique: false });
				store.createIndex('user_presensi_id', 'user_presensi_id', { unique: false });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

// Helper to save notification to IndexedDB from SW
async function saveNotificationToDb(notificationData) {
	try {
		const db = await openDatabase();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);

			const notifId = generateNotificationId(notificationData);

			// Check if already in IndexedDB to prevent duplicate writes
			const getReq = store.get(notifId);
			getReq.onsuccess = () => {
				if (getReq.result) {
					// Already saved, return existing record
					resolve(getReq.result);
					return;
				}

				const record = {
					id: notificationData.notifikasi_presensi_id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
					title: notificationData.title || 'Notifikasi Presensi SKAPSA',
					body: notificationData.body || 'Presensi telah dicatat',
					timestamp: notificationData.timestamp || new Date().toISOString(),
					read: notificationData.read ?? false,
					detail_target: notificationData.detail_target || null,
					user_presensi_id: notificationData.detail_target?.user_presensi_id || notificationData.user_presensi_id || 'UNKNOWN',
					type: notificationData.detail_target?.type || notificationData.type || 'siswa',
					nama: notificationData.detail_target?.nama || notificationData.nama || 'Pengguna Presensi',
					nis: notificationData.detail_target?.nis || notificationData.nis || '-',
					nama_rombel: notificationData.detail_target?.nama_rombel || notificationData.nama_rombel,
					jenis_presensi: notificationData.detail_presensi?.jenis_presensi || notificationData.jenis_presensi || 'masuk',
					status_presensi: notificationData.detail_presensi?.status_presensi || notificationData.status_presensi || 'HADIR',
					waktu_presensi: notificationData.detail_presensi?.waktu_presensi || notificationData.waktu_presensi || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
					mesin_presensi: notificationData.detail_presensi?.mesin_presensi || notificationData.mesin_presensi,
					catatan: notificationData.detail_presensi?.catatan || notificationData.catatan || 'Presensi digital berhasil diverifikasi oleh sistem Fingerprint/Face-Recognition SKAPSA'
				};

				const putReq = store.put(record);
				putReq.onsuccess = () => resolve(record);
				putReq.onerror = () => reject(putReq.error);
			};

			getReq.onerror = () => reject(getReq.error);
		});
	} catch (error) {
		console.error('[SW] Failed to save notification to IndexedDB:', error);
		return null;
	}
}

// 1. Install Event
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(ASSETS_TO_CACHE);
		}).then(() => self.skipWaiting())
	);
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(
				keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
			);
		}).then(() => self.clients.claim())
	);
});

// 3. Fetch Event (Cache-first for assets, network-first for API)
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Do not cache API calls
	if (url.pathname.startsWith('/presensi-api') || url.pathname.startsWith('/push')) {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}
			return fetch(event.request).then((networkResponse) => {
				// Cache successful GET responses for app assets
				if (
					event.request.method === 'GET' &&
					networkResponse &&
					networkResponse.status === 200 &&
					networkResponse.type === 'basic'
				) {
					const responseToCache = networkResponse.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});
				}
				return networkResponse;
			}).catch(() => {
				// Fallback for HTML navigations when offline
				if (event.request.mode === 'navigate') {
					return caches.match('/index.html');
				}
			});
		})
	);
});

// 4. Push Event: When backend sends a Web Push notification
self.addEventListener('push', (event) => {
	let pushData = {};

	if (event.data) {
		try {
			pushData = event.data.json();
		} catch (e) {
			pushData = {
				title: 'Presensi SKAPSA',
				body: event.data.text()
			};
		}
	} else {
		pushData = {
			title: 'Info Presensi SKAPSA',
			body: 'Ada informasi presensi baru yang tercatat.'
		};
	}

	// Generate deterministic ID
	const notifId = generateNotificationId(pushData);
	pushData.id = notifId;

	const title = pushData.title || 'Info Presensi SKAPSA';
	const options = {
		body: pushData.body || 'Presensi berhasil dicatat.',
		icon: '/icons/icon-192.png',
		badge: '/icons/icon-192.png',
		vibrate: [200, 100, 200],
		data: {
			url: pushData.url || '/notifications',
			...pushData,
			id: notifId
		},
		tag: pushData.tag || 'presensi-' + Date.now(),
		renotify: true,
		requireInteraction: false
	};

	event.waitUntil(
		(async () => {
			// 1. Show OS push notification
			await self.registration.showNotification(title, options);
			// 2. Store in IndexedDB for offline history (single writer for push notifications)
			const savedRecord = await saveNotificationToDb(pushData);
			// 3. Broadcast saved record (with its guaranteed ID) to all open client windows
			const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of clients) {
				client.postMessage({
					type: 'PUSH_NOTIFICATION_RECEIVED',
					payload: savedRecord || pushData
				});
			}
		})()
	);
});

// 5. Notification Click Event
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = event.notification.data?.url || '/';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
			// Check if there is already a window open
			for (const client of windowClients) {
				if (client.url.includes(self.registration.scope) && 'focus' in client) {
					client.postMessage({
						type: 'NOTIFICATION_CLICKED',
						data: event.notification.data
					});
					return client.focus();
				}
			}
			// If no window is open, open a new window
			if (self.clients.openWindow) {
				return self.clients.openWindow(targetUrl);
			}
		})
	);
});

// 6. Message Event (from client tabs)
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}

	// Local simulated push test (useful for browser testing without live external VAPID server)
	if (event.data && event.data.type === 'SIMULATE_PUSH') {
		const payload = event.data.payload || {};
		const notifId = payload.id || generateNotificationId(payload);
		payload.id = notifId;

		const title = payload.title || 'Presensi Berhasil Dikonfirmasi';
		const options = {
			body: payload.body || 'Pengguna presensi telah berhasil melakukan presensi.',
			icon: '/icons/icon-192.png',
			badge: '/icons/icon-192.png',
			vibrate: [150, 80, 150],
			data: {
				url: payload.url || '/notifications',
				...payload,
				id: notifId
			},
			tag: payload.tag || notifId,
			renotify: true,
			requireInteraction: true
		};

		event.waitUntil(
			(async () => {
				await self.registration.showNotification(title, options);
				const savedRecord = await saveNotificationToDb(payload);
				const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
				for (const client of clients) {
					client.postMessage({
						type: 'PUSH_NOTIFICATION_RECEIVED',
						payload: savedRecord || payload
					});
				}
			})()
		);
	}
});
