import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { qrcode } from 'vite-plugin-qrcode'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), qrcode()],
  assetsInclude: ["**/*.txt"],
})
