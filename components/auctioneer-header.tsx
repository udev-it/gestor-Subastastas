"use client"

import { useState, useEffect } from "react"
import { ModeToggle } from "./mode-toggle"
import { Button } from "@/components/ui/button"
import { Menu, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import Link from "next/link"
import { userService } from "@/lib/supabase"
import { SUBASTADOR_ID } from "@/lib/config"

export default function AuctioneerHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [userName, setUserName] = useState("Usuario")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const fetchSubastadorName = async () => {
      try {
        setLoading(true)

        // Usar el servicio centralizado para obtener información del subastador
        const { data, error } = await userService.getAuctioneerInfo(SUBASTADOR_ID)

        if (error) {
          console.error("Error al obtener información del subastador:", error)
          setUserName("Usuario")
          return
        }

        if (data) {
          setUserName(data.nombre)
        }
      } catch (error) {
        console.error("Error al obtener el nombre del subastador:", error)
        setUserName("Usuario")
      } finally {
        setLoading(false)
      }
    }

    fetchSubastadorName()
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled ? "bg-background/70 backdrop-blur-lg shadow-sm border-b border-border/50" : "bg-background",
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-2xl font-bold text-primary">ZAGOOM</span>
          </motion.div>
        </Link>

        {/* User Profile */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
              <User className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{loading ? "Cargando..." : `Hola, ${userName}`}</span>
            </div>
          </div>

          <ModeToggle />

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle Menu"
              className="relative"
            >
              <motion.div
                initial={false}
                animate={isOpen ? "open" : "closed"}
                variants={{
                  open: { rotate: 180 },
                  closed: { rotate: 0 },
                }}
                transition={{ duration: 0.3 }}
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </motion.div>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        className="md:hidden overflow-hidden"
        initial={{ height: 0 }}
        animate={{ height: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="container py-4 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-full mb-4">
            <User className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{loading ? "Cargando..." : `Hola, ${userName}`}</span>
          </div>
          <nav className="flex flex-col space-y-4">
            <Link
              href="#"
              className="text-sm font-medium transition-colors py-2 px-3 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              Mi perfil
            </Link>
          </nav>
        </div>
      </motion.div>
    </header>
  )
}
