'use client'
import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import {
  getCoreContract,
  ensureCorrectNetwork,
  formatETH,
  OUTCOME,
  getTeamInfo,
} from '../lib/ethers'
import { toast } from './Toast'

// ── Countdown timer hook ──────────────────────────────────
function useTimer(lockTimeSec) {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    const lockMs = lockTimeSec * 1000
    const tick = () => setLeft(Math.max(0, lockMs - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockTimeSec])

  const totalSecs = Math.floor(left / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const pad = (n) => String(n).padStart(2, '0')

  return {
    display: `${pad(h)}:${pad(m)}:${pad(s)}`,
    expired: left === 0,
    urgent: totalSecs > 0 && totalSecs < 300,
  }
}

export default function MatchCard({ match, account }) {
  const [choice, setChoice] = useState(null) // OUTCOME.TEAM_A / TEAM_B / DRAW
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)
  const [predicted, setPredicted] = useState(false)

  const teamA = getTeamInfo(match.teamA)
  const teamB = getTeamInfo(match.teamB)

  const { display, expired, urgent } = useTimer(match.lockTime)

  const now = Math.floor(Date.now() / 1000)
  const isLocked = now >= match.lockTime
  const isStarted = now >= match.startTime
  const pool = formatETH(match.totalStaked)

  const handlePredict = async () => {
    if (!account) {
      toast.error('Connect wallet first')
      return
    }
    if (!choice) {
      toast.error('Choose a team first')
      return
    }
    if (!stake || parseFloat(stake) <= 0) {
      toast.error('Enter stake amount')
      return
    }

    try {
      setLoading(true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.placePrediction(match.matchId, choice, {
        value: ethers.parseEther(stake),
      })
      toast.info('Transaction submitted — waiting for confirmation...')
      await tx.wait()
      setPredicted(true)
      toast.success(
        `Prediction placed on ${choice === OUTCOME.TEAM_A ? match.teamA : choice === OUTCOME.TEAM_B ? match.teamB : 'Draw'}! 🎉`,
      )
    } catch (e) {
      const raw = e?.reason || e?.message || 'Transaction failed'
      toast.error(raw.length > 90 ? raw.slice(0, 90) + '...' : raw)
    } finally {
      setLoading(false)
    }
  }

  // Timer color
  const timerColor = isLocked
    ? '#ff3355'
    : urgent
      ? '#ff8800'
      : 'var(--neon-blue)'

  return (
    <div
      className="glass card-hover"
      style={{ padding: '1.4rem', position: 'relative', overflow: 'hidden' }}
    >
      {/* Top glow stripe — team A color → team B color */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: isLocked
            ? 'linear-gradient(90deg,transparent,#ff3355,transparent)'
            : `linear-gradient(90deg, transparent, ${teamA.color}, ${teamB.color}, transparent)`,
        }}
      />

      {/* ── Header: teams ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.1rem',
        }}
      >
        {/* Match ID + teams */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '.6rem',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.12em',
              color: 'rgba(180,210,230,.4)',
              marginBottom: '.4rem',
            }}
          >
            MATCH #{match.matchId} · PSL
          </div>

          {/* Team row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.6rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Team A */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '1.5rem',
                  filter: `drop-shadow(0 0 8px ${teamA.color})`,
                }}
              >
                {teamA.emoji}
              </span>
              <span
                style={{
                  fontSize: '.72rem',
                  fontWeight: 700,
                  color: teamA.color,
                  fontFamily: "'Rajdhani',sans-serif",
                  marginTop: 2,
                  textAlign: 'center',
                  maxWidth: 80,
                }}
              >
                {match.teamA}
              </span>
            </div>

            <div
              style={{
                padding: '0 .35rem',
                fontSize: '.7rem',
                fontFamily: "'Orbitron',monospace",
                color: 'rgba(180,210,230,.35)',
                fontWeight: 700,
              }}
            >
              VS
            </div>

            {/* Team B */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '1.5rem',
                  filter: `drop-shadow(0 0 8px ${teamB.color})`,
                }}
              >
                {teamB.emoji}
              </span>
              <span
                style={{
                  fontSize: '.72rem',
                  fontWeight: 700,
                  color: teamB.color,
                  fontFamily: "'Rajdhani',sans-serif",
                  marginTop: 2,
                  textAlign: 'center',
                  maxWidth: 80,
                }}
              >
                {match.teamB}
              </span>
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div>
          {isLocked ? (
            <span className="badge-locked">🔒 Locked</span>
          ) : (
            <span className="badge-active">
              <span className="pulse-dot" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* ── Stats row: timer + pool ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '.6rem',
          marginBottom: '1.1rem',
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,.35)',
            borderRadius: 8,
            padding: '.65rem .75rem',
            border: `1px solid ${urgent && !isLocked ? 'rgba(255,136,0,.35)' : 'rgba(255,255,255,.05)'}`,
          }}
        >
          <div
            style={{
              fontSize: '.58rem',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.1em',
              color: 'rgba(180,210,230,.4)',
              marginBottom: '.28rem',
            }}
          >
            {isLocked ? 'BETTING CLOSED' : 'CLOSES IN'}
          </div>
          <div
            className="timer-text"
            style={{ fontSize: '1.2rem', color: timerColor }}
          >
            {isLocked ? '──:──:──' : display}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,.35)',
            borderRadius: 8,
            padding: '.65rem .75rem',
            border: '1px solid rgba(255,255,255,.05)',
          }}
        >
          <div
            style={{
              fontSize: '.58rem',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.1em',
              color: 'rgba(180,210,230,.4)',
              marginBottom: '.28rem',
            }}
          >
            TOTAL POOL
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--neon-gold)',
              fontFamily: "'Orbitron',monospace",
            }}
          >
            {pool} <span style={{ fontSize: '.65rem' }}>ETH</span>
          </div>
        </div>
      </div>

      {/* ── Prediction UI ── */}
      {predicted ? (
        /* Success state */
        <div
          style={{
            textAlign: 'center',
            padding: '.9rem',
            background: 'rgba(0,255,136,.04)',
            borderRadius: 9,
            border: '1px solid rgba(0,255,136,.18)',
          }}
        >
          <div
            style={{
              color: 'var(--neon-green)',
              fontWeight: 700,
              marginBottom: '.2rem',
            }}
          >
            ✅ Prediction placed!
          </div>
          <div style={{ fontSize: '.78rem', color: 'rgba(180,210,230,.45)' }}>
            {stake} ETH on{' '}
            {choice === OUTCOME.TEAM_A
              ? match.teamA
              : choice === OUTCOME.TEAM_B
                ? match.teamB
                : 'Draw'}
          </div>
          <div
            style={{
              fontSize: '.7rem',
              color: 'rgba(0,255,136,.5)',
              marginTop: '.4rem',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.08em',
            }}
          >
            65% → CHARITY · 35% → WINNERS
          </div>
        </div>
      ) : isLocked ? (
        /* Locked state */
        <div
          style={{
            textAlign: 'center',
            padding: '.9rem',
            background: 'rgba(255,51,85,.03)',
            borderRadius: 9,
            border: '1px solid rgba(255,51,85,.15)',
            fontFamily: "'Orbitron',monospace",
            color: '#ff5577',
            fontSize: '.75rem',
            letterSpacing: '.08em',
          }}
        >
          🔒 PREDICTIONS CLOSED
        </div>
      ) : (
        /* Active prediction form */
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}
        >
          {/* Choice buttons */}
          <div style={{ display: 'flex', gap: '.45rem' }}>
            <button
              className={`choice-btn ${choice === OUTCOME.TEAM_A ? 'sel-a' : ''}`}
              onClick={() => setChoice(OUTCOME.TEAM_A)}
            >
              <div style={{ fontSize: '1rem', marginBottom: 2 }}>
                {teamA.emoji}
              </div>
              <div>{match.teamA.split(' ')[0]}</div>
              <div style={{ fontSize: '.55rem', opacity: 0.7 }}>TEAM A</div>
            </button>

            <button
              className={`choice-btn ${choice === OUTCOME.DRAW ? 'sel-draw' : ''}`}
              onClick={() => setChoice(OUTCOME.DRAW)}
              style={{ flex: '0 0 52px' }}
            >
              <div style={{ fontSize: '.9rem', marginBottom: 2 }}>🤝</div>
              <div>Draw</div>
            </button>

            <button
              className={`choice-btn ${choice === OUTCOME.TEAM_B ? 'sel-b' : ''}`}
              onClick={() => setChoice(OUTCOME.TEAM_B)}
            >
              <div style={{ fontSize: '1rem', marginBottom: 2 }}>
                {teamB.emoji}
              </div>
              <div>{match.teamB.split(' ')[0]}</div>
              <div style={{ fontSize: '.55rem', opacity: 0.7 }}>TEAM B</div>
            </button>
          </div>

          {/* Stake input row */}
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                className="input-dark"
                placeholder="0.01"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                min="0"
                step="0.001"
              />
              <span
                style={{
                  position: 'absolute',
                  right: '.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '.7rem',
                  color: 'var(--neon-gold)',
                  fontFamily: "'Orbitron',monospace",
                  pointerEvents: 'none',
                }}
              >
                ETH
              </span>
            </div>
            <button
              className="btn-primary"
              onClick={handlePredict}
              disabled={loading || !choice || !stake}
              style={{
                flexShrink: 0,
                fontSize: '.68rem',
                padding: '.58rem 1.1rem',
              }}
            >
              {loading ? <span className="spinner" /> : 'Place Bet'}
            </button>
          </div>

          {/* Split info */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              fontSize: '.7rem',
              color: 'rgba(180,210,230,.35)',
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
