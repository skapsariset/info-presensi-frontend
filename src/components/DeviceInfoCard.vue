<template>
	<div id="card-device-info" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
		<div class="flex items-center justify-between pb-3 border-b border-slate-100">
			<div class="flex items-center gap-2.5">
				<div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
					<el-icon :size="18"><Monitor /></el-icon>
				</div>
				<div>
					<h4 class="font-bold text-slate-800 text-sm">Informasi & Dukungan Perangkat</h4>
					<p class="text-xs text-slate-500">Status kapabilitas browser untuk Web Push</p>
				</div>
			</div>
			<span
				:class="[
					'text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5',
					capabilities.isPushSupported ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200',
				]">
				<span :class="['w-1.5 h-1.5 rounded-full', capabilities.isPushSupported ? 'bg-emerald-500' : 'bg-rose-500']"></span>
				{{ capabilities.isPushSupported ? "Didukung" : "Terbatas" }}
			</span>
		</div>

		<!-- Capabilities Grid -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
			<!-- Browser Name -->
			<div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
				<span class="text-[11px] font-medium text-slate-400 block">Peramban (Browser)</span>
				<span class="font-semibold text-slate-800 text-xs mt-0.5 block truncate">
					{{ capabilities.browserName }}
				</span>
			</div>

			<!-- Service Worker -->
			<div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
				<span class="text-[11px] font-medium text-slate-400 block">Service Worker</span>
				<span :class="['font-semibold text-xs mt-0.5 flex items-center gap-1', capabilities.hasServiceWorker ? 'text-emerald-600' : 'text-rose-600']">
					<el-icon :size="12"><Check v-if="capabilities.hasServiceWorker" /><Close v-else /></el-icon>
					{{ capabilities.hasServiceWorker ? "Aktif" : "Tidak Didukung" }}
				</span>
			</div>

			<!-- Notification Permission -->
			<div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
				<span class="text-[11px] font-medium text-slate-400 block">Izin Notifikasi</span>
				<span
					:class="[
						'font-semibold text-xs mt-0.5 capitalize flex items-center gap-1',
						capabilities.permission === 'granted' ? 'text-emerald-600' : capabilities.permission === 'denied' ? 'text-rose-600' : 'text-amber-600',
					]">
					{{ formatPermission(capabilities.permission) }}
				</span>
			</div>

			<!-- Standalone Mode -->
			<div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
				<span class="text-[11px] font-medium text-slate-400 block">Mode Aplikasi</span>
				<span class="font-semibold text-slate-800 text-xs mt-0.5 block">
					{{ capabilities.isStandalone ? "PWA Terpasang" : "Tab Browser" }}
				</span>
			</div>
		</div>

		<!-- Alert Note jika izin notifikasi belum diatur / belum diizinkan -->
		<div
			v-if="capabilities.permission === 'default'"
			id="alert-permission-default"
			class="mt-3.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div class="flex items-start gap-2.5">
				<el-icon class="mt-0.5 text-amber-600 shrink-0"><Warning /></el-icon>
				<div>
					<p class="font-bold text-slate-800">Izin Notifikasi Belum Diaktifkan di Perangkat / PWA Ini</p>
					<p class="text-amber-800 mt-0.5">Tekan tombol di samping untuk memunculkan dialog persetujuan notifikasi sistem agar info presensi dapat diterima.</p>
				</div>
			</div>
			<el-button
				id="btn-request-permission"
				type="warning"
				size="small"
				:loading="requestingPermission"
				@click="handleRequestPermission"
				class="rounded-lg! font-bold! self-start sm:self-auto shrink-0 shadow-sm">
				<el-icon class="mr-1"><BellFilled /></el-icon>
				Izinkan Notifikasi Sekarang
			</el-button>
		</div>

		<!-- Alert Note jika izin notifikasi ditolak / diblokir -->
		<div
			v-else-if="capabilities.permission === 'denied'"
			id="alert-permission-denied"
			class="mt-3.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
			<div class="flex items-start gap-2.5">
				<el-icon class="mt-0.5 text-rose-600 shrink-0"><Warning /></el-icon>
				<div>
					<p class="font-bold text-rose-900">Izin Notifikasi Diblokir pada Peramban / Sistem Android</p>
					<p class="text-rose-700 mt-0.5 leading-relaxed">Peramban atau OS Android sedang memblokir notifikasi untuk aplikasi ini. Untuk mengaktifkannya kembali:</p>
				</div>
			</div>
			<div class="pl-6 space-y-1 text-slate-700">
				<p>
					• <strong>Di Android (PWA / Chrome):</strong> Ketuk ikon <span class="font-bold">Setelan Situs</span> (ikon gembok / slider di bilah alamat) &gt;
					<span class="font-bold">Izin</span> &gt; ubah <span class="font-bold">Notifikasi</span> menjadi <em>Diizinkan (Allow)</em>.
				</p>
				<p>
					• <strong>Di Setelan Aplikasi Android:</strong> Buka
					<em>Pengaturan HP &gt; Aplikasi &gt; Info Presensi SKAPSA (atau Chrome) &gt; Notifikasi &gt; Aktifkan Semua Notifikasi</em>.
				</p>
				<p>• <strong>Di Desktop Windows:</strong> Klik ikon gembok di sebelah URL &gt; aktifkan toggle <em>Notifikasi</em>.</p>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref } from "vue";
import { Monitor, Check, Close, Warning, BellFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import pushService from "../services/pushService.js";
import { useSubscriptionStore } from "../stores/subscriptionStore.js";

defineProps({
	capabilities: {
		type: Object,
		required: true,
	},
});

const subscriptionStore = useSubscriptionStore();
const requestingPermission = ref(false);

async function handleRequestPermission() {
	requestingPermission.value = true;
	try {
		const perm = await pushService.requestNotificationPermission();
		subscriptionStore.refreshCapabilities();
		if (perm === "granted") {
			ElMessage.success("Izin notifikasi berhasil diaktifkan!");
			// Jika service worker siap, coba daftarkan/pastikan subscription aktif
			await pushService.subscribeToPush().catch(() => {});
		} else if (perm === "denied") {
			ElMessage.error("Izin notifikasi ditolak. Silakan izinkan melalui pengaturan browser/HP.");
		}
	} catch (err) {
		ElMessage.error(err.message || "Gagal meminta izin notifikasi.");
	} finally {
		requestingPermission.value = false;
	}
}

function formatPermission(perm) {
	if (perm === "granted") return "Diizinkan";
	if (perm === "denied") return "Ditolak";
	if (perm === "default") return "Belum Diatur";
	return "Tidak Tersedia";
}
</script>
