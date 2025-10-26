"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useUser } from "@clerk/nextjs"

// Define the shape of the context data
interface WalletContextType {
  walletAddress: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => Promise<void>
  loading: boolean
}

// Create the context
const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Create the Provider component
export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, isLoaded } = useUser()

  // Effect to initialize wallet address from Clerk metadata
  useEffect(() => {
    if (isLoaded) {
      if (user?.publicMetadata?.wallet_address) {
        setWalletAddress(user.publicMetadata.wallet_address as string)
      }
      setLoading(false)
    }
  }, [user, isLoaded])

  const connectWallet = async () => {
    if (!user) {
      console.warn("User not loaded yet.")
      return
    }
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask to connect your wallet.")
      return
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const address = accounts[0]
      setWalletAddress(address)

      // ✅ CORRECTED: Use 'unsafeMetadata' for client-side updates
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          wallet_address: address,
        },
      })
      console.log("Wallet address saved to Clerk profile.")
    } catch (err: any) {
      console.error("Wallet connection failed:", err)
      alert("Failed to connect wallet: " + (err.message || "Unknown error"))
    }
  }

  const disconnectWallet = async () => {
    setWalletAddress(null)
    if (user) {
      // ✅ CORRECTED: Also use 'unsafeMetadata' to remove the key
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          wallet_address: undefined, // Using undefined removes the key from metadata
        },
      })
      console.log("Wallet address removed from Clerk profile.")
    }
  }

  const value = {
    walletAddress,
    connectWallet,
    disconnectWallet,
    loading
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

// Create a custom hook for easy access to the context
export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}