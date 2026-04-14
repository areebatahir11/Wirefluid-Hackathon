'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCoreRead, getDonationRead, formatETH } from '../lib/ethers'

export default function Landing() {
  const [stats, setStats] = useState({
    matches: 0,
    donated: '0.0000',
    charities: 0,
    loading: true,
  })

  useEffect(() => {
    ;(async () => {
      try {
        const core = getCoreRead()
        const donation = getDonationRead()
        const [count, addrs] = await Promise.all([
          core.matchCounter(),
          donation.getAllCharities(),
        ])

        let total = 0n
        for (const addr of addrs) {
          const info = await donation.getCharity(addr)
          total += BigInt(info.totalReceived)
        }

        setStats({
          matches: Number(count),
          donated: formatETH(total),
          charities: addrs.length,
          loading: false,
        })
      } catch {
        setStats((s) => ({ ...s, loading: false }))
      }
    })()
  }, [])

  return (
    <div
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      {/* Stadium background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: "url('/stadium.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          filter: 'brightness(.38) saturate(1.25)',
        }}
      />

      {/* Gradient overlay */}
      <div
        className="stadium-overlay scanlines"
        style={{ position: 'fixed', inset: 0, zIndex: 1 }}
      />

      {/* Blue grid lines */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(0,212,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5rem 1.5rem 4rem',
        }}
      >
        {/* Pill tag */}
        <div
          className="anim-1"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.45rem',
            background: 'rgba(0,212,255,.07)',
            border: '1px solid rgba(0,212,255,.22)',
            borderRadius: 99,
            padding: '.3rem 1rem',
            marginBottom: '2rem',
          }}
        >
          <span className="pulse-dot" />
          <span
            style={{
              fontSize: '.62rem',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.14em',
              color: 'var(--neon-blue)',
            }}
          >
            LIVE ON WIREFLUID TESTNET · CHAIN 92533
          </span>
        </div>

        {/* Headline */}
        <h1
          className="font-orbitron anim-2"
          style={{
            fontSize: 'clamp(2.8rem,8vw,6rem)',
            fontWeight: 900,
            textAlign: 'center',
            lineHeight: 1.08,
            letterSpacing: '-.025em',
            marginBottom: '1.1rem',
            maxWidth: 900,
          }}
        >
          <span style={{ color: '#fff' }}>Predict</span>{' '}
          <span
            style={{
              background:
                'linear-gradient(135deg, var(--neon-green) 0%, var(--neon-blue) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            For Good
          </span>
        </h1>

        {/* Sub */}
        <p
          className="anim-3"
          style={{
            fontSize: 'clamp(1rem,2.2vw,1.3rem)',
            fontWeight: 500,
            color: 'rgba(200,225,240,.65)',
            textAlign: 'center',
            maxWidth: 540,
            lineHeight: 1.65,
            marginBottom: '2.5rem',
            fontFamily: "'Rajdhani',sans-serif",
            letterSpacing: '.02em',
          }}
        >
          Stake ETH on PSL matches. Winners earn rewards.
          <br />
          <span style={{ color: 'var(--neon-green)' }}>
            65% of every match pool goes to charity.
          </span>
        </p>

        {/* CTAs */}
        <div
          className="anim-4"
          style={{
            display: 'flex',
            gap: '.85rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '3.5rem',
          }}
        >
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button
              className="btn-primary"
              style={{ fontSize: '.82rem', padding: '.82rem 2.4rem' }}
            >
              Enter Arena →
            </button>
          </Link>
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <button
              className="btn-outline"
              style={{ fontSize: '.78rem', padding: '.82rem 1.8rem' }}
            >
              My Profile
            </button>
          </Link>
        </div>

        {/* Live stats */}
        <div
          className="anim-5"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '1rem',
            width: '100%',
            maxWidth: 640,
          }}
        >
          <StatBox
            loading={stats.loading}
            value={stats.matches}
            label="Total Matches"
            color="var(--neon-blue)"
          />
          <StatBox
            loading={stats.loading}
            value={`${stats.donated} ETH`}
            label="Charity Raised"
            color="var(--neon-green)"
          />
          <StatBox
            loading={stats.loading}
            value={stats.charities}
            label="Charities"
            color="var(--neon-gold)"
          />
        </div>

        {/* Charity names */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '.58rem',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.14em',
              color: 'rgba(180,210,230,.32)',
              marginBottom: '.65rem',
            }}
          >
            SUPPORTING
          </div>
          <div
            style={{
              display: 'flex',
              gap: '1.25rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {['Edhi Foundation', 'Shaukat Khanum', 'Namal University'].map(
              (n) => (
                <span
                  key={n}
                  style={{
                    fontSize: '.85rem',
                    fontWeight: 600,
                    color: 'rgba(200,225,240,.45)',
                    fontFamily: "'Rajdhani',sans-serif",
                  }}
                >
                  {n}
                </span>
              ),
            )}
          </div>
        </div>

        {/* PSL teams teaser */}
        <div
          style={{
            marginTop: '2.5rem',
            display: 'flex',
            gap: '.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {[
            { name: 'Lahore Qalandars', emoji: '🦁', c: '#00a651' },
            { name: 'Karachi Kings', emoji: '👑', c: '#0077cc' },
            { name: 'Islamabad United', emoji: '⚡', c: '#e31837' },
            { name: 'Multan Sultans', emoji: '🔮', c: '#7b2d8b' },
            { name: 'Peshawar Zalmi', emoji: '🦅', c: '#f7941d' },
            { name: 'Quetta Gladiators', emoji: '⚔️', c: '#5555cc' },
          ].map((t) => (
            <div
              key={t.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '.35rem',
                background: 'rgba(255,255,255,.03)',
                border: `1px solid ${t.c}28`,
                borderRadius: 99,
                padding: '.28rem .85rem',
                fontSize: '.75rem',
                color: `${t.c}cc`,
                fontFamily: "'Rajdhani',sans-serif",
                fontWeight: 600,
              }}
            >
              <span>{t.emoji}</span> {t.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatBox({ value, label, color, loading }) {
  return (
    <div className="stat-card">
      {loading ? (
        <div
          style={{
            height: 32,
            background: 'rgba(255,255,255,.05)',
            borderRadius: 6,
            marginBottom: '.4rem',
            animation: 'pulse 1.5s ease infinite',
          }}
        />
      ) : (
        <div
          className="font-orbitron"
          style={{
            fontSize: 'clamp(1.1rem,3vw,1.55rem)',
            fontWeight: 900,
            color,
            marginBottom: '.3rem',
          }}
        >
          {value}
        </div>
      )}
      <div
        style={{
          fontSize: '.7rem',
          color: 'rgba(180,210,230,.45)',
          fontFamily: "'Rajdhani',sans-serif",
          letterSpacing: '.05em',
        }}
      >
        {label}
      </div>
    </div>
  )
}
