<template>
	<div id="card-subscription-status" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
			<div class="flex items-center gap-3">
				<div
					:class="[
						'w-11 h-11 rounded-2xl flex items-center justify-center transition-colors',
						subscriptionStore.isSubscribed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
					]">
					<el-icon :size="22">
						<BellFilled v-if="subscriptionStore.isSubscribed" />
						<MuteNotification v-else />
					</el-icon>
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h3 class="font-bold text-slate-900 text-base">Status Subscription</h3>
						<el-tag id="tag-sub-status" :type="subscriptionStore.isSubscribed ? 'success' : 'info'" effect="dark" round class="font-semibold text-xs">
							{{ subscriptionStore.isSubscribed ? "AKTIF" : "BELUM TERDAFTAR" }}
						</el-tag>
					</div>
					<p class="text-xs text-slate-500 mt-0.5">
						{{
							subscriptionStore.isSubscribed
								? `Perangkat ini terdaftar untuk menerima push notification (${subscriptionStore.targetCount} target presensi).`
								: "Belum ada target presensi yang terhubung dengan perangkat ini."
						}}
					</p>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex items-center gap-1 self-end sm:self-auto flex-wrap justify-end">
				<!-- Tombol Sinkronisasi -->
				<el-button id="btn-sync-subscription" type="primary" plain :loading="subscriptionStore.syncing" @click="handleSync" class="rounded-xl!">
					<el-icon class="mr-1"><Refresh /></el-icon>
					Sinkronkan
				</el-button>

				<!-- Tombol Nonaktifkan Subscription (Hanya jika aktif) -->
				<el-popconfirm
					v-if="subscriptionStore.isSubscribed"
					title="Nonaktifkan subscription ini beserta seluruh target presensi?"
					confirm-button-text="Ya, Nonaktifkan"
					cancel-button-text="Batal"
					confirm-button-type="danger"
					@confirm="handleDeactivate">
					<template #reference>
						<el-button id="btn-deactivate-subscription" type="danger" plain :loading="subscriptionStore.loading" class="rounded-xl!">
							<el-icon class="mr-1"><Delete /></el-icon>
							Nonaktifkan
						</el-button>
					</template>
				</el-popconfirm>
			</div>
		</div>

		<!-- Metadata Footer: Last Synced & Test Notification -->
		<div class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
			<div class="flex items-center gap-2">
				<span class="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
				<span>
					Terakhir disinkronkan:
					<strong class="text-slate-700">
						{{ subscriptionStore.lastSyncedAt ? formatTime(subscriptionStore.lastSyncedAt) : "Belum pernah" }}
					</strong>
				</span>
			</div>

			<!-- Tombol Uji Notifikasi jika diizinkan -->
			<button
				v-if="subscriptionStore.capabilities.permission === 'granted'"
				id="btn-test-notification"
				@click="sendTestNotification"
				class="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto">
				<el-icon><Notification /></el-icon>
				Uji Notifikasi Perangkat
			</button>
		</div>
	</div>
</template>

<script setup>
import { useSubscriptionStore } from "../stores/subscriptionStore.js";
import { useNotificationStore } from "../stores/notificationStore.js";
import pushService from "../services/pushService.js";
import { ElMessage } from "element-plus";
import { BellFilled, MuteNotification, Refresh, Delete, Notification } from "@element-plus/icons-vue";

const subscriptionStore = useSubscriptionStore();
const notificationStore = useNotificationStore();

async function handleSync() {
	try {
		await subscriptionStore.syncSubscription();
		ElMessage.success("Sinkronisasi data subscription berhasil!");
	} catch (e) {
		ElMessage.error(e.message || "Gagal sinkronisasi data.");
	}
}

async function handleDeactivate() {
	try {
		await subscriptionStore.deactivateSubscription();
		ElMessage.success("Push subscription berhasil dinonaktifkan.");
	} catch (e) {
		ElMessage.error(e.message || "Gagal menonaktifkan subscription.");
	}
}

async function sendTestNotification() {
	const suffix = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 6) : Math.random().toString(36).substring(2, 8);
	const testId = `test_${Date.now()}_${suffix}`;
	const now = new Date();
	const testData = {
		id: testId,
		is_test: true,
		title: "Uji Push Notifikasi SKAPSA",
		body: "Sistem push notifikasi di perangkat Anda berfungsi dengan sangat baik!",
		timestamp: now.toISOString(),
		status_presensi: "TERVERIFIKASI",
		waktu_presensi: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
		lokasi: "Simulasi Sistem SKAPSA",
		nama: "Tes Perangkat",
		type: "guru",
	};

	try {
		const swSent = await pushService.triggerLocalNotification(testData);
		// Jika Service Worker belum aktif (misal izin biasa tanpa SW), baru simpan manual
		if (!swSent) {
			await notificationStore.addNotification(testData);
		}
		ElMessage.success("Notifikasi pengujian berhasil dikirimkan!");
	} catch (e) {
		ElMessage.warning("Perangkat membatasi notifikasi: " + e.message);
	}
}

function formatTime(iso) {
	try {
		return new Date(iso).toLocaleTimeString("id-ID", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch {
		return iso;
	}
}
</script>
