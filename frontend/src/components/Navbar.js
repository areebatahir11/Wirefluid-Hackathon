'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getProvider, ensureCorrectNetwork, shortenAddr } from '../lib/ethers'
import { toast } from './Toast'

export default function Navbar() {
  const [account, setAccount] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const pathname = usePathname()

  const connect = async () => {
    try {
      setConnecting(true)
      if (!window.ethereum) {
        toast.error('Please install MetaMask')
        return
      }
      await ensureCorrectNetwork()
      const provider = getProvider()
      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
      toast.success('Wallet connected!')
    } catch (e) {
      toast.error(e?.message || 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return
      const accounts = await getProvider().send('eth_accounts', [])
      if (accounts.length) setAccount(accounts[0])
    }
    init()
    window.ethereum?.on('accountsChanged', (a) => setAccount(a[0] || null))
    window.ethereum?.on('chainChanged', () => window.location.reload())
  }, [])

  const links = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Arena' },
    { href: '/profile', label: 'Profile' },
  ]

  return (
    <nav className="navbar">
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 62,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '.55rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🏏</span>
          <span
            className="font-orbitron"
            style={{
              fontSize: '.95rem',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '.06em',
            }}
          >
            P4G<span style={{ color: 'var(--neon-green)' }}>.</span>
          </span>
          <span
            style={{
              fontSize: '.6rem',
              color: 'rgba(0,212,255,.55)',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.1em',
              marginLeft: 2,
            }}
          >
            PREDICT FOR GOOD
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '.15rem' }}>
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  textDecoration: 'none',
                  padding: '.38rem .9rem',
                  borderRadius: 7,
                  fontFamily: "'Rajdhani',sans-serif",
                  fontWeight: active ? 700 : 500,
                  fontSize: '.95rem',
                  letterSpacing: '.04em',
                  color: active ? 'var(--neon-blue)' : 'rgba(190,215,230,.6)',
                  background: active ? 'rgba(0,212,255,.08)' : 'transparent',
                  borderBottom: active
                    ? '1px solid rgba(0,212,255,.4)'
                    : '1px solid transparent',
                  transition: 'all .2s',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Wallet */}
        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span className="pulse-dot" />
            <span
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: '.72rem',
                color: 'var(--neon-green)',
                background: 'rgba(0,255,136,.07)',
                border: '1px solid rgba(0,255,136,.22)',
                padding: '.32rem .85rem',
                borderRadius: 6,
              }}
            >
              {shortenAddr(account)}
            </span>
          </div>
        ) : (
          <button
            className="btn-primary"
            onClick={connect}
            disabled={connecting}
            style={{ fontSize: '.72rem', padding: '.5rem 1.25rem' }}
          >
            {connecting ? <span className="spinner" /> : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  )
}
