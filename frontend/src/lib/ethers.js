// import { ethers } from 'ethers'
// import CoreABI from '../abi/Core.json'
// import NFTABI from '../abi/RewardNFT.json'
// import DonationABI from '../abi/Donation.json'

// export const CORE_ADDRESS = process.env.NEXT_PUBLIC_CORE_ADDRESS
// export const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS
// export const DONATION_ADDRESS = process.env.NEXT_PUBLIC_DONATION_ADDRESS

// export const getProvider = () => {
//   if (typeof window === 'undefined') return null

//   if (!window.ethereum) {
//     throw new Error('MetaMask not installed')
//   }

//   return new ethers.BrowserProvider(window.ethereum)
// }

// export const getSigner = async () => {
//   const provider = getProvider()
//   if (!provider) throw new Error('Provider not available')

//   return await provider.getSigner()
// }

// export const getCoreContract = async () => {
//   if (!CORE_ADDRESS) throw new Error('Core address missing')

//   const signer = await getSigner()
//   return new ethers.Contract(CORE_ADDRESS, CoreABI, signer)
// }

// export const getNFTContract = async () => {
//   if (!NFT_ADDRESS) throw new Error('NFT address missing')

//   const signer = await getSigner()
//   return new ethers.Contract(NFT_ADDRESS, NFTABI, signer)
// }

// export const getDonationContract = async () => {
//   if (!DONATION_ADDRESS) throw new Error('Donation address missing')

//   const signer = await getSigner()
//   return new ethers.Contract(DONATION_ADDRESS, DonationABI, signer)
// }
import { ethers } from 'ethers'

// ── ABI imports ──────────────────────────────────────────
// These files are in src/abi/ — copied from backend/out/
import CoreABIFull from '../abi/Core.json'
import RewardNFTABIFull from '../abi/RewardNFT.json'
import DonationABIFull from '../abi/Donation.json'

// Foundry outputs full JSON — we only need the abi array
const CoreABI = CoreABIFull.abi ?? CoreABIFull
const RewardNFTABI = RewardNFTABIFull.abi ?? RewardNFTABIFull
const DonationABI = DonationABIFull.abi ?? DonationABIFull

// ── Contract addresses from .env.local ──────────────────
export const CORE_ADDRESS = process.env.NEXT_PUBLIC_CORE_ADDRESS
export const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS
export const DONATION_ADDRESS = process.env.NEXT_PUBLIC_DONATION_ADDRESS
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '92533')
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || 'https://evm.wirefluid.com'

// ── Provider (MetaMask) ──────────────────────────────────
export const getProvider = () => {
  if (typeof window === 'undefined') return null
  if (!window.ethereum) throw new Error('MetaMask not installed')
  return new ethers.BrowserProvider(window.ethereum)
}

// ── Read-only provider (no wallet needed) ────────────────
export const getReadProvider = () => {
  return new ethers.JsonRpcProvider(RPC_URL)
}

// ── Signer ───────────────────────────────────────────────
export const getSigner = async () => {
  const provider = getProvider()
  if (!provider) throw new Error('No provider')
  return await provider.getSigner()
}

// ── Switch to WireFluid network ──────────────────────────
export const ensureCorrectNetwork = async () => {
  if (!window.ethereum) return
  const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
  const current = parseInt(chainIdHex, 16)
  if (current !== CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      })
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: 'WireFluid Testnet',
              nativeCurrency: { name: 'WIRE', symbol: 'WIRE', decimals: 18 },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: ['https://wirefluidscan.com/'],
            },
          ],
        })
      }
    }
  }
}

// ── Core Contract (read-only, no wallet) ─────────────────
export const getCoreRead = () => {
  const provider = getReadProvider()
  return new ethers.Contract(CORE_ADDRESS, CoreABI, provider)
}

// ── Core Contract (with signer) ──────────────────────────
export const getCoreContract = async () => {
  const signer = await getSigner()
  return new ethers.Contract(CORE_ADDRESS, CoreABI, signer)
}

// ── NFT Contract (read-only) ─────────────────────────────
export const getNFTRead = () => {
  const provider = getReadProvider()
  return new ethers.Contract(NFT_ADDRESS, RewardNFTABI, provider)
}

// ── NFT Contract (with signer) ───────────────────────────
export const getNFTContract = async () => {
  const signer = await getSigner()
  return new ethers.Contract(NFT_ADDRESS, RewardNFTABI, signer)
}

// ── Donation Contract (read-only) ────────────────────────
export const getDonationRead = () => {
  const provider = getReadProvider()
  return new ethers.Contract(DONATION_ADDRESS, DonationABI, provider)
}

// ── Helpers ───────────────────────────────────────────────
export const formatETH = (wei) => {
  try {
    return parseFloat(ethers.formatEther(wei)).toFixed(4)
  } catch {
    return '0.0000'
  }
}

export const shortenAddr = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

// PredictionOutcome enum  0=NONE 1=TEAM_A 2=TEAM_B 3=DRAW
export const OUTCOME = { NONE: 0, TEAM_A: 1, TEAM_B: 2, DRAW: 3 }

// MatchStatus enum  0=ACTIVE 1=RESOLVED 2=CANCELLED
export const STATUS = { ACTIVE: 0, RESOLVED: 1, CANCELLED: 2 }

// NFTTier enum  0=NONE 1=BRONZE 2=SILVER 3=GOLD
export const TIER = { NONE: 0, BRONZE: 1, SILVER: 2, GOLD: 3 }
export const TIER_NAME = { 0: 'None', 1: 'Bronze', 2: 'Silver', 3: 'Gold' }
