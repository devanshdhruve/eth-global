"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface BadgeProps {
  icon: LucideIcon
  title: string
  description: string
  earned: boolean
  delay?: number
}

export function Badge({ icon: Icon, title, description, earned, delay = 0 }: BadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center transition-all ${earned ? "border-2 border-blue-500/50" : "opacity-50"}`}
    >
      <Icon className={`w-12 h-12 mx-auto mb-4 ${earned ? "text-blue-400" : "text-foreground/30"}`} />
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-foreground/60">{description}</p>
      {earned && <div className="mt-4 text-xs font-semibold text-teal-400">EARNED</div>}
    </motion.div>
  )
}
