import axios from 'axios';

// Konfigurasi axios instance sesuai instruksi user dengan base url /presensi-api
const apiClient = axios.create({
  baseURL: '/presensi-api',
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
