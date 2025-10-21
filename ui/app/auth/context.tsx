"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

export type UserRole = "annotator" | "reviewer" | "client" | null

interface AuthContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  isAuthenticated: boolean
  setIsAuthenticated: (auth: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  return (
    <AuthContext.Provider value={{ role, setRole, isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
