"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface AuthProviderProps {
  children: React.ReactNode
}

// ID del subastador hardcodeado (reemplaza con un ID real de tu base de datos)
const SUBASTADOR_ID = "e7d2f6f6-51b0-4f5a-b613-9fb9f78ed524" // Reemplaza con un ID real

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular una carga breve para dar tiempo a que se inicialice la aplicación
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Mostrar un indicador de carga mientras se inicializa
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
