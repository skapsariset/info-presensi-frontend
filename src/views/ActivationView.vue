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

		<!-- Error State: Gagal Terhubung ke Server (Network Error / Timeout / ISP Routing Problem / 502-504) -->
		<div v-else-if="networkError" id="activation-network-error-state" class="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-amber-300 space-y-6">
			<div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
				<el-icon :size="34"><Connection /></el-icon>
			</div>

			<div class="text-center space-y-2">
				<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
					<el-icon><WarningFilled /></el-icon>
					Kendala Jaringan / Server
				</div>
				<h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">Gagal Terhubung ke Server Presensi</h3>
				<p class="text-sm text-amber-900 font-medium max-w-lg mx-auto">
					{{ networkError.message }}
				</p>
				<p class="text-xs text-slate-500 max-w-md mx-auto">
					Token Aktivasi: <code class="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700 wrap-anywhere">{{ currentToken }}</code>
				</p>
			</div>

			<!-- Penjelasan Penenang: Token Belum Terpakai -->
			<div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
				<p class="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
					<el-icon class="text-emerald-600"><Check /></el-icon>
					Token Aktivasi Anda Aman &amp; Belum Terpakai
				</p>
				<p class="leading-relaxed text-emerald-800">
					Karena permintaan gagal mencapai server (misalnya kendala rute internasional ISP, timeout, atau jaringan terputus), token aktivasi ini <strong>TIDAK HANGUS</strong> dan
					<strong>BELUM DIANGGAP TERPAKAI</strong>. Anda tidak perlu meminta token baru dari admin.
				</p>
			</div>

			<!-- Langkah Pemulihan -->
			<div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
				<p class="font-bold text-slate-800 flex items-center gap-1.5">
					<el-icon class="text-blue-600"><InfoFilled /></el-icon>
					Langkah Pemulihan yang Disarankan:
				</p>
				<ul class="list-disc list-inside space-y-1.5 pl-1">
					<li>Pastikan perangkat Anda terhubung ke koneksi internet yang stabil (atau coba beralih antara Wi-Fi dan data seluler).</li>
					<li>Jika terdapat gangguan rute jaringan pada ISP Anda, tunggu sejenak lalu tekan tombol coba sambungkan ulang.</li>
					<li>Tekan tombol <strong>"Coba Sambungkan Ulang"</strong> di bawah untuk memvalidasi kembali token secara instan.</li>
				</ul>
				<div v-if="networkError.detail" class="text-[11px] text-slate-400 font-mono pt-1">Diagnostik: {{ networkError.detail }}</div>
			</div>

			<div class="flex flex-col sm:flex-row justify-center gap-3 pt-2">
				<el-button id="btn-retry-validate-token" type="primary" size="large" :loading="validating" @click="validateToken" class="rounded-xl! px-6">
					<el-icon class="mr-1.5"><Refresh /></el-icon>
					Coba Sambungkan Ulang
				</el-button>

				<router-link to="/">
					<el-button id="btn-error-return-dashboard" size="large" class="rounded-xl! px-6 w-full sm:w-auto"> Kembali ke Dasbor </el-button>
				</router-link>
			</div>
		</div>

		<!-- Error State jika token ditolak secara sah oleh server (HTTP 4xx: Invalid / Expired / Already Used) -->
		<div v-else-if="businessError" id="activation-error-state" class="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-rose-200 space-y-6">
			<div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
				<el-icon :size="34"><CircleCloseFilled /></el-icon>
			</div>

			<div class="text-center space-y-2">
				<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">Token Ditolak Server</div>
				<h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">Aktivasi Tidak Dapat Dilanjutkan</h3>
				<p class="text-sm text-rose-600 font-semibold max-w-md mx-auto">
					{{ businessError.message }}
				</p>
				<p class="text-xs text-slate-500 max-w-md mx-auto">
					Token: <code class="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700 wrap-anywhere">{{ currentToken }}</code>
				</p>
			</div>

			<div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
				<p class="font-bold text-slate-800 flex items-center gap-1.5">
					<el-icon class="text-blue-600"><InfoFilled /></el-icon>
					Saran Penyelesaian:
				</p>
				<ul class="list-disc list-inside space-y-1 pl-1">
					<li>Periksa kembali ketikan huruf dan angka token aktivasi Anda jika dimasukkan manual.</li>
					<li>Pastikan token belum pernah digunakan pada perangkat lain sebelumnya.</li>
					<li>Jika masa berlaku token habis, hubungi admin/operator presensi SKAPSA untuk meminta tautan atau token aktivasi baru.</li>
				</ul>
			</div>

			<div class="flex justify-center gap-3">
				<router-link to="/">
					<el-button id="btn-error-return-dashboard" type="primary" size="large" class="rounded-xl! px-6"> Kembali ke Dasbor Utama </el-button>
				</router-link>
			</div>
		</div>

		<!-- Valid Token Confirmation Card -->
		<div v-else-if="tokenData" id="activation-confirm-card" class="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
			<div v-if="tokenData.is_idempotent_retry" class="space-y-6">
				<div class="border-b border-slate-100 pb-5">
					<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
						<el-icon><Check /></el-icon>
						Token Valid Terverifikasi
					</div>
					<h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">Pengguna Presensi Terkonfirmasi</h3>
				</div>

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

					<div class="pt-2 border-t border-blue-100/80 flex items-center text-xs text-slate-500">Pengguna presensi di atas telah ditambahkan ke perangkat ini.</div>
				</div>

				<div v-if="!subscriptionStore.capabilities.isStandalone" class="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
					<el-icon class="mt-0.5 text-blue-600 shrink-0"><InfoFilled /></el-icon>
					<div class="leading-relaxed">
						<strong class="block text-blue-950 font-bold mb-0.5">Rekomendasi Terbaik (Disarankan Pasang PWA Dahulu):</strong>
						Untuk penerimaan notifikasi 24/7 di latar belakang yang stabil (bahkan saat aplikasi/peramban tertutup), disarankan memasang aplikasi (PWA) ini ke Layar Utama perangkat
						terlebih dahulu sebelum mengaktifkan notifikasi.
					</div>
				</div>
			</div>
			<div v-else class="space-y-6">
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
	</div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import presensiApi, { classifyApiError } from "../api/presensiApi.js";
import { useSubscriptionStore } from "../stores/subscriptionStore.js";
import { ElMessage, ElNotification } from "element-plus";
import { Back, CircleCloseFilled, Check, InfoFilled, Iphone, BellFilled, Connection, WarningFilled, Refresh } from "@element-plus/icons-vue";

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
const networkError = ref(null); // { isTimeout, message, detail }
const businessError = ref(null); // { message, status }
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
		businessError.value = {
			message: "Token aktivasi tidak boleh kosong.",
			status: 400,
		};
		networkError.value = null;
		validating.value = false;
		return;
	}

	validating.value = true;
	networkError.value = null;
	businessError.value = null;
	tokenData.value = null;

	try {
		const res = await presensiApi.validateActivationToken(currentToken.value);

		// KASUS 1: REQUEST SUKSES & RESPON VALID DARI SERVER
		if (res.data && res.data.success) {
			tokenData.value = res.data.data;
		} else {
			businessError.value = {
				message: res.data?.message || "Token aktivasi tidak valid atau telah digunakan.",
				status: res.status || 400,
			};
		}
	} catch (err) {
		const classified = classifyApiError(err);

		// KASUS 2: GAGAL TERHUBUNG KE SERVER (Network Error, Timeout, 502/503/504, Routing ISP Bermasalah)
		if (classified.isNetworkError) {
			networkError.value = {
				isTimeout: classified.isTimeout,
				message: classified.message,
				detail: classified.detail,
			};
		} else {
			// KASUS 3: SERVER MENOLAK (HTTP 4xx: Token invalid, expired, used)
			businessError.value = {
				message: classified.message || "Token aktivasi tidak ditemukan atau sudah kedaluwarsa.",
				status: classified.status,
			};
		}
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
	const parts = name.replace(/\,.*/, "").trim().split(" ");
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
