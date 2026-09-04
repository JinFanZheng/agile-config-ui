import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { InitPasswordPage } from '../features/auth/InitPasswordPage'
import { LoginPage } from '../features/auth/LoginPage'
import { HomePage } from '../features/home/HomePage'
import { PlaceholderPage } from '../features/PlaceholderPage'
import { homeStr } from '../strings/layout'
import { RedirectIfAuthed, RequireAuth } from './guards'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
  },
  { path: '/init-password', element: <InitPasswordPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: 'apps',
            element: (
              <PlaceholderPage title={homeStr.appsCard} description={homeStr.appsComingSoon} />
            ),
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
