import { ethers } from 'ethers'
//lib/ethers.js
import CoreABIFull from '../abi/Core.json'
import RewardNFTABIFull from '../abi/RewardNFT.json'
import DonationABIFull from '../abi/Donation.json'

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

// ── NFT IPFS URIs ────────────────────────────────────────
// After uploading images to Pinata, set these in .env.local:
// NEXT_PUBLIC_BRONZE_URI=ipfs://QmYourBronzeCID
// NEXT_PUBLIC_SILVER_URI=ipfs://QmYourSilverCID
// NEXT_PUBLIC_GOLD_URI=ipfs://QmYourGoldCID
// Then call: nft.setUris(bronzeURI, silverURI, goldURI) from deployer wallet
export const NFT_URIS = {
  BRONZE: process.env.NEXT_PUBLIC_BRONZE_URI || null,
  SILVER: process.env.NEXT_PUBLIC_SILVER_URI || null,
  GOLD: process.env.NEXT_PUBLIC_GOLD_URI || null,
}

// Convert ipfs:// to https:// for <img> tags
export function ipfsToHttp(uri) {
  if (!uri) return ''

  // already http
  if (uri.startsWith('http')) return uri

  // ipfs:// → https://ipfs.io/ipfs/
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }

  return uri
}

// ── PSL Teams — colors fetched from blockchain names ─────
// CreateMatches script pushes exact these names on-chain
export const PSL_TEAMS = {
  'Lahore Qalandars': {
    color: '#00a651',
    glow: 'rgba(0,166,81,0.5)',
    emoji: '🦁',
    short: 'LQ',
  },
  'Karachi Kings': {
    color: '#0077cc',
    glow: 'rgba(0,119,204,0.5)',
    emoji: '👑',
    short: 'KK',
  },
  'Islamabad United': {
    color: '#e31837',
    glow: 'rgba(227,24,55,0.5)',
    emoji: '⚡',
    short: 'IU',
  },
  'Multan Sultans': {
    color: '#7b2d8b',
    glow: 'rgba(123,45,139,0.5)',
    emoji: '🔮',
    short: 'MS',
  },
  'Peshawar Zalmi': {
    color: '#f7941d',
    glow: 'rgba(247,148,29,0.5)',
    emoji: '⚔️',
    short: 'PZ',
  },
  'Quetta Gladiators': {
    color: '#1c1c6e',
    glow: 'rgba(60,60,180,0.5)',
    emoji: '🦅',
    short: 'QG',
  },
  'Rawalpindi Pindiz': {
    color: '#ff4d4d',
    glow: 'rgba(255,77,77,0.5)',
    emoji: '🔥',
    short: 'RP',
  },
}

export const getTeamInfo = (name) =>
  PSL_TEAMS[name] || {
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.4)',
    emoji: '🏏',
    short: '??',
  }

// ── Providers ────────────────────────────────────────────
export const getProvider = () => {
  if (typeof window === 'undefined') return null
  if (!window.ethereum) throw new Error('MetaMask not installed')
  return new ethers.BrowserProvider(window.ethereum)
}

export const getReadProvider = () => new ethers.JsonRpcProvider(RPC_URL)

export const getSigner = async () => {
  const provider = getProvider()
  if (!provider) throw new Error('No provider')
  return await provider.getSigner()
}

// ── Auto-add WireFluid network ───────────────────────────
export const ensureCorrectNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) return
  const hex = await window.ethereum.request({ method: 'eth_chainId' })
  const current = parseInt(hex, 16)
  if (current === CHAIN_ID) return

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
    } else throw err
  }
}

// ── Contract getters ─────────────────────────────────────
export const getCoreRead = () =>
  new ethers.Contract(CORE_ADDRESS, CoreABI, getReadProvider())
export const getNFTRead = () =>
  new ethers.Contract(NFT_ADDRESS, RewardNFTABI, getReadProvider())
export const getDonationRead = () =>
  new ethers.Contract(DONATION_ADDRESS, DonationABI, getReadProvider())

export const getCoreContract = async () =>
  new ethers.Contract(CORE_ADDRESS, CoreABI, await getSigner())
export const getNFTContract = async () =>
  new ethers.Contract(NFT_ADDRESS, RewardNFTABI, await getSigner())

// ── Formatting helpers ───────────────────────────────────
export const formatETH = (wei) => {
  try {
    return parseFloat(ethers.formatEther(wei)).toFixed(4)
  } catch {
    return '0.0000'
  }
}

export const shortenAddr = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

// ── Enums — match Solidity exactly ───────────────────────
export const OUTCOME = { NONE: 0, TEAM_A: 1, TEAM_B: 2, DRAW: 3 }
export const STATUS = { ACTIVE: 0, RESOLVED: 1, CANCELLED: 2 }
export const TIER = { NONE: 0, BRONZE: 1, SILVER: 2, GOLD: 3 }
export const TIER_NAME = { 0: 'None', 1: 'Bronze', 2: 'Silver', 3: 'Gold' }
export const TIER_REQ = { 1: 1, 2: 5, 3: 10 }

// ── Parse raw on-chain Match struct → plain JS object ────
export const parseMatch = (m) => ({
  matchId: Number(m.matchId),
  teamA: m.teamA,
  teamB: m.teamB,
  startTime: Number(m.startTime),
  lockTime: Number(m.lockTime),
  status: Number(m.status),
  result: Number(m.result),
  totalStaked: m.totalStaked,
  winnerPool: m.winnerPool,
  donationPool: m.donationPool,
})

// ── Load all active matches from blockchain ───────────────
export const fetchActiveMatches = async () => {
  const core = getCoreRead()
  const activeIds = await core.getActiveMatches()
  const results = await Promise.all(
    activeIds.map(async (id) => {
      const m = await core.getMatch(id)
      return parseMatch(m)
    }),
  )
  return results
}

// ── Load user prediction history across all matches ───────
export const fetchUserPredictions = async (account) => {
  const core = getCoreRead()
  const total = Number(await core.matchCounter())
  const matched = []

  for (let i = 1; i <= total; i++) {
    try {
      const pred = await core.getUserPrediction(i, account)
      if (Number(pred.stakeAmount) === 0) continue
      const match = await core.getMatch(i)
      matched.push({
        ...parseMatch(match),
        prediction: {
          choice: Number(pred.choice),
          stakeAmount: pred.stakeAmount,
          claimed: pred.claimed,
        },
      })
    } catch {}
  }
  return matched
}

// ── ADMIN HELPERS ─────────────────────────

// get owner
export const getOwner = async () => {
  const core = getCoreRead()
  return await core.owner()
}

// create match (admin)
export const createMatchAdmin = async (teamA, teamB, startTime, lockTime) => {
  const core = await getCoreContract()
  const tx = await core.createMatch(teamA, teamB, startTime, lockTime)
  return await tx.wait()
}

// resolve match (admin)
export const resolveMatchAdmin = async (matchId, result) => {
  const core = await getCoreContract()
  const tx = await core.resolveMatch(matchId, result)
  return await tx.wait()
}
