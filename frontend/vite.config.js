import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/employees': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/departments': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/working-schedules': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/contracts': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/attendance': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/time-off': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/payroll': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/payruns': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  }
})
