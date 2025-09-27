import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { resolve as pathResolve } from 'node:path';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'public',
  css: {
    postcss: {},
  },
  server: { open: '/src/pages/HomePage.html' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: r('./src/pages/HomePage.html'),
        account: r('./src/pages/Account.html'),
        admin: r('./src/pages/Admin.html'),
        cart: r('./src/pages/CartPage.html'),
        intro: r('./src/pages/IntroductionPage.html'),
        order: r('./src/pages/OrderPage.html'),
        product: r('./src/pages/ProductDetail.html'),
        signin: r('./src/pages/SigninPage.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
