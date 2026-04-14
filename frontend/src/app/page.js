'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCoreRead, getDonationRead, formatETH } from '../lib/ethers'

export default function LandingPage() {
  const [stats, setStats] = useState({
    matches: 0,
    donations: '0',
    charities: 0,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const core = getCoreRead()
        const donation = getDonationRead()
        const [matchCount, charityList] = await Promise.all([
          core.matchCounter(),
          donation.getAllCharities(),
        ])

        // Sum charity donations
        let totalDonation = 0n
        for (const addr of charityList) {
          const info = await donation.getCharity(addr)
          totalDonation += info.totalReceived
        }

        setStats({
          matches: Number(matchCount),
          donations: formatETH(totalDonation),
          charities: charityList.length,
        })
      } catch (e) {
        console.error('Stats load failed:', e)
      }
    }
    load()
  }, [])

  return (
    <div
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      {/* ── Stadium background ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: "url('/stadium.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          filter: 'brightness(0.45) saturate(1.2)',
        }}
      />

      {/* ── Gradient overlay ── */}
      <div
        className="stadium-overlay scanlines"
        style={{ position: 'fixed', inset: 0, zIndex: 1 }}
      />

      {/* ── Blue neon horizontal lines ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 120px, rgba(0,212,255,0.015) 121px)',
        }}
      />

      {/* ── Content ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem 6rem',
        }}
      >
        {/* Eyebrow */}
        <div
          className="fade-up-1"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 99,
            padding: '0.35rem 1rem',
            marginBottom: '2rem',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.12em',
              color: 'var(--neon-blue)',
            }}
          >
            🏏 LIVE ON WIREFLUID TESTNET
          </span>
        </div>

        {/* Main headline */}
        <h1
          className="font-orbitron fade-up-2"
          style={{
            fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
            fontWeight: 900,
            textAlign: 'center',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: '1.25rem',
            maxWidth: '900px',
          }}
        >
          <span style={{ color: '#fff' }}>Predict</span>{' '}
          <span
            style={{
              background:
                'linear-gradient(135deg, var(--neon-green), var(--neon-blue))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            For Good
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="fade-up-3"
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
            fontWeight: 500,
            color: 'rgba(200,225,235,0.75)',
            textAlign: 'center',
            maxWidth: '580px',
            lineHeight: 1.6,
            marginBottom: '2.5rem',
            fontFamily: "'Rajdhani', sans-serif",
            letterSpacing: '0.03em',
          }}
        >
          Stake on cricket matches. Winners take rewards.
          <br />
          <span style={{ color: 'var(--neon-green)' }}>
            65% of every match goes to charity.
          </span>
        </p>

        {/* CTA buttons */}
        <div
          className="fade-up-4"
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '4rem',
          }}
        >
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button
              className="btn-primary btn-glow-border"
              style={{ fontSize: '0.85rem', padding: '0.85rem 2.5rem' }}
            >
              Enter App →
            </button>
          </Link>
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <button
              style={{
                background: 'transparent',
                border: '1px solid rgba(0,212,255,0.35)',
                color: 'var(--neon-blue)',
                fontFamily: "'Orbitron', monospace",
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.85rem 2rem',
                borderRadius: 8,
                cursor: 'pointer',
                letterSpacing: '0.08em',
                transition: 'all 0.3s ease',
              }}
            >
              My Profile
            </button>
          </Link>
        </div>

        {/* Stats row */}
        <div
          className="fade-up-4"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            width: '100%',
            maxWidth: '700px',
          }}
        >
          <StatBox
            value={stats.matches}
            label="Total Matches"
            color="var(--neon-blue)"
          />
          <StatBox
            value={`${stats.donations} ETH`}
            label="Donated to Charity"
            color="var(--neon-green)"
          />
          <StatBox
            value={stats.charities}
            label="Partner Charities"
            color="var(--neon-gold)"
          />
        </div>

        {/* Charity row */}
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.7rem',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.12em',
              color: 'rgba(168,196,210,0.4)',
              marginBottom: '0.75rem',
            }}
          >
            SUPPORTING
          </div>
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {['Edhi Foundation', 'Shaukat Khanum', 'Namal University'].map(
              (n) => (
                <span
                  key={n}
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'rgba(200,225,235,0.55)',
                    fontFamily: "'Rajdhani', sans-serif",
                  }}
                >
                  {n}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ value, label, color }) {
  return (
    <div className="stat-card fade-up-4">
      <div
        className="font-orbitron"
        style={{
          fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
          fontWeight: 900,
          color,
          marginBottom: '0.35rem',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '0.75rem',
          color: 'rgba(168,196,210,0.5)',
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 500,
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
    </div>
  )
}
