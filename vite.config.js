import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { handleSiteMetadataRequest } from './lib/siteMetadata.js'
//import viteCompression from 'vite-plugin-compression' // 🌟 新增：引入静态资源压缩插件

// https://vite.dev/config/
export default defineConfig({

  base: '/', // 👈 解决样式丢失（裸奔）的唯一且最有效手段

  plugins: [
    vue(),
    vueDevTools(),
    {
      name: 'site-metadata-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/site-metadata')) {
            next()
            return
          }

          try {
            const response = await handleSiteMetadataRequest(`http://127.0.0.1${req.url}`)
            const body = await response.text()
            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              res.setHeader(key, value)
            })
            res.end(body)
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: '服务器错误', message: error.message }))
          }
        })
      },
    },
    // 🌟 新增：开启 Gzip 压缩，大副减少线上 JS/CSS 传输体积，加快网页打开速度
// 🌟 修改后：开启 Gzip 压缩，并明确指定输出目录，规避 Windows 绝对路径 Bug
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    // 构建时也需要考虑路由配置
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router']
          // 🌟 优化：移除了 'admin' 的硬编码拆包。因为你在路由文件 router/index.js 中已经配置了 () => import(...) 动态引入，Vite 会自动将其单独打包，无需在此重复声明。
        }
      }
    }
  }
})