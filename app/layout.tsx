import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@/components/analytics"
import ClientLayout from "./client"
import { Suspense } from "react"
import AuthProvider from "@/components/auth-provider"

export const metadata: Metadata = {
  title: "ZAGOOM - Sistema de Subastas",
  description: "Plataforma de subastas de vehículos con daños a precios competitivos",
  keywords: ["Subastas", "Vehículos", "Autos", "Compra", "Venta", "Daños", "Precios", "Oportunidades", "ZAGOOM"],
  authors: [{ name: "ZAGOOM" }],
  creator: "ZAGOOM",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://zagoom.com",
    title: "ZAGOOM - Sistema de Subastas",
    description: "Plataforma de subastas de vehículos con daños a precios competitivos",
    siteName: "ZAGOOM",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZAGOOM - Sistema de Subastas",
    description: "Plataforma de subastas de vehículos con daños a precios competitivos",
    creator: "@zagoom",
  },
  robots: {
    index: true,
    follow: true,
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <Suspense>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}


import './globals.css'
