"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { auctionService, vehicleService, type Vehicle } from "@/lib/supabase"
import { SUBASTADOR_ID } from "@/lib/config"
import AuctioneerHeader from "@/components/auctioneer-header"
import { AlertCircle, ArrowLeft, Car } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"

export default function NewAuctionPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)

  // Vehículos
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [loadingVehicles, setLoadingVehicles] = useState(true)

  // Campos del formulario
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [inicio, setInicio] = useState("")
  const [fin, setFin] = useState("")
  const [precioBase, setPrecioBase] = useState("")
  const [montoMinimoPuja, setMontoMinimoPuja] = useState("")
  const [cantidadMaxParticipantes, setCantidadMaxParticipantes] = useState("")

  // Cargar vehículos disponibles usando el servicio centralizado
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoadingVehicles(true)

        const { data, error } = await vehicleService.getAvailableVehicles()

        if (error) {
          console.error("Error al cargar los vehículos:", error)
          toast({
            title: "Error",
            description: "No se pudieron cargar los vehículos disponibles.",
            variant: "destructive",
          })
          setAvailableVehicles([])
          return
        }

        setAvailableVehicles(data || [])
      } catch (error) {
        console.error("Error al cargar los vehículos:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los vehículos disponibles.",
          variant: "destructive",
        })
        setAvailableVehicles([])
      } finally {
        setLoadingVehicles(false)
      }
    }

    fetchVehicles()
  }, [])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!titulo.trim()) {
      errors.titulo = "El título es obligatorio"
    }

    if (!inicio) {
      errors.inicio = "La fecha de inicio es obligatoria"
    }

    if (!fin) {
      errors.fin = "La fecha de fin es obligatoria"
    }

    if (inicio && fin && new Date(inicio) >= new Date(fin)) {
      errors.fin = "La fecha de fin debe ser posterior a la fecha de inicio"
    }

    if (!precioBase) {
      errors.precioBase = "El precio base es obligatorio"
    } else if (isNaN(Number(precioBase)) || Number(precioBase) <= 0) {
      errors.precioBase = "El precio base debe ser un número positivo"
    }

    if (!montoMinimoPuja) {
      errors.montoMinimoPuja = "El monto mínimo de puja es obligatorio"
    } else if (isNaN(Number(montoMinimoPuja)) || Number(montoMinimoPuja) <= 0) {
      errors.montoMinimoPuja = "El monto mínimo de puja debe ser un número positivo"
    }

    if (!cantidadMaxParticipantes) {
      errors.cantidadMaxParticipantes = "La cantidad máxima de participantes es obligatoria"
    } else if (
      isNaN(Number(cantidadMaxParticipantes)) ||
      Number(cantidadMaxParticipantes) <= 0 ||
      !Number.isInteger(Number(cantidadMaxParticipantes))
    ) {
      errors.cantidadMaxParticipantes = "La cantidad máxima de participantes debe ser un número entero positivo"
    }

    // Validar que se haya seleccionado un vehículo
    if (!selectedVehicle) {
      errors.vehiculo = "Debes seleccionar un vehículo para la subasta"
    }

    // Validaciones de fecha
    const now = new Date()

    if (inicio) {
      const inicioDate = new Date(inicio)
      if (inicioDate <= now) {
        errors.inicio = "La fecha de inicio debe ser posterior a la fecha y hora actual"
      }
    }

    if (fin) {
      const finDate = new Date(fin)
      if (finDate <= now) {
        errors.fin = "La fecha de fin debe ser posterior a la fecha y hora actual"
      }
    }

    if (inicio && fin) {
      const inicioDate = new Date(inicio)
      const finDate = new Date(fin)
      if (finDate <= inicioDate) {
        errors.fin = "La fecha de fin debe ser posterior a la fecha de inicio"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // Si hay errores de validación, mostrar un mensaje de error
      if (validationErrors.vehiculo) {
        toast({
          title: "Error de validación",
          description: "Debes seleccionar un vehículo para la subasta.",
          variant: "destructive",
        })
      }
      return
    }

    setIsConfirmDialogOpen(true)
  }

  const handleConfirmSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Preparar los datos para guardar
      const newAuctionData = {
        titulo,
        descripcion,
        estado: "Pendiente", // Siempre se crea en estado Pendiente
        inicio: new Date(inicio).toISOString(),
        fin: new Date(fin).toISOString(),
        precio_base: Number(precioBase),
        monto_minimo_puja: Number(montoMinimoPuja),
        cantidad_max_participantes: Number(cantidadMaxParticipantes),
        ficha: selectedVehicle,
      }

      // Usar el servicio centralizado para crear la subasta
      const { data, error } = await auctionService.createAuction(newAuctionData, SUBASTADOR_ID)

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error("No se pudo crear la subasta")
      }

      // Mostrar mensaje de éxito
      toast({
        title: "Subasta creada",
        description: "La subasta ha sido creada correctamente.",
      })

      // Redirigir a la página principal
      router.push("/")
    } catch (error) {
      console.error("Error al crear la subasta:", error)
      setError("No se pudo crear la subasta. Por favor, inténtalo de nuevo.")
      setIsConfirmDialogOpen(false)
      toast({
        title: "Error",
        description: "No se pudo crear la subasta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AuctioneerHeader />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" onClick={() => router.push("/")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Nueva Subasta</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Información de la subasta</CardTitle>
            <CardDescription>Ingresa los detalles de la nueva subasta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className={validationErrors.titulo ? "border-red-500" : ""}
                  />
                  {validationErrors.titulo && <p className="text-sm text-red-500">{validationErrors.titulo}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex h-10 items-center px-3 rounded-md border border-input bg-background text-sm text-muted-foreground">
                    Pendiente (automático)
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inicio">Fecha de inicio</Label>
                  <Input
                    id="inicio"
                    type="datetime-local"
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} // 1 minuto en el futuro
                    className={validationErrors.inicio ? "border-red-500" : ""}
                  />
                  {validationErrors.inicio && <p className="text-sm text-red-500">{validationErrors.inicio}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fin">Fecha de fin</Label>
                  <Input
                    id="fin"
                    type="datetime-local"
                    value={fin}
                    onChange={(e) => setFin(e.target.value)}
                    min={inicio || new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className={validationErrors.fin ? "border-red-500" : ""}
                  />
                  {validationErrors.fin && <p className="text-sm text-red-500">{validationErrors.fin}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precioBase">Precio base ($)</Label>
                  <Input
                    id="precioBase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioBase}
                    onChange={(e) => setPrecioBase(e.target.value)}
                    className={validationErrors.precioBase ? "border-red-500" : ""}
                  />
                  {validationErrors.precioBase && <p className="text-sm text-red-500">{validationErrors.precioBase}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="montoMinimoPuja">Monto mínimo de puja ($)</Label>
                  <Input
                    id="montoMinimoPuja"
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoMinimoPuja}
                    onChange={(e) => setMontoMinimoPuja(e.target.value)}
                    className={validationErrors.montoMinimoPuja ? "border-red-500" : ""}
                  />
                  {validationErrors.montoMinimoPuja && (
                    <p className="text-sm text-red-500">{validationErrors.montoMinimoPuja}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cantidadMaxParticipantes">Cantidad máxima de participantes</Label>
                  <Input
                    id="cantidadMaxParticipantes"
                    type="number"
                    min="1"
                    step="1"
                    value={cantidadMaxParticipantes}
                    onChange={(e) => setCantidadMaxParticipantes(e.target.value)}
                    className={validationErrors.cantidadMaxParticipantes ? "border-red-500" : ""}
                  />
                  {validationErrors.cantidadMaxParticipantes && (
                    <p className="text-sm text-red-500">{validationErrors.cantidadMaxParticipantes}</p>
                  )}
                </div>
              </div>

              {/* Sección de vehículos */}
              <div className="mt-8 border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Car className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Vehículo para esta subasta</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Selecciona un vehículo para esta subasta. Solo puedes asignar un vehículo por subasta.
                </p>

                {loadingVehicles ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Cargando vehículos...</p>
                  </div>
                ) : availableVehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No hay vehículos disponibles</AlertTitle>
                      <AlertDescription>
                        No hay vehículos disponibles para asignar. Debes tener al menos un vehículo disponible para
                        crear una subasta.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <RadioGroup
                      value={selectedVehicle || ""}
                      onValueChange={setSelectedVehicle}
                      className={validationErrors.vehiculo ? "border border-red-500 rounded-md p-4" : ""}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableVehicles.map((vehicle) => (
                          <div
                            key={vehicle.ficha}
                            className={`border rounded-lg p-4 ${
                              selectedVehicle === vehicle.ficha ? "border-primary bg-primary/5" : "border-border"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <RadioGroupItem value={vehicle.ficha} id={vehicle.ficha} className="mt-1" />
                              <div>
                                <Label htmlFor={vehicle.ficha} className="font-medium cursor-pointer">
                                  {vehicle.modelo} ({vehicle.anio})
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">{vehicle.descripcion}</p>
                                <p className="text-xs text-muted-foreground mt-2">Ficha: {vehicle.ficha}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                    {validationErrors.vehiculo && (
                      <p className="text-sm text-red-500 mt-2">{validationErrors.vehiculo}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push("/")}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={availableVehicles.length === 0}>
                  Crear subasta
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación para guardar */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar creación</DialogTitle>
            <DialogDescription>¿Estás seguro de que deseas crear esta nueva subasta?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              La subasta se creará con estado <strong>Pendiente</strong> y podrás editarla antes de publicarla.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSave} disabled={saving || !selectedVehicle}>
              {saving ? "Creando..." : "Crear subasta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
