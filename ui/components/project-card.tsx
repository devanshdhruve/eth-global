"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { TrendingUp, Users, Clock } from "lucide-react"

interface ProjectCardProps {
  id: number
  title: string
  description: string
  category: string
  difficulty: string
  reward: string
  annotators: number
  progress: number
  deadline: string
  image?: string
  delay?: number
}

export function ProjectCard({
  id,
  title,
  description,
  category,
  difficulty,
  reward,
  annotators,
  progress,
  deadline,
  image,
  delay = 0,
}: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="group"
    >
      <Link href={`/projects/${id}`}>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 h-full flex flex-col overflow-hidden cursor-pointer">
          {/* Project Image */}
          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <img
              src={image || "/placeholder.svg"}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute top-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
              {difficulty}
            </div>
          </div>

          {/* Project Info */}
          <div className="p-6 flex flex-col flex-grow">
            <div className="mb-3">
              <span className="text-xs font-semibold text-blue-400 uppercase">{category}</span>
              <h3 className="text-lg font-bold mt-2 group-hover:text-blue-400 transition-colors">{title}</h3>
            </div>

            <p className="text-sm text-foreground/60 mb-4 flex-grow">{description}</p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-foreground/60">Progress</span>
                <span className="text-xs font-semibold text-blue-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp size={14} className="text-teal-400" />
                </div>
                <p className="text-xs font-semibold text-foreground">{reward}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users size={14} className="text-blue-400" />
                </div>
                <p className="text-xs font-semibold text-foreground">{annotators}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock size={14} className="text-purple-400" />
                </div>
                <p className="text-xs font-semibold text-foreground">{deadline}</p>
              </div>
            </div>

            {/* CTA Button */}
            <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow">
              Start Annotating
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
