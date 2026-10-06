import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Gymo 是纯本地 PWA：无后端、无账号、无运行时网络依赖。
// 构建产物为静态文件，可 file:// 打开或任意静态托管，完全离线可用。
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icon-192.png', 'icon-512.png', 'maskable-512.png'],
      manifest: {
        name: 'Gymo',
        short_name: 'Gymo',
        description: '纯本地力量训练记录器',
        theme_color: '#0f0f10',
        background_color: '#0f0f10',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // 完全离线：缓存所有静态资源
        navigateFallback: 'index.html'
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  base: './',
  build: {
    target: 'es2020',
    sourcemap: true
  }
});