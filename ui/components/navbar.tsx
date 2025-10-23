"use client"

import Link from "next/link"
import { Menu, X, LogOut } from "lucide-react"
import { useEffect ,useState } from "react"
import { useAuth } from "@/app/auth/context"
import { useRouter } from "next/navigation"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const { role, isAuthenticated, setRole, setIsAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const savedWallet = localStorage.getItem("connectedWallet")
    if (savedWallet) setWalletAddress(savedWallet)
  }, [])

  useEffect(() => {
    if (walletAddress) {
      localStorage.setItem("connectedWallet", walletAddress)
    }
  }, [walletAddress])


  const connectWallet = async() => {
    if(typeof window === "undefined") return
    if(!window.ethereum) {
      alert("Please install MetaMask to connect your wallet.")
      return
    }

    try {
      const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    })
     
    const address = accounts[0]
    setWalletAddress(address)
    setIsAuthenticated(true)
    console.log("Connected wallet address:", address)
    } catch (err: any) {
      console.error("Wallet connection failed:", err)
      alert("Failed to connect wallet: " + err.message)
    }
  } 

  const handleLogout = () => {
    setRole(null)
    setIsAuthenticated(false)
    router.push("/")
  }

  const getNavLinks = () => {
    const baseLinks = [{ href: "/", label: "Home" }]

    if (!isAuthenticated) {
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
            {/* Role + Logout only for email-authenticated users */}
            {isAuthenticated && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground/70 capitalize">{role}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300 flex items-center gap-2"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}

            {/* Wallet connect button — independent of isAuthenticated */}
            <button
              onClick={() => {
                if (walletAddress) {
                // Disconnect wallet
                setWalletAddress(null)
                localStorage.removeItem("connectedWallet")
                } else {
                  // Connect wallet
                  connectWallet()
                }
              }}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow"
            >
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "Connect Wallet"}
            </button>
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
                className="block px-4 py-2 text-foreground/70 hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/10 space-y-2">
              {isAuthenticated && (
                <>
                  <div className="px-4 py-2 text-sm text-foreground/70 capitalize">Role: {role}</div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </>
              )}
              {
                <button
                  onClick={() => {
                    if(walletAddress) {
                      setWalletAddress(null)
                      localStorage.removeItem("connectedWallet")
                    } else {
                      connectWallet()
                    }
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white"
                >
                  {walletAddress
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : "Connect Wallet"}
                </button>
              }
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
