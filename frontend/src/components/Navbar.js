'use client'
// components/Navbar.js
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ConnectWallet from '../lib/connectWallet'
import { useAccount } from '../lib/AccountContext'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Arena' },
  { href: '/profile', label: 'Profile' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { account, setAccount } = useAccount()

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        height: 56,
        background: 'rgba(2,8,16,.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,212,255,.08)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '.45rem',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>🏏</span>
        <span
          style={{
            fontFamily: "'Orbitron',monospace",
            fontWeight: 900,
            fontSize: '.85rem',
            color: '#fff',
            letterSpacing: '.05em',
          }}
        >
          P4G.{' '}
          <span
            style={{
              color: 'var(--neon-blue)',
              fontWeight: 400,
              fontSize: '.6rem',
            }}
          >
            PREDICT FOR GOOD
          </span>
        </span>
      </Link>

      {/* Links */}
      <div style={{ display: 'flex', gap: '.25rem' }}>
        {NAV.map((n) => {
          const active = pathname === n.href
          return (
            <Link key={n.href} href={n.href} style={{ textDecoration: 'none' }}>
              <span
                style={{
                  padding: '.4rem .9rem',
                  borderRadius: 7,
                  fontSize: '.78rem',
                  fontFamily: "'Rajdhani',sans-serif",
                  fontWeight: 600,
                  letterSpacing: '.04em',
                  color: active ? 'var(--neon-blue)' : 'rgba(180,210,230,.6)',
                  background: active ? 'rgba(0,212,255,.08)' : 'transparent',
                  border: active
                    ? '1px solid rgba(0,212,255,.22)'
                    : '1px solid transparent',
                  transition: 'all .2s',
                  cursor: 'pointer',
                }}
              >
                {n.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Wallet */}
      <ConnectWallet account={account} setAccount={setAccount} />
    </nav>
  )
}
