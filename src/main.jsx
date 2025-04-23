import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'
import './index.css'

import { AuthProvider } from './contexts/AuthContext'
import { SimpleAuthProvider } from './contexts/SimpleAuthContext'
import { OrderProvider } from './contexts/OrderContext'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <SimpleAuthProvider>
        <AuthProvider>
          <OrderProvider>
            <App />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  border: '1px solid #3b82f6',
                  padding: '16px',
                },
              }}
            />
          </OrderProvider>
        </AuthProvider>
      </SimpleAuthProvider>
    </Router>
  </React.StrictMode>
) 