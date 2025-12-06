import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router/index.jsx'
import { Toaster } from "react-hot-toast";
import { CameraProvider } from './context/CameraContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CameraProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" reverseOrder={false} />
    </CameraProvider>
  </StrictMode>,
)