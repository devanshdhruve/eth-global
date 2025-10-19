"use client"

import { motion } from "framer-motion"

interface ProgressBarProps {
  label: string
  value: number
  max?: number
  showPercentage?: boolean
  color?: string
}

export function ProgressBar({
  label,
  value,
  max = 100,
  showPercentage = true,
  color = "from-blue-500 to-purple-500",
}: ProgressBarProps) {
  const percentage = (value / max) * 100

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold">{label}</span>
        {showPercentage && <span className="text-sm text-blue-400">{percentage.toFixed(1)}%</span>}
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
