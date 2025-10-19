"use client"

import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"

interface TransactionRowProps {
  type: "earn" | "withdraw" | "stake"
  description: string
  amount: number
  date: string
  status: string
  delay?: number
}

export function TransactionRow({ type, description, amount, date, status, delay = 0 }: TransactionRowProps) {
  const getTypeColor = () => {
    switch (type) {
      case "earn":
        return "bg-teal-500/20 text-teal-400"
      case "withdraw":
        return "bg-purple-500/20 text-purple-400"
      case "stake":
        return "bg-blue-500/20 text-blue-400"
      default:
        return "bg-white/5 text-foreground/60"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor()}`}>
          <ArrowUpRight size={18} />
        </div>
        <div>
          <p className="font-semibold text-sm">{description}</p>
          <p className="text-xs text-foreground/60">{date}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${amount > 0 ? "text-teal-400" : "text-red-400"}`}>
          {amount > 0 ? "+" : ""}
          {amount}
        </p>
        <p className="text-xs text-green-400">{status}</p>
      </div>
    </motion.div>
  )
}
