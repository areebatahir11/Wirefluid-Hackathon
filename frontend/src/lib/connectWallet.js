'use client'

import { useAccount } from '../context/AccountProvider'
import { getProvider, getOwner } from '../lib/ethers'

export default function ConnectWallet() {
  const { account, setAccount, isOwner } = useAccount()

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask')
        return
      }

      const accounts = await getProvider().send('eth_requestAccounts', [])

      const user = accounts[0]
      setAccount(user)

      const owner = await getOwner()
      console.log(owner)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {account ? (
        <div
          className={`px-4 py-2 rounded-xl backdrop-blur ${
            isOwner
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-green-500/20 text-green-400'
          }`}
        >
          {isOwner ? 'ADMIN • ' : ''}
          {account.slice(0, 6)}...{account.slice(-4)}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
        >
          Connect Wallet
        </button>
      )}
    </div>
  )
}
