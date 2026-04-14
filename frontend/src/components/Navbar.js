'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getProvider, ensureCorrectNetwork, shortenAddr } from '../lib/ethers'
import { toast } from './Toast.js'

export default function Navbar() {
  const [account, setAccount] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const pathname = usePathname()

  const connect = async () => {
    try {
      setConnecting(true)
      if (!window.ethereum) {
        toast.error('Install MetaMask first')
        return
      }
      await ensureCorrectNetwork()
      const provider = getProvider()
      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
      toast.success('Wallet connected!')
    } catch (e) {
      toast.error(e.message || 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  useEffect(() => {
    const check = async () => {
      if (!window.ethereum) return
      const provider = getProvider()
      const accounts = await provider.send('eth_accounts', [])
      if (accounts.length) setAccount(accounts[0])
    }
    check()

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accs) =>
        setAccount(accs[0] || null),
      )
      window.ethereum.on('chainChanged', () => window.location.reload())
    }
  }, [])

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
  ]

  return (
    <nav className="navbar" style={{ padding: '0 2rem' }}>
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 900,
            }}
          >
            🏏
          </div>
          <span
            className="font-orbitron"
            style={{
              fontSize: '1rem',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '0.05em',
            }}
          >
            P4G<span style={{ color: 'var(--neon-green)' }}>.</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                textDecoration: 'none',
                padding: '0.4rem 1rem',
                borderRadius: '6px',
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: '0.95rem',
                letterSpacing: '0.05em',
                color:
                  pathname === href
                    ? 'var(--neon-blue)'
                    : 'rgba(200,220,230,0.7)',
                background:
                  pathname === href ? 'rgba(0,212,255,0.08)' : 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Connect button */}
        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="pulse-dot" />
            <span
              style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: '0.75rem',
                color: 'var(--neon-green)',
                background: 'rgba(0,255,136,0.08)',
                border: '1px solid rgba(0,255,136,0.25)',
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
              }}
            >
              {shortenAddr(account)}
            </span>
          </div>
        ) : (
          <button
            className="btn-primary btn-glow-border"
            onClick={connect}
            disabled={connecting}
          >
            {connecting ? <span className="spinner" /> : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  )
}
