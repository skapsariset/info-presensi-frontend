<template>
	<div class="min-h-screen flex flex-col bg-slate-100 text-slate-900 selection:bg-blue-600 selection:text-white">
		<!-- Navbar -->
		<Navbar :can-install="canInstall" :is-installed="isInstalled" @install-app="triggerPwaInstall" />

		<!-- Main Container with Vue Router View -->
		<main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
			<router-view :can-install="canInstall" :is-installed="isInstalled" @install-app="triggerPwaInstall" />
		</main>

		<!-- Footer -->
		<footer class="bg-white border-t border-slate-200 mt-auto py-6">
			<div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
				<div class="flex items-center gap-2">
					<div class="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-black text-[10px]">S</div>
					<span>&copy; {{ new Date().getFullYear() }} SMK PGRI 1 KEDIRI (SKAPSA) — Info Presensi PWA</span>
				</div>
				<div class="flex items-center gap-4 text-slate-400">
					<span>Progressive Web App</span>
					<span>•</span>
					<span>Web Push Service Worker</span>
				</div>
			</div>
		</footer>
	</div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Navbar from "./components/Navbar.vue";

import { useSubscriptionStore } from "./stores/subscriptionStore.js";
import { useNotificationStore } from "./stores/notificationStore.js";
import pushService from "./services/pushService.js";
import { ElNotification } from "element-plus";

const router = useRouter();
const subscriptionStore = useSubscriptionStore();
const notificationStore = useNotificationStore();

const deferredPrompt = ref(null);
const canInstall = ref(false);
const isInstalled = ref(false);

// PWA Installation handling
function setupPwaListeners() {
	// Check standalone mode
	const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator && window.navigator.standalone === true);
	isInstalled.value = isStandalone;

	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		deferredPrompt.value = e;
		canInstall.value = true;
	});

	window.addEventListener("appinstalled", () => {
		isInstalled.value = true;
		canInstall.value = false;
		deferredPrompt.value = null;
		ElNotification({
			title: "PWA Terpasang",
			message: "Aplikasi Info Presensi SKAPSA berhasil dipasang pada perangkat Anda.",
			type: "success",
		});
	});
}

async function triggerPwaInstall() {
	if (!deferredPrompt.value) return;
	deferredPrompt.value.prompt();
	const { outcome } = await deferredPrompt.value.userChoice;
	if (outcome === "accepted") {
		isInstalled.value = true;
		canInstall.value = false;
	}
	deferredPrompt.value = null;
}

// Service worker message handler (real-time notification received from SW)
function handleServiceWorkerMessages() {
	if (!("serviceWorker" in navigator)) return;

	navigator.serviceWorker.addEventListener("message", (event) => {
		if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED") {
			const payload = event.data.payload;
			notificationStore.handleIncomingNotification(payload);
			ElNotification({
				title: payload.title || "Notifikasi Presensi Masuk",
				message: payload.body || "Informasi presensi baru telah diterima.",
				type: "info",
				duration: 5000,
			});
		}

		if (event.data && event.data.type === "NOTIFICATION_CLICKED") {
			router.push({ name: "notifications" });
		}
	});
}

onMounted(async () => {
	setupPwaListeners();
	notificationStore.initOnlineListeners();

	// Register service worker
	await pushService.registerServiceWorker();
	handleServiceWorkerMessages();

	// Initial data load
	await Promise.allSettled([subscriptionStore.syncSubscription(), notificationStore.loadNotifications()]);
});
</script>
