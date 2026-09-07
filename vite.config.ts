/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
    plugins: [react(), tailwindcss()],
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
