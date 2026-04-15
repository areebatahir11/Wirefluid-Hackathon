'use client'
// lib/AccountContext.js
import { createContext, useContext, useEffect, useState } from 'react'
import { getProvider, getOwner } from './ethers'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [account, setAccountRaw] = useState(null)
  const [isOwner, setIsOwner] = useState(false)

  // Helper: set account AND update isOwner in one go
  const setAccount = async (user) => {
    setAccountRaw(user)
    if (user) {
      try {
        const owner = await getOwner()
        setIsOwner(owner.toLowerCase() === user.toLowerCase())
      } catch {
        setIsOwner(false)
      }
    } else {
      setIsOwner(false)
    }
  }

  // INIT: check if already connected on page load
  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return
      try {
        const accounts = await getProvider().send('eth_accounts', [])
        if (accounts.length > 0) {
          await setAccount(accounts[0])
        }
      } catch (e) {
        console.error('Init wallet error:', e)
      }
    }
    init()
  }, [])

  // LISTENER: wallet switch
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return

    const handler = async (accounts) => {
      await setAccount(accounts[0] || null)
    }

    window.ethereum.on('accountsChanged', handler)
    return () => window.ethereum.removeListener('accountsChanged', handler)
  }, [])

  return (
    <AccountContext.Provider value={{ account, setAccount, isOwner }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  return useContext(AccountContext)
}
