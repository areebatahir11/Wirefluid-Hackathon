'use client'
import { useState, useEffect } from 'react'
import {
  fetchActiveMatches,
  getDonationRead,
  formatETH,
  getOwner,
  createMatchAdmin,
} from '../../lib/ethers'

import MatchCard from '../../components/MatchCard'
import ConnectWallet from '../../lib/connectWallet'

export default function Dashboard() {
  const [account, setAccount] = useState(null)
  const [owner, setOwner] = useState(null)
  const [isOwner, setIsOwner] = useState(false)

  const [matches, setMatches] = useState([])
  const [donated, setDonated] = useState('0.0000')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // OWNER FETCH
  useEffect(() => {
    const loadOwner = async () => {
      const o = await getOwner()
      setOwner(o)
    }
    loadOwner()
  }, [])

  // OWNER CHECK
  useEffect(() => {
    if (!account || !owner) return setIsOwner(false)

    setIsOwner(account.toLowerCase() === owner.toLowerCase())
  }, [account, owner])

  // LOAD DATA
  useEffect(() => {
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

    load()
  }, [])

  const handleCreateMatch = async () => {
    const now = Math.floor(Date.now() / 1000)

    const start = now + 300
    const lock = now + 120

    await createMatchAdmin(teamA, teamB, start, lock)

    alert('Match Created!')
    window.location.reload()
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* WALLET (UNCHANGED POSITION/UI) */}
      {mounted && (
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <ConnectWallet account={account} setAccount={setAccount} />
        </div>
      )}

      {/* ADMIN PANEL (UNCHANGED UI) */}
      {isOwner && (
        <div
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            border: '1px solid rgba(0,255,255,.2)',
            borderRadius: 10,
          }}
        >
          <h3 style={{ color: '#00d4ff' }}>⚙️ Admin Panel</h3>

          <input
            placeholder="Team A"
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
          />
          <input
            placeholder="Team B"
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
          />

          <button onClick={handleCreateMatch}>Create Match</button>
        </div>
      )}

      {/* BACKGROUND (UNCHANGED) */}
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

      {/* MAIN CONTENT (UNCHANGED) */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1280,
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        {/* HEADER (UNCHANGED) */}
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

          {/* DONATION PILL (UNCHANGED) */}
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

        {/* WALLET WARNING (UNCHANGED) */}
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

        {/* LOADING */}
        {loading && <p>Loading...</p>}

        {/* ERROR */}
        {error && !loading && <p style={{ color: 'red' }}>{error}</p>}

        {/* MATCHES */}
        {!loading &&
          !error &&
          matches.map((m) => (
            <MatchCard key={m.matchId} match={m} account={account} />
          ))}
      </div>
    </div>
  )
}
