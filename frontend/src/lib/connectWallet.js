'use client'

import { useState, useEffect } from 'react'
import { getProvider } from './ethers'

export default function ConnectWallet() {
  const [account, setAccount] = useState(null)

  // 🔌 Connect Wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask')
        return
      }

      const provider = getProvider()

      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return

      const provider = getProvider()
      const accounts = await provider.send('eth_accounts', [])

      if (accounts.length > 0) {
        setAccount(accounts[0])
      }
    }

    checkConnection()
  }, [])

  useEffect(() => {
    if (!window.ethereum) return

    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0])
      } else {
        setAccount(null)
      }
    })
  }, [])

  return (
    <div className="flex items-center gap-3">
      {account ? (
        <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl backdrop-blur">
          {account.slice(0, 6)}...{account.slice(-4)}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
        >
          Connect Wallet
        </button>
      )}
    </div>
  )
}
