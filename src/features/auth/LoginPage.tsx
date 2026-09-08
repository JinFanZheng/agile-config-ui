import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { checkPasswordInited, login } from '../../api/auth'
import { getSsoLoginUrl } from '../../api/importExport'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Spinner } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { useAuthStore } from '../../stores/auth'
import { S } from '../../strings/common'
import { authStr } from '../../strings/auth'
import { loginSchema, type LoginValues } from './schemas'

export function LoginPage() {
  const navigate = useNavigate()
    const setSession = useAuthStore((s) => s.setSession)
  const [error, setError] = useState<string | null>(null)

  // 首启检测：实例未初始化密码时引导去初始化页（公开接口）
  const { data: passwordInited } = useQuery({
    queryKey: ['passwordInited'],
    queryFn: checkPasswordInited,
    staleTime: Infinity,
  })
  // SSO 入口（Home/Sys ssoEnabled 驱动；未开启时接口 400 → 隐藏）
  const { data: ssoUrl } = useQuery({
    queryKey: ['ops', 'ssoLoginUrl'],
    queryFn: getSsoLoginUrl,
    staleTime: 5 * 60_000,
    retry: false,
  })
  useEffect(() => {
    if (passwordInited === false) navigate('/init-password', { replace: true })
  }, [passwordInited, navigate])

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userName: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    setError(null)
    try {
      const session = await login(values.userName, values.password)
      // 登录后跳转收口在 RedirectIfAuthed（guards.tsx）：from 回跳 > 落地偏好；此处只写入会话
      setSession(session)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : authStr.login.failed)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            A
          </div>
          <h1 className="text-lg font-semibold text-foreground">{authStr.login.title}</h1>
          <p className="text-xs text-muted-foreground">{S.tagline}</p>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-lg border border-border bg-panel p-5"
          noValidate
        >
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              {error}
            </div>
          )}
          {passwordInited === false && (
            <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              {authStr.login.needInit}
              <Link to="/init-password" className="ml-1 underline underline-offset-2">
                {authStr.login.goInit}
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="userName">{authStr.login.userName}</Label>
              <Input
                id="userName"
                autoComplete="username"
                autoFocus
                placeholder={authStr.login.userNamePlaceholder}
                {...form.register('userName')}
              />
              {form.formState.errors.userName && (
                <p className="text-xs text-danger">{form.formState.errors.userName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{authStr.login.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder={authStr.login.passwordPlaceholder}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting} className="h-9 w-full">
              {form.formState.isSubmitting && <Spinner />}
              {form.formState.isSubmitting ? authStr.login.submitting : authStr.login.submit}
            </Button>

            {ssoUrl && (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  或
                  <span className="h-px flex-1 bg-border" />
                </div>
                <a
                  href={ssoUrl}
                  className="flex h-9 w-full items-center justify-center rounded-md border border-border text-sm text-foreground transition-colors duration-150 hover:bg-elevated"
                >
                  {authStr.login.sso}
                </a>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
