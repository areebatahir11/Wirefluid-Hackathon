import '../styles/globals.css'
import Navbar from '../components/Navbar'
import ToastProvider from '../components/Toast'

export const metadata = {
  title: 'Predict For Good | PSL Prediction dApp',
  description: 'Stake on PSL matches. Winners earn ETH. 65% goes to charity.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
      </head>
      <body style={{ minHeight: '100vh', background: 'var(--dark-bg)' }}>
        <Navbar />
        <main>{children}</main>
        <ToastProvider />
      </body>
    </html>
  )
}
