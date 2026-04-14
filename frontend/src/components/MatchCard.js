'use client'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import {
  getCoreContract,
  ensureCorrectNetwork,
  formatETH,
  OUTCOME,
} from '../lib/ethers'
import { toast } from './Toast'

// ── Countdown hook ──────────────────────────────────────
function useCountdown(lockTime) {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const lockMs = Number(lockTime) * 1000
    const update = () => setTimeLeft(Math.max(0, lockMs - Date.now()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lockTime])

  const secs = Math.floor(timeLeft / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const fmt = (n) => String(n).padStart(2, '0')

  return {
    display: `${fmt(h)}:${fmt(m)}:${fmt(s)}`,
    expired: timeLeft === 0,
    urgent: secs < 300, // < 5 min
  }
}

export default function MatchCard({ match, account }) {
  const [choice, setChoice] = useState(null) // 1=TEAM_A, 2=TEAM_B, 3=DRAW
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)
  const [predicted, setPredicted] = useState(false)

  const { display, expired, urgent } = useCountdown(match.lockTime)

  const lockTime = Number(match.lockTime)
  const startTime = Number(match.startTime)
  const now = Math.floor(Date.now() / 1000)
  const isLocked = now >= lockTime
  const isStarted = now >= startTime
  const totalPool = formatETH(match.totalStaked)

  const handlePredict = async () => {
    if (!account) {
      toast.error('Connect wallet first')
      return
    }
    if (!choice) {
      toast.error('Select a team first')
      return
    }
    if (!stake || parseFloat(stake) <= 0) {
      toast.error('Enter a valid stake amount')
      return
    }

    try {
      setLoading(true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.placePrediction(match.matchId, choice, {
        value: ethers.parseEther(stake),
      })
      toast.info('Transaction submitted...')
      await tx.wait()
      setPredicted(true)
      toast.success('Prediction placed successfully! 🎉')
    } catch (e) {
      const msg = e?.reason || e?.message || 'Transaction failed'
      toast.error(msg.length > 80 ? msg.slice(0, 80) + '...' : msg)
    } finally {
      setLoading(false)
    }
  }

  const choiceLabel = { 1: match.teamA, 2: match.teamB, 3: 'DRAW' }

  return (
    <div
      className="glass card-hover"
      style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}
    >
      {/* Top glow line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: isLocked
            ? 'linear-gradient(90deg, transparent, #ff4466, transparent)'
            : 'linear-gradient(90deg, transparent, var(--neon-blue), var(--neon-green), transparent)',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'rgba(168,196,210,0.5)',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.1em',
              marginBottom: '0.35rem',
            }}
          >
            MATCH #{String(match.matchId)}
          </div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.2,
            }}
          >
            <span style={{ color: 'var(--neon-green)' }}>{match.teamA}</span>
            <span
              style={{
                color: 'rgba(168,196,210,0.5)',
                margin: '0 0.5rem',
                fontSize: '1rem',
              }}
            >
              vs
            </span>
            <span style={{ color: '#ff6688' }}>{match.teamB}</span>
          </div>
        </div>

        {isLocked ? (
          <span className="locked-badge">🔒 Locked</span>
        ) : (
          <span className="active-badge">
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            Live
          </span>
        )}
      </div>

      {/* Timer + Pool */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '0.75rem',
            border: `1px solid ${urgent && !isLocked ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.06)'}`,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.6rem',
              color: 'rgba(168,196,210,0.5)',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.08em',
              marginBottom: '0.3rem',
            }}
          >
            {isLocked ? 'LOCKED' : 'LOCKS IN'}
          </div>
          <div
            className="timer-ring"
            style={{
              fontSize: '1.3rem',
              color: isLocked
                ? '#ff4466'
                : urgent
                  ? '#ff8800'
                  : 'var(--neon-blue)',
              letterSpacing: '0.05em',
            }}
          >
            {isLocked ? '00:00:00' : display}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '0.75rem',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.6rem',
              color: 'rgba(168,196,210,0.5)',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.08em',
              marginBottom: '0.3rem',
            }}
          >
            TOTAL POOL
          </div>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--neon-gold)',
              fontFamily: "'Orbitron', monospace",
            }}
          >
            {totalPool} <span style={{ fontSize: '0.7rem' }}>ETH</span>
          </div>
        </div>
      </div>

      {/* Prediction section */}
      {predicted ? (
        <div
          style={{
            textAlign: 'center',
            padding: '1rem',
            background: 'rgba(0,255,136,0.05)',
            borderRadius: 8,
            border: '1px solid rgba(0,255,136,0.2)',
            color: 'var(--neon-green)',
            fontWeight: 600,
          }}
        >
          ✅ Predicted: <strong>{choiceLabel[choice]}</strong>
          <div
            style={{
              fontSize: '0.8rem',
              color: 'rgba(168,196,210,0.5)',
              marginTop: '0.25rem',
            }}
          >
            Stake: {stake} ETH
          </div>
        </div>
      ) : isLocked ? (
        <div
          style={{
            textAlign: 'center',
            padding: '1rem',
            background: 'rgba(255,68,102,0.05)',
            borderRadius: 8,
            border: '1px solid rgba(255,68,102,0.2)',
            color: '#ff6688',
            fontWeight: 600,
            fontSize: '0.9rem',
            fontFamily: "'Orbitron', monospace",
          }}
        >
          🔒 PREDICTIONS CLOSED
        </div>
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          {/* Choice buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`choice-btn ${choice === OUTCOME.TEAM_A ? 'selected-a' : ''}`}
              onClick={() => setChoice(OUTCOME.TEAM_A)}
            >
              {match.teamA}
            </button>
            <button
              className={`choice-btn ${choice === OUTCOME.DRAW ? 'selected-draw' : ''}`}
              onClick={() => setChoice(OUTCOME.DRAW)}
              style={{ flex: '0 0 auto', padding: '0.75rem 0.6rem' }}
            >
              Draw
            </button>
            <button
              className={`choice-btn ${choice === OUTCOME.TEAM_B ? 'selected-b' : ''}`}
              onClick={() => setChoice(OUTCOME.TEAM_B)}
            >
              {match.teamB}
            </button>
          </div>

          {/* Stake input */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                className="input-dark"
                placeholder="Stake (ETH)"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                min="0"
                step="0.001"
              />
              <span
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.75rem',
                  color: 'var(--neon-gold)',
                  fontFamily: "'Orbitron', monospace",
                }}
              >
                ETH
              </span>
            </div>
            <button
              className="btn-primary btn-glow-border"
              onClick={handlePredict}
              disabled={loading || !choice || !stake}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {loading ? <span className="spinner" /> : 'Place Bet'}
            </button>
          </div>

          {/* Split info */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              fontSize: '0.75rem',
              color: 'rgba(168,196,210,0.45)',
            }}
          >
            <span>🏆 35% winners</span>
            <span>💚 65% charity</span>
          </div>
        </div>
      )}
    </div>
  )
}
