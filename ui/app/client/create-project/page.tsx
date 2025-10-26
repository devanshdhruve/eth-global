"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Upload, ArrowRight, CheckCircle2, User, Shield, AlertCircle, ExternalLink } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { createClientDelegation, ClientDelegationConfig } from "@/lib/ClientDelegationManager"
import { PaymentDelegation } from "@/types/payment"

interface Task {
  id: number
  raw: any
  ipfsHash: string
  status: "pending" | "uploading" | "uploaded" | "failed"
}

interface OwnerInfo {
  accountId: string
  walletAddress: string
  name: string
  email: string
}

export default function CreateProject() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    projectName: "",
    instruction: "",
    category: "",
    reward: "",
    maxPaymentPerTask: "",
    delegationDuration: "30",
    qualityThreshold: "0.7",
  })
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo>({
    accountId: "",
    walletAddress: "",
    name: "",
    email: "",
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [uploading, setUploading] = useState(false)
  const [filesUploaded, setFilesUploaded] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [projectCreated, setProjectCreated] = useState(false)
  const [projectResponse, setProjectResponse] = useState<any>(null)
  
  // Delegation state
  const [delegationCreated, setDelegationCreated] = useState(false)
  const [creatingDelegation, setCreatingDelegation] = useState(false)
  const [delegationToken, setDelegationToken] = useState<string | null>(null)
  const [delegation, setDelegation] = useState<PaymentDelegation | null>(null)
  const [delegationError, setDelegationError] = useState<string | null>(null)

  // Get wallet info from window.ethereum (managed by Navbar)
  useEffect(() => {
    const getWalletInfo = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts && accounts.length > 0) {
            setOwnerInfo(prev => ({
              ...prev,
              walletAddress: accounts[0],
              accountId: prev.accountId || `0.0.${Math.floor(Math.random() * 999999)}`,
              name: prev.name || "Demo User",
            }))
          }
        } catch (error) {
          console.error("Error getting wallet info:", error)
        }
      }
    }
    
    getWalletInfo()
    
    // Listen for account changes (handled by MetaMask)
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setOwnerInfo(prev => ({ ...prev, walletAddress: accounts[0] }))
        }
      })
    }
  }, [])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setOwnerInfo((prev) => ({ ...prev, [name]: value }))
  }

  // Payment delegation creation
  const createPaymentDelegation = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to create payment authorization")
      window.open("https://metamask.io/download/", "_blank")
      return
    }

    if (!ownerInfo.walletAddress) {
      alert("Please connect your wallet first (use the Connect Wallet button in the navbar)")
      return
    }

    if (!formData.reward || !formData.projectName) {
      alert("Please fill in project name and reward amount first")
      return
    }

    setCreatingDelegation(true)
    setDelegationError(null)
    
    try {
      console.log("🔐 Creating payment delegation...")
      
      // Calculate max payment per task
      const rewardAmount = parseFloat(formData.reward)
      const maxPerTask = formData.maxPaymentPerTask 
        ? parseFloat(formData.maxPaymentPerTask) 
        : rewardAmount / 10 // Default to 10% of total

      const delegationConfig: ClientDelegationConfig = {
        maxPaymentPerTask: maxPerTask,
        maxTotalSpending: rewardAmount,
        timeLimit: `${formData.delegationDuration}d`,
        qualityThreshold: parseFloat(formData.qualityThreshold),
        allowedPaymentTypes: ["task_completion", "quality_bonus"],
        projectId: formData.projectName.toLowerCase().replace(/\s+/g, "_"),
      }

      console.log("📋 Delegation config:", delegationConfig)

      const createdDelegation = await createClientDelegation(delegationConfig)
      
      setDelegation(createdDelegation)
      setDelegationToken(createdDelegation.token)
      setDelegationCreated(true)
      
      console.log("✅ Delegation created successfully!")
      console.log("🔑 Token:", createdDelegation.token.substring(0, 30) + "...")
      console.log("⏰ Expires:", createdDelegation.expiresAt)
      
    } catch (error: any) {
      console.error("❌ Delegation creation failed:", error)
      setDelegationError(error.message || "Failed to create payment authorization")
      
      // User-friendly error messages
      if (error.message.includes("rejected")) {
        alert("You rejected the signature request. Payment authorization was not created.")
      } else if (error.message.includes("MetaMask")) {
        alert(error.message)
      } else {
        alert("Failed to create payment authorization: " + error.message)
      }
    } finally {
      setCreatingDelegation(false)
    }
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handlePrev = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setTasks([])
    setFilesUploaded(false)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("file", file)
      formDataToSend.append("projectId", formData.projectName.toLowerCase().replace(/\s+/g, "_"))
      formDataToSend.append("projectName", formData.projectName)
      formDataToSend.append("instruction", formData.instruction)
      formDataToSend.append("category", formData.category)
      formDataToSend.append("reward", formData.reward || "0")
      
      // Add owner information
      formDataToSend.append("ownerAccountId", ownerInfo.accountId)
      formDataToSend.append("ownerWallet", ownerInfo.walletAddress)
      formDataToSend.append("ownerName", ownerInfo.name)
      formDataToSend.append("ownerEmail", ownerInfo.email)

      // Add delegation token if created
      if (delegationToken) {
        formDataToSend.append("delegationToken", delegationToken)
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataToSend,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Upload failed: ${res.statusText}`)
      }

      const data = await res.json()
      console.log("Upload response:", data)

      // Map backend tasks to frontend state
      const mappedTasks: Task[] = data.tasks.map((t: any, i: number) => ({
        id: i + 1,
        raw: t.raw || t.data,
        ipfsHash: t.ipfsHash || t.cid,
        status: (t.ipfsHash || t.cid) ? "uploaded" : "failed",
      }))

      setTasks(mappedTasks)
      setFilesUploaded(true)
      setProjectResponse(data)
      
      // Mark project as created
      if (data.success && data.project) {
        setProjectCreated(true)
      }
    } catch (err: any) {
      console.error("Upload failed", err)
      alert("Upload failed: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2 gradient-text">Create New Project</h1>
          <p className="text-foreground/70">Set up your annotation project in 3 steps</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  s <= step
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    : "bg-white/10 text-foreground/60"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                    s < step ? "bg-gradient-to-r from-blue-500 to-purple-500" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass p-8"
        >
          {/* Step 1: Project Details */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Project Details</h2>
              
              {/* Wallet Info Display */}
              {!ownerInfo.walletAddress && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-400 font-semibold">Wallet Connection Required</span>
                  </div>
                  <p className="text-sm text-foreground/60">
                    Please connect your wallet using the "Connect Wallet" button in the navbar to continue.
                  </p>
                </div>
              )}

              {/* Owner Information */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <User size={20} className="text-blue-400" />
                  <h3 className="font-semibold text-blue-400">Project Owner</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Name</label>
                    <input
                      type="text"
                      name="name"
                      value={ownerInfo.name}
                      onChange={handleOwnerChange}
                      placeholder="John Doe"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email (Optional)</label>
                    <input
                      type="email"
                      name="email"
                      value={ownerInfo.email}
                      onChange={handleOwnerChange}
                      placeholder="john@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">Hedera Account ID</label>
                  <input
                    type="text"
                    name="accountId"
                    value={ownerInfo.accountId}
                    onChange={handleOwnerChange}
                    placeholder="0.0.123456"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  />
                  <p className="text-xs text-foreground/40 mt-1">
                    Your Hedera account for receiving project updates
                  </p>
                </div>
                {ownerInfo.walletAddress && (
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded">
                    <p className="text-xs text-green-400">
                      ✓ Wallet Connected: {ownerInfo.walletAddress.substring(0, 10)}...{ownerInfo.walletAddress.substring(ownerInfo.walletAddress.length - 8)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Project Name *</label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  placeholder="e.g., Medical Imaging Dataset"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Annotation Instructions *</label>
                <textarea
                  name="instruction"
                  value={formData.instruction}
                  onChange={handleInputChange}
                  placeholder="Provide clear, detailed instructions for annotators. Include examples of what you're looking for..."
                  rows={4}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                >
                  <option value="">Select a category</option>
                  <option value="image">Image Annotation</option>
                  <option value="text">Text Annotation</option>
                  <option value="audio">Audio Annotation</option>
                  <option value="video">Video Annotation</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Budget & Payment Setup */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Budget & Payment Setup</h2>
              
              {/* Budget Section */}
              <div>
                <label className="block text-sm font-medium mb-2">Total Reward Pool (HBAR) *</label>
                <input
                  type="number"
                  name="reward"
                  value={formData.reward}
                  onChange={handleInputChange}
                  placeholder="e.g., 1000"
                  step="0.01"
                  min="0"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                />
                <p className="text-xs text-foreground/40 mt-1">
                  Total HBAR to be distributed among all completed tasks
                </p>
              </div>

              {/* Payment Delegation Section */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-blue-400">AI Payment Authorization</h3>
                </div>
                
                <p className="text-sm text-foreground/60 mb-4">
                  Allow AI agents to automatically pay annotators when tasks meet quality standards. 
                  You maintain full control and can revoke access anytime.
                </p>

                {/* Payment Rules */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Payment per Task (HBAR)</label>
                    <input
                      type="number"
                      name="maxPaymentPerTask"
                      value={formData.maxPaymentPerTask || ""}
                      onChange={handleInputChange}
                      placeholder={formData.reward ? (parseFloat(formData.reward) / 10).toFixed(2) : "50"}
                      step="0.01"
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    />
                    <p className="text-xs text-foreground/40 mt-1">
                      {formData.reward ? `Suggested: ${(parseFloat(formData.reward) / 10).toFixed(2)} HBAR` : "Maximum per task"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Authorization Duration</label>
                    <select
                      name="delegationDuration"
                      value={formData.delegationDuration}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    >
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">6 months</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>
                </div>

                {/* Quality Threshold */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Minimum Quality Threshold</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      name="qualityThreshold"
                      value={formData.qualityThreshold}
                      onChange={handleInputChange}
                      min="0"
                      max="1"
                      step="0.05"
                      className="flex-1"
                    />
                    <span className="text-sm font-mono bg-white/5 px-3 py-1 rounded min-w-[60px] text-center">
                      {(parseFloat(formData.qualityThreshold) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-foreground/40 mt-1">
                    Only approve payments for tasks meeting this quality score
                  </p>
                </div>

                {/* Delegation Status */}
                {delegationError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-semibold">Authorization Failed</span>
                    </div>
                    <p className="text-sm text-foreground/60">{delegationError}</p>
                  </div>
                )}

                {delegationCreated ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-semibold">Payment Authorization Active</span>
                    </div>
                    <p className="text-sm text-foreground/60 mb-3">
                      AI agents can now automatically process payments within your specified limits.
                    </p>
                    {delegation && (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Max per Task:</span>
                          <span className="font-mono">{delegation.rules.maxPaymentPerTask} HBAR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Total Budget:</span>
                          <span className="font-mono">{delegation.rules.maxTotalSpending} HBAR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Expires:</span>
                          <span className="font-mono">{new Date(delegation.expiresAt).toLocaleDateString()}</span>
                        </div>
                        <div className="pt-2 border-t border-green-500/20">
                          <span className="text-foreground/60">Token:</span>
                          <p className="font-mono text-[10px] text-green-400 break-all mt-1">
                            {delegation.token.substring(0, 40)}...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={createPaymentDelegation}
                    disabled={creatingDelegation || !formData.reward || !formData.projectName || !ownerInfo.walletAddress}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creatingDelegation ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Authorization...
                      </>
                    ) : !ownerInfo.walletAddress ? (
                      "Connect Wallet to Continue"
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Authorize AI Payments
                      </>
                    )}
                  </button>
                )}

                {!ownerInfo.walletAddress && (
                  <p className="text-xs text-yellow-400 mt-2 text-center">
                    ⚠️ Connect your wallet via navbar to create payment authorization
                  </p>
                )}
              </div>

              {/* Reward Distribution Info */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Payment Details</h4>
                <ul className="text-sm text-foreground/60 space-y-1">
                  <li>• Each completed task receives an equal share of the reward pool</li>
                  <li>• Payments are only processed for tasks meeting quality threshold</li>
                  <li>• You can monitor and revoke authorization at any time</li>
                  <li>• All transactions are recorded on Hedera blockchain</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Upload Dataset */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Upload Dataset</h2>

              <div className="relative border-2 border-dashed border-white/20 rounded-lg p-12 text-center hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                <h3 className="text-lg font-semibold mb-2">Upload your dataset</h3>
                <p className="text-foreground/60 mb-4">Drag and drop your files or click to browse</p>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading || filesUploaded}
                />
                <button
                  className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading || filesUploaded}
                >
                  {uploading ? "Uploading..." : filesUploaded ? "Files Uploaded ✓" : "Choose Files"}
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-sm text-foreground/60">
                  <strong>Supported formats:</strong> CSV, JSON • <strong>Max file size:</strong> 500MB
                </p>
                <p className="text-xs text-foreground/40 mt-2">
                  Your data will be uploaded to IPFS and recorded on Hedera Consensus Service
                </p>
              </div>

              {/* Display uploaded tasks */}
              {tasks.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Uploaded Tasks</h4>
                    <span className="text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      {tasks.length} tasks uploaded
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <ul className="space-y-2">
                      {tasks.map((t) => (
                        <li key={t.id} className="text-sm text-foreground/80 flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <span>Task {t.id}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-blue-400">{t.ipfsHash.substring(0, 12)}...</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              t.status === 'uploaded' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Project Summary */}
              {filesUploaded && projectResponse && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mt-6">
                  <h4 className="text-lg font-semibold mb-4">Project Summary</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-foreground/60">Project Name:</span>
                      <p className="font-semibold">{projectResponse.project.projectName}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Category:</span>
                      <p className="font-semibold">{projectResponse.project.category}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Total Tasks:</span>
                      <p className="font-semibold">{projectResponse.project.taskCount}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Reward per Task:</span>
                      <p className="font-semibold">{projectResponse.project.rewardPerTask} HBAR</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Total Reward:</span>
                      <p className="font-semibold">{projectResponse.project.reward} HBAR</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Owner:</span>
                      <p className="font-semibold">{projectResponse.project.owner.name}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <span className="text-foreground/60 text-xs">Transaction ID:</span>
                    <p className="font-mono text-xs text-blue-400 break-all">
                      {projectResponse.hedera.transactionId}
                    </p>
                  </div>
                </div>
              )}

              {/* Success message */}
              {projectCreated && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mt-6 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
                  <h4 className="text-xl font-semibold mb-2">Project Created Successfully!</h4>
                  <p className="text-foreground/60 mb-4">Your project has been submitted to the Hedera network</p>
                  <div className="flex gap-4 justify-center">
                    <a
                      href={`/dashboard/${ownerInfo.accountId}`}
                      className="px-6 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-all"
                    >
                      View Dashboard
                    </a>
                    <a
                      href="/projects"
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all"
                    >
                      Browse All Projects
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-white/10">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className="px-6 py-2 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="text-sm text-foreground/60">Step {step} of 3</div>

            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && (!formData.projectName || !formData.instruction || !formData.category || !ownerInfo.accountId)) ||
                  (step === 2 && (!formData.reward || !delegationCreated))
                }
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 neon-glow"
              >
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => window.location.href = `/dashboard/${ownerInfo.accountId}`}
                disabled={!projectCreated}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 neon-glow"
              >
                {projectCreated ? (
                  <>
                    Go to Dashboard <ArrowRight size={18} />
                  </>
                ) : (
                  <>Upload Files to Continue</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}