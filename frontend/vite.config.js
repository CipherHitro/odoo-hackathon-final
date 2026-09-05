import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const proxyTarget = 'http://localhost:8000'
const createProxyConfig = () => ({
  target: proxyTarget,
  changeOrigin: true,
  bypass: (req) => {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return '/index.html'
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': createProxyConfig(),
      '/employees': createProxyConfig(),
      '/departments': createProxyConfig(),
      '/working-schedules': createProxyConfig(),
      '/contracts': createProxyConfig(),
      '/attendance': createProxyConfig(),
      '/time-off': createProxyConfig(),
      '/payroll': createProxyConfig(),
      '/payruns': createProxyConfig(),
    }
  }
})
