"use client"

import type React from "react"
import { Inter } from 'next/font/google'
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"
import NoScriptStyles from "@/components/noscript-styles"
import { usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/toaster"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <NoScriptStyles />
        <style jsx global>{`
          :root {
            --font-mono: ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, Monaco, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
          }
        `}</style>
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <div className="relative flex min-h-screen flex-col">
            <noscript>
              <div className="bg-yellow-100 dark:bg-yellow-900 p-4 text-center text-sm">
                Para una mejor experiencia, por favor habilita JavaScript. Algunas funciones pueden estar limitadas sin
                él.
              </div>
            </noscript>
            {!isLoginPage && <AnimatedBackground />}
            <main className={cn("flex-1 relative z-10", isLoginPage ? "" : "pt-16")}>{children}</main>
            {!isLoginPage && <Footer />}
          </div>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
