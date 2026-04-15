'use client'
// components/MatchCard.js
import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import {
  getCoreContract,
  ensureCorrectNetwork,
  formatETH,
  OUTCOME,
  STATUS,
  getTeamInfo,
  resolveMatchAdmin,
  getOwner,
  getCoreRead,
} from '../lib/ethers'
import { toast } from './Toast'
import Confetti from './Confetti'

// ── Countdown hook ────────────────────────────────────────
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

// ── NFT tiers ─────────────────────────────────────────────
const TIER = [
  {
    min: 1,
    label: 'Bronze',
    emoji: '🥉',
    color: '#cd7f32',
    img: '/bronze.png',
  },
  {
    min: 2,
    label: 'Silver',
    emoji: '🥈',
    color: '#c0c0c0',
    img: '/silver.png',
  },
  { min: 3, label: 'Gold', emoji: '🏆', color: '#ffd700', img: '/gold.png' },
]

function getTier(correct) {
  let t = null
  for (const tier of TIER) {
    if (correct >= tier.min) t = tier
  }
  return t
}

export default function MatchCard({ match, account, isAdmin, onResolved }) {
  const [choice, setChoice] = useState(null) // OUTCOME enum
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)
  const [predicted, setPredicted] = useState(false)
  const [resolving, setResolving] = useState(false)

  // Post-resolve state
  const [resolved, setResolved] = useState(match.status === STATUS.RESOLVED)
  const [winnerOutcome, setWinnerOutcome] = useState(match.result ?? null) // OUTCOME
  const [userWon, setUserWon] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // NFT minting
  const [minting, setMinting] = useState(false)
  const [minted, setMinted] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(match.prediction?.claimed ?? false)

  const teamA = getTeamInfo(match.teamA)
  const teamB = getTeamInfo(match.teamB)

  const { display, expired: lockExpired, urgent } = useTimer(match.lockTime)

  const now = Math.floor(Date.now() / 1000)
  const isLocked = lockExpired || now >= match.lockTime
  const isStarted = now >= match.startTime
  const pool = formatETH(match.totalStaked)

  // Load existing prediction + correct count
  useEffect(() => {
    if (!account || !match.prediction) return
    if (
      match.prediction.stakeAmount &&
      BigInt(match.prediction.stakeAmount) > 0n
    ) {
      setPredicted(true)
      setChoice(match.prediction.choice)
      setClaimed(match.prediction.claimed)
    }
    if (match.status === STATUS.RESOLVED) {
      setResolved(true)
      setWinnerOutcome(match.result)
      const won = match.prediction?.choice === match.result
      setUserWon(won)
    }
  }, [account, match])

  // Load correct predictions count
  useEffect(() => {
    if (!account) return
    getCoreRead()
      .correctPredictions(account)
      .then((n) => setCorrectCount(Number(n)))
      .catch(() => {})
  }, [account, minted])

  // ── Place prediction ────────────────────────────────────
  const handlePredict = async () => {
    if (!choice || !stake) return
    try {
      setLoading(true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.placePrediction(match.matchId, choice, {
        value: ethers.parseEther(stake),
      })
      toast.info('Waiting confirmation...')
      await tx.wait()
      setPredicted(true)
      toast.success('Prediction placed! 🎉')
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Admin: resolve match randomly ──────────────────────
  const handleResolve = async () => {
    try {
      setResolving(true)
      // 1 = TEAM_A, 2 = TEAM_B  (no draw for cricket)
      const random = Math.random() < 0.5 ? OUTCOME.TEAM_A : OUTCOME.TEAM_B
      await resolveMatchAdmin(match.matchId, random)

      setWinnerOutcome(random)
      setResolved(true)
      if (predicted && choice === random) {
        setUserWon(true)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
      toast.success('Match resolved! 🏆')
      onResolved?.()
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Resolve failed')
    } finally {
      setResolving(false)
    }
  }

  // ── Claim reward ────────────────────────────────────────
  const handleClaim = async () => {
    try {
      setClaiming(true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.claimReward(match.matchId)
      toast.info('Claiming reward...')
      await tx.wait()
      setClaimed(true)
      toast.success('Reward claimed! 💰')
      // Refresh correct count
      const n = await getCoreRead().correctPredictions(account)
      setCorrectCount(Number(n))
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Claim failed')
    } finally {
      setClaiming(false)
    }
  }

  // ── Mint NFT ────────────────────────────────────────────
  const handleMintNFT = async () => {
    try {
      setMinting(true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.mintPredictorNft(match.matchId)
      toast.info('Minting your badge...')
      await tx.wait()
      setMinted(true)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 6000)
      toast.success('NFT minted! 🎖️')
      const n = await getCoreRead().correctPredictions(account)
      setCorrectCount(Number(n))
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Mint failed')
    } finally {
      setMinting(false)
    }
  }

  const timerColor = isLocked
    ? '#ff3355'
    : urgent
      ? '#ff8800'
      : 'var(--neon-blue)'

  const winnerName =
    winnerOutcome === OUTCOME.TEAM_A
      ? match.teamA
      : winnerOutcome === OUTCOME.TEAM_B
        ? match.teamB
        : 'Draw'

  const tier = getTier(correctCount)

  return (
    <>
      {showConfetti && <Confetti />}

      <div
        className="glass card-hover"
        style={{
          padding: '1.75rem',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
        }}
      >
        {/* Top glow stripe */}
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

        {/* Match ID + status badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              fontSize: '.58rem',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.14em',
              color: 'rgba(180,210,230,.38)',
            }}
          >
            MATCH #{match.matchId} · PSL
          </div>
          {resolved ? (
            <span className="badge-resolved">✓ Resolved</span>
          ) : isLocked ? (
            <span className="badge-locked">🔒 Locked</span>
          ) : (
            <span className="badge-active">
              <span className="pulse-dot" />
              Live
            </span>
          )}
        </div>

        {/* Teams */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            gap: '1rem',
          }}
        >
          {/* Team A */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                fontSize: '2.5rem',
                filter: `drop-shadow(0 0 12px ${teamA.color})`,
                marginBottom: '.35rem',
                lineHeight: 1,
              }}
            >
              {teamA.emoji}
            </div>
            <div
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: '.72rem',
                fontWeight: 700,
                color: teamA.color,
                letterSpacing: '.04em',
              }}
            >
              {match.teamA}
            </div>
          </div>

          {/* VS divider */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: '1.1rem',
                fontWeight: 900,
                color: 'rgba(180,210,230,.2)',
                letterSpacing: '.1em',
              }}
            >
              VS
            </div>
          </div>

          {/* Team B */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                fontSize: '2.5rem',
                filter: `drop-shadow(0 0 12px ${teamB.color})`,
                marginBottom: '.35rem',
                lineHeight: 1,
              }}
            >
              {teamB.emoji}
            </div>
            <div
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: '.72rem',
                fontWeight: 700,
                color: teamB.color,
                letterSpacing: '.04em',
              }}
            >
              {match.teamB}
            </div>
          </div>
        </div>

        {/* Timer + Pool row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            className="glass-sm"
            style={{ padding: '.75rem', textAlign: 'center' }}
          >
            <div
              style={{
                fontSize: '.55rem',
                fontFamily: "'Orbitron',monospace",
                letterSpacing: '.12em',
                color: 'rgba(180,210,230,.35)',
                marginBottom: '.3rem',
              }}
            >
              CLOSES IN
            </div>
            <div
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: '1.15rem',
                fontWeight: 700,
                color: timerColor,
                letterSpacing: '.08em',
              }}
            >
              {isLocked ? '──:──:──' : display}
            </div>
          </div>

          <div
            className="glass-sm"
            style={{ padding: '.75rem', textAlign: 'center' }}
          >
            <div
              style={{
                fontSize: '.55rem',
                fontFamily: "'Orbitron',monospace",
                letterSpacing: '.12em',
                color: 'rgba(180,210,230,.35)',
                marginBottom: '.3rem',
              }}
            >
              TOTAL POOL
            </div>
            <div
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--neon-gold)',
              }}
            >
              {pool} <span style={{ fontSize: '.65rem' }}>ETH</span>
            </div>
          </div>
        </div>

        {/* ── RESOLVED: Winner Banner ── */}
        {resolved && winnerOutcome !== null && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '1.1rem',
              background: userWon
                ? 'rgba(0,255,136,.06)'
                : 'rgba(255,50,80,.05)',
              border: `1px solid ${userWon ? 'rgba(0,255,136,.25)' : 'rgba(255,50,80,.2)'}`,
              borderRadius: 12,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '.4rem' }}>
              {userWon ? '🏆' : '💔'}
            </div>
            <div
              className="font-orbitron"
              style={{
                fontSize: '.85rem',
                color: userWon ? 'var(--neon-green)' : '#ff6688',
                fontWeight: 700,
                marginBottom: '.25rem',
              }}
            >
              {userWon ? 'You Won!' : 'Match Resolved'}
            </div>
            <div
              style={{
                fontSize: '.78rem',
                color: 'rgba(180,210,230,.55)',
                fontFamily: "'Rajdhani',sans-serif",
              }}
            >
              Winner:{' '}
              <span style={{ color: '#fff', fontWeight: 700 }}>
                {winnerName}
              </span>
            </div>
          </div>
        )}

        {/* ── PREDICTION UI (not locked, not yet predicted) ── */}
        {!resolved && !isLocked && !predicted && account && (
          <div>
            {/* Team choice buttons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '.5rem',
                marginBottom: '1rem',
              }}
            >
              <button
                onClick={() => setChoice(OUTCOME.TEAM_A)}
                style={{
                  padding: '.65rem',
                  borderRadius: 10,
                  border:
                    choice === OUTCOME.TEAM_A
                      ? `2px solid ${teamA.color}`
                      : '2px solid rgba(255,255,255,.08)',
                  background:
                    choice === OUTCOME.TEAM_A
                      ? `${teamA.color}18`
                      : 'rgba(255,255,255,.03)',
                  color:
                    choice === OUTCOME.TEAM_A
                      ? teamA.color
                      : 'rgba(180,210,230,.5)',
                  fontFamily: "'Rajdhani',sans-serif",
                  fontWeight: 700,
                  fontSize: '.82rem',
                  cursor: 'pointer',
                  transition: 'all .2s',
                }}
              >
                {teamA.emoji} {match.teamA}
              </button>

              <button
                onClick={() => setChoice(OUTCOME.DRAW)}
                style={{
                  padding: '.65rem .9rem',
                  borderRadius: 10,
                  border:
                    choice === OUTCOME.DRAW
                      ? '2px solid rgba(180,210,230,.5)'
                      : '2px solid rgba(255,255,255,.08)',
                  background:
                    choice === OUTCOME.DRAW
                      ? 'rgba(180,210,230,.08)'
                      : 'rgba(255,255,255,.03)',
                  color:
                    choice === OUTCOME.DRAW ? '#fff' : 'rgba(180,210,230,.4)',
                  fontFamily: "'Rajdhani',sans-serif",
                  fontWeight: 700,
                  fontSize: '.78rem',
                  cursor: 'pointer',
                  transition: 'all .2s',
                  whiteSpace: 'nowrap',
                }}
              >
                Draw
              </button>

              <button
                onClick={() => setChoice(OUTCOME.TEAM_B)}
                style={{
                  padding: '.65rem',
                  borderRadius: 10,
                  border:
                    choice === OUTCOME.TEAM_B
                      ? `2px solid ${teamB.color}`
                      : '2px solid rgba(255,255,255,.08)',
                  background:
                    choice === OUTCOME.TEAM_B
                      ? `${teamB.color}18`
                      : 'rgba(255,255,255,.03)',
                  color:
                    choice === OUTCOME.TEAM_B
                      ? teamB.color
                      : 'rgba(180,210,230,.5)',
                  fontFamily: "'Rajdhani',sans-serif",
                  fontWeight: 700,
                  fontSize: '.82rem',
                  cursor: 'pointer',
                  transition: 'all .2s',
                }}
              >
                {teamB.emoji} {match.teamB}
              </button>
            </div>

            {/* Stake input */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0.01"
                step="0.001"
                min="0.001"
                style={{
                  width: '100%',
                  padding: '.7rem 3.5rem .7rem 1rem',
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(0,212,255,.15)',
                  borderRadius: 10,
                  color: '#fff',
                  fontFamily: "'Orbitron',monospace",
                  fontSize: '.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '.7rem',
                  color: 'rgba(180,210,230,.4)',
                  fontFamily: "'Orbitron',monospace",
                }}
              >
                ETH
              </span>
            </div>

            {/* Place bet button */}
            <button
              className="btn-primary"
              onClick={handlePredict}
              disabled={loading || !choice || !stake}
              style={{ width: '100%', fontSize: '.82rem', padding: '.8rem' }}
            >
              {loading ? (
                <span className="spinner" />
              ) : choice ? (
                `🎯 Bet on ${
                  choice === OUTCOME.TEAM_A
                    ? match.teamA
                    : choice === OUTCOME.TEAM_B
                      ? match.teamB
                      : 'Draw'
                }`
              ) : (
                'Select a team first'
              )}
            </button>
          </div>
        )}

        {/* ── PREDICTED but not yet resolved ── */}
        {predicted && !resolved && (
          <div
            style={{
              padding: '.9rem 1rem',
              background: 'rgba(0,212,255,.05)',
              border: '1px solid rgba(0,212,255,.15)',
              borderRadius: 10,
              textAlign: 'center',
              fontFamily: "'Rajdhani',sans-serif",
              color: 'var(--neon-blue)',
              fontSize: '.88rem',
              fontWeight: 600,
            }}
          >
            ✓ Prediction placed — awaiting result
          </div>
        )}

        {/* ── LOCKED, no prediction ── */}
        {isLocked && !resolved && !predicted && (
          <div
            style={{
              padding: '.9rem 1rem',
              background: 'rgba(255,50,80,.04)',
              border: '1px solid rgba(255,50,80,.15)',
              borderRadius: 10,
              textAlign: 'center',
              fontFamily: "'Rajdhani',sans-serif",
              color: '#ff6688',
              fontSize: '.88rem',
            }}
          >
            🔒 Predictions are closed — you need to wait for results
          </div>
        )}

        {/* ── No wallet ── */}
        {!account && !resolved && (
          <div
            style={{
              padding: '.9rem',
              textAlign: 'center',
              color: 'rgba(180,210,230,.35)',
              fontFamily: "'Rajdhani',sans-serif",
              fontSize: '.85rem',
            }}
          >
            Connect MetaMask to place a prediction
          </div>
        )}

        {/* ── Winner actions: Claim + Mint ── */}
        {resolved && predicted && userWon && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '.65rem',
              marginTop: '.25rem',
            }}
          >
            {!claimed && (
              <button
                className="btn-green"
                onClick={handleClaim}
                disabled={claiming}
                style={{ width: '100%', fontSize: '.82rem', padding: '.8rem' }}
              >
                {claiming ? <span className="spinner" /> : '💰 Claim Reward'}
              </button>
            )}

            {claimed && !minted && tier && (
              <button
                className="btn-primary"
                onClick={handleMintNFT}
                disabled={minting}
                style={{
                  width: '100%',
                  fontSize: '.82rem',
                  padding: '.8rem',
                  background: `linear-gradient(135deg, ${tier.color}88, ${tier.color}44)`,
                  border: `1px solid ${tier.color}60`,
                }}
              >
                {minting ? (
                  <span className="spinner" />
                ) : (
                  `${tier.emoji} Get Digital Reward — ${tier.label} NFT`
                )}
              </button>
            )}

            {minted && (
              <NFTRewardDisplay tier={tier} correctCount={correctCount} />
            )}

            {claimed && (
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '.72rem',
                  color: 'rgba(180,210,230,.35)',
                  fontFamily: "'Rajdhani',sans-serif",
                }}
              >
                ✓ Reward claimed
                {correctCount > 0 && (
                  <span
                    style={{ color: 'var(--neon-gold)', marginLeft: '.5rem' }}
                  >
                    · {correctCount} correct prediction
                    {correctCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN: Resolve button ── */}
        {isAdmin && isStarted && !resolved && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            style={{
              marginTop: '1rem',
              width: '100%',
              padding: '.7rem',
              borderRadius: 9,
              border: '1px solid rgba(255,140,0,.3)',
              background: 'rgba(255,140,0,.08)',
              color: '#ffaa44',
              fontFamily: "'Orbitron',monospace",
              fontSize: '.72rem',
              letterSpacing: '.06em',
              cursor: 'pointer',
              transition: 'all .2s',
            }}
          >
            {resolving ? (
              <span className="spinner" />
            ) : (
              '⚡ Resolve Match (Admin)'
            )}
          </button>
        )}
      </div>
    </>
  )
}

// ── NFT Reward Display ────────────────────────────────────
function NFTRewardDisplay({ tier, correctCount }) {
  if (!tier) return null
  return (
    <div
      style={{
        padding: '1.25rem',
        background: `rgba(${tier.color === '#ffd700' ? '255,215,0' : tier.color === '#c0c0c0' ? '192,192,192' : '205,127,50'},.06)`,
        border: `1px solid ${tier.color}40`,
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <img
        src={tier.img}
        alt={tier.label}
        style={{
          width: 100,
          height: 100,
          objectFit: 'contain',
          borderRadius: 12,
          marginBottom: '.75rem',
          filter: `drop-shadow(0 0 16px ${tier.color}80)`,
        }}
      />
      <div
        style={{
          fontFamily: "'Orbitron',monospace",
          fontSize: '.8rem',
          fontWeight: 700,
          color: tier.color,
          marginBottom: '.2rem',
        }}
      >
        {tier.emoji} {tier.label} Predictor
      </div>
      <div
        style={{
          fontSize: '.7rem',
          color: 'rgba(180,210,230,.45)',
          fontFamily: "'Rajdhani',sans-serif",
        }}
      >
        {correctCount} correct prediction{correctCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
