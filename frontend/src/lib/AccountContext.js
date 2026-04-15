'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getProvider, getOwner } from '../lib/ethers'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [isOwner, setIsOwner] = useState(false)

  // INIT WALLET
  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return

      try {
        const accounts = await getProvider().send('eth_accounts', [])

        if (accounts.length > 0) {
          const user = accounts[0]
          setAccount(user)

          const owner = await getOwner()
          setIsOwner(owner.toLowerCase() === user.toLowerCase())
        }
      } catch (e) {
        console.error(e)
      }
    }

    init()
  }, [])

  // LISTENER
  useEffect(() => {
    if (!window.ethereum) return

    const handler = async (accounts) => {
      const user = accounts[0] || null
      setAccount(user)

      if (user) {
        const owner = await getOwner()
        setIsOwner(owner.toLowerCase() === user.toLowerCase())
      } else {
        setIsOwner(false)
      }
    }

    window.ethereum.on('accountsChanged', handler)

    return () => {
      window.ethereum.removeListener('accountsChanged', handler)
    }
  }, [])

  return (
    <AccountContext.Provider
      value={{
        account,
        setAccount,
        isOwner,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  return useContext(AccountContext)
}
