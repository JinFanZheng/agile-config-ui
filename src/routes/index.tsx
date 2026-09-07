import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { InitPasswordPage } from '../features/auth/InitPasswordPage'
import { LoginPage } from '../features/auth/LoginPage'
import { AppsPage } from '../features/apps/AppsPage'
import { ConfigPage } from '../features/configs/ConfigPage'
import { ClientsPage } from '../features/clients/ClientsPage'
import { LogsPage } from '../features/logs/LogsPage'
import { NodesPage } from '../features/nodes/NodesPage'
import { AppHistoryPage, HistoryIndexPage } from '../features/publish/HistoryPages'
import { HomePage } from '../features/home/HomePage'
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
          { path: 'apps', element: <AppsPage /> },
          { path: 'apps/:appId/config', element: <ConfigPage /> },
          { path: 'apps/:appId/history', element: <AppHistoryPage /> },
          { path: 'history', element: <HistoryIndexPage /> },
          { path: 'clients', element: <ClientsPage /> },
          { path: 'nodes', element: <NodesPage /> },
          { path: 'logs', element: <LogsPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
