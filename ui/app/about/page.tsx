"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"

export default function AboutPage() {
  const milestones = [
    { phase: "MVP Launch", description: "Initial platform release" },
    { phase: "Automation", description: "AI-assisted annotation" },
    { phase: "Fully Autonomous DAO", description: "Community governance" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-12 px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 gradient-text">About DataChain</h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
          <p className="text-foreground/70 leading-relaxed mb-4">
            DataChain is revolutionizing data annotation by combining the power of decentralized networks with AI-driven
            efficiency. We believe that high-quality training data should be accessible, transparent, and fairly
            rewarded.
          </p>
          <p className="text-foreground/70 leading-relaxed">
            Built on Hedera Hashgraph and powered by the ASI Alliance, DataChain creates a trustless ecosystem where
            annotators are rewarded fairly, projects get verified data, and the entire process is transparent on the
            blockchain.
          </p>
        </motion.div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Roadmap</h2>
          <div className="space-y-4">
            {milestones.map((milestone, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{milestone.phase}</h3>
                  <p className="text-foreground/60">{milestone.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center"
        >
          <h2 className="text-2xl font-bold mb-4">Join Our Community</h2>
          <p className="text-foreground/70 mb-6">Be part of the future of decentralized data annotation</p>
          <div className="flex gap-4 justify-center">
            <a href="#" className="px-6 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors">
              Discord
            </a>
            <a href="#" className="px-6 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors">
              Twitter
            </a>
            <a href="#" className="px-6 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors">
              GitHub
            </a>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
