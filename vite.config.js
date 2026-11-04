import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'force-full-reload',
      handleHotUpdate({ server }) {
        server.ws.send({ type: 'full-reload' });
      },
    },
  ],
  server: {
    watch: {
      usePolling: true,
    },
  },
})