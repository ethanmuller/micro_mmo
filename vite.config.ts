import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// this is the terminal QR code, not the one rendered in UI
import { qrcode } from 'vite-plugin-qrcode'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), qrcode()],
  assetsInclude: ["**/*.txt"],
  base: '',
  build: {
    rollupOptions: {
      input: {
        mouse: 'index.html',
        wheel: 'wheel.html',
      }
    }
  }
})
