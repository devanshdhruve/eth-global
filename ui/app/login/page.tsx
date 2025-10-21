"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { ArrowRight, Users, CheckCircle, Briefcase } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/app/auth/context"

export default function LoginPage() {
  const router = useRouter()
  const { setRole, setIsAuthenticated } = useAuth()
  const [selectedRole, setSelectedRole] = useState<"annotator" | "reviewer" | "client" | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const roles = [
    {
      id: "annotator",
      title: "Annotator",
      description: "Label data and earn ASI tokens",
      icon: CheckCircle,
      features: ["Earn rewards", "Build reputation", "Flexible scheduling"],
      color: "from-blue-500 to-purple-500",
    },
    {
      id: "reviewer",
      title: "Reviewer",
      description: "Verify and validate annotations",
      icon: Users,
      features: ["Quality assurance", "Higher rewards", "Leadership role"],
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "client",
      title: "Client",
      description: "Create projects and manage datasets",
      icon: Briefcase,
      features: ["Upload datasets", "Manage projects", "Analytics dashboard"],
      color: "from-teal-500 to-cyan-500",
    },
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole || !email || !password) return

    setIsLoading(true)
    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setRole(selectedRole as "annotator" | "reviewer" | "client")
    setIsAuthenticated(true)

    // Route based on role
    if (selectedRole === "annotator") {
      router.push("/projects")
    } else if (selectedRole === "reviewer") {
      router.push("/reviewer/dashboard")
    } else if (selectedRole === "client") {
      router.push("/client/dashboard")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-20">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 gradient-text">Choose Your Role</h1>
            <p className="text-xl text-foreground/70">Select how you want to participate in DataChain</p>
          </motion.div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {roles.map((role, i) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                onClick={() => setSelectedRole(role.id as any)}
                className={`cursor-pointer glass transition-all duration-300 p-8 group ${
                  selectedRole === role.id
                    ? "ring-2 ring-blue-500 bg-white/10 border-white/20"
                    : "hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <role.icon
                  className={`w-12 h-12 mb-4 transition-colors ${
                    selectedRole === role.id ? "text-blue-400" : "text-foreground/60 group-hover:text-blue-400"
                  }`}
                />
                <h3 className="text-2xl font-bold mb-2">{role.title}</h3>
                <p className="text-foreground/70 mb-6">{role.description}</p>
                <ul className="space-y-2">
                  {role.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-foreground/60">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Login Form */}
          {selectedRole && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-md mx-auto glass p-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">
                Login as {roles.find((r) => r.id === selectedRole)?.title}
              </h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white py-2 hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 neon-glow flex items-center justify-center gap-2"
                >
                  {isLoading ? "Logging in..." : "Login"} {!isLoading && <ArrowRight size={18} />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="w-full border border-white/20 rounded-lg font-semibold py-2 hover:bg-white/5 transition-all duration-300"
                >
                  Change Role
                </button>
              </form>

              <p className="text-center text-sm text-foreground/60 mt-6">
                Don't have an account?{" "}
                <Link href="/signup" className="text-blue-400 hover:text-blue-300">
                  Sign up here
                </Link>
              </p>
            </motion.div>
          )}

          {!selectedRole && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-center"
            >
              <p className="text-foreground/60">Select a role above to continue</p>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
