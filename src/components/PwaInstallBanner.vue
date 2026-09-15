<template>
  <div v-if="!isInstalled" class="mb-6">
    <!-- Banner jika didukung & belum diinstal (Android/Chromium/Desktop) -->
    <div 
      v-if="canInstall"
      id="banner-pwa-install"
      class="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-blue-600/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div class="flex items-start gap-3.5">
        <div class="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
          <el-icon :size="26" class="text-white"><Iphone /></el-icon>
        </div>
        <div>
          <h3 class="font-bold text-base text-white flex items-center gap-2">
            Pasang Aplikasi Info Presensi SKAPSA
            <span class="bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Disarankan
            </span>
          </h3>
          <p class="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
            Pasang aplikasi (PWA) di perangkat Anda untuk menerima notifikasi presensi secara real-time meskipun browser sedang ditutup.
          </p>
        </div>
      </div>

      <button
        id="btn-install-pwa-banner"
        @click="$emit('install-app')"
        class="w-full sm:w-auto px-5 py-2.5 bg-white text-blue-900 font-bold text-sm rounded-xl hover:bg-blue-50 transition shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
      >
        <el-icon><Download /></el-icon>
        Pasang Sekarang
      </button>
    </div>

    <!-- Banner Panduan Khusus iOS Safari -->
    <div 
      v-else-if="isIOS"
      id="banner-ios-install"
      class="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div class="flex items-start gap-3.5">
        <div class="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
          <el-icon :size="26" class="text-slate-200"><Apple /></el-icon>
        </div>
        <div>
          <h3 class="font-bold text-base text-white">
            Pengguna iOS (iPhone / iPad)
          </h3>
          <p class="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Untuk mengaktifkan Web Push di iOS Safari, aplikasi perlu ditambahkan ke Layar Utama (Home Screen).
          </p>
        </div>
      </div>

      <button
        id="btn-open-ios-guide"
        @click="showIOSGuide = true"
        class="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
      >
        <el-icon><InfoFilled /></el-icon>
        Panduan Pasang di iOS
      </button>
    </div>

    <!-- Dialog Panduan iOS -->
    <el-dialog
      v-model="showIOSGuide"
      title="Panduan Pemasangan di iPhone / iPad"
      width="90%"
      class="max-w-md rounded-2xl"
      center
    >
      <div class="space-y-4 text-slate-700 text-sm">
        <div class="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
          <div>
            <p class="font-semibold text-slate-900">Buka di Browser Safari</p>
            <p class="text-xs text-slate-600 mt-0.5">Pastikan Anda membuka tautan ini langsung menggunakan peramban Apple Safari.</p>
          </div>
        </div>

        <div class="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
          <div>
            <p class="font-semibold text-slate-900">Tekan Tombol 'Bagikan' (Share)</p>
            <p class="text-xs text-slate-600 mt-0.5">Ketuk ikon kotak dengan panah ke atas di bagian bawah layar Safari.</p>
          </div>
        </div>

        <div class="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
          <div>
            <p class="font-semibold text-slate-900">Pilih 'Tambah ke Layar Utama'</p>
            <p class="text-xs text-slate-600 mt-0.5">Gulir ke bawah dan ketuk menu <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).</p>
          </div>
        </div>

        <div class="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
          <div>
            <p class="font-semibold text-slate-900">Buka Ikon Aplikasi di Layar Utama</p>
            <p class="text-xs text-slate-600 mt-0.5">Jalankan aplikasi dari layar utama iOS Anda untuk mengaktifkan notifikasi sistem.</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <el-button id="btn-close-ios-guide" type="primary" @click="showIOSGuide = false">
            Saya Mengerti
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Download, Iphone, Apple, InfoFilled } from '@element-plus/icons-vue';

defineProps({
  canInstall: {
    type: Boolean,
    default: false
  },
  isInstalled: {
    type: Boolean,
    default: false
  },
  isIOS: {
    type: Boolean,
    default: false
  }
});

defineEmits(['install-app']);

const showIOSGuide = ref(false);
</script>
