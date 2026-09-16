<template>
	<div class="max-w-2xl mx-auto space-y-6">
		<!-- Back to Dashboard Button via router-link -->
		<router-link
			to="/"
			id="btn-back-to-dashboard"
			class="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition cursor-pointer no-underline">
			<el-icon><Back /></el-icon>
			Kembali ke Dasbor
		</router-link>

		<!-- Loading State while validating token -->
		<div v-if="validating" id="activation-loading" class="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center space-y-4">
			<el-skeleton :rows="5" animated />
			<p class="text-sm font-medium text-slate-500">Memvalidasi token aktivasi presensi...</p>
		</div>

		<!-- Error State jika token tidak valid / kedaluwarsa -->
		<div v-else-if="validationError" id="activation-error-state" class="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-rose-200 space-y-6">
			<div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
				<el-icon :size="34"><CircleCloseFilled /></el-icon>
			</div>

			<div class="text-center space-y-2">
				<h3 class="text-xl font-bold text-slate-900">Aktivasi Gagal</h3>
				<p class="text-sm text-rose-600 font-semibold max-w-md mx-auto">
					{{ validationError }}
				</p>
				<p class="text-xs text-slate-500 max-w-md mx-auto">
					Token: <code class="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">{{ currentToken }}</code>
				</p>
			</div>

			<div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
				<p class="font-bold text-slate-800 flex items-center gap-1.5">
					<el-icon class="text-blue-600"><InfoFilled /></el-icon>
					Saran Penyelesaian:
				</p>
				<ul class="list-disc list-inside space-y-1 pl-1">
					<li>Periksa kembali ketikan huruf dan angka token aktivasi Anda.</li>
					<li>Pastikan token belum pernah digunakan pada perangkat lain.</li>
					<li>Hubungi admin/operator presensi SKAPSA untuk meminta tautan atau token aktivasi baru jika masa berlakunya telah habis.</li>
				</ul>
			</div>

			<div class="flex justify-center gap-3">
				<router-link to="/">
					<el-button id="btn-error-return-dashboard" type="primary" size="large" class="rounded-xl! px-6"> Kembali ke Dasbor Utama </el-button>
				</router-link>
			</div>
		</div>

		<!-- Valid Token Confirmation Card -->
		<div v-else-if="tokenData" id="activation-confirm-card" class="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
			<!-- Header -->
			<div class="border-b border-slate-100 pb-5">
				<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
					<el-icon><Check /></el-icon>
					Token Valid Terverifikasi
				</div>
				<h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">Konfirmasi Aktivasi Notifikasi</h3>
				<p class="text-xs sm:text-sm text-slate-500 mt-1">Silakan tinjau profil pengguna presensi di bawah ini sebelum menyetujui aktivasi push notification.</p>
			</div>

			<!-- Target Profile Card -->
			<div class="p-5 rounded-2xl bg-linear-to-br from-slate-50 to-blue-50/40 border border-blue-100 space-y-4">
				<div class="flex items-start gap-4">
					<div
						:class="[
							'w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-sm shrink-0',
							getTypeBadgeColor(tokenData.detail_target?.type),
						]">
						{{ getInitials(tokenData.detail_target?.nama) }}
					</div>

					<div class="space-y-1">
						<span :class="['text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block', getTypeTagStyle(tokenData.detail_target?.type)]">
							{{ formatTypeLabel(tokenData.detail_target?.type) }}
						</span>
						<h4 class="text-lg font-bold text-slate-900">
							{{ tokenData.detail_target?.nama }}
						</h4>
						<p class="text-xs text-slate-500">
							ID Presensi: <strong class="text-slate-700 font-mono">{{ tokenData.detail_target?.user_presensi_id }}</strong>
						</p>
						<p class="text-xs text-slate-500" v-if="tokenData.detail_target?.type === 'siswa'">
							Kelas/NIS: <strong class="text-slate-700 font-mono">{{ tokenData.detail_target?.nama_rombel || "-" }} • {{ tokenData.detail_target?.nis || "-" }}</strong>
						</p>
					</div>
				</div>

				<div v-if="tokenData.detail_target?.type === 'siswa'" class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
					<el-icon class="mt-0.5 text-emerald-600 shrink-0"><InfoFilled /></el-icon>
					<div>
						<strong class="block font-bold">Target Penerima: Wali Murid</strong>
						Perangkat ini akan menerima pemberitahuan setiap kali siswa di atas berhasil melakukan presensi datang maupun pulang.
					</div>
				</div>

				<!-- Expiration info -->
				<div class="pt-2 border-t border-blue-100/80 flex items-center justify-between text-xs text-slate-500">
					<span>Masa Berlaku Token:</span>
					<span class="font-semibold text-slate-700">{{ formatDateTime(tokenData.expires_at) }}</span>
				</div>
			</div>

			<!-- Device Preference Label -->
			<div class="space-y-2">
				<label for="input-device-label" class="block text-xs font-bold text-slate-700 uppercase tracking-wider"> Label / Nama Perangkat Ini </label>
				<el-input id="input-device-label" v-model="deviceLabel" placeholder="Contoh: HP Ayah (Samsung Galaxy) atau Laptop Kerja" size="large" class="rounded-xl!">
					<template #prefix>
						<el-icon class="text-slate-400"><Iphone /></el-icon>
					</template>
				</el-input>
				<p class="text-[11px] text-slate-400">Nama ini membantu mengidentifikasi perangkat yang menerima notifikasi.</p>
			</div>

			<!-- Recommended Best Practice Tip jika belum terpasang sebagai PWA -->
			<div v-if="!subscriptionStore.capabilities.isStandalone" class="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
				<el-icon class="mt-0.5 text-blue-600 shrink-0"><InfoFilled /></el-icon>
				<div class="leading-relaxed">
					<strong class="block text-blue-950 font-bold mb-0.5">Rekomendasi Terbaik (Disarankan Pasang PWA Dahulu):</strong>
					Untuk penerimaan notifikasi 24/7 di latar belakang yang stabil (bahkan saat aplikasi/peramban tertutup), disarankan memasang aplikasi (PWA) ini ke Layar Utama perangkat
					terlebih dahulu sebelum mengaktifkan notifikasi.
				</div>
			</div>

			<!-- Permission Notice Note -->
			<div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
				<el-icon class="mt-0.5 text-amber-600 shrink-0"><BellFilled /></el-icon>
				<div class="leading-relaxed">
					<strong>Perhatian Izin Notifikasi:</strong> Setelah Anda menekan tombol <em>"Konfirmasi & Aktifkan Notifikasi"</em> di bawah, peramban (browser) Anda akan menampilkan
					jendela dialog izin notifikasi sistem. <strong>Pastikan untuk memilih "Izinkan" (Allow).</strong>
				</div>
			</div>

			<!-- Submit Activation Button -->
			<div class="pt-2 flex flex-col sm:flex-row gap-3 justify-end">
				<router-link to="/">
					<el-button id="btn-cancel-activation" size="large" class="rounded-xl! w-full sm:w-auto"> Batal </el-button>
				</router-link>

				<el-button
					id="btn-confirm-activation"
					type="primary"
					size="large"
					:loading="submitting"
					@click="handleConfirmActivation"
					class="rounded-xl! font-bold! px-8 bg-blue-600! hover:bg-blue-700!">
					<el-icon class="mr-1.5"><Check /></el-icon>
					Konfirmasi & Aktifkan Notifikasi
				</el-button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import presensiApi from "../api/presensiApi.js";
import { useSubscriptionStore } from "../stores/subscriptionStore.js";
import { ElMessage, ElNotification } from "element-plus";
import { Back, CircleCloseFilled, Check, InfoFilled, Iphone, BellFilled } from "@element-plus/icons-vue";

const props = defineProps({
	token: {
		type: String,
		default: "",
	},
});

const router = useRouter();
const route = useRoute();
const subscriptionStore = useSubscriptionStore();

// Read token from props or from route.params
const currentToken = ref(props.token || route.params.token || "");
const validating = ref(true);
const validationError = ref(null);
const tokenData = ref(null);
const submitting = ref(false);
const deviceLabel = ref("");

onMounted(() => {
	deviceLabel.value = `${subscriptionStore.capabilities.browserName} (${subscriptionStore.capabilities.isIOS ? "iOS Device" : "Perangkat Aktif"})`;
	if (!currentToken.value && route.params.token) {
		currentToken.value = route.params.token;
	}
	validateToken();
});

watch(
	() => props.token,
	(newVal) => {
		if (newVal) {
			currentToken.value = newVal;
			validateToken();
		}
	},
);

watch(
	() => route.params.token,
	(newVal) => {
		if (newVal) {
			currentToken.value = newVal;
			validateToken();
		}
	},
);

async function validateToken() {
	if (!currentToken.value) {
		validationError.value = "Token aktivasi tidak boleh kosong.";
		validating.value = false;
		return;
	}

	validating.value = true;
	validationError.value = null;
	tokenData.value = null;

	try {
		const res = await presensiApi.validateActivationToken(currentToken.value);
		if (res.data && res.data.success) {
			tokenData.value = res.data.data;
		} else {
			validationError.value = res.data?.message || "Token aktivasi tidak valid.";
		}
	} catch (err) {
		validationError.value = err.response?.data?.message || "Token aktivasi tidak ditemukan atau sudah kedaluwarsa.";
	} finally {
		validating.value = false;
	}
}

async function handleConfirmActivation() {
	submitting.value = true;
	try {
		const result = await subscriptionStore.activateWithToken(currentToken.value, deviceLabel.value.trim() || undefined);

		ElNotification({
			title: "Aktivasi Berhasil!",
			message: `Push notification aktif untuk ${result.detail_target?.nama || "pengguna presensi"}.`,
			type: "success",
			duration: 4000,
		});

		// Arahkan kembali ke dasbor via router.push
		router.push({ name: "dashboard" });
	} catch (err) {
		ElMessage.error(err.message || "Gagal mengaktifkan push subscription.");
	} finally {
		submitting.value = false;
	}
}

function formatTypeLabel(type) {
	switch (type) {
		case "guru":
			return "Guru";
		case "karyawan":
			return "Tenaga Kependidikan";
		case "siswa":
			return "Siswa";
		case "non_gtk":
			return "Tenaga Non GTK";
		default:
			return type || "Pengguna";
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
	if (!name) return "PR";
	const parts = name.trim().split(" ");
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return name.slice(0, 2).toUpperCase();
}

function formatDateTime(iso) {
	if (!iso) return "-";
	try {
		const d = new Date(iso);
		return d.toLocaleDateString("id-ID", {
			weekday: "long",
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return iso;
	}
}
</script>
