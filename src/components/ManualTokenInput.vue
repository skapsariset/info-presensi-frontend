<template>
	<div id="card-manual-token" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
		<div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
			<div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
				<el-icon :size="18"><Key /></el-icon>
			</div>
			<div>
				<h4 class="font-bold text-slate-800 text-sm">Input Token Aktivasi Presensi</h4>
				<p class="text-xs text-slate-500">Masukkan token yang Anda peroleh dari admin presensi SKAPSA</p>
			</div>
		</div>

		<form @submit.prevent="handleSubmit" class="mt-4 space-y-3">
			<div class="flex flex-col sm:flex-row gap-2">
				<el-input
					id="input-activation-token"
					v-model="tokenInput"
					placeholder="Contoh: TOKEN-SISWA-01 atau TOKEN-GURU-01"
					size="large"
					clearable
					class="!rounded-xl flex-1 font-mono uppercase">
					<template #prefix>
						<el-icon class="text-slate-400"><Ticket /></el-icon>
					</template>
				</el-input>

				<el-button id="btn-submit-token" type="primary" size="large" :disabled="!tokenInput.trim()" @click="handleSubmit" class="!rounded-xl !font-bold px-6">
					<el-icon class="mr-1.5"><Right /></el-icon>
					Buka Aktivasi
				</el-button>
			</div>
		</form>
	</div>
</template>

<script setup>
import { ref } from "vue";
import { Key, Ticket, Right } from "@element-plus/icons-vue";

const emit = defineEmits(["navigate-activation"]);

const tokenInput = ref("");

function handleSubmit() {
	if (!tokenInput.value.trim()) return;
	emit("navigate-activation", tokenInput.value.trim());
}
</script>
