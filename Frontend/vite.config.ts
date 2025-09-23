import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Entry points for different pages
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'src/pages/HomePage.html'),
        signin: resolve(__dirname, 'src/pages/SigninPage.html'),
        account: resolve(__dirname, 'src/pages/Account.html'),
        admin: resolve(__dirname, 'src/pages/Admin.html'),
        cart: resolve(__dirname, 'src/pages/CartPage.html'),
        intro: resolve(__dirname, 'src/pages/IntroductionPage.html'),
        order: resolve(__dirname, 'src/pages/OrderPage.html'),
        product: resolve(__dirname, 'src/pages/ProductDetail.html')
      }
    }
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
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
      '@': resolve(__dirname, 'src'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/modules': resolve(__dirname, 'src/modules'),
      '@/shared': resolve(__dirname, 'src/shared'),
      '@/assets': resolve(__dirname, 'src/assets')
    }
  },

  // CSS processing
  css: {
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