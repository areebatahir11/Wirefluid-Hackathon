'use client'
// lib/connectWallet.js
import { useAccount } from './AccountContext'
import { getProvider, ensureCorrectNetwork } from './ethers'

export default function ConnectWallet() {
  const { account, setAccount, isOwner } = useAccount()

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask')
        return
      }
      await ensureCorrectNetwork()
      const accounts = await getProvider().send('eth_requestAccounts', [])
      await setAccount(accounts[0])
    } catch (e) {
      console.error(e)
    }
  }

  if (account) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.5rem',
          padding: '.4rem 1rem',
          borderRadius: 8,
          border: isOwner
            ? '1px solid rgba(168,85,247,.4)'
            : '1px solid rgba(0,212,255,.25)',
          background: isOwner ? 'rgba(168,85,247,.1)' : 'rgba(0,212,255,.06)',
          fontFamily: "'Orbitron',monospace",
          fontSize: '.72rem',
          fontWeight: 700,
          color: isOwner ? '#c084fc' : 'var(--neon-blue)',
          letterSpacing: '.04em',
        }}
      >
        {isOwner ? '⚙️ WALLET · ' : ''}
        {account.slice(0, 6)}...{account.slice(-4)}
      </div>
    )
  }

  return (
    <button
      onClick={connectWallet}
      className="btn-primary btn-glow-border"
      style={{
        fontSize: '.78rem',
        padding: '.5rem 1.4rem',
        letterSpacing: '.06em',
      }}
    >
      Connect Wallet →
    </button>
  )
}
