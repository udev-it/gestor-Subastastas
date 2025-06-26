"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Eye, Edit, Play, Trash, Pause, Square, Filter } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  auctionService,
  vehicleService,
  pujasService,
  adjudicacionService,
  type Auction,
  type Vehicle,
  type Puja,
} from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { SUBASTADOR_ID } from "@/lib/config"
import Image from "next/image"

// Datos de ejemplo para mostrar cuando no se puede conectar a Supabase
const EXAMPLE_AUCTIONS = [
  {
    id_subasta: "1",
    titulo: "Toyota Corolla",
    estado: "Pendiente",
    created_at: "2025-04-12T00:00:00.000Z",
    inicio: "2025-04-12T00:00:00.000Z",
    fin: "2025-04-20T00:00:00.000Z",
    precio_base: 2000.0,
    monto_minimo_puja: 100.0,
    cantidad_max_participantes: 30,
    ficha: null,
    motivo_cancelacion: null,
  },
  {
    id_subasta: "2",
    titulo: "Moto Yamaha",
    estado: "Publicada",
    created_at: "2025-04-01T00:00:00.000Z",
    inicio: "2025-04-01T00:00:00.000Z",
    fin: "2025-04-15T00:00:00.000Z",
    precio_base: 1500.0,
    monto_minimo_puja: 50.0,
    cantidad_max_participantes: 25,
    ficha: null,
    motivo_cancelacion: null,
  },
  {
    id_subasta: "3",
    titulo: "Moto Yamaha",
    estado: "Finalizada",
    created_at: "2025-03-15T00:00:00.000Z",
    inicio: "2025-03-15T00:00:00.000Z",
    fin: "2025-03-30T00:00:00.000Z",
    precio_base: 1200.0,
    monto_minimo_puja: 50.0,
    cantidad_max_participantes: 25,
    ficha: null,
    motivo_cancelacion: null,
  },
]

// Tipos para filtros
interface FilterOptions {
  estado: string[]
  fechaDesde: string
  fechaHasta: string
}

export default function AuctionManager() {
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [isCancelLoading, setIsCancelLoading] = useState(false)
  const [isStartLoading, setIsStartLoading] = useState(false)
  const [isStopLoading, setIsStopLoading] = useState(false)
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingExampleData, setUsingExampleData] = useState(false)
  const router = useRouter()

  // Estado para el motivo de cancelación
  const [motivoCancelacion, setMotivoCancelacion] = useState("")
  const [motivoError, setMotivoError] = useState("")

  // Estado para filtros
  const [filters, setFilters] = useState<FilterOptions>({
    estado: [],
    fechaDesde: "",
    fechaHasta: "",
  })

  // Estado para detalles del vehículo y pujas
  const [vehicleDetails, setVehicleDetails] = useState<Vehicle | null>(null)
  const [loadingVehicleDetails, setLoadingVehicleDetails] = useState(false)
  const [pujas, setPujas] = useState<Puja[]>([])
  const [loadingPujas, setLoadingPujas] = useState(false)

  // Función para verificar y actualizar estados automáticamente
  const checkAndUpdateAuctionStates = async () => {
    console.log("Verificando estados de subastas...")
    const now = new Date()
    let hasChanges = false
    const updatedAuctions = [...auctions]

    for (let i = 0; i < updatedAuctions.length; i++) {
      const auction = updatedAuctions[i]
      let shouldUpdate = false
      let newState = auction.estado

      // Verificar si una subasta publicada debe pasar a "Activa"
      if (auction.estado === "Publicada" && auction.inicio) {
        const inicioDate = new Date(auction.inicio)
        if (now >= inicioDate) {
          newState = "Activa"
          shouldUpdate = true
          console.log(`Subasta ${auction.id_subasta} cambiando de Publicada a Activa`)
        }
      }

      // Verificar si una subasta activa debe pasar a "Expirada"
      if (auction.estado === "Activa" && auction.fin) {
        const finDate = new Date(auction.fin)
        if (now >= finDate) {
          newState = "Expirada"
          shouldUpdate = true
          console.log(`Subasta ${auction.id_subasta} cambiando de Activa a Expirada`)
        }
      }

      // Verificar si una subasta expirada debe pasar a "Finalizada" (si tiene adjudicación)
      if (auction.estado === "Expirada" && !usingExampleData) {
        try {
          const { hasAdjudication } = await adjudicacionService.hasAdjudication(auction.id_subasta)

          if (hasAdjudication) {
            newState = "Finalizada"
            shouldUpdate = true
            console.log(`Subasta ${auction.id_subasta} cambiando de Expirada a Finalizada`)
          }
        } catch (error) {
          console.log("Error al verificar adjudicación para la subasta:", auction.id_subasta)
        }
      }

      // Actualizar en la base de datos si es necesario
      if (shouldUpdate && !usingExampleData) {
        try {
          const { error } = await auctionService.changeAuctionState(auction.id_subasta, newState)
          if (!error) {
            updatedAuctions[i] = { ...auction, estado: newState }
            hasChanges = true
          }
        } catch (error) {
          console.error("Error al actualizar estado de subasta:", error)
        }
      }
    }

    // Actualizar el estado local si hubo cambios
    if (hasChanges) {
      console.log("Se detectaron cambios de estado, actualizando estado local...")
      setAuctions(updatedAuctions)
      setFilteredAuctions((prevFiltered) => {
        return updatedAuctions.filter((auction) => {
          // Filtro por estado
          if (filters.estado.length > 0 && !filters.estado.includes(auction.estado)) {
            return false
          }

          // Filtro por fecha desde
          if (filters.fechaDesde && auction.created_at) {
            const fechaDesde = new Date(filters.fechaDesde)
            const createdAt = new Date(auction.created_at)
            if (createdAt < fechaDesde) {
              return false
            }
          }

          // Filtro por fecha hasta
          if (filters.fechaHasta && auction.created_at) {
            const fechaHasta = new Date(filters.fechaHasta)
            fechaHasta.setHours(23, 59, 59, 999)
            const createdAt = new Date(auction.created_at)
            if (createdAt > fechaHasta) {
              return false
            }
          }

          return true
        })
      })
    }
  }

  // Cargar las subastas usando el servicio
  const fetchAuctions = async () => {
    try {
      setLoading(true)

      const { data, error } = await auctionService.getAuctionsByAuctioneer(SUBASTADOR_ID)

      if (error) {
        console.error("Error al cargar las subastas:", error)
        setAuctions(EXAMPLE_AUCTIONS)
        setFilteredAuctions(EXAMPLE_AUCTIONS)
        setUsingExampleData(true)
        setError("No se pudo conectar a la base de datos. Mostrando datos de ejemplo.")
        return
      }

      setAuctions(data || [])
      setFilteredAuctions(data || [])
      setUsingExampleData(false)
      setError(null)

      // Verificar y actualizar estados después de cargar
      await checkAndUpdateAuctionStates()
    } catch (error) {
      console.error("Error al cargar las subastas:", error)
      setAuctions(EXAMPLE_AUCTIONS)
      setFilteredAuctions(EXAMPLE_AUCTIONS)
      setUsingExampleData(true)
      setError("No se pudo conectar a la base de datos. Mostrando datos de ejemplo.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Cargar las subastas al montar el componente
    fetchAuctions()

    // Configurar intervalo para verificar estados cada 30 segundos
    const interval = setInterval(() => {
      if (auctions.length > 0) {
        checkAndUpdateAuctionStates()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Añadir un useEffect separado para manejar la actualización de estados cuando cambian las subastas
  useEffect(() => {
    // No ejecutar en el primer render
    if (auctions.length > 0 && !loading) {
      checkAndUpdateAuctionStates()
    }
  }, [auctions.length, loading])

  // Aplicar filtros cuando cambian
  useEffect(() => {
    if (auctions.length === 0) return

    let result = [...auctions]

    // Aplicar filtros
    if (filters.estado.length > 0) {
      result = result.filter((auction) => filters.estado.includes(auction.estado))
    }

    if (filters.fechaDesde) {
      const fechaDesde = new Date(filters.fechaDesde)
      result = result.filter((auction) => {
        if (!auction.created_at) return true
        const createdAt = new Date(auction.created_at)
        return createdAt >= fechaDesde
      })
    }

    if (filters.fechaHasta) {
      const fechaHasta = new Date(filters.fechaHasta)
      // Ajustar la fecha hasta el final del día
      fechaHasta.setHours(23, 59, 59, 999)
      result = result.filter((auction) => {
        if (!auction.created_at) return true
        const createdAt = new Date(auction.created_at)
        return createdAt <= fechaHasta
      })
    }

    setFilteredAuctions(result)
  }, [auctions, filters])

  const handleDeleteClick = (auction: Auction) => {
    setSelectedAuction(auction)
    setIsDeleteDialogOpen(true)
  }

  const handleDetailsClick = async (auction: Auction) => {
    setSelectedAuction(auction)

    // Si la subasta tiene un vehículo asociado, cargar sus detalles
    if (auction.ficha) {
      await fetchVehicleDetails(auction.ficha)
    } else {
      setVehicleDetails(null)
    }

    // Si la subasta está activa, cargar las pujas
    if (auction.estado === "Activa") {
      await fetchPujas(auction.id_subasta)
    } else {
      setPujas([])
    }

    setIsDetailsDialogOpen(true)
  }

  const fetchVehicleDetails = async (ficha: string) => {
    try {
      setLoadingVehicleDetails(true)

      const { data, error } = await vehicleService.getVehicleByFicha(ficha)

      if (error) {
        console.error("Error al cargar los detalles del vehículo:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los detalles del vehículo.",
          variant: "destructive",
        })
        return
      }

      setVehicleDetails(data)
    } catch (error) {
      console.error("Error al cargar los detalles del vehículo:", error)
    } finally {
      setLoadingVehicleDetails(false)
    }
  }

  const fetchPujas = async (idSubasta: string) => {
    try {
      setLoadingPujas(true)

      const { data, error } = await pujasService.getPujasByAuction(idSubasta)

      if (error) {
        console.error("Error al cargar las pujas:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las pujas de la subasta.",
          variant: "destructive",
        })
        return
      }

      setPujas(data || [])
    } catch (error) {
      console.error("Error al cargar las pujas:", error)
    } finally {
      setLoadingPujas(false)
    }
  }

  const handleEditClick = (auction: Auction) => {
    // Navegar a la página de edición con el ID de la subasta
    router.push(`/edit-auction/${auction.id_subasta}`)
  }

  // Nueva función para manejar el clic en publicar subasta
  const handleStartAuctionClick = (auction: Auction) => {
    // Verificar si las fechas son válidas antes de abrir el diálogo
    const now = new Date()
    const inicioDate = auction.inicio ? new Date(auction.inicio) : null
    const finDate = auction.fin ? new Date(auction.fin) : null

    // Verificar si la fecha de inicio es anterior a la actual
    if (inicioDate && inicioDate < now) {
      toast({
        title: "No se puede publicar la subasta",
        description:
          "La fecha de inicio de la subasta ya ha pasado. Por favor, edita la subasta y actualiza las fechas.",
        variant: "destructive",
      })
      return
    }

    // Verificar si la fecha de fin es anterior a la actual
    if (finDate && finDate < now) {
      toast({
        title: "No se puede publicar la subasta",
        description: "La fecha de fin de la subasta ya ha pasado. Por favor, edita la subasta y actualiza las fechas.",
        variant: "destructive",
      })
      return
    }

    // Verificar si la fecha de fin es anterior o igual a la fecha de inicio
    if (inicioDate && finDate && finDate <= inicioDate) {
      toast({
        title: "No se puede publicar la subasta",
        description:
          "La fecha de fin debe ser posterior a la fecha de inicio. Por favor, edita la subasta y corrige las fechas.",
        variant: "destructive",
      })
      return
    }

    // Si todas las validaciones pasan, abrir el diálogo
    setSelectedAuction(auction)
    setIsStartDialogOpen(true)
  }

  // Función para confirmar la publicación de la subasta
  const handleConfirmStartAuction = async () => {
    if (!selectedAuction) return

    if (usingExampleData) {
      // Si estamos usando datos de ejemplo, simular la actualización
      setAuctions(
        auctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Publicada" } : a)),
      )
      setIsStartDialogOpen(false)
      toast({
        title: "Subasta publicada",
        description: "La subasta ha sido publicada correctamente (modo demo).",
      })
      return
    }

    try {
      setIsStartLoading(true)

      // Actualizar localmente primero para feedback inmediato
      setAuctions(
        auctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Publicando..." } : a)),
      )
      setFilteredAuctions(
        filteredAuctions.map((a) =>
          a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Publicando..." } : a,
        ),
      )

      // Actualizar el estado de la subasta a "Publicada"
      const { error } = await auctionService.changeAuctionState(selectedAuction.id_subasta, "Publicada")

      if (error) {
        throw error
      }

      // Actualizar la lista de subastas
      await fetchAuctions()
      setIsStartDialogOpen(false)
      toast({
        title: "Subasta publicada",
        description: "La subasta ha sido publicada correctamente.",
      })
    } catch (error) {
      console.error("Error al publicar la subasta:", error)

      // Revertir el cambio local en caso de error
      setAuctions(
        auctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Pendiente" } : a)),
      )
      setFilteredAuctions(
        filteredAuctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Pendiente" } : a)),
      )

      toast({
        title: "Error",
        description: "No se pudo publicar la subasta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsStartLoading(false)
    }
  }

  // Nueva función para manejar la cancelación de subasta
  const handleCancelAuction = (auction: Auction) => {
    setSelectedAuction(auction)
    setMotivoCancelacion("")
    setMotivoError("")
    setIsCancelDialogOpen(true)
  }

  // Función para validar el motivo de cancelación
  const validateMotivo = () => {
    if (!motivoCancelacion.trim()) {
      setMotivoError("El motivo de cancelación es obligatorio")
      return false
    }
    if (motivoCancelacion.length > 300) {
      setMotivoError("El motivo no puede exceder los 300 caracteres")
      return false
    }
    setMotivoError("")
    return true
  }

  // Función para confirmar la cancelación
  const handleConfirmCancel = async () => {
    if (!validateMotivo() || !selectedAuction) return

    if (usingExampleData) {
      // Si estamos usando datos de ejemplo, simular la actualización
      setAuctions(
        auctions.map((a) =>
          a.id_subasta === selectedAuction.id_subasta
            ? { ...a, estado: "Cancelada", motivo_cancelacion: motivoCancelacion }
            : a,
        ),
      )
      setIsCancelDialogOpen(false)
      toast({
        title: "Subasta cancelada",
        description: "La subasta ha sido cancelada correctamente (modo demo).",
      })
      return
    }

    try {
      setIsCancelLoading(true)

      // Actualizar el estado de la subasta a "Cancelada" y guardar el motivo
      const { error } = await auctionService.changeAuctionState(
        selectedAuction.id_subasta,
        "Cancelada",
        motivoCancelacion.trim(),
      )

      if (error) {
        throw error
      }

      // Actualizar la lista de subastas
      await fetchAuctions()
      setIsCancelDialogOpen(false)
      toast({
        title: "Subasta cancelada",
        description: "La subasta ha sido cancelada correctamente.",
      })
    } catch (error) {
      console.error("Error al cancelar la subasta:", error)
      toast({
        title: "Error",
        description: "No se pudo cancelar la subasta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsCancelLoading(false)
    }
  }

  // Nueva función para manejar la parada de subasta
  const handleStopAuction = (auction: Auction) => {
    setSelectedAuction(auction)
    setIsStopDialogOpen(true)
  }

  // Función para confirmar la parada de la subasta
  const handleConfirmStopAuction = async () => {
    if (!selectedAuction) return

    if (usingExampleData) {
      // Si estamos usando datos de ejemplo, simular la actualización
      setAuctions(
        auctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Pendiente" } : a)),
      )
      setIsStopDialogOpen(false)
      toast({
        title: "Subasta parada",
        description: "La subasta ha sido parada correctamente (modo demo).",
      })
      return
    }

    try {
      setIsStopLoading(true)

      // Actualizar localmente primero para feedback inmediato
      setAuctions(
        auctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Parando..." } : a)),
      )
      setFilteredAuctions(
        filteredAuctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Parando..." } : a)),
      )

      // Actualizar el estado de la subasta a "Pendiente"
      const { error } = await auctionService.changeAuctionState(selectedAuction.id_subasta, "Pendiente")

      if (error) {
        throw error
      }

      // Actualizar la lista de subastas
      await fetchAuctions()
      setIsStopDialogOpen(false)
      toast({
        title: "Subasta parada",
        description: "La subasta ha sido parada correctamente y vuelve al estado Pendiente.",
      })
    } catch (error) {
      console.error("Error al parar la subasta:", error)

      // Revertir el cambio local en caso de error
      setAuctions(
        auctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Publicada" } : a)),
      )
      setFilteredAuctions(
        filteredAuctions.map((a) => (a.id_subasta === selectedAuction.id_subasta ? { ...a, estado: "Publicada" } : a)),
      )

      toast({
        title: "Error",
        description: "No se pudo parar la subasta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsStopLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedAuction) return

    setIsDeleteLoading(true)

    // Si estamos usando datos de ejemplo, simular la eliminación
    if (usingExampleData) {
      setTimeout(() => {
        setAuctions(auctions.filter((auction) => auction.id_subasta !== selectedAuction.id_subasta))
        setIsDeleteDialogOpen(false)
        setIsDeleteLoading(false)
      }, 1000)
      return
    }

    try {
      const { error } = await auctionService.deleteAuction(selectedAuction.id_subasta, SUBASTADOR_ID)

      if (error) {
        throw error
      }

      // Actualizar la lista de subastas
      await fetchAuctions()
      setIsDeleteDialogOpen(false)
      toast({
        title: "Subasta eliminada",
        description: "La subasta ha sido eliminada correctamente.",
      })
    } catch (error) {
      console.error("Error al eliminar la subasta:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la subasta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteLoading(false)
    }
  }

  // Manejar cambios en los filtros de estado
  const handleEstadoFilterChange = (estado: string) => {
    setFilters((prev) => {
      const newEstados = prev.estado.includes(estado)
        ? prev.estado.filter((e) => e !== estado)
        : [...prev.estado, estado]
      return { ...prev, estado: newEstados }
    })
  }

  // Manejar cambios en los filtros de fecha
  const handleFechaDesdeChange = (value: string) => {
    setFilters((prev) => ({ ...prev, fechaDesde: value }))
  }

  const handleFechaHastaChange = (value: string) => {
    setFilters((prev) => ({ ...prev, fechaHasta: value }))
  }

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setFilters({
      estado: [],
      fechaDesde: "",
      fechaHasta: "",
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch (error) {
      return "Fecha inválida"
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
    } catch (error) {
      return "Fecha inválida"
    }
  }

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "N/A"
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" }).format(amount)
  }

  // Actualizar la función getStatusBadge con los nuevos estados
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pendiente":
        return <span className="font-medium text-yellow-600 dark:text-yellow-400">{status}</span>
      case "publicada":
        return <span className="font-medium text-green-600 dark:text-green-400">{status}</span>
      case "activa":
        return <span className="font-medium text-blue-600 dark:text-blue-400">{status}</span>
      case "expirada":
        return <span className="font-medium text-orange-600 dark:text-orange-400">{status}</span>
      case "finalizada":
        return <span className="font-medium text-gray-600 dark:text-gray-400">{status}</span>
      case "cancelada":
        return <span className="font-medium text-red-600 dark:text-red-400">{status}</span>
      case "publicando...":
        return (
          <span className="font-medium text-yellow-600 dark:text-yellow-400 flex items-center">
            <span className="animate-pulse mr-1">Publicando</span>
            <span className="animate-bounce">...</span>
          </span>
        )
      case "parando...":
        return (
          <span className="font-medium text-orange-600 dark:text-orange-400 flex items-center">
            <span className="animate-pulse mr-1">Parando</span>
            <span className="animate-bounce">...</span>
          </span>
        )
      case "cancelando...":
        return (
          <span className="font-medium text-red-600 dark:text-red-400 flex items-center">
            <span className="animate-pulse mr-1">Cancelando</span>
            <span className="animate-bounce">...</span>
          </span>
        )
      default:
        return <span>{status}</span>
    }
  }

  // Actualizar la función getActionIcons con los nuevos estados
  const getActionIcons = (auction: Auction) => {
    const isTransitioning =
      auction.estado.toLowerCase().includes("publicando") ||
      auction.estado.toLowerCase().includes("cancelando") ||
      auction.estado.toLowerCase().includes("parando")

    // Estados donde se puede eliminar la subasta
    const canDelete = ["pendiente", "finalizada", "expirada", "cancelada"].includes(auction.estado.toLowerCase())
    const isActiva = auction.estado.toLowerCase() === "activa"

    // Verificar si las fechas son válidas para publicar
    const now = new Date()
    const inicioDate = auction.inicio ? new Date(auction.inicio) : null
    const finDate = auction.fin ? new Date(auction.fin) : null
    const hasValidDates = inicioDate && finDate && inicioDate >= now && finDate > now && finDate > inicioDate

    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Ver detalles"
          onClick={() => handleDetailsClick(auction)}
          disabled={isTransitioning}
        >
          <Eye className="h-5 w-5" />
        </Button>

        {auction.estado.toLowerCase() === "pendiente" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Editar"
              onClick={() => handleEditClick(auction)}
              disabled={isTransitioning || isStartLoading}
            >
              <Edit className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                hasValidDates
                  ? "text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              title={hasValidDates ? "Publicar" : "No se puede publicar: fechas inválidas o pasadas"}
              onClick={() => handleStartAuctionClick(auction)}
              disabled={isTransitioning || isStartLoading || !hasValidDates}
            >
              <Play className="h-5 w-5 fill-current" />
            </Button>
          </>
        )}

        {auction.estado.toLowerCase() === "publicada" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-orange-500 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
            title="Parar"
            onClick={() => handleStopAuction(auction)}
            disabled={isTransitioning || isStopLoading}
          >
            <Pause className="h-5 w-5" />
          </Button>
        )}

        {isActiva && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
            title="Cancelar"
            onClick={() => handleCancelAuction(auction)}
            disabled={isTransitioning || isCancelLoading}
          >
            <Square className="h-5 w-5" />
          </Button>
        )}

        {/* Solo mostrar el botón de eliminar si no está activa */}
        {!isActiva && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              canDelete
                ? "text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                : "text-gray-400 cursor-not-allowed"
            }`}
            title={canDelete ? "Eliminar" : "No se puede eliminar en este estado"}
            onClick={() => canDelete && handleDeleteClick(auction)}
            disabled={isTransitioning || !canDelete}
          >
            <Trash className="h-5 w-5" />
          </Button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <section className="py-10">
        <div className="container px-4 md:px-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Gestionar subastas</h1>
            <p className="mt-4">Cargando subastas...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-10 min-h-screen">
      <div className="container px-4 md:px-6 mx-auto max-w-full">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Gestionar subastas</h1>
            {error && (
              <p className="mt-2 text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full md:w-auto flex gap-2">
              <Card className="border-0 shadow-none">
                <Button
                  variant="outline"
                  className="w-full md:w-auto border-2 flex justify-between items-center"
                  onClick={() => setIsFilterDialogOpen(true)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  <span>Filtros</span>
                  {(filters.estado.length > 0 || filters.fechaDesde || filters.fechaHasta) && (
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {filters.estado.length + (filters.fechaDesde ? 1 : 0) + (filters.fechaHasta ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </Card>
            </div>
            <Button
              className="w-full md:w-auto bg-black hover:bg-black/90 text-white"
              onClick={() => router.push("/new-auction")}
            >
              Nueva subasta
            </Button>
          </div>
          {filteredAuctions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                {auctions.length === 0
                  ? "No tienes subastas creadas. Crea una nueva subasta para comenzar."
                  : "No se encontraron subastas con los filtros aplicados."}
              </p>
              {auctions.length > 0 && filters && (
                <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Subasta
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Estado
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Fecha de creación
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                      {filteredAuctions.map((auction) => (
                        <tr key={auction.id_subasta} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{auction.titulo}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(auction.estado)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(auction.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {getActionIcons(auction)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de filtros */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
            <DialogDescription>
              Filtra las subastas según tus necesidades. Puedes combinar múltiples filtros.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Filtro por estado */}
            <div className="space-y-2">
              <Label className="text-base">Estado de la subasta</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="estado-pendiente"
                    checked={filters.estado.includes("Pendiente")}
                    onCheckedChange={() => handleEstadoFilterChange("Pendiente")}
                  />
                  <label
                    htmlFor="estado-pendiente"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Pendiente
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="estado-publicada"
                    checked={filters.estado.includes("Publicada")}
                    onCheckedChange={() => handleEstadoFilterChange("Publicada")}
                  />
                  <label
                    htmlFor="estado-publicada"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Publicada
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="estado-activa"
                    checked={filters.estado.includes("Activa")}
                    onCheckedChange={() => handleEstadoFilterChange("Activa")}
                  />
                  <label
                    htmlFor="estado-activa"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Activa
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="estado-finalizada"
                    checked={filters.estado.includes("Finalizada")}
                    onCheckedChange={() => handleEstadoFilterChange("Finalizada")}
                  />
                  <label
                    htmlFor="estado-finalizada"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Finalizada
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="estado-cancelada"
                    checked={filters.estado.includes("Cancelada")}
                    onCheckedChange={() => handleEstadoFilterChange("Cancelada")}
                  />
                  <label
                    htmlFor="estado-cancelada"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Cancelada
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="estado-expirada"
                    checked={filters.estado.includes("Expirada")}
                    onCheckedChange={() => handleEstadoFilterChange("Expirada")}
                  />
                  <label
                    htmlFor="estado-expirada"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Expirada
                  </label>
                </div>
              </div>
            </div>

            {/* Filtro por fecha de creación */}
            <div className="space-y-2">
              <Label className="text-base">Fecha de creación</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha-desde" className="text-xs text-muted-foreground">
                    Desde
                  </Label>
                  <Input
                    id="fecha-desde"
                    type="date"
                    value={filters.fechaDesde}
                    onChange={(e) => handleFechaDesdeChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha-hasta" className="text-xs text-muted-foreground">
                    Hasta
                  </Label>
                  <Input
                    id="fecha-hasta"
                    type="date"
                    value={filters.fechaHasta}
                    onChange={(e) => handleFechaHastaChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleClearFilters} disabled={isStartLoading || isCancelLoading}>
              Limpiar filtros
            </Button>
            <Button onClick={() => setIsFilterDialogOpen(false)} disabled={isStartLoading || isCancelLoading}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para publicar subasta */}
      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Publicar subasta</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas publicar la subasta "{selectedAuction?.titulo}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Información importante:</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                <li>• La subasta pasará al estado "Publicada"</li>
                <li>• Los postores podrán registrarse para participar</li>
                <li>• La subasta comenzará automáticamente en la fecha de inicio programada</li>
                <li>• Una vez publicada, solo podrás cancelarla proporcionando un motivo</li>
              </ul>
            </div>

            {selectedAuction && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Fecha de inicio:</span>
                    <p
                      className={`${
                        selectedAuction.inicio && new Date(selectedAuction.inicio) < new Date()
                          ? "text-red-600 dark:text-red-400"
                          : "text-foreground"
                      }`}
                    >
                      {formatDateTime(selectedAuction.inicio)}
                      {selectedAuction.inicio && new Date(selectedAuction.inicio) < new Date() && (
                        <span className="ml-1 text-xs">(Pasada)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Fecha de fin:</span>
                    <p
                      className={`${
                        selectedAuction.fin && new Date(selectedAuction.fin) < new Date()
                          ? "text-red-600 dark:text-red-400"
                          : "text-foreground"
                      }`}
                    >
                      {formatDateTime(selectedAuction.fin)}
                      {selectedAuction.fin && new Date(selectedAuction.fin) < new Date() && (
                        <span className="ml-1 text-xs">(Pasada)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Precio base:</span>
                    <p>{formatCurrency(selectedAuction.precio_base)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Máx. participantes:</span>
                    <p>{selectedAuction.cantidad_max_participantes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsStartDialogOpen(false)} disabled={isStartLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmStartAuction} disabled={isStartLoading}>
              {isStartLoading ? "Publicando..." : "Confirmar publicación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de cancelación de subasta */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cancelar subasta</DialogTitle>
            <DialogDescription>
              Para cancelar la subasta "{selectedAuction?.titulo}", debes proporcionar un motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo-cancelacion" className="text-base">
                Motivo de cancelación *
              </Label>
              <Textarea
                id="motivo-cancelacion"
                placeholder="Describe el motivo por el cual se cancela la subasta..."
                value={motivoCancelacion}
                onChange={(e) => {
                  setMotivoCancelacion(e.target.value)
                  if (motivoError) setMotivoError("")
                }}
                className={motivoError ? "border-red-500" : ""}
                rows={4}
                maxLength={300}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{motivoCancelacion.length}/300 caracteres</span>
                {motivoError && <span className="text-xs text-red-500">{motivoError}</span>}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} disabled={isCancelLoading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelLoading || !motivoCancelacion.trim()}
            >
              {isCancelLoading ? "Cancelando..." : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalles de la subasta */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la subasta</DialogTitle>
            <DialogDescription>Información detallada sobre la subasta y el vehículo asociado.</DialogDescription>
          </DialogHeader>

          {selectedAuction && (
            <div className="space-y-6">
              {/* Datos de la subasta */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Información de la subasta</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Título</p>
                    <p className="text-base">{selectedAuction.titulo}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <p className="text-base">{getStatusBadge(selectedAuction.estado)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
                    <p className="text-base">{formatDate(selectedAuction.created_at)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de inicio</p>
                    <p className="text-base">{formatDateTime(selectedAuction.inicio)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de fin</p>
                    <p className="text-base">{formatDateTime(selectedAuction.fin)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Precio base</p>
                    <p className="text-base">{formatCurrency(selectedAuction.precio_base)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monto mínimo de puja</p>
                    <p className="text-base">{formatCurrency(selectedAuction.monto_minimo_puja)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Máximo de participantes</p>
                    <p className="text-base">{selectedAuction.cantidad_max_participantes}</p>
                  </div>
                </div>

                {selectedAuction.descripcion && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                    <p className="text-base mt-1">{selectedAuction.descripcion}</p>
                  </div>
                )}

                {/* Mostrar motivo de cancelación si existe */}
                {selectedAuction.motivo_cancelacion && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Motivo de cancelación:</p>
                    <p className="text-sm text-red-700 dark:text-red-300">{selectedAuction.motivo_cancelacion}</p>
                  </div>
                )}
              </div>

              {/* Pujas de la subasta (solo si está activa) */}
              {selectedAuction.estado === "Activa" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Pujas de la subasta</h3>

                  {loadingPujas ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Cargando pujas...</p>
                    </div>
                  ) : pujas.length > 0 ? (
                    <div className="space-y-3">
                      {pujas.map((puja, index) => (
                        <div
                          key={puja.id_puja}
                          className={`p-4 rounded-lg border ${
                            index === 0
                              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-lg">
                                {formatCurrency(puja.monto)}
                                {index === 0 && (
                                  <span className="ml-2 text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                                    Puja más alta
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">Por: {puja.postor_nombre}</p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>{formatDate(puja.fecha)}</p>
                              <p>{puja.hora}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-muted-foreground">No hay pujas registradas para esta subasta.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Datos del vehículo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Información del vehículo</h3>

                {loadingVehicleDetails ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Cargando detalles del vehículo...</p>
                  </div>
                ) : vehicleDetails ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ficha</p>
                        <p className="text-base">{vehicleDetails.ficha}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Modelo</p>
                        <p className="text-base">{vehicleDetails.modelo}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Año</p>
                        <p className="text-base">{vehicleDetails.anio}</p>
                      </div>
                    </div>

                    {vehicleDetails.descripcion && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                        <p className="text-base mt-1">{vehicleDetails.descripcion}</p>
                      </div>
                    )}

                    {/* Imagen del vehículo */}
                    {vehicleDetails.imagen_url ? (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Imagen</p>
                        <div className="relative h-64 w-full rounded-lg overflow-hidden">
                          <Image
                            src={vehicleDetails.imagen_url || "/placeholder.svg"}
                            alt={`Imagen de ${vehicleDetails.modelo}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                        <p className="text-muted-foreground">No hay imagen disponible para este vehículo</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <p className="text-amber-600 dark:text-amber-400">Esta subasta no tiene un vehículo asociado.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente la subasta y todos los datos relacionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              ¿Estás seguro de que deseas eliminar la subasta <strong>"{selectedAuction?.titulo}"</strong>?
            </p>

            {selectedAuction &&
              !["pendiente", "finalizada", "expirada", "cancelada"].includes(selectedAuction.estado.toLowerCase()) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Restricción:</strong> Solo se pueden eliminar subastas en estado Pendiente, Finalizada,
                    Expirada o Cancelada.
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Estado actual: <strong>{selectedAuction.estado}</strong>
                  </p>
                </div>
              )}

            <p className="text-sm text-destructive">
              Se eliminarán todas las pujas, participaciones y adjudicaciones relacionadas con esta subasta.
            </p>
            <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleteLoading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={
                isDeleteLoading ||
                (selectedAuction &&
                  !["pendiente", "finalizada", "expirada", "cancelada"].includes(selectedAuction.estado.toLowerCase()))
              }
            >
              {isDeleteLoading ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para parar subasta */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Parar subasta</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas parar la subasta "{selectedAuction?.titulo}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Información importante:</strong>
              </p>
              <ul className="text-sm text-orange-700 dark:text-orange-300 mt-2 space-y-1">
                <li>• La subasta volverá al estado "Pendiente"</li>
                <li>• Podrás editarla nuevamente</li>
                <li>• Los postores registrados mantendrán su registro</li>
                <li>• Podrás publicarla nuevamente cuando desees</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsStopDialogOpen(false)} disabled={isStopLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmStopAuction} disabled={isStopLoading}>
              {isStopLoading ? "Parando..." : "Confirmar parada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

// Exportar tipos para uso en otros archivos
export type { Auction, Vehicle, Puja }
