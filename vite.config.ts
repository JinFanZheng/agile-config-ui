/// <reference types="vitest" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * llms*.txt 显式 UTF-8 伺服（ITER-18）：静态中间件默认给 text/plain 不带 charset，
 * 中文内容在部分浏览器按本地编码猜解出现乱码（实测反馈），这里直接接管这两个路径。
 */
function llmsCharsetPlugin(): Plugin {
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const path = req.url?.split('?')[0]
    if (path !== '/llms.txt' && path !== '/llms-full.txt') return next()
    const root = process.cwd()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(req.method === 'HEAD' ? undefined : readFileSync(resolve(root, 'public', path.slice(1))))
  }
  return {
    name: 'llms-charset',
    configureServer(server) {
      server.middlewares.use(serve)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve)
    },
  }
}

// 服务端 API 无统一前缀且未开 CORS（docs/AGENT_HANDOFF.md §7），
// dev 按控制器路径清单代理到本地 AgileConfig 实例。
const API_PREFIXES = [
  '/App',
  '/Config',
  '/admin',
  '/Admin',
  '/User',
  '/Role',
  '/ServerNode',
  '/Service',
  '/SysLog',
  '/SSO',
  '/Report',
  '/Home',
  '/RemoteOP',
  '/RemoteServerProxy',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://localhost:5017'
  return {
    plugins: [react(), tailwindcss(), llmsCharsetPlugin()],
    server: {
      port: 5173,
      proxy: Object.fromEntries(
        API_PREFIXES.map((p) => [p, { target: backend, changeOrigin: true }])
      ),
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
