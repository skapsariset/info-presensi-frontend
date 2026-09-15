import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import ActivationView from '../views/ActivationView.vue';
import NotificationHistoryView from '../views/NotificationHistoryView.vue';

const routes = [
	{
		path: '/',
		name: 'dashboard',
		component: DashboardView,
		meta: { title: 'Dasbor Info Presensi' }
	},
	{
		path: '/activation/:token',
		name: 'activation',
		component: ActivationView,
		props: true,
		meta: { title: 'Aktivasi Presensi' }
	},
	{
		path: '/notifications',
		name: 'notifications',
		component: NotificationHistoryView,
		meta: { title: 'Riwayat Notifikasi Presensi' }
	},
	{
		// Fallback redirect ke dasbor jika rute tidak ditemukan
		path: '/:pathMatch(.*)*',
		redirect: '/'
	}
];

const router = createRouter({
	history: createWebHistory(),
	routes,
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) {
			return savedPosition;
		}
		return { top: 0 };
	}
});

router.afterEach((to) => {
	if (to.meta && to.meta.title) {
		document.title = `${to.meta.title} • Info Presensi SKAPSA`;
	} else {
		document.title = 'Info Presensi SKAPSA • PWA Web Push Notification';
	}
});

export default router;
