import '../styles/globals.css'
import Navbar from '@/components/Navbar'
import ToastProvider from '@/components/Toast'

export const metadata = {
  title: 'Predict For Good | Win Rewards, Support Charity',
  description:
    'Stake on cricket matches. Winners earn ETH. 65% goes to charity. Powered by WireFluid.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>

      <body className="min-h-screen bg-[var(--dark-bg)]">
        <Navbar />
        <main>{children}</main>
        <ToastProvider />
      </body>
    </html>
  )
}
