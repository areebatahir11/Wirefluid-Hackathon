'use client'
import { TIER_NAME } from '../lib/ethers'

const TIER_CONFIG = {
  1: {
    name: 'Bronze',
    color: '#cd7f32',
    glow: 'rgba(205,127,50,0.4)',
    emoji: '🥉',
    class: 'tier-bronze',
    min: 1,
  },
  2: {
    name: 'Silver',
    color: '#c0c0c0',
    glow: 'rgba(192,192,192,0.4)',
    emoji: '🥈',
    class: 'tier-silver',
    min: 5,
  },
  3: {
    name: 'Gold',
    color: '#ffd700',
    glow: 'rgba(255,215,0,0.4)',
    emoji: '🏆',
    class: 'tier-gold',
    min: 10,
  },
}

export default function NFTCard({ tokenId, metadata, onUpgrade, upgrading }) {
  const tier = Number(metadata.tier)
  const config = TIER_CONFIG[tier] || TIER_CONFIG[1]
  const canUpgrade = tier < 3

  const mintDate = new Date(
    Number(metadata.mintedAt) * 1000,
  ).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={`glass card-hover ${config.class}`}
      style={{
        padding: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${config.color}40`,
      }}
    >
      {/* Glow top line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
        }}
      />

      {/* NFT Visual */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          background: `radial-gradient(circle at center, ${config.color}25, transparent 70%)`,
          border: `1px solid ${config.color}30`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          marginBottom: '1rem',
          boxShadow: `0 0 30px ${config.glow}`,
        }}
      >
        {config.emoji}
      </div>

      {/* Info */}
      <div style={{ textAlign: 'center' }}>
        <div
          className="font-orbitron"
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            color: 'rgba(168,196,210,0.5)',
            marginBottom: '0.25rem',
          }}
        >
          TOKEN #{String(tokenId)}
        </div>
        <div
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: config.color,
            marginBottom: '0.5rem',
          }}
        >
          {config.name} Predictor
        </div>
        <div
          style={{
            fontSize: '0.8rem',
            color: 'rgba(168,196,210,0.5)',
            marginBottom: '0.75rem',
          }}
        >
          {Number(metadata.predictionsAtMint)} correct predictions
          <br />
          <span style={{ fontSize: '0.7rem' }}>Minted {mintDate}</span>
        </div>

        {canUpgrade ? (
          <button
            className="btn-primary btn-glow-border"
            onClick={() => onUpgrade(tokenId)}
            disabled={upgrading}
            style={{ width: '100%', fontSize: '0.7rem' }}
          >
            {upgrading ? (
              <span className="spinner" />
            ) : (
              `Upgrade → ${TIER_CONFIG[tier + 1]?.name}`
            )}
          </button>
        ) : (
          <div
            style={{
              padding: '0.5rem',
              background: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.25)',
              borderRadius: 6,
              fontSize: '0.75rem',
              color: 'var(--neon-gold)',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.05em',
            }}
          >
            MAX TIER ✨
          </div>
        )}
      </div>
    </div>
  )
}
