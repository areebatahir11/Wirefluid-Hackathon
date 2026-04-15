'use client'
// app/dashboard/page.js
import { useState, useEffect } from 'react'
import {
  fetchActiveMatches,
  getDonationRead,
  formatETH,
  getOwner,
  createMatchAdmin,
} from '../../lib/ethers'
import MatchCard from '../../components/MatchCard'
import { useAccount } from '../../lib/AccountContext'

const PSL_TEAMS = [
  { name: 'Lahore Qalandars', emoji: '🦁' },
  { name: 'Karachi Kings', emoji: '👑' },
  { name: 'Islamabad United', emoji: '⚡' },
  { name: 'Multan Sultans', emoji: '🔮' },
  { name: 'Peshawar Zalmi', emoji: '⚔️' },
  { name: 'Quetta Gladiators', emoji: '🦅' },
  { name: 'Rawalpindi Pindiz', emoji: '✨' },
]

export default function Dashboard() {
  const { account } = useAccount()
  const [owner, setOwner] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [matches, setMatches] = useState([])
  const [donated, setDonated] = useState('0.0000')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Admin form
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [creating, setCreating] = useState(false)

  // Owner fetch
  useEffect(() => {
    getOwner()
      .then(setOwner)
      .catch(() => {})
  }, [])

  // Owner check
  useEffect(() => {
    if (!account || !owner) return setIsOwner(false)
    setIsOwner(account.toLowerCase() === owner.toLowerCase())
  }, [account, owner])

  // Load matches + donation
  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
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
    if (!teamA || !teamB || teamA === teamB) return
    try {
      setCreating(true)
      const now = Math.floor(Date.now() / 1000)
      // lock in 2 minutes, start in 5 minutes
      await createMatchAdmin(teamA, teamB, now + 300, now + 120)
      setTeamA('')
      setTeamB('')
      await load()
    } catch (e) {
      alert(e?.reason || e?.message || 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  // Show only the first/active match for users
  const activeMatch = matches[0] || null

  return (
    <div style={{ minHeight: '100vh', position: 'relative', paddingTop: 56 }}>
      {/* Stadium background */}
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

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1280,
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        {/* Header */}
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
              {isOwner ? '⚙️ Admin Panel' : 'Active Matches'}
            </h1>
          </div>

          {/* Donation pill */}
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
              fontFamily: "'Rajdhani',sans-serif",
            }}
          >
            ⚡ Connect MetaMask to place predictions
          </div>
        )}

        {/* ── ADMIN VIEW ── */}
        {isOwner && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {/* Create match card */}
            <div
              className="glass"
              style={{ padding: '1.75rem', maxWidth: 640 }}
            >
              <div
                style={{
                  fontSize: '.6rem',
                  fontFamily: "'Orbitron',monospace",
                  letterSpacing: '.14em',
                  color: 'var(--neon-blue)',
                  marginBottom: '1.25rem',
                }}
              >
                CREATE NEW MATCH
              </div>

              <div
                style={{
                  fontSize: '.78rem',
                  color: 'rgba(180,210,230,.45)',
                  marginBottom: '.65rem',
                  fontFamily: "'Rajdhani',sans-serif",
                }}
              >
                Select Team A
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '.45rem',
                  marginBottom: '1.1rem',
                }}
              >
                {PSL_TEAMS.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTeamA(t.name)}
                    style={{
                      padding: '.4rem .85rem',
                      borderRadius: 8,
                      border:
                        teamA === t.name
                          ? '1px solid var(--neon-green)'
                          : '1px solid rgba(255,255,255,.1)',
                      background:
                        teamA === t.name
                          ? 'rgba(0,255,136,.1)'
                          : 'rgba(255,255,255,.03)',
                      color:
                        teamA === t.name
                          ? 'var(--neon-green)'
                          : 'rgba(180,210,230,.6)',
                      fontSize: '.78rem',
                      fontFamily: "'Rajdhani',sans-serif",
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                  >
                    {t.emoji} {t.name}
                  </button>
                ))}
              </div>

              <div
                style={{
                  fontSize: '.78rem',
                  color: 'rgba(180,210,230,.45)',
                  marginBottom: '.65rem',
                  fontFamily: "'Rajdhani',sans-serif",
                }}
              >
                Select Team B
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '.45rem',
                  marginBottom: '1.5rem',
                }}
              >
                {PSL_TEAMS.filter((t) => t.name !== teamA).map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTeamB(t.name)}
                    style={{
                      padding: '.4rem .85rem',
                      borderRadius: 8,
                      border:
                        teamB === t.name
                          ? '1px solid #ff6688'
                          : '1px solid rgba(255,255,255,.1)',
                      background:
                        teamB === t.name
                          ? 'rgba(255,100,136,.1)'
                          : 'rgba(255,255,255,.03)',
                      color:
                        teamB === t.name ? '#ff6688' : 'rgba(180,210,230,.6)',
                      fontSize: '.78rem',
                      fontFamily: "'Rajdhani',sans-serif",
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                  >
                    {t.emoji} {t.name}
                  </button>
                ))}
              </div>

              {/* Preview */}
              {teamA && teamB && (
                <div
                  style={{
                    marginBottom: '1.25rem',
                    padding: '.9rem 1.1rem',
                    background: 'rgba(0,212,255,.04)',
                    border: '1px solid rgba(0,212,255,.12)',
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    fontFamily: "'Rajdhani',sans-serif",
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: 'var(--neon-green)' }}>{teamA}</span>
                  <span style={{ color: 'rgba(180,210,230,.3)' }}>VS</span>
                  <span style={{ color: '#ff6688' }}>{teamB}</span>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={handleCreateMatch}
                disabled={!teamA || !teamB || creating}
                style={{ width: '100%', fontSize: '.82rem', padding: '.75rem' }}
              >
                {creating ? <span className="spinner" /> : '⚡ Create Match'}
              </button>
            </div>

            {/* Admin match list */}
            {matches.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '.6rem',
                    fontFamily: "'Orbitron',monospace",
                    letterSpacing: '.14em',
                    color: 'rgba(180,210,230,.35)',
                    marginBottom: '1rem',
                  }}
                >
                  ACTIVE MATCHES ({matches.length})
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {matches.map((m) => (
                    <MatchCard
                      key={m.matchId}
                      match={m}
                      account={account}
                      isAdmin={true}
                      onResolved={load}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── USER VIEW ── */}
        {!isOwner && (
          <>
            {loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '5rem',
                  color: 'var(--neon-blue)',
                }}
              >
                <div
                  className="spinner"
                  style={{
                    width: 36,
                    height: 36,
                    margin: '0 auto 1rem',
                    borderWidth: 3,
                  }}
                />
                <div
                  className="font-orbitron"
                  style={{ fontSize: '.8rem', letterSpacing: '.1em' }}
                >
                  Loading match...
                </div>
              </div>
            )}

            {error && !loading && (
              <div
                style={{
                  color: '#ff6688',
                  fontFamily: "'Rajdhani',sans-serif",
                }}
              >
                {error}
              </div>
            )}

            {!loading && !error && !activeMatch && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '6rem 2rem',
                  background: 'rgba(0,212,255,.02)',
                  border: '1px solid rgba(0,212,255,.08)',
                  borderRadius: 16,
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏏</div>
                <div
                  className="font-orbitron"
                  style={{
                    color: 'var(--neon-blue)',
                    fontSize: '.9rem',
                    marginBottom: '.5rem',
                  }}
                >
                  No Active Matches
                </div>
                <div
                  style={{
                    color: 'rgba(180,210,230,.35)',
                    fontFamily: "'Rajdhani',sans-serif",
                  }}
                >
                  Check back soon — the admin will schedule the next PSL match
                </div>
              </div>
            )}

            {/* SPOTLIGHT MATCH */}
            {!loading && !error && activeMatch && (
              <div
                style={{
                  maxWidth: 700,
                  margin: '0 auto',
                  // spotlight glow effect
                  filter: 'drop-shadow(0 0 60px rgba(0,212,255,.08))',
                }}
              >
                {/* Spotlight label */}
                <div
                  style={{
                    textAlign: 'center',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '.5rem',
                  }}
                >
                  <span className="pulse-dot" />
                  <span
                    style={{
                      fontSize: '.6rem',
                      fontFamily: "'Orbitron',monospace",
                      letterSpacing: '.18em',
                      color: 'var(--neon-blue)',
                    }}
                  >
                    LIVE MATCH · PLACE YOUR PREDICTION
                  </span>
                  <span className="pulse-dot" />
                </div>

                <MatchCard
                  match={activeMatch}
                  account={account}
                  isAdmin={false}
                  onResolved={load}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
