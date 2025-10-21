"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ArrowRight, Zap, Shield, TrendingUp, CheckCircle } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function Home() {
  const features = [
    {
      icon: Shield,
      title: "On-Chain Reputation",
      description: "Transparent, verifiable annotator credentials",
    },
    {
      icon: Zap,
      title: "AI-Assisted Annotation",
      description: "Smart labeling with machine learning support",
    },
    {
      icon: TrendingUp,
      title: "Instant Micropayments",
      description: "Real-time ASI token rewards",
    },
  ]

  const steps = [
    { number: 1, title: "Dataset Upload", description: "Upload your data to IPFS" },
    { number: 2, title: "Task Distribution", description: "Distribute to annotators" },
    { number: 3, title: "Annotator Labeling", description: "Crowd-powered labeling" },
    { number: 4, title: "On-Chain Validation", description: "Verify on Hedera" },
    { number: 5, title: "ASI Payment Release", description: "Instant rewards" },
    { number: 6, title: "Reputation Update", description: "Build credibility" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
        {/* Animated background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold mb-6 gradient-text"
          >
            Crowd-Powered Data, Chain-Verified Trust
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto"
          >
            A decentralized, transparent, and AI-optimized data annotation platform built on Hedera and ASI Alliance
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2 neon-glow"
            >
              Get Started <ArrowRight size={20} />
            </Link>
            <Link
              href="/projects"
              className="px-8 py-3 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300"
            >
              Explore Projects
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16 gradient-text">Platform Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 p-8 group"
            >
              <feature.icon className="w-12 h-12 mb-4 text-blue-400 group-hover:text-purple-400 transition-colors" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-foreground/60">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16 gradient-text">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative"
            >
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-white">
                  {step.number}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-foreground/60">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Token Utility */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16 gradient-text">ASI Token Utility</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {["Stake ASI", "Earn Rewards", "Reputation Boost", "Governance"].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 p-8 text-center group"
            >
              <CheckCircle className="w-8 h-8 mx-auto mb-4 text-teal-400 group-hover:text-blue-400 transition-colors" />
              <h3 className="font-semibold">{item}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center border-2 border-blue-500/30">
          <h2 className="text-4xl font-bold mb-6 gradient-text">Join the Future of Data Annotation</h2>
          <p className="text-lg text-foreground/70 mb-8">
            Start earning ASI tokens while contributing to AI training datasets
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow"
            >
              Get Started
            </Link>
            <a
              href="#"
              className="px-8 py-3 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300"
            >
              Read Whitepaper
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
