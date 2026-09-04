import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { initPassword } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Spinner } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { S } from '../../strings/common'
import { authStr } from '../../strings/auth'
import { initPasswordSchema, type InitPasswordValues } from './schemas'

export function InitPasswordPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const form = useForm<InitPasswordValues>({
    resolver: zodResolver(initPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: InitPasswordValues) => {
    setError(null)
    try {
      await initPassword(values.password, values.confirmPassword)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : authStr.initPassword.failed)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            A
          </div>
          <h1 className="text-lg font-semibold text-foreground">{authStr.initPassword.title}</h1>
          <p className="text-xs text-muted-foreground">{authStr.initPassword.subtitle}</p>
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
          {done && (
            <div className="mb-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
              {authStr.initPassword.success}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{authStr.initPassword.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                autoFocus
                disabled={done}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">{authStr.initPassword.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                disabled={done}
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-danger">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={form.formState.isSubmitting || done}
              className="h-9 w-full"
            >
              {form.formState.isSubmitting && <Spinner />}
              {form.formState.isSubmitting
                ? authStr.initPassword.submitting
                : authStr.initPassword.submit}
            </Button>

            <p className="text-center text-xs text-muted-foreground">{S.appName}</p>
          </div>
        </form>
      </div>
    </div>
  )
}
