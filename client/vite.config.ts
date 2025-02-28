import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		vue(),
		tailwindcss(),
		Components({
			dirs: ['src/components'],
			extensions: ['vue'],
			dts: 'src/types/components.d.ts',
		}),
		AutoImport({
			imports: ['vue'],
			dts: 'src/types/auto-import.d.ts',
		}),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000', // 后端 HTTP 地址
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ''), // 去掉 /api 前缀
				ws: false,
			},
			'/ws': {
				target: 'ws://localhost:3000', // 后端 WebSocket 地址
				ws: true,
			},
		},
	}
})
