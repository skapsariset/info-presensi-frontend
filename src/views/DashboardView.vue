<template>
	<div class="space-y-6">
		<!-- Quick App Description & Shortcut to Notification History -->
		<div id="card-dashboard-hero" class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-5">
				<div class="max-w-2xl">
					<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
						<span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
						Layanan Resmi Info Presensi SKAPSA
					</div>
					<h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Sistem Informasi & Notifikasi Presensi Real-Time</h2>
					<p class="text-sm text-slate-600 mt-1.5 leading-relaxed">
						Menyampaikan informasi presensi guru, tenaga kependidikan, siswa, dan tenaga non GTK secara instan ke perangkat Anda melalui teknologi Web Push PWA, bahkan saat
						aplikasi dan peramban sedang tertutup.
					</p>
				</div>

				<!-- Shortcut ke Riwayat Notifikasi via router-link -->
				<router-link
					to="/notifications"
					id="btn-shortcut-notifications"
					class="flex items-center justify-between gap-4 p-4 rounded-xl bg-liear-to-br from-slate-900 to-blue-950 text-white shadow-md hover:shadow-lg hover:from-slate-800 hover:to-blue-900 transition shrink-0 cursor-pointer text-left group no-underline">
					<div class="flex items-center gap-3">
						<div class="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
							<el-icon :size="24"><BellFilled /></el-icon>
						</div>
						<div>
							<p class="text-xs text-slate-400 font-medium">Akses Cepat</p>
							<h4 class="font-bold text-sm text-white">Riwayat Notifikasi</h4>
							<p class="text-xs text-blue-300 mt-0.5">
								{{ notificationStore.unreadCount > 0 ? `${notificationStore.unreadCount} pesan belum dibaca` : "Semua pesan sudah dibaca" }}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span v-if="notificationStore.unreadCount > 0" class="w-6 h-6 rounded-full bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
							{{ notificationStore.unreadCount }}
						</span>
						<el-icon class="text-slate-400 group-hover:translate-x-1 transition"><ArrowRight /></el-icon>
					</div>
				</router-link>
			</div>
		</div>

		<!-- Anjuran Pasang PWA / Panduan iOS -->
		<PwaInstallBanner :can-install="canInstall" :is-installed="isInstalled" :is-i-o-s="subscriptionStore.capabilities.isIOS" @install-app="$emit('install-app')" />

		<!-- Device Capabilities Info -->
		<DeviceInfoCard :capabilities="subscriptionStore.capabilities" />

		<!-- Status Subscription Card & Sync Button -->
		<SubscriptionStatusCard />

		<!-- Target Pengguna Presensi List -->
		<TargetUserList />

		<!-- Formulir Input Token Aktivasi Manual -->
		<ManualTokenInput @navigate-activation="handleNavigateActivation" />
	</div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useSubscriptionStore } from "../stores/subscriptionStore.js";
import { useNotificationStore } from "../stores/notificationStore.js";
import PwaInstallBanner from "../components/PwaInstallBanner.vue";
import DeviceInfoCard from "../components/DeviceInfoCard.vue";
import SubscriptionStatusCard from "../components/SubscriptionStatusCard.vue";
import TargetUserList from "../components/TargetUserList.vue";
import ManualTokenInput from "../components/ManualTokenInput.vue";
import { BellFilled, ArrowRight } from "@element-plus/icons-vue";

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

const router = useRouter();
const subscriptionStore = useSubscriptionStore();
const notificationStore = useNotificationStore();

function handleNavigateActivation(token) {
	router.push({
		name: "activation",
		params: { token },
	});
}
</script>
