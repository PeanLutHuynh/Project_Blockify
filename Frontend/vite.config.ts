import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Load environment variables from project root
  const env = loadEnv(mode, resolve(__dirname, '../'), '')
  
  return {
    root: '.',
    publicDir: 'public',
    base: '/',
    
    // Build configuration
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          home: resolve(__dirname, 'src/pages/HomePage.html'),
          signin: resolve(__dirname, 'src/pages/SigninPage.html'),
          signup: resolve(__dirname, 'src/pages/SignupPage.html'),
          account: resolve(__dirname, 'src/pages/Account.html'),
          admin: resolve(__dirname, 'src/pages/Admin.html'),
          cart: resolve(__dirname, 'src/pages/CartPage.html'),
          contact: resolve(__dirname, 'src/pages/Contact.html'),
          intro: resolve(__dirname, 'src/pages/IntroductionPage.html'),
          product: resolve(__dirname, 'src/pages/ProductDetail.html'),
          callback: resolve(__dirname, 'src/pages/AuthCallback.html')
        }
      }
    },
  
    // Development server configuration
    server: {
      port: 3000,
      host: 'localhost',
      open: '/src/pages/HomePage.html',
      cors: true,
      proxy: {
        // Proxy API requests to backend
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        }
      }
    },

    // Preview server configuration for production build
    preview: {
      port: 4173,
      host: 'localhost',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },

    // Path resolution theo cấu trúc MVC + OOP
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@/core': resolve(__dirname, 'src/core'),
        '@/models': resolve(__dirname, 'src/core/models'),
        '@/services': resolve(__dirname, 'src/core/services'),
        '@/utils': resolve(__dirname, 'src/core/utils'),
        '@/modules': resolve(__dirname, 'src/modules'),
        '@/shared': resolve(__dirname, 'src/shared'),
        '@/components': resolve(__dirname, 'src/shared/components'),
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

    // Optimizations
    optimizeDeps: {
      include: ['axios']
    },

    // Enable environment variables starting with VITE_
    define: {
      __APP_ENV__: JSON.stringify(env.NODE_ENV || 'development')
    },

    // Tell Vite to load environment variables from project root
    envDir: '../'
  }
})
