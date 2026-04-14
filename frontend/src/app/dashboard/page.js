'use client'
import { useState, useEffect } from 'react'
import { getCoreRead, getProvider, STATUS } from '../../lib/ethers'
import MatchCard from '../../components/MatchCard.js'

export default function Dashboard() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(null)
  const [error, setError] = useState(null)

  // Get connected account
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
    }
  }, [])

  // Load active matches
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const core = getCoreRead()
        const activeIds = await core.getActiveMatches()

        const matchData = await Promise.all(
          activeIds.map(async (id) => {
            const m = await core.getMatch(id)
            return {
              matchId: Number(m.matchId),
              teamA: m.teamA,
              teamB: m.teamB,
              startTime: m.startTime,
              lockTime: m.lockTime,
              status: Number(m.status),
              result: Number(m.result),
              totalStaked: m.totalStaked,
              winnerPool: m.winnerPool,
              donationPool: m.donationPool,
            }
          }),
        )

        setMatches(matchData)
      } catch (e) {
        console.error('Dashboard load error:', e)
        setError('Could not load matches. Check your connection.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Stadium background (dimmer than landing) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: "url('/stadium.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.2) saturate(0.8)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'rgba(2,10,20,0.75)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              fontSize: '0.7rem',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.15em',
              color: 'var(--neon-blue)',
              marginBottom: '0.5rem',
            }}
          >
            LIVE PREDICTION ARENA
          </div>
          <h1
            className="font-orbitron"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 900,
              color: '#fff',
              marginBottom: '0.5rem',
            }}
          >
            Active Matches
          </h1>
          <p
            style={{
              color: 'rgba(168,196,210,0.6)',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '1rem',
            }}
          >
            Pick your winner. Place your stake. Support charity.
          </p>
        </div>

        {/* Wallet warning */}
        {!account && (
          <div
            style={{
              marginBottom: '2rem',
              padding: '0.85rem 1.25rem',
              background: 'rgba(255,140,0,0.08)',
              border: '1px solid rgba(255,140,0,0.3)',
              borderRadius: 10,
              color: '#ffaa44',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            ⚡ Connect your wallet to place predictions
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass"
                style={{ padding: '1.5rem', height: '320px', opacity: 0.4 }}
              >
                <div
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    height: 16,
                    width: '60%',
                    marginBottom: '1rem',
                  }}
                />
                <div
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    height: 24,
                    width: '80%',
                    marginBottom: '1.5rem',
                  }}
                />
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    height: 80,
                    marginBottom: '1rem',
                  }}
                />
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    height: 44,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'rgba(255,68,102,0.05)',
              border: '1px solid rgba(255,68,102,0.2)',
              borderRadius: 12,
              color: '#ff6688',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
            <div
              style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem' }}
            >
              {error}
            </div>
          </div>
        )}

        {/* Match grid */}
        {!loading && !error && matches.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {matches.map((m) => (
              <MatchCard key={m.matchId} match={m} account={account} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && matches.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '5rem 2rem',
              color: 'rgba(168,196,210,0.4)',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏏</div>
            <div
              className="font-orbitron"
              style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}
            >
              No Active Matches
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '0.95rem',
              }}
            >
              Check back soon — new matches are added regularly
            </div>
          </div>
        )}

        {/* Info bar */}
        {!loading && matches.length > 0 && (
          <div
            style={{
              marginTop: '2rem',
              padding: '1rem 1.25rem',
              background: 'rgba(0,212,255,0.04)',
              border: '1px solid rgba(0,212,255,0.1)',
              borderRadius: 10,
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
            }}
          >
            <InfoPill icon="🏆" label="35%" desc="goes to winners" />
            <InfoPill icon="💚" label="65%" desc="goes to charity" />
            <InfoPill
              icon="🔒"
              label="Lock time"
              desc="predictions close before match starts"
            />
            <InfoPill
              icon="🎖️"
              label="NFT rewards"
              desc="earn badges for correct predictions"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function InfoPill({ icon, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--neon-blue)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: '0.85rem',
          color: 'rgba(168,196,210,0.5)',
        }}
      >
        {desc}
      </span>
    </div>
  )
}
