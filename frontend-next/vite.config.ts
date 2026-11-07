import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/washjoy/',
  resolve: { tsconfigPaths: true },
  plugins: [reactRouter(), tailwindcss()],
  preview: {
    host: '127.0.0.1',
    port: 3780,
    proxy: {
      '/washjoy/api': {
        target: 'http://127.0.0.1:3775',
        rewrite: (path) => path.replace(/^\/washjoy\/api/, ''),
      },
    },
  },
})
