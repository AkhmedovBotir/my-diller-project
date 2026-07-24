import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './modules/auth/AuthContext.tsx'
import { CartProvider } from './modules/cart/CartContext.tsx'
import { SnackbarProvider } from './shared/Snackbar.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SnackbarProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </SnackbarProvider>
    </BrowserRouter>
  </StrictMode>,
)
