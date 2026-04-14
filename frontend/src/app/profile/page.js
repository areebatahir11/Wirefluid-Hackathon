'use client'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import {
  getCoreRead,
  getCoreContract,
  getNFTRead,
  getNFTContract,
  getDonationRead,
  getProvider,
  ensureCorrectNetwork,
  shortenAddr,
  formatETH,
  STATUS,
  OUTCOME,
  TIER_NAME,
} from '../../lib/ethers'
import NFTCard from '../../components/NFTCard'
import { toast } from '../../components/Toast'

export default function Profile() {
  const [account, setAccount] = useState(null)
  const [profile, setProfile] = useState(null)
  const [nfts, setNfts] = useState([])
  const [userMatches, setUserMatches] = useState([]) // matches user predicted
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)
  const [upgradingId, setUpgradingId] = useState(null)
  const [minting, setMinting] = useState({}) // matchId -> bool
  const [claiming, setClaiming] = useState({}) // matchId -> bool

  // ── Get account ──────────────────────────────────────
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

  // ── Load profile data ────────────────────────────────
  useEffect(() => {
    if (!account) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        const core = getCoreRead()
        const nftRead = getNFTRead()
        const donation = getDonationRead()

        // Correct predictions count
        const correct = await core.correctPredictions(account)

        // NFT token IDs
        const tokenIds = await nftRead.getUserNfts(account)
        const nftData = await Promise.all(
          tokenIds.map(async (id) => {
            const meta = await nftRead.getNftMetadata(id)
            return { tokenId: Number(id), metadata: meta }
          }),
        )
        setNfts(nftData)

        // All matches — find ones user predicted
        const totalMatches = await core.matchCounter()
        const matchList = []
        for (let i = 1; i <= Number(totalMatches); i++) {
          try {
            const pred = await core.getUserPrediction(i, account)
            if (Number(pred.stakeAmount) > 0) {
              const match = await core.getMatch(i)
              matchList.push({
                matchId: Number(match.matchId),
                teamA: match.teamA,
                teamB: match.teamB,
                status: Number(match.status),
                result: Number(match.result),
                winnerPool: match.winnerPool,
                prediction: {
                  choice: Number(pred.choice),
                  stakeAmount: pred.stakeAmount,
                  claimed: pred.claimed,
                },
              })
            }
          } catch {}
        }
        setUserMatches(matchList)

        // Charities
        const charityAddrs = await donation.getAllCharities()
        const charityData = await Promise.all(
          charityAddrs.map(async (addr) => {
            const info = await donation.getCharity(addr)
            return {
              addr,
              name: info.name,
              totalReceived: info.totalReceived,
              isActive: info.isActive,
            }
          }),
        )
        setCharities(charityData)

        setProfile({ correct: Number(correct) })
      } catch (e) {
        console.error('Profile load error:', e)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [account])

  // ── Claim reward ─────────────────────────────────────
  const handleClaimReward = async (matchId) => {
    try {
      setClaiming((p) => ({ ...p, [matchId]: true }))
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.claimReward(matchId)
      toast.info('Claiming reward...')
      await tx.wait()
      toast.success('Reward claimed successfully! 🎉')
      // Refresh
      setUserMatches((prev) =>
        prev.map((m) =>
          m.matchId === matchId
            ? { ...m, prediction: { ...m.prediction, claimed: true } }
            : m,
        ),
      )
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Claim failed')
    } finally {
      setClaiming((p) => ({ ...p, [matchId]: false }))
    }
  }

  // ── Claim refund ─────────────────────────────────────
  const handleClaimRefund = async (matchId) => {
    try {
      setClaiming((p) => ({ ...p, [matchId]: true }))
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.claimRefund(matchId)
      toast.info('Processing refund...')
      await tx.wait()
      toast.success('Refund received!')
      setUserMatches((prev) =>
        prev.map((m) =>
          m.matchId === matchId
            ? { ...m, prediction: { ...m.prediction, claimed: true } }
            : m,
        ),
      )
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Refund failed')
    } finally {
      setClaiming((p) => ({ ...p, [matchId]: false }))
    }
  }

  // ── Mint NFT ─────────────────────────────────────────
  const handleMintNFT = async (matchId) => {
    try {
      setMinting((p) => ({ ...p, [matchId]: true }))
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.mintPredictorNFT(matchId)
      toast.info('Minting NFT...')
      await tx.wait()
      toast.success('NFT minted! Check your collection 🎖️')
      // Refresh NFTs
      const nftRead = getNFTRead()
      const tokenIds = await nftRead.getUserNfts(account)
      const nftData = await Promise.all(
        tokenIds.map(async (id) => {
          const meta = await nftRead.getNftMetadata(id)
          return { tokenId: Number(id), metadata: meta }
        }),
      )
      setNfts(nftData)
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Mint failed')
    } finally {
      setMinting((p) => ({ ...p, [matchId]: false }))
    }
  }

  // ── Upgrade NFT ──────────────────────────────────────
  const handleUpgradeNFT = async (tokenId) => {
    try {
      setUpgradingId(tokenId)
      await ensureCorrectNetwork()
      const core = await getCoreContract()
      const tx = await core.upgradeNFT(tokenId)
      toast.info('Upgrading NFT...')
      await tx.wait()
      toast.success('NFT upgraded! ⬆️')
      // Refresh
      const nftRead = getNFTRead()
      const tokenIds = await nftRead.getUserNfts(account)
      const nftData = await Promise.all(
        tokenIds.map(async (id) => {
          const meta = await nftRead.getNftMetadata(id)
          return { tokenId: Number(id), metadata: meta }
        }),
      )
      setNfts(nftData)
    } catch (e) {
      toast.error(e?.reason || e?.message || 'Upgrade failed')
    } finally {
      setUpgradingId(null)
    }
  }

  const OUTCOME_LABEL = { 0: 'None', 1: 'Team A', 2: 'Team B', 3: 'Draw' }

  // ── Render ───────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(0,100,200,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,255,136,0.05) 0%, transparent 60%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '1100px',
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
              color: 'var(--neon-green)',
              marginBottom: '0.5rem',
            }}
          >
            PREDICTOR PROFILE
          </div>
          <h1
            className="font-orbitron"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
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
              background: 'rgba(0,212,255,0.03)',
              border: '1px solid rgba(0,212,255,0.1)',
              borderRadius: 16,
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔌</div>
            <div
              className="font-orbitron"
              style={{
                fontSize: '1.1rem',
                marginBottom: '0.5rem',
                color: 'var(--neon-blue)',
              }}
            >
              Wallet Not Connected
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                color: 'rgba(168,196,210,0.5)',
              }}
            >
              Connect your MetaMask wallet to view your profile
            </div>
          </div>
        )}

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
              style={{ width: 36, height: 36, margin: '0 auto 1rem' }}
            />
            <div
              className="font-orbitron"
              style={{ fontSize: '0.85rem', letterSpacing: '0.1em' }}
            >
              Loading profile...
            </div>
          </div>
        )}

        {account && !loading && profile && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {/* ── Profile card ── */}
            <div
              className="glass"
              style={{
                padding: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, var(--neon-blue), var(--neon-green))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  flexShrink: 0,
                }}
              >
                🏏
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: "'Orbitron', monospace",
                    letterSpacing: '0.1em',
                    color: 'rgba(168,196,210,0.5)',
                    marginBottom: '0.35rem',
                  }}
                >
                  CONNECTED WALLET
                </div>
                <div
                  className="font-orbitron"
                  style={{
                    fontSize: '1rem',
                    color: '#fff',
                    marginBottom: '0.25rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {account}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <StatMini
                  value={profile.correct}
                  label="Correct Predictions"
                  color="var(--neon-green)"
                />
                <StatMini
                  value={nfts.length}
                  label="NFTs Owned"
                  color="var(--neon-gold)"
                />
                <StatMini
                  value={userMatches.length}
                  label="Matches Predicted"
                  color="var(--neon-blue)"
                />
              </div>
            </div>

            {/* ── My Predictions / Actions ── */}
            {userMatches.length > 0 && (
              <Section title="My Predictions" icon="🎯">
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {userMatches.map((m) => {
                    const isResolved = m.status === STATUS.RESOLVED
                    const isCancelled = m.status === STATUS.CANCELLED
                    const isWinner =
                      isResolved && m.prediction.choice === m.result
                    const isPending = !isResolved && !isCancelled
                    const alreadyClaimed = m.prediction.claimed

                    return (
                      <div
                        key={m.matchId}
                        className="glass-dark"
                        style={{
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Match info */}
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: '#fff',
                              fontSize: '1rem',
                              marginBottom: '0.2rem',
                            }}
                          >
                            <span style={{ color: 'var(--neon-green)' }}>
                              {m.teamA}
                            </span>
                            <span
                              style={{
                                color: 'rgba(168,196,210,0.4)',
                                margin: '0 0.4rem',
                              }}
                            >
                              vs
                            </span>
                            <span style={{ color: '#ff6688' }}>{m.teamB}</span>
                          </div>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: 'rgba(168,196,210,0.5)',
                            }}
                          >
                            Predicted:{' '}
                            <span style={{ color: 'var(--neon-blue)' }}>
                              {m.prediction.choice === OUTCOME.TEAM_A
                                ? m.teamA
                                : m.prediction.choice === OUTCOME.TEAM_B
                                  ? m.teamB
                                  : 'Draw'}
                            </span>{' '}
                            · Stake:{' '}
                            <span style={{ color: 'var(--neon-gold)' }}>
                              {formatETH(m.prediction.stakeAmount)} ETH
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div>
                          {isPending && (
                            <span className="active-badge">Pending</span>
                          )}
                          {isResolved && isWinner && (
                            <span
                              style={{
                                background: 'rgba(0,255,136,0.1)',
                                border: '1px solid var(--neon-green)',
                                color: 'var(--neon-green)',
                                fontFamily: "'Orbitron', monospace",
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                padding: '0.25rem 0.65rem',
                                borderRadius: 4,
                              }}
                            >
                              🏆 WON
                            </span>
                          )}
                          {isResolved && !isWinner && (
                            <span className="locked-badge">Lost</span>
                          )}
                          {isCancelled && (
                            <span
                              style={{
                                background: 'rgba(255,140,0,0.1)',
                                border: '1px solid #ff8c00',
                                color: '#ffaa44',
                                fontFamily: "'Orbitron', monospace",
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                padding: '0.25rem 0.65rem',
                                borderRadius: 4,
                              }}
                            >
                              Cancelled
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          {isResolved && isWinner && !alreadyClaimed && (
                            <>
                              <button
                                className="btn-green"
                                onClick={() => handleClaimReward(m.matchId)}
                                disabled={claiming[m.matchId]}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.5rem 1rem',
                                }}
                              >
                                {claiming[m.matchId] ? (
                                  <span className="spinner" />
                                ) : (
                                  '💰 Claim Reward'
                                )}
                              </button>
                              <button
                                className="btn-primary"
                                onClick={() => handleMintNFT(m.matchId)}
                                disabled={minting[m.matchId]}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.5rem 1rem',
                                }}
                              >
                                {minting[m.matchId] ? (
                                  <span className="spinner" />
                                ) : (
                                  '🎖️ Mint NFT'
                                )}
                              </button>
                            </>
                          )}
                          {isCancelled && !alreadyClaimed && (
                            <button
                              className="btn-primary"
                              onClick={() => handleClaimRefund(m.matchId)}
                              disabled={claiming[m.matchId]}
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.5rem 1rem',
                                background:
                                  'linear-gradient(135deg, #ff8800, #ff4400)',
                              }}
                            >
                              {claiming[m.matchId] ? (
                                <span className="spinner" />
                              ) : (
                                '↩️ Claim Refund'
                              )}
                            </button>
                          )}
                          {alreadyClaimed && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'rgba(168,196,210,0.35)',
                                fontFamily: "'Rajdhani', sans-serif",
                              }}
                            >
                              ✓ Claimed
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* ── NFT Collection ── */}
            <Section title="My NFT Collection" icon="🎖️">
              {nfts.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    color: 'rgba(168,196,210,0.35)',
                    fontFamily: "'Rajdhani', sans-serif",
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                    🏅
                  </div>
                  <div
                    className="font-orbitron"
                    style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}
                  >
                    No NFTs yet
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    Win matches and mint your first badge
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {nfts.map(({ tokenId, metadata }) => (
                    <NFTCard
                      key={tokenId}
                      tokenId={tokenId}
                      metadata={metadata}
                      onUpgrade={handleUpgradeNFT}
                      upgrading={upgradingId === tokenId}
                    />
                  ))}
                </div>
              )}

              {/* NFT progress */}
              {profile.correct > 0 && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: "'Orbitron', monospace",
                      color: 'rgba(168,196,210,0.4)',
                      letterSpacing: '0.1em',
                      marginBottom: '0.75rem',
                    }}
                  >
                    PREDICTION RANK PROGRESS
                  </div>
                  <div
                    style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}
                  >
                    <ProgressTier
                      label="Bronze"
                      required={1}
                      current={profile.correct}
                      color="#cd7f32"
                      emoji="🥉"
                    />
                    <ProgressTier
                      label="Silver"
                      required={5}
                      current={profile.correct}
                      color="#c0c0c0"
                      emoji="🥈"
                    />
                    <ProgressTier
                      label="Gold"
                      required={10}
                      current={profile.correct}
                      color="#ffd700"
                      emoji="🏆"
                    />
                  </div>
                </div>
              )}
            </Section>

            {/* ── Charity Impact ── */}
            <Section title="Charity Impact" icon="💚">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {charities.map((c) => (
                  <div
                    key={c.addr}
                    className="glass-dark"
                    style={{ padding: '1.25rem' }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: '#fff',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'rgba(168,196,210,0.4)',
                        marginBottom: '0.75rem',
                        fontFamily: "'Orbitron', monospace",
                      }}
                    >
                      {shortenAddr(c.addr)}
                    </div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--neon-green)',
                        fontFamily: "'Orbitron', monospace",
                      }}
                    >
                      {formatETH(c.totalReceived)} ETH
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'rgba(168,196,210,0.4)',
                        marginTop: '0.2rem',
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

// ── Sub-components ────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '1rem',
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h2
          className="font-orbitron"
          style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function StatMini({ value, label, color }) {
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
          fontSize: '0.7rem',
          color: 'rgba(168,196,210,0.45)',
          fontFamily: "'Rajdhani', sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  )
}

function ProgressTier({ label, required, current, color, emoji }) {
  const done = current >= required
  const pct = Math.min(100, (current / required) * 100)
  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.35rem',
        }}
      >
        <span style={{ fontSize: '0.8rem', color, fontWeight: 600 }}>
          {emoji} {label}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'rgba(168,196,210,0.45)' }}>
          {current}/{required}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 2,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: done ? color : `${color}80`,
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}
