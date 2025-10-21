"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
      <Icon className="w-16 h-16 text-foreground/30 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-foreground/60 mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all neon-glow"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}
