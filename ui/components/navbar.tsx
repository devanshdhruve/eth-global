"use client"

import Link from "next/link"
import { Menu, X, LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { useUserRole } from "@/hooks/useUserRole"
import { useClerk, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const { role } = useUserRole()
  const { isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  useEffect(() => {
    // Load wallet address from Clerk metadata
    if (user?.publicMetadata?.wallet_address) {
      setWalletAddress(user.publicMetadata.wallet_address as string)
    }
  }, [user])

  const connectWallet = async () => {
    if (typeof window === "undefined" || !user) {
      console.warn("User not loaded yet or not in browser environment.")
      return
    }
    
    if (!window.ethereum) {
      alert("Please install MetaMask to connect your wallet.")
      return
    }

    try {
      // Request accounts from MetaMask
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      const address = accounts[0]
      setWalletAddress(address)
      console.log("Connected wallet address:", address)

      // Save to Clerk user metadata
      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            wallet_address: address
          }
        })
        console.log("Wallet address saved successfully to Clerk user metadata.")
      } catch (clerkErr) {
        console.error("Error saving wallet address to Clerk:", clerkErr)
        alert("Wallet connected locally, but failed to save to your profile.")
      }

    } catch (err: any) {
      console.error("Wallet connection failed:", err)
      alert("Failed to connect wallet: " + (err.message || "Unknown error"))
    }
  }

  const disconnectWallet = async () => {
    setWalletAddress(null)
    console.log("Wallet disconnected locally.")
    
    // Optionally remove from Clerk metadata
    if (user) {
      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            wallet_address: null
          }
        })
      } catch (err) {
        console.error("Error removing wallet from Clerk:", err)
      }
    }
  }

  const handleLogout = async () => {
    await signOut()
    setWalletAddress(null)
    router.push("/")
  }

  const getNavLinks = () => {
    const baseLinks = [{ href: "/", label: "Home" }]

    if (!isSignedIn) {
      return [...baseLinks, { href: "/login", label: "Login" }]
    }

    if (role === "annotator") {
      return [
        ...baseLinks,
        { href: "/projects", label: "Projects" },
        { href: "/annotate", label: "Annotate" },
        { href: "/reputation", label: "Reputation" },
        { href: "/wallet", label: "Wallet" },
        { href: "/verify", label: "Verify" },
        { href: "/dashboard", label: "Dashboard" },
      ]
    }
    
    if (role === "reviewer") {
      return [
        ...baseLinks,
        { href: "/reviewer/dashboard", label: "Dashboard" },
        { href: "/reviewer/queue", label: "Review Queue" },
        { href: "/reviewer/team", label: "Team" },
        { href: "/reviewer/analytics", label: "Analytics" },
      ]
    }
    
    if (role === "client") {
      return [
        ...baseLinks,
        { href: "/client/dashboard", label: "Dashboard" },
        { href: "/client/create-project", label: "New Project" },
      ]
    }

    return baseLinks
  }

  const links = getNavLinks()

  return (
    <nav className="sticky top-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg" />
            <span className="font-bold text-lg gradient-text">DataChain</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isSignedIn && (
              <div className="flex items-center gap-3">
                {role && <span className="text-sm text-foreground/70 capitalize">{role}</span>}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300 flex items-center gap-2"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}

            {isSignedIn && (
              <button
                onClick={() => {
                  if (walletAddress) {
                    disconnectWallet()
                  } else {
                    connectWallet()
                  }
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow"
              >
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "Connect Wallet"}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-foreground/70 hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/10 space-y-2">
              {isSignedIn && (
                <>
                  {role && <div className="px-4 py-2 text-sm text-foreground/70 capitalize">Role: {role}</div>}
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </>
              )}
              {isSignedIn && (
                <button
                  onClick={() => {
                    if (walletAddress) {
                      disconnectWallet().then(() => setIsOpen(false))
                    } else {
                      connectWallet().then(() => setIsOpen(false))
                    }
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white"
                >
                  {walletAddress
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : "Connect Wallet"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}