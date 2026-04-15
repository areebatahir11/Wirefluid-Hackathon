'use client'
// app/dashboard/page.js
import { useState, useEffect } from 'react'
import {
  fetchActiveMatches,
  getDonationRead,
  formatETH,
  createMatchAdmin,
  PSL_TEAMS,
} from '../../lib/ethers'
import { useAccount } from '../../lib/AccountContext'
import MatchCard from '../../components/MatchCard'
import ConnectWallet from '../../lib/connectWallet'

// PSL team names list from ethers.js constant
const TEAMS = Object.keys(PSL_TEAMS)

export default function Dashboard() {
  const { account, isOwner } = useAccount()

  const [matches, setMatches] = useState([])
  const [donated, setDonated] = useState('0.0000')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mounted, setMounted] = useState(false)

  // Admin form state
  const [teamA, setTeamA] = useState(TEAMS[0])
  const [teamB, setTeamB] = useState(TEAMS[1])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const [active, donation] = await Promise.all([
        fetchActiveMatches(),
        getDonationRead(),
      ])
      setMatches(active)

      const addrs = await donation.getAllCharities()
      let total = 0n
      for (const addr of addrs) {
        const info = await donation.getCharity(addr)
        total += BigInt(info.totalReceived)
      }
      setDonated(formatETH(total))
    } catch (e) {
      setError('Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMatch = async () => {
    if (teamA === teamB) {
      alert('Team A and Team B cannot be the same!')
      return
    }
    try {
      setCreating(true)
      const now = Math.floor(Date.now() / 1000)
      const start = now + 300 // starts in 5 min
      const lock = now + 120 // locks in 2 min
      await createMatchAdmin(teamA, teamB, start, lock)
      alert(`Match created: ${teamA} vs ${teamB}`)
      await load()
    } catch (e) {
      alert(e?.reason || e?.message || 'Failed to create match')
    } finally {
      setCreating(false)
    }
  }

  const selectStyle = {
    padding: '.55rem .9rem',
    background: 'rgba(0,212,255,.05)',
    border: '1px solid rgba(0,212,255,.2)',
    borderRadius: 8,
    color: '#fff',
    fontFamily: "'Rajdhani',sans-serif",
    fontWeight: 600,
    fontSize: '.85rem',
    cursor: 'pointer',
    outline: 'none',
    flex: 1,
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* WALLET */}
      {mounted && (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 20 }}>
          <ConnectWallet />
        </div>
      )}

      {/* BACKGROUND */}
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

      {/* MAIN CONTENT */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1280,
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        {/* HEADER */}
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

          {/* DONATION PILL */}
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
            <span>💚</span>
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

        {/* ADMIN PANEL */}
        {isOwner && (
          <div
            style={{
              marginBottom: '2rem',
              padding: '1.25rem 1.5rem',
              background: 'rgba(168,85,247,.06)',
              border: '1px solid rgba(168,85,247,.25)',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                fontSize: '.6rem',
                fontFamily: "'Orbitron',monospace",
                letterSpacing: '.14em',
                color: '#c084fc',
                marginBottom: '1rem',
              }}
            >
              ⚙️ ADMIN — CREATE MATCH
            </div>

            <div
              style={{
                display: 'flex',
                gap: '.75rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {/* Team A dropdown */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '.3rem',
                  flex: 1,
                  minWidth: 180,
                }}
              >
                <label
                  style={{
                    fontSize: '.62rem',
                    fontFamily: "'Orbitron',monospace",
                    color: 'rgba(180,210,230,.4)',
                    letterSpacing: '.1em',
                  }}
                >
                  TEAM A
                </label>
                <select
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  style={selectStyle}
                >
                  {TEAMS.map((t) => (
                    <option key={t} value={t} style={{ background: '#0a0f1a' }}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* VS divider */}
              <div
                style={{
                  fontFamily: "'Orbitron',monospace",
                  fontSize: '.9rem',
                  color: 'rgba(180,210,230,.3)',
                  fontWeight: 900,
                  marginTop: '1.2rem',
                }}
              >
                VS
              </div>

              {/* Team B dropdown */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '.3rem',
                  flex: 1,
                  minWidth: 180,
                }}
              >
                <label
                  style={{
                    fontSize: '.62rem',
                    fontFamily: "'Orbitron',monospace",
                    color: 'rgba(180,210,230,.4)',
                    letterSpacing: '.1em',
                  }}
                >
                  TEAM B
                </label>
                <select
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  style={selectStyle}
                >
                  {TEAMS.map((t) => (
                    <option key={t} value={t} style={{ background: '#0a0f1a' }}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create button */}
              <div style={{ marginTop: '1.2rem' }}>
                <button
                  onClick={handleCreateMatch}
                  disabled={creating || teamA === teamB}
                  style={{
                    padding: '.58rem 1.5rem',
                    borderRadius: 8,
                    border: '1px solid rgba(168,85,247,.4)',
                    background: creating
                      ? 'rgba(168,85,247,.05)'
                      : 'rgba(168,85,247,.15)',
                    color: '#c084fc',
                    fontFamily: "'Orbitron',monospace",
                    fontSize: '.72rem',
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    cursor:
                      creating || teamA === teamB ? 'not-allowed' : 'pointer',
                    opacity: teamA === teamB ? 0.5 : 1,
                    transition: 'all .2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {creating ? <span className="spinner" /> : '⚡ Create Match'}
                </button>
              </div>
            </div>

            {teamA === teamB && (
              <div
                style={{
                  marginTop: '.6rem',
                  fontSize: '.72rem',
                  color: '#ff6688',
                  fontFamily: "'Rajdhani',sans-serif",
                }}
              >
                ⚠ Team A and Team B must be different
              </div>
            )}
          </div>
        )}

        {/* WALLET WARNING */}
        {!account && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '.8rem 1.1rem',
              background: 'rgba(255,140,0,.07)',
              border: '1px solid rgba(255,140,0,.25)',
              borderRadius: 9,
              color: '#ffaa44',
            }}
          >
            ⚡ Connect MetaMask to place predictions
          </div>
        )}

        {loading && (
          <p
            style={{
              color: 'rgba(180,210,230,.5)',
              fontFamily: "'Rajdhani',sans-serif",
            }}
          >
            Loading matches...
          </p>
        )}
        {error && !loading && <p style={{ color: 'red' }}>{error}</p>}

        {/* MATCH CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {!loading &&
            !error &&
            matches.map((m) => (
              <MatchCard
                key={m.matchId}
                match={m}
                account={account}
                isAdmin={isOwner}
                onResolved={load}
              />
            ))}
        </div>

        {!loading && !error && matches.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '5rem 2rem',
              color: 'rgba(180,210,230,.3)',
              fontFamily: "'Rajdhani',sans-serif",
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏏</div>
            <div
              style={{ fontFamily: "'Orbitron',monospace", fontSize: '.8rem' }}
            >
              No active matches
            </div>
            {isOwner && (
              <div style={{ marginTop: '.5rem', fontSize: '.8rem' }}>
                Create one above ↑
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
