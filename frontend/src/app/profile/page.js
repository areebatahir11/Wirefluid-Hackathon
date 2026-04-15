'use client'
// app/profile/page.js
import { useState, useEffect } from 'react'
import {
  ensureCorrectNetwork,
  getCoreContract,
  getCoreRead,
  getNFTRead,
  getDonationRead,
  fetchUserPredictions,
  formatETH,
  shortenAddr,
  OUTCOME,
  STATUS,
} from '../../lib/ethers'
import NFTCard from '../../components/NFTCard'
import { toast } from '../../components/Toast'
import { useAccount } from '../../lib/AccountContext'
import Confetti from '../../components/Confetti'

export default function Profile() {
  const { account } = useAccount()
  const [correct, setCorrect] = useState(0)
  const [myMatches, setMyMatches] = useState([])
  const [nfts, setNfts] = useState([])
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({})
  const [showConfetti, setShowConfetti] = useState(false)

  const setBusyFor = (key, val) => setBusy((p) => ({ ...p, [key]: val }))

  useEffect(() => {
    if (!account) {
      setLoading(false)
      return
    }
    load(account)
  }, [account])

  const load = async (addr) => {
    try {
      setLoading(true)
      const core = getCoreRead()
      const nftRead = getNFTRead()
      const donation = getDonationRead()

      const [correctCount, tokenIds, charityAddrs, predictions] =
        await Promise.all([
          core.correctPredictions(addr),
          nftRead.getUserNfts(addr),
          donation.getAllCharities(),
          fetchUserPredictions(addr),
        ])

      setCorrect(Number(correctCount))
      setMyMatches(predictions)

      const nftData = await Promise.all(
        tokenIds.map(async (id) => {
          const uri = await nftRead.tokenURI(id).catch(() => '')

          const meta = await fetch(ipfsToHttp(uri))
            .then((res) => res.json())
            .catch(() => ({}))

          return {
            tokenId: Number(id),
            metadata: meta,
          }
        }),
      )

      const cData = await Promise.all(
        charityAddrs.map(async (a) => {
          const info = await donation.getCharity(a)
          return { addr: a, name: info.name, received: info.totalReceived }
        }),
      )
      setCharities(cData)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const claimReward = async (matchId) => {
    try {
      setBusyFor(`reward_${matchId}`, true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.claimReward(matchId)
      toast.info('Claiming reward...')
      await tx.wait()
      toast.success('Reward claimed! 💰')
      await load(account)
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Claim failed')
    } finally {
      setBusyFor(`reward_${matchId}`, false)
    }
  }

  const claimRefund = async (matchId) => {
    try {
      setBusyFor(`refund_${matchId}`, true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.claimRefund(matchId)
      toast.info('Processing refund...')
      await tx.wait()
      toast.success('Refund received!')
      await load(account)
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Refund failed')
    } finally {
      setBusyFor(`refund_${matchId}`, false)
    }
  }

  const mintNFT = async (matchId) => {
    try {
      setBusyFor(`mint_${matchId}`, true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.mintPredictorNft(matchId)
      toast.info('Minting NFT badge...')
      await tx.wait()
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 6000)
      toast.success('NFT minted! 🎖️')
      await load(account)
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Mint failed')
    } finally {
      setBusyFor(`mint_${matchId}`, false)
    }
  }

  const upgradeNFT = async (tokenId) => {
    try {
      setBusyFor(`upgrade_${tokenId}`, true)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.upgradeNft(tokenId)
      toast.info('Upgrading NFT...')
      await tx.wait()
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 6000)
      toast.success('NFT upgraded! ⬆️')
      await load(account)
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Upgrade failed')
    } finally {
      setBusyFor(`upgrade_${tokenId}`, false)
    }
  }

  const choiceLabel = (m) => {
    if (m.prediction.choice === OUTCOME.TEAM_A) return m.teamA
    if (m.prediction.choice === OUTCOME.TEAM_B) return m.teamB
    return 'Draw'
  }

  const isWinner = (m) =>
    m.status === STATUS.RESOLVED && m.prediction.choice === m.result
  const isCancelled = (m) => m.status === STATUS.CANCELLED

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        paddingTop: 56,
        paddingBottom: '4rem',
      }}
    >
      {showConfetti && <Confetti />}

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(ellipse at 20% 10%, rgba(0,80,180,.06), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(0,200,100,.04), transparent 55%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1100,
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              fontSize: '.6rem',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.16em',
              color: 'var(--neon-green)',
              marginBottom: '.4rem',
            }}
          >
            PREDICTOR PROFILE
          </div>
          <h1
            className="font-orbitron"
            style={{
              fontSize: 'clamp(1.6rem,4vw,2.4rem)',
              fontWeight: 900,
              color: '#fff',
            }}
          >
            My Dashboard
          </h1>
        </div>

        {/* Not connected */}
        {!account && (
          <div
            style={{
              textAlign: 'center',
              padding: '5rem 2rem',
              background: 'rgba(0,212,255,.03)',
              border: '1px solid rgba(0,212,255,.1)',
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔌</div>
            <div
              className="font-orbitron"
              style={{
                fontSize: '1rem',
                color: 'var(--neon-blue)',
                marginBottom: '.4rem',
              }}
            >
              Wallet Not Connected
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani',sans-serif",
                color: 'rgba(180,210,230,.4)',
              }}
            >
              Connect MetaMask to see your predictions and NFTs
            </div>
          </div>
        )}

        {/* Loading */}
        {account && loading && (
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
              Loading profile...
            </div>
          </div>
        )}

        {account && !loading && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {/* Profile card */}
            <div
              className="glass"
              style={{
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background:
                    'linear-gradient(135deg,var(--neon-blue),var(--neon-green))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                }}
              >
                🏏
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    fontSize: '.6rem',
                    fontFamily: "'Orbitron',monospace",
                    letterSpacing: '.1em',
                    color: 'rgba(180,210,230,.4)',
                    marginBottom: '.28rem',
                  }}
                >
                  CONNECTED WALLET
                </div>
                <div
                  style={{
                    fontFamily: "'Orbitron',monospace",
                    fontSize: '.82rem',
                    color: '#fff',
                    wordBreak: 'break-all',
                  }}
                >
                  {account}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <MiniStat
                  value={correct}
                  label="Correct"
                  color="var(--neon-green)"
                />
                <MiniStat
                  value={nfts.length}
                  label="NFTs"
                  color="var(--neon-gold)"
                />
                <MiniStat
                  value={myMatches.length}
                  label="Predicted"
                  color="var(--neon-blue)"
                />
              </div>
            </div>

            {/* Rank progress */}
            {correct > 0 && (
              <div className="glass-sm" style={{ padding: '1.1rem 1.3rem' }}>
                <div
                  style={{
                    fontSize: '.6rem',
                    fontFamily: "'Orbitron',monospace",
                    letterSpacing: '.12em',
                    color: 'rgba(180,210,230,.38)',
                    marginBottom: '.9rem',
                  }}
                >
                  RANK PROGRESS
                </div>
                <div
                  style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}
                >
                  <ProgressBar
                    label="Bronze"
                    emoji="🥉"
                    required={1}
                    current={correct}
                    color="#cd7f32"
                  />
                  <ProgressBar
                    label="Silver"
                    emoji="🥈"
                    required={2}
                    current={correct}
                    color="#c0c0c0"
                  />
                  <ProgressBar
                    label="Gold"
                    emoji="🏆"
                    required={3}
                    current={correct}
                    color="#ffd700"
                  />
                </div>
              </div>
            )}

            {/* My Predictions */}
            <Section title="My Predictions" icon="🎯" count={myMatches.length}>
              {myMatches.length === 0 ? (
                <Empty text="No predictions yet — go to the Arena and place your first bet!" />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '.6rem',
                  }}
                >
                  {myMatches.map((m) => {
                    const won = isWinner(m)
                    const cancelled = isCancelled(m)
                    const claimed = m.prediction.claimed
                    const resolved = m.status === STATUS.RESOLVED
                    const pending = !resolved && !cancelled

                    return (
                      <div
                        key={m.matchId}
                        className="glass-sm"
                        style={{
                          padding: '1rem 1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '1rem',
                              color: '#fff',
                              marginBottom: '.18rem',
                            }}
                          >
                            <span style={{ color: 'var(--neon-green)' }}>
                              {m.teamA}
                            </span>
                            <span
                              style={{
                                color: 'rgba(180,210,230,.35)',
                                margin: '0 .35rem',
                                fontSize: '.85rem',
                              }}
                            >
                              vs
                            </span>
                            <span style={{ color: '#ff6688' }}>{m.teamB}</span>
                          </div>
                          <div
                            style={{
                              fontSize: '.78rem',
                              color: 'rgba(180,210,230,.45)',
                            }}
                          >
                            Your pick:{' '}
                            <span style={{ color: 'var(--neon-blue)' }}>
                              {choiceLabel(m)}
                            </span>
                            {'  '}·{'  '}
                            Stake:{' '}
                            <span style={{ color: 'var(--neon-gold)' }}>
                              {formatETH(m.prediction.stakeAmount)} ETH
                            </span>
                          </div>
                        </div>

                        <div>
                          {pending && (
                            <span className="badge-active">
                              <span className="pulse-dot" />
                              Pending
                            </span>
                          )}
                          {resolved && won && (
                            <span className="badge-win">🏆 Won</span>
                          )}
                          {resolved && !won && (
                            <span className="badge-lost">Lost</span>
                          )}
                          {cancelled && (
                            <span className="badge-resolved">Cancelled</span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '.45rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          {resolved && won && !claimed && (
                            <button
                              className="btn-green"
                              onClick={() => claimReward(m.matchId)}
                              disabled={busy[`reward_${m.matchId}`]}
                              style={{
                                fontSize: '.68rem',
                                padding: '.48rem 1rem',
                              }}
                            >
                              {busy[`reward_${m.matchId}`] ? (
                                <span className="spinner" />
                              ) : (
                                '💰 Claim'
                              )}
                            </button>
                          )}
                          {resolved && won && claimed && (
                            <button
                              className="btn-primary"
                              onClick={() => mintNFT(m.matchId)}
                              disabled={busy[`mint_${m.matchId}`]}
                              style={{
                                fontSize: '.68rem',
                                padding: '.48rem 1rem',
                              }}
                            >
                              {busy[`mint_${m.matchId}`] ? (
                                <span className="spinner" />
                              ) : (
                                '🎖️ Mint NFT'
                              )}
                            </button>
                          )}
                          {cancelled && !claimed && (
                            <button
                              className="btn-primary"
                              onClick={() => claimRefund(m.matchId)}
                              disabled={busy[`refund_${m.matchId}`]}
                              style={{
                                fontSize: '.68rem',
                                padding: '.48rem 1rem',
                                background:
                                  'linear-gradient(135deg,#ff7700,#ff3300)',
                              }}
                            >
                              {busy[`refund_${m.matchId}`] ? (
                                <span className="spinner" />
                              ) : (
                                '↩️ Refund'
                              )}
                            </button>
                          )}
                          {claimed && !resolved && (
                            <span
                              style={{
                                fontSize: '.72rem',
                                color: 'rgba(180,210,230,.28)',
                                fontFamily: "'Rajdhani',sans-serif",
                              }}
                            >
                              ✓ Settled
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            {/* NFT Collection */}
            <Section title="NFT Collection" icon="🎖️" count={nfts.length}>
              {nfts.length === 0 ? (
                <Empty text="Win matches, then mint your Predictor badge here. Bronze → Silver → Gold." />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                    gap: '1rem',
                  }}
                >
                  {nfts.map(({ tokenId, metadata }) => (
                    <NFTCard
                      key={tokenId}
                      tokenId={tokenId}
                      metadata={metadata}
                      onUpgrade={upgradeNFT}
                      upgrading={!!busy[`upgrade_${tokenId}`]}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* Charity impact */}
            <Section title="Charity Impact" icon="💚" count={charities.length}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))',
                  gap: '.9rem',
                }}
              >
                {charities.map((c) => (
                  <div
                    key={c.addr}
                    className="glass-sm"
                    style={{ padding: '1.15rem' }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: '#fff',
                        marginBottom: '.25rem',
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: '.68rem',
                        fontFamily: "'Orbitron',monospace",
                        color: 'rgba(180,210,230,.35)',
                        marginBottom: '.8rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      {shortenAddr(c.addr)}
                    </div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--neon-green)',
                        fontFamily: "'Orbitron',monospace",
                      }}
                    >
                      {formatETH(c.received)}{' '}
                      <span style={{ fontSize: '.7rem' }}>ETH</span>
                    </div>
                    <div
                      style={{
                        fontSize: '.7rem',
                        color: 'rgba(180,210,230,.38)',
                        marginTop: '.18rem',
                      }}
                    >
                      total received
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, count, children }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.55rem',
          marginBottom: '.9rem',
        }}
      >
        <span style={{ fontSize: '1.05rem' }}>{icon}</span>
        <h2
          className="font-orbitron"
          style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}
        >
          {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span
            style={{
              fontFamily: "'Orbitron',monospace",
              fontSize: '.62rem',
              color: 'var(--neon-blue)',
              background: 'rgba(0,212,255,.1)',
              border: '1px solid rgba(0,212,255,.22)',
              padding: '.15rem .55rem',
              borderRadius: 99,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function MiniStat({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="font-orbitron"
        style={{ fontSize: '1.5rem', fontWeight: 900, color }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '.65rem',
          color: 'rgba(180,210,230,.4)',
          fontFamily: "'Rajdhani',sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  )
}

function ProgressBar({ label, emoji, required, current, color }) {
  const pct = Math.min(100, (current / required) * 100)
  const done = current >= required
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '.35rem',
        }}
      >
        <span style={{ fontSize: '.8rem', color, fontWeight: 600 }}>
          {emoji} {label}
        </span>
        <span style={{ fontSize: '.7rem', color: 'rgba(180,210,230,.4)' }}>
          {current}/{required}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: 'rgba(255,255,255,.07)',
          borderRadius: 3,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: done ? color : `${color}70`,
            borderRadius: 3,
            transition: 'width .5s ease',
          }}
        />
      </div>
      {done && (
        <div
          style={{
            fontSize: '.62rem',
            color,
            marginTop: '.25rem',
            fontFamily: "'Orbitron',monospace",
          }}
        >
          ✓ ELIGIBLE
        </div>
      )}
    </div>
  )
}

function Empty({ text }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2rem',
        color: 'rgba(180,210,230,.32)',
        fontFamily: "'Rajdhani',sans-serif",
        fontSize: '.92rem',
      }}
    >
      {text}
    </div>
  )
}
