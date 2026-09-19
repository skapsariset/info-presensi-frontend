import axios from 'axios';

// Konfigurasi axios instance sesuai instruksi user dengan base url /presensi-api
const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL,
	withCredentials: true, // Mengirim & menerima cookie push_device_token
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	},
	timeout: 10000
});

// Interceptor untuk menyertakan token dari localStorage jika cookie di-block oleh konfigurasi browser/iframe
apiClient.interceptors.request.use((config) => {
	const storedToken = localStorage.getItem('skapsa_device_token');
	if (storedToken) {
		config.headers['x-device-token'] = storedToken;
		config.headers['Authorization'] = `Bearer ${storedToken}`;
	}
	return config;
});

// Interceptor untuk menyimpan token perangkat jika dikembalikan di respons
apiClient.interceptors.response.use(
	(response) => {
		if (response.data?.data?.push_device_token) {
			localStorage.setItem('skapsa_device_token', response.data.data.push_device_token);
		}
		return response;
	},
	(error) => {
		// Jika 401 dan clear cookie, bersihkan juga token lokal
		if (error.response?.status === 401) {
			localStorage.removeItem('skapsa_device_token');
		}
		return Promise.reject(error);
	}
);

/**
 * Klasifikasi status respons API menjadi 3 kategori jelas:
 * 1. 'NETWORK_ERROR': Gagal terhubung ke server (offline, timeout, DNS error, routing ISP putus, status 502/503/504)
 * 2. 'BUSINESS_REJECTED': Terhubung ke server, namun server menolak secara sah (HTTP 4xx: 400, 404, 422 - token invalid/expired/used)
 * 3. 'AUTH_REJECTED': Server menolak karena subscription tidak ditemukan atau sudah dibatalkan (HTTP 401)
 * 4. 'SERVER_ERROR': Server merespons HTTP 500 (Internal Server Error)
 */
export function classifyApiError(error) {
	// Kondisi A: Tidak ada respons dari server sama sekali (Network Error / Timeout / Routing Down / Offline)
	if (!error.response) {
		const isTimeout = error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'));
		return {
			category: 'NETWORK_ERROR',
			isNetworkError: true,
			isTimeout,
			status: null,
			message: isTimeout
				? 'Batas waktu koneksi ke server habis (Connection Timeout). Server tidak merespons.'
				: 'Gagal terhubung ke server presensi. Periksa jaringan internet atau rute ISP perangkat Anda.',
			detail: error.message || 'Koneksi jaringan terputus atau tidak dapat dijangkau.'
		};
	}

	const status = error.response.status;

	// Kondisi B: Error infrastruktur perantara / gateway (502, 503, 504 dari Cloudflare/Nginx/ISP Proxy)
	if (status === 502 || status === 503 || status === 504) {
		return {
			category: 'NETWORK_ERROR',
			isNetworkError: true,
			isTimeout: status === 504,
			status,
			message: 'Server presensi sedang tidak dapat dijangkau (Gateway / Network Unreachable).',
			detail: `Terdeteksi kendala pada server/gateway (HTTP ${status}). Data Anda tetap aman.`
		};
	}

	// Kondisi C: Status 401 Unauthorized dari backend
	if (status === 401) {
		return {
			category: 'AUTH_REJECTED',
			isNetworkError: false,
			isTimeout: false,
			status,
			message: error.response.data?.message || 'Sesi subscription perangkat belum terdaftar atau telah dinonaktifkan.',
			detail: error.response.data
		};
	}

	// Kondisi D: Status 4xx lainnya (400, 404, 422 - Token Invalid, Expired, Used, dll)
	if (status >= 400 && status < 500) {
		return {
			category: 'BUSINESS_REJECTED',
			isNetworkError: false,
			isTimeout: false,
			status,
			message: error.response.data?.message || 'Permintaan ditolak oleh server presensi.',
			detail: error.response.data
		};
	}

	// Kondisi E: Server Error (500)
	return {
		category: 'SERVER_ERROR',
		isNetworkError: false,
		isTimeout: false,
		status,
		message: error.response.data?.message || 'Terjadi kesalahan internal pada server presensi.',
		detail: error.response.data
	};
}

export const presensiApi = {
	/**
	 * 1. Validasi token aktivasi
	 * GET /push/activation-token/:token
	 */
	validateActivationToken(token) {
		return apiClient.get(`/push/activation-token/${encodeURIComponent(token)}`);
	},

	/**
	 * 2. Aktifkan push subscription
	 * POST /push/subscription
	 * Body: { activation_token, subscription, device_label }
	 */
	activateSubscription(payload) {
		return apiClient.post('/push/subscription', payload);
	},

	/**
	 * 3. Mendapatkan data target subscription
	 * GET /push/subscription/me
	 */
	getMySubscriptionTargets() {
		return apiClient.get('/push/subscription/me');
	},

	/**
	 * 4. Nonaktifkan push subscription beserta target subscription
	 * DELETE /push/subscription/me
	 */
	deactivateSubscription() {
		return apiClient.delete('/push/subscription/me').finally(() => {
			localStorage.removeItem('skapsa_device_token');
		});
	},

	/**
	 * 5. Hanya menonaktifkan target subscription (user presensi) tertentu
	 * DELETE /push/subscription/me/target/:user_presensi_id
	 */
	removeSubscriptionTarget(userPresensiId) {
		return apiClient.delete(`/push/subscription/me/target/${encodeURIComponent(userPresensiId)}`);
	}
};

export default presensiApi;
