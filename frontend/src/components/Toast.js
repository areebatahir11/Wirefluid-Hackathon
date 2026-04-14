'use client'
import { useEffect, useState } from 'react'

let _push = null
export const toast = {
  success: (msg) => _push?.('success', msg),
  error: (msg) => _push?.('error', msg),
  info: (msg) => _push?.('info', msg),
}

export default function ToastProvider() {
  const [list, setList] = useState([])

  useEffect(() => {
    _push = (type, message) => {
      const id = Date.now() + Math.random()
      setList((p) => [...p, { id, type, message }])
      setTimeout(() => setList((p) => p.filter((t) => t.id !== id)), 4200)
    }
    return () => {
      _push = null
    }
  }, [])

  const icons = { success: '✅', error: '❌', info: 'ℹ️' }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.75rem',
        right: '1.75rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '.65rem',
      }}
    >
      {list.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {icons[t.type]} {t.message}
        </div>
      ))}
    </div>
  )
}
