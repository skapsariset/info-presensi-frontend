import { defineStore } from 'pinia';
import notificationDb, { MAX_NOTIFICATIONS_LIMIT } from '../services/indexedDb.js';

export const useNotificationStore = defineStore('notification', {
	state: () => ({
		notifications: [],
		unreadCount: 0,
		filterUnreadOnly: false,
		loading: false,
		maxLimit: MAX_NOTIFICATIONS_LIMIT,
		displayCount: 10,
		selectedNotification: null,
		isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
	}),

	getters: {
		totalCount: (state) => state.notifications.length,
		filteredNotifications: (state) => {
			let list = state.notifications;
			if (state.filterUnreadOnly) {
				list = list.filter((n) => !n.read);
			}
			return list.slice(0, state.displayCount);
		},
		hasMore: (state) => {
			const filtered = state.filterUnreadOnly
				? state.notifications.filter((n) => !n.read)
				: state.notifications;
			return state.displayCount < filtered.length;
		}
	},

	actions: {
		initOnlineListeners() {
			if (typeof window === 'undefined') return;
			window.addEventListener('online', () => {
				this.isOnline = true;
			});
			window.addEventListener('offline', () => {
				this.isOnline = false;
			});
		},

		/**
		 * Memuat riwayat dari IndexedDB
		 */
		async loadNotifications() {
			this.loading = true;
			try {
				const items = await notificationDb.getAll();
				this.notifications = items;
				this.unreadCount = items.filter((n) => !n.read).length;
			} catch (err) {
				console.error('[NotificationStore] Gagal memuat notifikasi:', err);
			} finally {
				this.loading = false;
			}
		},

		/**
		 * Menambah notifikasi baru
		 */
		async addNotification(data) {
			const added = await notificationDb.add(data);
			if (added) {
				const existingIndex = this.notifications.findIndex((n) => {
					if (n.id === added.id) return true;
					const sameTitle = (n.title || '').trim() === (added.title || '').trim();
					const sameBody = (n.body || '').trim() === (added.body || '').trim();
					const sameUser = (n.user_presensi_id || n.detail_target?.user_presensi_id) ===
						(added.user_presensi_id || added.detail_target?.user_presensi_id);
					const timeDiff = Math.abs(new Date(n.timestamp).getTime() - new Date(added.timestamp || Date.now()).getTime());
					return sameTitle && sameBody && sameUser && timeDiff < 15000;
				});

				if (existingIndex >= 0) {
					this.notifications[existingIndex] = added;
				} else {
					this.notifications = [added, ...this.notifications];
					if (!added.read) {
						this.unreadCount++;
					}
				}
			}
			return added;
		},

		/**
		 * Menangani notifikasi real-time yang diterima dari Service Worker.
		 * Service Worker sudah menyimpannya ke IndexedDB, sehingga fungsi ini HANYA
		 * menyelaraskan state reaktif di memori Pinia tanpa menulis ganda ke IndexedDB.
		 */
		handleIncomingNotification(payload) {
			if (!payload) return;
			const id = payload.id;

			const existingIndex = this.notifications.findIndex((n) => {
				if (id && n.id === id) return true;
				const sameTitle = (n.title || '').trim() === (payload.title || '').trim();
				const sameBody = (n.body || '').trim() === (payload.body || '').trim();
				const sameUser = (n.user_presensi_id || n.detail_target?.user_presensi_id) ===
					(payload.user_presensi_id || payload.detail_target?.user_presensi_id);
				const timeDiff = Math.abs(new Date(n.timestamp).getTime() - new Date(payload.timestamp || Date.now()).getTime());
				return sameTitle && sameBody && sameUser && timeDiff < 15000;
			});

			if (existingIndex >= 0) {
				this.notifications[existingIndex] = { ...this.notifications[existingIndex], ...payload };
			} else {
				this.notifications = [payload, ...this.notifications];
				if (!payload.read) {
					this.unreadCount++;
				}
			}
		},

		/**
		 * Tandai notifikasi sebagai terbaca
		 */
		async markRead(id) {
			const success = await notificationDb.markRead(id);
			if (success) {
				const item = this.notifications.find((n) => n.id === id);
				if (item && !item.read) {
					item.read = true;
					this.unreadCount = Math.max(0, this.unreadCount - 1);
				}
			}
		},

		/**
		 * Tandai semua sebagai terbaca
		 */
		async markAllRead() {
			const success = await notificationDb.markAllRead();
			if (success) {
				this.notifications.forEach((n) => {
					n.read = true;
				});
				this.unreadCount = 0;
			}
		},

		/**
		 * Hapus 1 notifikasi
		 */
		async deleteNotification(id) {
			const item = this.notifications.find((n) => n.id === id);
			const wasUnread = item && !item.read;

			const success = await notificationDb.delete(id);
			if (success) {
				this.notifications = this.notifications.filter((n) => n.id !== id);
				if (wasUnread) {
					this.unreadCount = Math.max(0, this.unreadCount - 1);
				}
			}
		},

		/**
		 * Hapus semua notifikasi
		 */
		async clearAll() {
			const success = await notificationDb.clearAll();
			if (success) {
				this.notifications = [];
				this.unreadCount = 0;
			}
		},

		/**
		 * Muat lebih banyak (Infinite Scroll pagination)
		 */
		loadMore() {
			this.displayCount += 10;
		},

		/**
		 * Buka modal detail notifikasi
		 */
		openDetail(item) {
			this.selectedNotification = item;
			if (!item.read) {
				this.markRead(item.id);
			}
		},

		closeDetail() {
			this.selectedNotification = null;
		}
	}
});

export default useNotificationStore;
