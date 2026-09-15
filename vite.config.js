import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	const PORT = Number(env.VITE_PORT) || 8097;
	const HOST = env.VITE_HOST || '0.0.0.0';
	const API_PREFIX = env.VITE_BACKEND_TARGET_URL || '/presensi-api';
	const BACKEND_TARGET = env.VITE_BACKEND_TARGET || 'http://localhost:3011';

	return {
		plugins: [
			vue(),
			tailwindcss()
		],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src')
			}
		},
		server: {
			port: PORT,
			host: HOST,
			hmr: process.env.DISABLE_HMR !== 'true',
			watch: process.env.DISABLE_HMR === 'true' ? null : {},
			proxy: {
				[API_PREFIX]: {
					target: BACKEND_TARGET,
					changeOrigin: true
				}
			}
		}
	};
});
