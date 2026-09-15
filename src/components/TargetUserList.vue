<template>
	<div id="card-target-users" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
		<div class="flex items-center justify-between pb-3 border-b border-slate-100">
			<div class="flex items-center gap-2.5">
				<div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
					<el-icon :size="18"><User /></el-icon>
				</div>
				<div>
					<h4 class="font-bold text-slate-800 text-sm">Target Pengguna Presensi</h4>
					<p class="text-xs text-slate-500">Daftar profil yang notifikasi presensinya diterima oleh perangkat ini</p>
				</div>
			</div>
			<el-tag size="small" type="info" round class="font-semibold"> {{ subscriptionStore.targetCount }} Target </el-tag>
		</div>

		<!-- Info Banner mengenai Hubungan Presensi & Wali Murid -->
		<div class="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
			<el-icon class="mt-0.5 text-blue-600 shrink-0"><InfoFilled /></el-icon>
			<p class="leading-relaxed">
				<strong>Ketentuan:</strong> 1 pengguna presensi dapat diikuti oleh banyak penerima notifikasi, dan perangkat ini dapat mengikuti banyak pengguna presensi sekaligus. Khusus
				profil <strong>Siswa</strong>, target penerima adalah <strong>Wali Murid</strong>.
			</p>
		</div>

		<!-- Empty State jika belum ada target -->
		<div v-if="subscriptionStore.targetCount === 0" id="empty-state-targets" class="py-10 text-center text-slate-400">
			<el-icon :size="40" class="text-slate-300 mb-2"><UserFilled /></el-icon>
			<p class="text-sm font-semibold text-slate-600">Belum Ada Target Presensi yang Terhubung</p>
			<p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Masukkan token aktivasi dari admin presensi pada formulir di bawah untuk mulai menerima notifikasi instan.</p>
		</div>

		<!-- Target List -->
		<div v-else class="mt-4 divide-y divide-slate-100">
			<div
				v-for="target in subscriptionStore.targets"
				:key="target.user_presensi_id"
				:id="`target-item-${target.user_presensi_id}`"
				class="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2.5 transition">
				<div class="flex items-center gap-3 min-w-0">
					<!-- Avatar Icon based on type -->
					<div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm', getTypeBadgeColor(target.type)]">
						{{ getInitials(target.nama) }}
					</div>

					<!-- User Details -->
					<div class="min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<h5 class="font-bold text-slate-800 text-sm truncate">
								{{ target.nama }}
							</h5>
							<span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', getTypeTagStyle(target.type)]">
								{{ formatTypeLabel(target.type) }}
							</span>
						</div>
						<div class="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
							<span
								>ID Presensi: <strong class="text-slate-600">{{ target.user_presensi_id }}</strong></span
							>
							<span v-if="target.type === 'siswa'"
								>Kelas/NIS: <strong class="text-slate-600">{{ target.nama_rombel || "-" }} • {{ target.nis || "-" }}</strong></span
							>
							<span v-if="target.type === 'siswa'" class="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px] font-medium"> Penerima: Wali Murid </span>
						</div>
					</div>
				</div>

				<!-- Remove target button -->
				<el-popconfirm
					:title="`Hapus notifikasi untuk ${target.nama}?`"
					confirm-button-text="Hapus"
					cancel-button-text="Batal"
					confirm-button-type="danger"
					@confirm="handleRemoveTarget(target.user_presensi_id, target.nama)">
					<template #reference>
						<el-button :id="`btn-remove-target-${target.user_presensi_id}`" type="danger" link size="small" class="hover:bg-rose-50 p-2 rounded-lg">
							<el-icon :size="16"><Close /></el-icon>
						</el-button>
					</template>
				</el-popconfirm>
			</div>
		</div>
	</div>
</template>

<script setup>
import { useSubscriptionStore } from "../stores/subscriptionStore.js";
import { ElMessage } from "element-plus";
import { User, UserFilled, InfoFilled, Close } from "@element-plus/icons-vue";

const subscriptionStore = useSubscriptionStore();

function formatTypeLabel(type) {
	switch (type) {
		case "guru":
			return "Guru";
		case "karyawan":
			return "Karyawan";
		case "siswa":
			return "Siswa";
		case "non_gtk":
			return "Tenaga Non GTK";
		default:
			return type;
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

function getInitials(name) {
	if (!name) return "U";
	const parts = name.trim().split(" ");
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

async function handleRemoveTarget(id, nama) {
	try {
		await subscriptionStore.removeTarget(id);
		ElMessage.success(`Target presensi "${nama}" berhasil dihapus.`);
	} catch (err) {
		ElMessage.error(err.message || "Gagal menghapus target.");
	}
}
</script>
