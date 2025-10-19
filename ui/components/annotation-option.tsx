"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

interface AnnotationOptionProps {
  option: string
  isSelected: boolean
  onClick: () => void
  delay?: number
}

export function AnnotationOption({ option, isSelected, onClick, delay = 0 }: AnnotationOptionProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-300 font-medium ${
        isSelected
          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500 text-blue-400"
          : "bg-white/5 border-white/10 text-foreground hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isSelected ? "border-blue-500 bg-blue-500" : "border-white/30"
          }`}
        >
          {isSelected && <Check size={16} className="text-white" />}
        </div>
        {option}
      </div>
    </motion.button>
  )
}
