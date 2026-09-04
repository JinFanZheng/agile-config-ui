import { RouterProvider } from 'react-router'
import { ToastContainer } from './components/Toast'
import { router } from './routes'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  )
}
