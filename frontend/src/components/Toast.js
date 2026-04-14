'use client'
import { useEffect, useState } from 'react'

// Global toast state
let toastFn = null

export const toast = {
  success: (msg) => toastFn?.('success', msg),
  error: (msg) => toastFn?.('error', msg),
  info: (msg) => toastFn?.('info', msg),
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    toastFn = (type, message) => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    }
    return () => {
      toastFn = null
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span style={{ marginRight: '0.5rem' }}>
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
