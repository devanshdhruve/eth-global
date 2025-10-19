"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Send, Download, TrendingUp, Wallet, Copy } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"

export default function WalletPage() {
  const [copied, setCopied] = useState(false)

  const asiBalance = 12450.5
  const usdValue = 6225.25
  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f42e0e"

  const transactions = [
    {
      id: 1,
      type: "earn",
      description: "Medical Imaging Project Completion",
      amount: 500,
      date: "Oct 15, 2025",
      status: "completed",
    },
    { id: 2, type: "earn", description: "Accuracy Bonus", amount: 250, date: "Oct 14, 2025", status: "completed" },
    {
      id: 3,
      type: "withdraw",
      description: "Withdrawal to Wallet",
      amount: -1000,
      date: "Oct 13, 2025",
      status: "completed",
    },
    {
      id: 4,
      type: "earn",
      description: "NLP Dataset Completion",
      amount: 400,
      date: "Oct 12, 2025",
      status: "completed",
    },
    { id: 5, type: "earn", description: "Quality Bonus", amount: 300, date: "Oct 11, 2025", status: "completed" },
    { id: 6, type: "stake", description: "Staking Rewards", amount: 125.5, date: "Oct 10, 2025", status: "completed" },
  ]

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 gradient-text">Your Wallet</h1>
          <p className="text-foreground/60">Manage your ASI tokens and track earnings</p>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 mb-12 border-2 border-teal-500/30"
        >
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="text-foreground/60 mb-2">ASI Token Balance</p>
              <h2 className="text-5xl font-bold mb-2 gradient-text">{asiBalance.toLocaleString()}</h2>
              <p className="text-lg text-foreground/60 mb-8">≈ ${usdValue.toLocaleString()}</p>

              <div className="space-y-3">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all neon-glow flex items-center justify-center gap-2">
                  <Send size={18} />
                  Send Tokens
                </button>
                <button className="w-full px-6 py-3 border border-white/10 rounded-lg font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                  <Download size={18} />
                  Withdraw to Bank
                </button>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="space-y-6">
              <div>
                <p className="text-foreground/60 text-sm mb-2">Wallet Address</p>
                <div className="flex items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <code className="text-sm font-mono text-blue-400 flex-1 truncate">{walletAddress}</code>
                  <button onClick={handleCopyAddress} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Copy size={18} className={copied ? "text-teal-400" : "text-foreground/60"} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-foreground/60 text-sm mb-2">Total Earned</p>
                  <p className="text-2xl font-bold text-teal-400">15,250 ASI</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-foreground/60 text-sm mb-2">Total Withdrawn</p>
                  <p className="text-2xl font-bold text-purple-400">2,800 ASI</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Staking Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Staking & Rewards</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <Wallet className="w-8 h-8 text-blue-400 mb-4" />
              <p className="text-foreground/60 text-sm mb-2">Staked Amount</p>
              <p className="text-3xl font-bold mb-4">5,000 ASI</p>
              <button className="w-full px-4 py-2 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors">
                Manage Stake
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <TrendingUp className="w-8 h-8 text-teal-400 mb-4" />
              <p className="text-foreground/60 text-sm mb-2">APY Rate</p>
              <p className="text-3xl font-bold mb-4">12.5%</p>
              <button className="w-full px-4 py-2 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors">
                Learn More
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <TrendingUp className="w-8 h-8 text-purple-400 mb-4" />
              <p className="text-foreground/60 text-sm mb-2">Monthly Rewards</p>
              <p className="text-3xl font-bold mb-4">52.08 ASI</p>
              <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-sm font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all">
                Claim Rewards
              </button>
            </motion.div>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tx.type === "earn"
                              ? "bg-teal-500/20 text-teal-400"
                              : tx.type === "withdraw"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{tx.description}</td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        <span className={tx.amount > 0 ? "text-teal-400" : "text-red-400"}>
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount} ASI
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground/60">{tx.date}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
