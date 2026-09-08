import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { InitPasswordPage } from '../features/auth/InitPasswordPage'
import { LoginPage } from '../features/auth/LoginPage'
import { AppsPage } from '../features/apps/AppsPage'
import { ConfigPage } from '../features/configs/ConfigPage'
import { ClientsPage } from '../features/clients/ClientsPage'
import { LogsPage } from '../features/logs/LogsPage'
import { UsersPage } from '../features/users/UsersPage'
import { RolesPage } from '../features/roles/RolesPage'
import { ServicesPage } from '../features/services/ServicesPage'
import { NodesPage } from '../features/nodes/NodesPage'
import { AppHistoryPage, HistoryIndexPage } from '../features/publish/HistoryPages'
import { HomePage } from '../features/home/HomePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { GuidePage } from '../features/guide/GuidePage'
import { RedirectIfAuthed, RequireAuth } from './guards'
import { RouterErrorPage } from './RouterErrorPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
    errorElement: <RouterErrorPage />,
  },
  { path: '/init-password', element: <InitPasswordPage />, errorElement: <RouterErrorPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    errorElement: <RouterErrorPage />,
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
          { path: 'users', element: <UsersPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'services', element: <ServicesPage /> },
          { path: 'guide', element: <GuidePage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
