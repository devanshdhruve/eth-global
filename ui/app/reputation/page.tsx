"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Award, TrendingUp, Shield, Star, ArrowUpRight, Calendar } from "lucide-react"
import { motion } from "framer-motion"

export default function ReputationPage() {
  const reputationScore = 8750
  const reputationLevel = "Gold"
  const totalAnnotations = 2345
  const accuracy = 96.8
  const completionRate = 98.5

  const badges = [
    { icon: Award, title: "Accuracy Champion", description: "98%+ accuracy rate", earned: true },
    { icon: TrendingUp, title: "Prolific Annotator", description: "1000+ annotations", earned: true },
    { icon: Shield, title: "Trusted Contributor", description: "Zero disputes", earned: true },
    { icon: Star, title: "Quality Master", description: "Consistent excellence", earned: false },
  ]

  const reputationHistory = [
    { date: "Oct 15, 2025", action: "Completed Medical Imaging Project", points: 500, type: "earn" },
    { date: "Oct 14, 2025", action: "Accuracy Bonus", points: 250, type: "earn" },
    { date: "Oct 13, 2025", action: "Dispute Resolution", points: -100, type: "deduct" },
    { date: "Oct 12, 2025", action: "Completed NLP Dataset", points: 400, type: "earn" },
    { date: "Oct 11, 2025", action: "Quality Bonus", points: 300, type: "earn" },
  ]

  const milestones = [
    { level: "Bronze", score: 0, current: false },
    { level: "Silver", score: 2500, current: false },
    { level: "Gold", score: 5000, current: true },
    { level: "Platinum", score: 10000, current: false },
    { level: "Diamond", score: 20000, current: false },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 gradient-text">Your Reputation</h1>
          <p className="text-foreground/60">Build trust and credibility on the DataChain platform</p>
        </div>

        {/* Main Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 mb-12 border-2 border-blue-500/30"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-foreground/60 mb-2">Current Reputation Level</p>
              <h2 className="text-5xl font-bold mb-4 gradient-text">{reputationLevel}</h2>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-bold text-blue-400">{reputationScore}</span>
                <span className="text-foreground/60">points</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold">Progress to Platinum</span>
                    <span className="text-sm text-blue-400">43.75%</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[43.75%] bg-gradient-to-r from-blue-500 to-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-foreground/60 text-sm mb-2">Total Annotations</p>
                <p className="text-3xl font-bold text-blue-400">{totalAnnotations}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-foreground/60 text-sm mb-2">Accuracy Rate</p>
                <p className="text-3xl font-bold text-teal-400">{accuracy}%</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-foreground/60 text-sm mb-2">Completion Rate</p>
                <p className="text-3xl font-bold text-purple-400">{completionRate}%</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-foreground/60 text-sm mb-2">Disputes</p>
                <p className="text-3xl font-bold text-green-400">0</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Badges Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Achievements & Badges</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {badges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center transition-all ${
                  badge.earned ? "border-2 border-blue-500/50" : "opacity-50"
                }`}
              >
                <badge.icon
                  className={`w-12 h-12 mx-auto mb-4 ${badge.earned ? "text-blue-400" : "text-foreground/30"}`}
                />
                <h3 className="font-bold mb-2">{badge.title}</h3>
                <p className="text-sm text-foreground/60">{badge.description}</p>
                {badge.earned && <div className="mt-4 text-xs font-semibold text-teal-400">EARNED</div>}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Reputation Levels */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Reputation Levels</h2>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
            <div className="space-y-4">
              {milestones.map((milestone, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">{milestone.level}</span>
                      <span className="text-foreground/60">{milestone.score} points</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          milestone.current ? "bg-gradient-to-r from-blue-500 to-purple-500" : "bg-white/10"
                        }`}
                        style={{
                          width: milestone.current ? "100%" : "0%",
                        }}
                      />
                    </div>
                  </div>
                  {milestone.current && (
                    <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs font-bold text-white">
                      CURRENT
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reputation History */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/10">
              {reputationHistory.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        item.type === "earn" ? "bg-teal-500/20 text-teal-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      <ArrowUpRight size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{item.action}</p>
                      <p className="text-sm text-foreground/60 flex items-center gap-2">
                        <Calendar size={14} />
                        {item.date}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${item.type === "earn" ? "text-teal-400" : "text-red-400"}`}>
                    {item.type === "earn" ? "+" : ""}
                    {item.points}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
