'use client'
// app/layout.js
import '../styles/globals.css'
import Navbar from '../components/Navbar'
import ToastProvider from '../components/Toast'
import { AccountProvider } from '../lib/AccountContext'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', background: 'var(--dark-bg)' }}>
        <AccountProvider>
          <Navbar />
          <main>{children}</main>
          <ToastProvider />
        </AccountProvider>
      </body>
    </html>
  )
}
