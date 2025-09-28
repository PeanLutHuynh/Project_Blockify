import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  // Entry points for different pages
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: r('./src/pages/HomePage.html'),
        signin: r('./src/pages/SigninPage.html'),
        account: r('./src/pages/Account.html'),
        admin: r('./src/pages/Admin.html'),
        cart: r('./src/pages/CartPage.html'),
        intro: r('./src/pages/IntroductionPage.html'),
        order: r('./src/pages/OrderPage.html'),
        product: r('./src/pages/ProductDetail.html')
      }
    }
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: '/src/pages/HomePage.html',
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Path resolution
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/types': resolve(__dirname, 'src/types'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/modules': resolve(__dirname, 'src/modules'),
      '@/shared': resolve(__dirname, 'src/shared'),
      '@/assets': resolve(__dirname, 'src/assets')
    }
  },

  // CSS processing
  css: {
    postcss: {},
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/scss/variables.scss";`
      }
    }
  },

  // Enable environment variables starting with VITE_
  define: {
    __APP_ENV__: JSON.stringify(process.env.NODE_ENV)
  }
})
