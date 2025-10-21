"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface StatRowProps {
  icon: LucideIcon
  label: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative"
  delay?: number
}

export function StatRow({ icon: Icon, label, value, change, changeType = "positive", delay = 0 }: StatRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-blue-400" />
        <span className="text-sm text-foreground/60">{label}</span>
      </div>
      <div className="text-right">
        <p className="font-semibold">{value}</p>
        {change && (
          <p className={`text-xs ${changeType === "positive" ? "text-teal-400" : "text-red-400"}`}>{change}</p>
        )}
      </div>
    </motion.div>
  )
}
