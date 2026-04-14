'use client'
import { useState, useEffect } from 'react'
import {
  getProvider,
  fetchActiveMatches,
  getDonationRead,
  formatETH,
} from '../../lib/ethers'
import MatchCard from '../../components/MatchCard'

export default function Dashboard() {
  const [account, setAccount] = useState(null)
  const [matches, setMatches] = useState([])
  const [donated, setDonated] = useState('0.0000')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Wallet ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return
      const accounts = await getProvider().send('eth_accounts', [])
      if (accounts.length) setAccount(accounts[0])
    }
    init()
    window.ethereum?.on('accountsChanged', (a) => setAccount(a[0] || null))
  }, [])

  // ── Load matches from blockchain ─────────────────────────
  // Teams (teamA, teamB) come directly from Core.getMatch() —
  // they are the strings pushed by CreateMatches.s.sol script.
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const [active, donation] = await Promise.all([
          fetchActiveMatches(),
          getDonationRead(),
        ])
        setMatches(active)

        // Total donated across all charities
        const addrs = await donation.getAllCharities()
        let total = 0n
        for (const addr of addrs) {
          const info = await donation.getCharity(addr)
          total += BigInt(info.totalReceived)
        }
        setDonated(formatETH(total))
      } catch (e) {
        console.error(e)
        setError('Failed to load matches. Check RPC connection.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Dim stadium background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: "url('/stadium.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          filter: 'brightness(.15) saturate(.7)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'rgba(2,8,16,.72)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1280,
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        {/* ── Page header ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '.6rem',
                fontFamily: "'Orbitron',monospace",
                letterSpacing: '.16em',
                color: 'var(--neon-blue)',
                marginBottom: '.4rem',
              }}
            >
              PREDICTION ARENA · PSL SEASON
            </div>
            <h1
              className="font-orbitron"
              style={{
                fontSize: 'clamp(1.6rem,4vw,2.4rem)',
                fontWeight: 900,
                color: '#fff',
              }}
            >
              Active Matches
            </h1>
          </div>

          {/* Charity raised pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
              background: 'rgba(0,255,136,.06)',
              border: '1px solid rgba(0,255,136,.2)',
              borderRadius: 99,
              padding: '.4rem 1rem',
            }}
          >
            <span style={{ fontSize: '.85rem' }}>💚</span>
            <span
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: '.7rem',
                color: 'var(--neon-green)',
                fontWeight: 700,
              }}
            >
              {donated} ETH donated
            </span>
          </div>
        </div>

        {/* ── No wallet warning ── */}
        {!account && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '.8rem 1.1rem',
              background: 'rgba(255,140,0,.07)',
              border: '1px solid rgba(255,140,0,.25)',
              borderRadius: 9,
              color: '#ffaa44',
              fontFamily: "'Rajdhani',sans-serif",
              fontSize: '.92rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
            }}
          >
            ⚡ Connect MetaMask to place predictions
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))',
              gap: '1.1rem',
            }}
          >
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'rgba(255,51,85,.04)',
              border: '1px solid rgba(255,51,85,.18)',
              borderRadius: 14,
              color: '#ff5577',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>⚠️</div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif" }}>{error}</div>
          </div>
        )}

        {/* ── Match grid ──
             Teams are loaded directly from blockchain via fetchActiveMatches()
             which calls core.getActiveMatches() then core.getMatch(id)
             Returns teamA, teamB strings as stored by CreateMatches.s.sol
        ── */}
        {!loading && !error && matches.length > 0 && (
          <>
            <div
              style={{
                fontSize: '.7rem',
                fontFamily: "'Orbitron',monospace",
                letterSpacing: '.1em',
                color: 'rgba(180,210,230,.35)',
                marginBottom: '1rem',
              }}
            >
              {matches.length} MATCH{matches.length !== 1 ? 'ES' : ''} FOUND
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))',
                gap: '1.1rem',
              }}
            >
              {matches.map((m) => (
                <MatchCard key={m.matchId} match={m} account={account} />
              ))}
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && matches.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '5rem 2rem',
              color: 'rgba(180,210,230,.35)',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏏</div>
            <div
              className="font-orbitron"
              style={{ fontSize: '1rem', marginBottom: '.4rem' }}
            >
              No Active Matches
            </div>
            <div
              style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '.9rem' }}
            >
              Run{' '}
              <code style={{ color: 'var(--neon-green)', fontSize: '.85rem' }}>
                forge script script/CreateMatches.s.sol
              </code>{' '}
              to add matches
            </div>
          </div>
        )}

        {/* ── Info footer ── */}
        {!loading && matches.length > 0 && (
          <div
            style={{
              marginTop: '1.75rem',
              padding: '.9rem 1.25rem',
              background: 'rgba(0,212,255,.03)',
              border: '1px solid rgba(0,212,255,.09)',
              borderRadius: 10,
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {[
              { icon: '🏆', bold: '35%', text: 'winners pool' },
              { icon: '💚', bold: '65%', text: 'charity pool' },
              {
                icon: '🔒',
                bold: 'Lock time',
                text: 'betting closes before match start',
              },
              {
                icon: '🎖️',
                bold: 'NFT badges',
                text: 'earned on correct predictions',
              },
            ].map(({ icon, bold, text }) => (
              <div
                key={bold}
                style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}
              >
                <span style={{ fontSize: '.9rem' }}>{icon}</span>
                <span
                  style={{
                    fontFamily: "'Orbitron',monospace",
                    fontSize: '.7rem',
                    fontWeight: 700,
                    color: 'var(--neon-blue)',
                  }}
                >
                  {bold}
                </span>
                <span
                  style={{
                    fontFamily: "'Rajdhani',sans-serif",
                    fontSize: '.82rem',
                    color: 'rgba(180,210,230,.42)',
                  }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  const s = (h, w = '100%') => ({
    height: h,
    width: w,
    background: 'rgba(255,255,255,.045)',
    borderRadius: 7,
    marginBottom: '.7rem',
  })
  return (
    <div className="glass" style={{ padding: '1.4rem', opacity: 0.5 }}>
      <div style={s(14, '50%')} />
      <div style={s(22, '80%')} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '.6rem',
          margin: '1rem 0',
        }}
      >
        <div style={{ ...s(60, '100%'), marginBottom: 0 }} />
        <div style={{ ...s(60, '100%'), marginBottom: 0 }} />
      </div>
      <div style={s(44)} />
    </div>
  )
}
