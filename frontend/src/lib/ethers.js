import { ethers } from 'ethers'
import CoreABI from '../abi/Core.json'
import NFTABI from '../abi/RewardNFT.json'
import DonationABI from '../abi/Donation.json'

export const CORE_ADDRESS = process.env.NEXT_PUBLIC_CORE_ADDRESS
export const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS
export const DONATION_ADDRESS = process.env.NEXT_PUBLIC_DONATION_ADDRESS

export const getProvider = () => {
  if (typeof window === 'undefined') return null

  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  return new ethers.BrowserProvider(window.ethereum)
}

export const getSigner = async () => {
  const provider = getProvider()
  if (!provider) throw new Error('Provider not available')

  return await provider.getSigner()
}

export const getCoreContract = async () => {
  if (!CORE_ADDRESS) throw new Error('Core address missing')

  const signer = await getSigner()
  return new ethers.Contract(CORE_ADDRESS, CoreABI, signer)
}

export const getNFTContract = async () => {
  if (!NFT_ADDRESS) throw new Error('NFT address missing')

  const signer = await getSigner()
  return new ethers.Contract(NFT_ADDRESS, NFTABI, signer)
}

export const getDonationContract = async () => {
  if (!DONATION_ADDRESS) throw new Error('Donation address missing')

  const signer = await getSigner()
  return new ethers.Contract(DONATION_ADDRESS, DonationABI, signer)
}
