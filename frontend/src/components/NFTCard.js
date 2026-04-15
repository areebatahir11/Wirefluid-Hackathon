'use client'
import { ipfsToHttp } from '../lib/ethers'

const TIER_CFG = {
  1: {
    name: 'Bronze',
    color: '#cd7f32',
    glow: 'rgba(205,127,50,.5)',
    emoji: '🥉',
    cls: 'tier-bronze',
    next: 'Silver',
  },
  2: {
    name: 'Silver',
    color: '#c0c0c0',
    glow: 'rgba(192,192,192,.5)',
    emoji: '🥈',
    cls: 'tier-silver',
    next: 'Gold',
  },
  3: {
    name: 'Gold',
    color: '#ffd700',
    glow: 'rgba(255,215,0,.5)',
    emoji: '🏆',
    cls: 'tier-gold',
    next: null,
  },
}

export default function NFTCard({ tokenId, metadata, onUpgrade, upgrading }) {
  const tier = Number(metadata?.tier)
  const cfg = TIER_CFG[tier] || TIER_CFG[1]

  // 🔥 FIXED IMAGE LOGIC (metadata + env fallback)
  const fallback =
    tier === 1
      ? process.env.NEXT_PUBLIC_BRONZE_URI
      : tier === 2
        ? process.env.NEXT_PUBLIC_SILVER_URI
        : process.env.NEXT_PUBLIC_GOLD_URI

  const imgUrl = ipfsToHttp(metadata?.image || fallback || '')

  const date = new Date(
    Number(metadata?.mintedAt || 0) * 1000,
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className={`glass card-hover ${cfg.cls}`}
      style={{
        padding: '1.2rem',
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${cfg.color}38`,
      }}
    >
      {/* Top stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
        }}
      />

      {/* NFT image or emoji placeholder */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: 10,
          border: `1px solid ${cfg.color}28`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '.9rem',
          background: `radial-gradient(circle at center, ${cfg.color}18, transparent 70%)`,
          boxShadow: `0 0 28px ${cfg.glow}`,
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={cfg.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 9,
            }}
            onError={(e) => {
              e.currentTarget.src = ''
            }}
          />
        ) : (
          <span
            style={{
              fontSize: '3rem',
              filter: `drop-shadow(0 0 12px ${cfg.color})`,
            }}
          >
            {cfg.emoji}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '.6rem',
            fontFamily: "'Orbitron',monospace",
            letterSpacing: '.12em',
            color: 'rgba(180,210,230,.4)',
            marginBottom: '.2rem',
          }}
        >
          TOKEN #{tokenId}
        </div>
        <div
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: cfg.color,
            fontFamily: "'Rajdhani',sans-serif",
            marginBottom: '.35rem',
          }}
        >
          {cfg.name} Predictor
        </div>
        <div
          style={{
            fontSize: '.75rem',
            color: 'rgba(180,210,230,.45)',
            marginBottom: '.75rem',
          }}
        >
          {Number(metadata?.predictionsAtMint || 0)} predictions
          <br />
          <span style={{ fontSize: '.65rem' }}>Minted {date}</span>
        </div>

        {/* Upgrade or max badge */}
        {cfg.next ? (
          <button
            className="btn-primary"
            onClick={() => onUpgrade(tokenId)}
            disabled={upgrading}
            style={{ width: '100%', fontSize: '.65rem', padding: '.5rem' }}
          >
            {upgrading ? (
              <span className="spinner" />
            ) : (
              `⬆ Upgrade → ${cfg.next}`
            )}
          </button>
        ) : (
          <div
            style={{
              padding: '.45rem',
              background: 'rgba(255,215,0,.07)',
              border: '1px solid rgba(255,215,0,.25)',
              borderRadius: 6,
              fontSize: '.65rem',
              color: 'var(--neon-gold)',
              fontFamily: "'Orbitron',monospace",
              letterSpacing: '.06em',
            }}
          >
            ✨ MAX TIER
          </div>
        )}
      </div>
    </div>
  )
}
