import { openDB } from 'idb';

const DB_NAME = 'skapsa_presensi_db';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';
export const MAX_NOTIFICATIONS_LIMIT = 100;

/**
 * Menghasilkan ID deterministik untuk notifikasi agar seragam antara Service Worker dan Frontend.
 * Prioritas:
 * 1. ID riwayat notifikasi dari database backend (misal: data.id, data.riwayat_id)
 * 2. ID ber-prefix 'test_' untuk uji coba perangkat / simulasi lokal
 * 3. Hash deterministik berbasis payload jika backend tidak menyertakan ID
 */
export function generateNotificationId(data) {
	if (!data) return `local_${Date.now()}`;

	// 1. Prioritas Utama: ID riwayat pengiriman notifikasi dari backend
	const backendId = data.id ?? data.riwayat_id ?? data.notification_id ?? data.id_riwayat ?? data._id;
	if (backendId !== undefined && backendId !== null && String(backendId).trim() !== '') {
		return String(backendId);
	}

	// 2. Jika notifikasi berasal dari uji coba / simulasi lokal
	if (data.is_test || data.type === 'test' || (typeof data.title === 'string' && data.title.toLowerCase().includes('uji'))) {
		const timestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
		const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
			? crypto.randomUUID().slice(0, 6)
			: Math.random().toString(36).substring(2, 8);
		return `test_${timestamp}_${suffix}`;
	}

	// 3. Fallback deterministik berbasis fingerprint payload
	const user = data.user_presensi_id || data.detail_target?.user_presensi_id || data.nama || 'USER';
	const status = data.status_presensi || 'HADIR';
	const waktu = data.waktu_presensi || '';

	let timeKey = '';
	if (data.timestamp) {
		const t = new Date(data.timestamp).getTime();
		if (!isNaN(t)) {
			timeKey = Math.floor(t / 10000); // 10-detik bucket toleransi clock-skew
		}
	}
	if (!timeKey) {
		timeKey = Math.floor(Date.now() / 10000);
	}

	const title = (data.title || '').trim();
	const rawKey = `${user}_${status}_${waktu}_${timeKey}_${title}`;
	return 'notif_' + rawKey.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

async function getDatabase() {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, {
					keyPath: 'id',
					autoIncrement: true
				});
				store.createIndex('timestamp', 'timestamp');
				store.createIndex('read', 'read');
				store.createIndex('user_presensi_id', 'user_presensi_id');
			}
		}
	});
}

export const notificationDb = {
	/**
	 * Mengambil semua notifikasi diurutkan dari terbaru
	 */
	async getAll() {
		try {
			const db = await getDatabase();
			let all = await db.getAll(STORE_NAME);

			// Deteksi dan bersihkan data ganda / duplikat yang mungkin tersimpan sebelumnya
			const seen = new Map();
			const duplicateIdsToDelete = [];

			for (const item of all) {
				const user = item.user_presensi_id || item.detail_target?.user_presensi_id || item.nama || '';
				const title = (item.title || '').trim();
				const body = (item.body || '').trim();
				const waktu = item.waktu_presensi || '';
				const timeMinute = item.timestamp ? new Date(item.timestamp).toISOString().slice(0, 16) : '';
				const sig = `${user}|${title}|${body}|${waktu}|${timeMinute}`;

				if (seen.has(sig)) {
					duplicateIdsToDelete.push(item.id);
				} else {
					seen.set(sig, item);
				}
			}

			if (duplicateIdsToDelete.length > 0) {
				console.log(`[IndexedDB] Membersihkan ${duplicateIdsToDelete.length} notifikasi duplikat di IndexedDB.`);
				const tx = db.transaction(STORE_NAME, 'readwrite');
				for (const dupId of duplicateIdsToDelete) {
					tx.store.delete(dupId);
				}
				await tx.done;
				all = Array.from(seen.values());
			}

			return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
		} catch (error) {
			console.error('[IndexedDB] Error getAll:', error);
			return [];
		}
	},

	/**
	 * Menambah notifikasi baru dengan pembatasan maksimal
	 */
	async add(item) {
		try {
			const db = await getDatabase();
			const id = generateNotificationId(item);

			// 1. Cek apakah record dengan ID ini sudah ada di IndexedDB
			const existingById = await db.get(STORE_NAME, id);
			if (existingById) {
				return existingById;
			}

			// 2. Cek apakah ada record duplikat berdasarkan kemiripan isi konten dan waktu yang berdekatan
			const all = await db.getAll(STORE_NAME);
			const isDuplicate = all.find((existing) => {
				if (existing.id === id) return true;
				const sameTitle = (existing.title || '').trim() === (item.title || '').trim();
				const sameBody = (existing.body || '').trim() === (item.body || '').trim();
				const sameUser = (existing.user_presensi_id || existing.detail_target?.user_presensi_id) ===
					(item.user_presensi_id || item.detail_target?.user_presensi_id);
				const timeDiff = Math.abs(new Date(existing.timestamp).getTime() - new Date(item.timestamp || Date.now()).getTime());
				return sameTitle && sameBody && sameUser && timeDiff < 15000;
			});

			if (isDuplicate) {
				console.log('[IndexedDB] Mencegah penambahan notifikasi duplikat:', isDuplicate.id);
				return isDuplicate;
			}

			const record = {
				id: item.notifikasi_presensi_id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
				title: item.title || 'Notifikasi Presensi SKAPSA',
				body: item.body || 'Presensi telah dicatat',
				timestamp: item.timestamp || new Date().toISOString(),
				read: item.read ?? false,
				detail_target: item.detail_target || null,
				user_presensi_id: item.detail_target?.user_presensi_id || item.user_presensi_id || 'UNKNOWN',
				type: item.detail_target?.type || item.type || 'siswa',
				nama: item.detail_target?.nama || item.nama || 'Pengguna Presensi',
				nis: item.detail_target?.nis || item.nis || '-',
				nama_rombel: item.detail_target?.nama_rombel || item.nama_rombel,
				jenis_presensi: item.detail_presensi?.jenis_presensi || item.jenis_presensi || 'masuk',
				status_presensi: item.detail_presensi?.status_presensi || item.status_presensi || 'HADIR',
				waktu_presensi: item.detail_presensi?.waktu_presensi || item.waktu_presensi || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
				mesin_presensi: item.detail_presensi?.mesin_presensi || item.mesin_presensi,
				catatan: item.detail_presensi?.catatan || item.catatan || 'Presensi digital berhasil diverifikasi oleh sistem Fingerprint/Face-Recognition SKAPSA'
			};

			await db.put(STORE_NAME, record);

			// Pangkas otomatis jika melebihi batas maksimal jumlah notifikasi
			const updatedAll = await this.getAll();
			if (updatedAll.length > MAX_NOTIFICATIONS_LIMIT) {
				const excess = updatedAll.slice(MAX_NOTIFICATIONS_LIMIT);
				const tx = db.transaction(STORE_NAME, 'readwrite');
				for (const oldItem of excess) {
					tx.store.delete(oldItem.id);
				}
				await tx.done;
			}

			return record;
		} catch (error) {
			console.error('[IndexedDB] Error add:', error);
			return null;
		}
	},

	/**
	 * Tandai 1 notifikasi sebagai terbaca
	 */
	async markRead(id) {
		try {
			const db = await getDatabase();
			const item = await db.get(STORE_NAME, id);
			if (item) {
				item.read = true;
				await db.put(STORE_NAME, item);
			}
			return true;
		} catch (error) {
			console.error('[IndexedDB] Error markRead:', error);
			return false;
		}
	},

	/**
	 * Tandai semua notifikasi sebagai terbaca
	 */
	async markAllRead() {
		try {
			const db = await getDatabase();
			const tx = db.transaction(STORE_NAME, 'readwrite');
			let cursor = await tx.store.openCursor();
			while (cursor) {
				const updateData = { ...cursor.value, read: true };
				await cursor.update(updateData);
				cursor = await cursor.continue();
			}
			await tx.done;
			return true;
		} catch (error) {
			console.error('[IndexedDB] Error markAllRead:', error);
			return false;
		}
	},

	/**
	 * Hapus notifikasi tertentu
	 */
	async delete(id) {
		try {
			const db = await getDatabase();
			await db.delete(STORE_NAME, id);
			return true;
		} catch (error) {
			console.error('[IndexedDB] Error delete:', error);
			return false;
		}
	},

	/**
	 * Hapus semua riwayat notifikasi
	 */
	async clearAll() {
		try {
			const db = await getDatabase();
			await db.clear(STORE_NAME);
			return true;
		} catch (error) {
			console.error('[IndexedDB] Error clearAll:', error);
			return false;
		}
	},

	/**
	 * Hitung jumlah notifikasi belum terbaca
	 */
	async getUnreadCount() {
		try {
			const db = await getDatabase();
			const all = await db.getAll(STORE_NAME);
			return all.filter((n) => !n.read).length;
		} catch (error) {
			console.error('[IndexedDB] Error getUnreadCount:', error);
			return 0;
		}
	},
};

export default notificationDb;
