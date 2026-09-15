<template>
	<header class="bg-slate-900 text-white shadow-md sticky top-0 z-40">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
			<!-- Logo & Branding (Route to Dashboard) -->
			<router-link to="/" id="btn-nav-brand" class="flex items-center gap-3 cursor-pointer select-none no-underline">
				<img src="/icons/icon.svg" alt="SKAPSA" class="w-8 h-8 rounded-lg" />
				<div>
					<div class="flex items-center gap-2">
						<h1 class="font-bold text-base sm:text-lg tracking-tight leading-none text-white">Info Presensi</h1>
						<span class="bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wider"> SKAPSA </span>
					</div>
					<p class="text-xs text-slate-400 font-medium leading-none mt-1 hidden sm:block">PWA Push Notification Real-Time</p>
				</div>
			</router-link>

			<!-- Navigation & Actions -->
			<div class="flex items-center gap-2 sm:gap-3">
				<!-- Offline Warning Badge if Offline -->
				<span
					v-if="!notificationStore.isOnline"
					id="badge-offline-mode"
					class="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs px-2.5 py-1 rounded-full font-medium">
					<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
					<span>Offline (IndexedDB)</span>
				</span>

				<!-- Nav Links using router-link -->
				<router-link
					to="/"
					id="btn-nav-dashboard"
					:class="[
						'px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 no-underline',
						route.name === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800',
					]">
					<el-icon><HomeFilled /></el-icon>
					<span class="hidden sm:inline">Dasbor</span>
				</router-link>

				<router-link
					to="/notifications"
					id="btn-nav-notifications"
					:class="[
						'px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 relative no-underline',
						route.name === 'notifications' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800',
					]">
					<el-icon><BellFilled /></el-icon>
					<span class="hidden sm:inline">Riwayat</span>

					<!-- Unread notification counter badge -->
					<span
						v-if="notificationStore.unreadCount > 0"
						id="badge-unread-count"
						class="min-w-4.5 h-4.5 px-1 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none">
						{{ notificationStore.unreadCount > 99 ? "99+" : notificationStore.unreadCount }}
					</span>
				</router-link>

				<!-- Install Button in Header if Installable -->
				<button
					v-if="canInstall && !isInstalled"
					id="btn-header-install"
					@click="$emit('install-app')"
					class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer ml-1">
					<el-icon><Download /></el-icon>
					<span class="hidden md:inline">Pasang PWA</span>
				</button>
			</div>
		</div>
	</header>
</template>

<script setup>
import { useRoute } from "vue-router";
import { useNotificationStore } from "../stores/notificationStore.js";
import { HomeFilled, BellFilled, Download } from "@element-plus/icons-vue";

defineProps({
	canInstall: {
		type: Boolean,
		default: false,
	},
	isInstalled: {
		type: Boolean,
		default: false,
	},
});

defineEmits(["install-app"]);

const route = useRoute();
const notificationStore = useNotificationStore();
</script>
