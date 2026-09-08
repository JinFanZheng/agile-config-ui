import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { createQueryClient } from './lib/queryClient'
import { oidcLoginByCode } from './api/auth'
import { useAuthStore } from './stores/auth'
import { cleanOidcCallbackUrl, parseOidcCallback } from './lib/sso'

const queryClient = createQueryClient()

/**
 * SSO/OIDC 回调引导（ITER-25）：后端硬编码重定向官方 UI 的 `/ui#/oidc/login?code=xxx`；
 * BrowserRouter 会忽略该 hash，故在渲染前解析并兑换成会话，再清理地址挂载应用。
 * 兑换失败静默落回登录页（密码登录始终可用）。
 */
async function bootstrap() {
  const code = parseOidcCallback(window.location.hash)
  if (code) {
    try {
      const session = await oidcLoginByCode(code)
      useAuthStore.getState().setSession(session)
    } catch {
      // code 失效/SSO 未开启：保持未登录态
    }
    cleanOidcCallbackUrl()
  }
}

void bootstrap().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
})
