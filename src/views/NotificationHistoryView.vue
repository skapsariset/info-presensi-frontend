<template>
	<div class="space-y-6">
		<!-- Header & Back Button (vue-router) -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<router-link
					to="/"
					id="btn-back-from-history"
					class="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition cursor-pointer mb-2 no-underline">
					<el-icon><Back /></el-icon>
					Kembali ke Dasbor
				</router-link>
				<h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
					<span>Riwayat Notifikasi Presensi</span>
					<el-tag v-if="!notificationStore.isOnline" size="small" type="warning" effect="plain" round> Offline Mode </el-tag>
				</h2>
				<p class="text-xs sm:text-sm text-slate-500 mt-0.5">Arsip push notifikasi kehadiran tersimpan di IndexedDB perangkat ini secara aman dan dapat dibaca offline.</p>
			</div>

			<!-- Quick Actions -->
			<div class="flex items-center gap-2 flex-wrap justify-end">
				<el-button id="btn-mark-all-read" type="primary" plain :disabled="notificationStore.unreadCount === 0" @click="handleMarkAllRead" class="rounded-xl! text-xs sm:text-sm">
					<el-icon class="mr-1"><Select /></el-icon>
					Tandai Semua Terbaca
				</el-button>

				<el-popconfirm
					title="Hapus seluruh riwayat notifikasi dari perangkat ini?"
					confirm-button-text="Ya, Hapus Semua"
					cancel-button-text="Batal"
					confirm-button-type="danger"
					@confirm="handleClearAll">
					<template #reference>
						<el-button id="btn-clear-all-history" type="danger" plain :disabled="notificationStore.totalCount === 0" class="rounded-xl! text-xs sm:text-sm">
							<el-icon class="mr-1"><Delete /></el-icon>
							Hapus Semua
						</el-button>
					</template>
				</el-popconfirm>
			</div>
		</div>

		<!-- Ringkasan Statistik Kartu (Summary Cards) -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<!-- Total Notifikasi -->
			<div id="stat-total-notifications" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3.5">
				<div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
					<el-icon :size="24"><Collection /></el-icon>
				</div>
				<div>
					<span class="text-xs font-medium text-slate-500 block">Total Riwayat</span>
					<span class="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
						{{ notificationStore.totalCount }}
					</span>
					<span class="text-[11px] text-slate-400 block mt-0.5">Pesan tersimpan</span>
				</div>
			</div>

			<!-- Belum Terbaca -->
			<div id="stat-unread-notifications" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3.5">
				<div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
					<el-icon :size="24"><BellFilled /></el-icon>
				</div>
				<div>
					<span class="text-xs font-medium text-slate-500 block">Belum Terbaca</span>
					<span class="text-xl sm:text-2xl font-black text-rose-600 leading-tight">
						{{ notificationStore.unreadCount }}
					</span>
					<span class="text-[11px] text-slate-400 block mt-0.5">Memerlukan perhatian</span>
				</div>
			</div>

			<!-- Batas Maksimal Jumlah Notifikasi -->
			<div id="stat-max-notifications-limit" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3.5">
				<div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
					<el-icon :size="24"><Coin /></el-icon>
				</div>
				<div>
					<span class="text-xs font-medium text-slate-500 block">Batas Maksimal</span>
					<span class="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
						{{ notificationStore.maxLimit }}
					</span>
					<span class="text-[11px] text-slate-400 block mt-0.5">Kapasitas cache IndexedDB</span>
				</div>
			</div>
		</div>

		<!-- Filter & Toolbar -->
		<div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter Tampilan:</span>
				<el-switch
					id="switch-filter-unread"
					v-model="notificationStore.filterUnreadOnly"
					active-text="Hanya Belum Terbaca"
					inactive-text="Semua Pesan"
					class="font-medium! text-xs" />
			</div>

			<div class="text-xs text-slate-400 ms-auto">
				Menampilkan
				<strong class="text-slate-700 font-semibold">{{ notificationStore.filteredNotifications.length }}</strong>
				dari {{ notificationStore.filterUnreadOnly ? notificationStore.unreadCount : notificationStore.totalCount }} notifikasi
			</div>
		</div>

		<!-- Empty State jika tidak ada notifikasi -->
		<div
			v-if="notificationStore.filteredNotifications.length === 0"
			id="empty-state-notifications"
			class="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200 space-y-3">
			<div class="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
				<el-icon :size="32"><Bell /></el-icon>
			</div>
			<h4 class="text-base font-bold text-slate-700">
				{{ notificationStore.filterUnreadOnly ? "Tidak Ada Notifikasi Belum Terbaca" : "Belum Ada Riwayat Notifikasi" }}
			</h4>
			<p class="text-xs text-slate-400 max-w-sm mx-auto">
				{{
					notificationStore.filterUnreadOnly
						? "Semua pesan notifikasi kehadiran telah Anda baca."
						: "Pesan akan otomatis masuk dan tersimpan di sini saat ada kegiatan presensi dari target yang Anda ikuti."
				}}
			</p>
			<div v-if="notificationStore.filterUnreadOnly" class="pt-2">
				<el-button size="small" type="primary" plain @click="notificationStore.filterUnreadOnly = false"> Lihat Semua Riwayat </el-button>
			</div>
		</div>

		<!-- List Notifikasi dengan Fitur Infinite Scroll -->
		<div v-else class="space-y-3">
			<div
				v-for="notif in notificationStore.filteredNotifications"
				:key="notif.id"
				:id="`notif-card-${notif.id}`"
				:class="[
					'bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all cursor-pointer relative overflow-hidden group',
					notif.read ? 'border-slate-200 hover:border-slate-300' : 'border-blue-300 bg-blue-50/20 shadow-blue-50',
				]"
				@click="openDetail(notif)">
				<!-- Unread Indicator Strip on Left Border -->
				<div v-if="!notif.read" class="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></div>

				<div class="flex items-start justify-between gap-3">
					<div class="flex items-start gap-3.5 min-w-0">
						<!-- Icon Badge based on type & status -->
						<div :class="['w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm mt-0.5', getTypeBadgeColor(notif.type)]">
							{{ getInitials(notif.nama) }}
						</div>

						<!-- Content -->
						<div class="min-w-0 space-y-1">
							<div class="flex items-center gap-2 flex-wrap">
								<h4 :class="['text-sm truncate', notif.read ? 'font-bold text-slate-800' : 'font-extrabold text-blue-950']">
									{{ notif.title }}
								</h4>
								<span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', getTypeTagStyle(notif.type)]">
									{{ formatTypeLabel(notif.type) }}
								</span>
								<span
									v-if="notif.is_test || (notif.id && String(notif.id).startsWith('test_'))"
									class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
									UJI COBA
								</span>
								<span v-if="!notif.read" class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"> BARU </span>
							</div>

							<!-- Main message body -->
							<p class="text-xs sm:text-sm text-slate-600 line-clamp-2">
								{{ notif.body }}
							</p>

							<!-- Attendance meta tags: user name, time, status -->
							<div class="flex items-center gap-3 text-xs text-slate-400 pt-1 flex-wrap">
								<span class="font-semibold text-slate-700" v-if="notif.type === 'siswa' && notif.nama_rombel"> {{ notif.nama }} ({{ notif.nama_rombel }}) </span>
								<span class="font-semibold text-slate-700" v-else> {{ notif.nama }}</span>
								<span>•</span>
								<span class="text-slate-500">
									{{ formatRelativeTime(notif.timestamp) }}
								</span>
								<span>•</span>
								<span :class="['inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded uppercase', getStatusTagStyle(notif.status_presensi)]">
									{{ formatStatusLabel(notif.jenis_presensi, notif.status_presensi) || "HADIR" }}
								</span>
							</div>
						</div>
					</div>

					<!-- Per-item Action Buttons (Tandai Terbaca & Hapus) -->
					<div class="flex items-center gap-1 shrink-0 ml-2" @click.stop>
						<!-- Tombol Tandai Terbaca pada masing-masing riwayat -->
						<el-tooltip v-if="!notif.read" content="Tandai Sudah Dibaca" placement="top">
							<button
								:id="`btn-mark-read-${notif.id}`"
								@click="notificationStore.markRead(notif.id)"
								class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer">
								<el-icon :size="16"><Check /></el-icon>
							</button>
						</el-tooltip>

						<!-- Tombol Hapus pada masing-masing riwayat -->
						<el-tooltip content="Hapus Notifikasi Ini" placement="top">
							<button
								:id="`btn-delete-notif-${notif.id}`"
								@click="notificationStore.deleteNotification(notif.id)"
								class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer">
								<el-icon :size="16"><Delete /></el-icon>
							</button>
						</el-tooltip>
					</div>
				</div>
			</div>

			<!-- Infinite Scroll Trigger / Muat Lebih Banyak Button -->
			<div v-if="notificationStore.hasMore" id="infinite-scroll-container" class="text-center py-4">
				<el-button id="btn-load-more" type="primary" plain @click="notificationStore.loadMore" class="rounded-xl! px-6"> Muat Lebih Banyak Notifikasi </el-button>
			</div>
		</div>

		<!-- Modal Dialog Detail Notifikasi Lengkap -->
		<el-dialog v-model="showDetailModal" title="Detail Presensi Real-Time" width="90%" class="max-w-lg rounded-2xl" center>
			<div v-if="selectedItem" class="space-y-4 text-slate-800">
				<div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
					<div :class="['w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0', getTypeBadgeColor(selectedItem.type)]">
						{{ getInitials(selectedItem.nama) }}
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h4 class="font-bold text-base text-slate-900">{{ selectedItem.nama }}</h4>
							<span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', getTypeTagStyle(selectedItem.type)]">
								{{ formatTypeLabel(selectedItem.type) }}
							</span>
						</div>
						<p class="text-xs text-slate-500 mt-0.5">ID: {{ selectedItem.user_presensi_id }}</p>
						<p class="text-xs text-slate-500 mt-0.5" v-if="selectedItem.type === 'siswa'">Kelas/NIS: {{ selectedItem.nama_rombel }} • {{ selectedItem.nis }}</p>
					</div>
				</div>

				<div class="space-y-2 text-xs">
					<div class="flex justify-between py-2 border-b border-slate-100">
						<span class="text-slate-400">Status Presensi</span>
						<span :class="['font-bold px-2 py-0.5 rounded uppercase text-right', getStatusTagStyle(selectedItem.status_presensi)]">
							{{ formatStatusLabel(selectedItem.jenis_presensi, selectedItem.status_presensi) || "HADIR" }}
						</span>
					</div>

					<div class="flex justify-between py-2 border-b border-slate-100">
						<span class="text-slate-400">Waktu Terverifikasi</span>
						<span class="font-semibold text-slate-800 text-right"> {{ selectedItem.waktu_presensi }} WIB </span>
					</div>

					<div class="flex justify-between py-2 border-b border-slate-100">
						<span class="text-slate-400">Mesin Presensi</span>
						<span class="font-semibold text-slate-800 text-right">
							{{ selectedItem.mesin_presensi || "-" }}
						</span>
					</div>

					<div class="flex justify-between py-2 border-b border-slate-100">
						<span class="text-slate-400">Waktu Terima Notifikasi</span>
						<span class="font-semibold text-slate-800 text-right">
							{{ formatFullDate(selectedItem.timestamp) }}
						</span>
					</div>
				</div>

				<div class="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
					<strong>Keterangan Sistem:</strong> {{ selectedItem.catatan || selectedItem.body }}
				</div>
			</div>

			<template #footer>
				<div class="flex justify-end gap-1 items-center">
					<el-button type="danger" plain size="small" @click="handleDeleteCurrentDetail"> Hapus Pesan </el-button>
					<el-button type="primary" size="small" @click="showDetailModal = false"> Tutup </el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref } from "vue";
import { useNotificationStore } from "../stores/notificationStore.js";
import { ElMessage } from "element-plus";
import { Back, Collection, BellFilled, Coin, Check, Delete, Select, Bell } from "@element-plus/icons-vue";

const notificationStore = useNotificationStore();
const showDetailModal = ref(false);
const selectedItem = ref(null);

function openDetail(item) {
	selectedItem.value = item;
	notificationStore.openDetail(item);
	showDetailModal.value = true;
}

function handleDeleteCurrentDetail() {
	if (selectedItem.value) {
		notificationStore.deleteNotification(selectedItem.value.id);
		showDetailModal.value = false;
		ElMessage.success("Notifikasi berhasil dihapus.");
	}
}

async function handleMarkAllRead() {
	await notificationStore.markAllRead();
	ElMessage.success("Semua notifikasi ditandai telah dibaca.");
}

async function handleClearAll() {
	await notificationStore.clearAll();
	ElMessage.success("Semua riwayat notifikasi telah dibersihkan.");
}

function formatTypeLabel(type) {
	switch (type) {
		case "guru":
			return "Guru";
		case "karyawan":
			return "Karyawan";
		case "siswa":
			return "Siswa";
		case "non_gtk":
			return "Non GTK";
		default:
			return type || "Presensi";
	}
}

function getTypeBadgeColor(type) {
	switch (type) {
		case "guru":
			return "bg-indigo-600";
		case "karyawan":
			return "bg-sky-600";
		case "siswa":
			return "bg-emerald-600";
		case "non_gtk":
			return "bg-amber-600";
		default:
			return "bg-slate-600";
	}
}

function getTypeTagStyle(type) {
	switch (type) {
		case "guru":
			return "bg-indigo-100 text-indigo-800";
		case "karyawan":
			return "bg-sky-100 text-sky-800";
		case "siswa":
			return "bg-emerald-100 text-emerald-800";
		case "non_gtk":
			return "bg-amber-100 text-amber-800";
		default:
			return "bg-slate-100 text-slate-800";
	}
}

function formatStatusLabel(jenisPresensi, statusPresensi) {
	switch (statusPresensi) {
		case "tepat_waktu":
			const jenis = jenisPresensi === "masuk" ? "Hadir" : "Pulang";
			return `${jenis} Tepat Waktu`;
		case "terlambat":
			return "Terlambat Masuk";
		case "cepat":
			return "Pulang Lebih Awal";
		default:
			return "Hadir";
	}
}

function getStatusTagStyle(statusPresensi) {
	switch (statusPresensi) {
		case "tepat_waktu":
			return " bg-emerald-50 text-emerald-700";
		case "terlambat":
			return "bg-yellow-50 text-yellow-700";
		case "cepat":
			return "bg-orange-50 text-orange-700";
		default:
			return "bg-slate-50 text-slate-700";
	}
}

function getInitials(name) {
	if (!name) return "PR";
	const parts = name.trim().split(" ");
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(iso) {
	if (!iso) return "";
	try {
		const diff = (Date.now() - new Date(iso).getTime()) / 1000;
		if (diff < 60) return "Baru saja";
		if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
		if (diffSec < 172800) return "Kemarin";
		return `${Math.floor(diffSec / 86400)} hari lalu`;
	} catch {
		return iso;
	}
}

function formatFullDate(iso) {
	if (!iso) return "-";
	try {
		return new Date(iso).toLocaleString("id-ID", {
			dateStyle: "full",
			timeStyle: "long",
		});
	} catch {
		return iso;
	}
}
</script>
