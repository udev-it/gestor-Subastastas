"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { auctionService, vehicleService, type Auction, type Vehicle } from "@/lib/supabase"
import { SUBASTADOR_ID } from "@/lib/config"
import AuctioneerHeader from "@/components/auctioneer-header"
import { format } from "date-fns"
import { AlertCircle, ArrowLeft, Car } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"

export default function EditAuctionPage() {
  const router = useRouter()
  const params = useParams()
  const auctionId = params.id as string

  // Estados principales
  const [currentAuction, setCurrentAuction] = useState<Auction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Estados para vehículos
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true)

  // Estados del formulario
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    precioBase: "",
    montoMinimoPuja: "",
    maxParticipantes: "",
  })

  // Función para cargar los datos de la subasta usando servicios centralizados
  const loadAuctionData = async () => {
    try {
      setIsLoading(true)

      // Verificar permisos del subastador
      const { hasPermission, error: permissionError } = await auctionService.checkAuctioneerPermission(
        auctionId,
        SUBASTADOR_ID,
      )

      if (permissionError || !hasPermission) {
        console.error("Error al verificar permisos:", permissionError)
        throw new Error("No tienes permiso para editar esta subasta")
      }

      // Obtener datos de la subasta
      const { data: auctionData, error: auctionError } = await auctionService.getAuctionById(auctionId)

      if (auctionError) {
        throw auctionError
      }

      if (!auctionData) {
        throw new Error("Subasta no encontrada")
      }

      // Verificar que la subasta esté en estado Pendiente
      if (auctionData.estado !== "Pendiente") {
        throw new Error("Solo se pueden editar subastas en estado Pendiente")
      }

      setCurrentAuction(auctionData)
      setSelectedVehicleId(auctionData.ficha)

      // Llenar el formulario con los datos existentes
      setFormData({
        titulo: auctionData.titulo || "",
        descripcion: auctionData.descripcion || "",
        fechaInicio: auctionData.inicio ? format(new Date(auctionData.inicio), "yyyy-MM-dd'T'HH:mm") : "",
        fechaFin: auctionData.fin ? format(new Date(auctionData.fin), "yyyy-MM-dd'T'HH:mm") : "",
        precioBase: auctionData.precio_base?.toString() || "",
        montoMinimoPuja: auctionData.monto_minimo_puja?.toString() || "",
        maxParticipantes: auctionData.cantidad_max_participantes?.toString() || "",
      })
    } catch (error) {
      console.error("Error al cargar la subasta:", error)
      setErrorMessage(error instanceof Error ? error.message : "Error desconocido al cargar la subasta")
    } finally {
      setIsLoading(false)
    }
  }

  // Función para cargar vehículos disponibles usando servicios centralizados
  const loadAvailableVehicles = async () => {
    try {
      setIsLoadingVehicles(true)

      // Obtener vehículos disponibles excluyendo la subasta actual
      const { data, error } = await vehicleService.getAvailableVehicles(auctionId)

      if (error) {
        console.error("Error al cargar vehículos:", error)
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
      console.error("Error al cargar vehículos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos disponibles.",
        variant: "destructive",
      })
      setAvailableVehicles([])
    } finally {
      setIsLoadingVehicles(false)
    }
  }

  // Función para validar campos requeridos
  const validateRequiredFields = () => {
    const errors: Record<string, string> = {}

    if (!formData.titulo.trim()) {
      errors.titulo = "El título es obligatorio"
    }

    if (!formData.fechaInicio) {
      errors.fechaInicio = "La fecha de inicio es obligatoria"
    }

    if (!formData.fechaFin) {
      errors.fechaFin = "La fecha de fin es obligatoria"
    }

    if (!formData.precioBase) {
      errors.precioBase = "El precio base es obligatorio"
    }

    if (!formData.montoMinimoPuja) {
      errors.montoMinimoPuja = "El monto mínimo de puja es obligatorio"
    }

    if (!formData.maxParticipantes) {
      errors.maxParticipantes = "La cantidad máxima de participantes es obligatoria"
    }

    if (!selectedVehicleId) {
      errors.vehiculo = "Debes seleccionar un vehículo para la subasta"
    }

    return errors
  }

  // Función para validar formatos numéricos
  const validateNumericFields = () => {
    const errors: Record<string, string> = {}

    const precioBase = Number(formData.precioBase)
    if (isNaN(precioBase) || precioBase <= 0) {
      errors.precioBase = "El precio base debe ser un número positivo"
    }

    const montoMinimo = Number(formData.montoMinimoPuja)
    if (isNaN(montoMinimo) || montoMinimo <= 0) {
      errors.montoMinimoPuja = "El monto mínimo de puja debe ser un número positivo"
    }

    const maxParticipantes = Number(formData.maxParticipantes)
    if (isNaN(maxParticipantes) || maxParticipantes <= 0 || !Number.isInteger(maxParticipantes)) {
      errors.maxParticipantes = "La cantidad máxima de participantes debe ser un número entero positivo"
    }

    return errors
  }

  // Función para validar fechas
  const validateDates = () => {
    const errors: Record<string, string> = {}
    const now = new Date()

    if (formData.fechaInicio && formData.fechaFin) {
      const fechaInicio = new Date(formData.fechaInicio)
      const fechaFin = new Date(formData.fechaFin)

      // Validar que las fechas sean futuras
      if (fechaInicio <= now) {
        errors.fechaInicio = "La fecha de inicio debe ser posterior a la fecha y hora actual"
      }

      if (fechaFin <= now) {
        errors.fechaFin = "La fecha de fin debe ser posterior a la fecha y hora actual"
      }

      // Validar que la fecha de fin sea posterior a la de inicio
      if (fechaFin <= fechaInicio) {
        errors.fechaFin = "La fecha de fin debe ser posterior a la fecha de inicio"
      }
    }

    return errors
  }

  // Función principal de validación
  const validateForm = () => {
    const requiredErrors = validateRequiredFields()
    const numericErrors = validateNumericFields()
    const dateErrors = validateDates()

    const allErrors = { ...requiredErrors, ...numericErrors, ...dateErrors }
    setFieldErrors(allErrors)

    return Object.keys(allErrors).length === 0
  }

  // Función para manejar cambios en el formulario
  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpiar error del campo si existe
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Función para manejar el envío del formulario
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      if (fieldErrors.vehiculo) {
        toast({
          title: "Error de validación",
          description: "Debes seleccionar un vehículo para la subasta.",
          variant: "destructive",
        })
      }
      return
    }

    setShowConfirmDialog(true)
  }

  // Función para guardar los cambios usando servicios centralizados
  const saveAuctionChanges = async () => {
    try {
      setIsSaving(true)

      const updatedAuctionData = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        inicio: new Date(formData.fechaInicio).toISOString(),
        fin: new Date(formData.fechaFin).toISOString(),
        precio_base: Number(formData.precioBase),
        monto_minimo_puja: Number(formData.montoMinimoPuja),
        cantidad_max_participantes: Number(formData.maxParticipantes),
        ficha: selectedVehicleId,
      }

      const { error } = await auctionService.updateAuction(auctionId, updatedAuctionData)

      if (error) {
        throw error
      }

      toast({
        title: "Subasta actualizada",
        description: "La información de la subasta ha sido actualizada correctamente.",
      })

      router.push("/")
    } catch (error) {
      console.error("Error al guardar:", error)
      setErrorMessage("No se pudo guardar la subasta. Por favor, inténtalo de nuevo.")
      setShowConfirmDialog(false)
      toast({
        title: "Error",
        description: "No se pudo guardar la subasta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Efectos
  useEffect(() => {
    if (auctionId) {
      loadAuctionData()
    }
  }, [auctionId])

  useEffect(() => {
    if (auctionId) {
      loadAvailableVehicles()
    }
  }, [auctionId])

  // Renderizado condicional para estados de carga y error
  if (isLoading) {
    return (
      <>
        <AuctioneerHeader />
        <div className="container mx-auto px-4 pt-24">
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-500">Cargando subasta...</p>
          </div>
        </div>
      </>
    )
  }

  if (errorMessage) {
    return (
      <>
        <AuctioneerHeader />
        <div className="container mx-auto px-4 pt-24">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={() => router.push("/")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a la lista de subastas
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AuctioneerHeader />
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Encabezado */}
        <div className="mb-6 flex items-center">
          <Button variant="ghost" onClick={() => router.push("/")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Editar Subasta</h1>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Información de la subasta</CardTitle>
            <CardDescription>Modifica los detalles de la subasta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => handleFormChange("titulo", e.target.value)}
                    className={fieldErrors.titulo ? "border-red-500" : ""}
                  />
                  {fieldErrors.titulo && <p className="text-sm text-red-500">{fieldErrors.titulo}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex h-10 items-center px-3 rounded-md border border-input bg-background text-sm text-muted-foreground">
                    Pendiente (no modificable)
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => handleFormChange("descripcion", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha de inicio</Label>
                  <Input
                    id="fechaInicio"
                    type="datetime-local"
                    value={formData.fechaInicio}
                    onChange={(e) => handleFormChange("fechaInicio", e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className={fieldErrors.fechaInicio ? "border-red-500" : ""}
                  />
                  {fieldErrors.fechaInicio && <p className="text-sm text-red-500">{fieldErrors.fechaInicio}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fecha de fin</Label>
                  <Input
                    id="fechaFin"
                    type="datetime-local"
                    value={formData.fechaFin}
                    onChange={(e) => handleFormChange("fechaFin", e.target.value)}
                    min={formData.fechaInicio || new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className={fieldErrors.fechaFin ? "border-red-500" : ""}
                  />
                  {fieldErrors.fechaFin && <p className="text-sm text-red-500">{fieldErrors.fechaFin}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precioBase">Precio base ($)</Label>
                  <Input
                    id="precioBase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precioBase}
                    onChange={(e) => handleFormChange("precioBase", e.target.value)}
                    className={fieldErrors.precioBase ? "border-red-500" : ""}
                  />
                  {fieldErrors.precioBase && <p className="text-sm text-red-500">{fieldErrors.precioBase}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="montoMinimoPuja">Monto mínimo de puja ($)</Label>
                  <Input
                    id="montoMinimoPuja"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.montoMinimoPuja}
                    onChange={(e) => handleFormChange("montoMinimoPuja", e.target.value)}
                    className={fieldErrors.montoMinimoPuja ? "border-red-500" : ""}
                  />
                  {fieldErrors.montoMinimoPuja && <p className="text-sm text-red-500">{fieldErrors.montoMinimoPuja}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipantes">Cantidad máxima de participantes</Label>
                  <Input
                    id="maxParticipantes"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.maxParticipantes}
                    onChange={(e) => handleFormChange("maxParticipantes", e.target.value)}
                    className={fieldErrors.maxParticipantes ? "border-red-500" : ""}
                  />
                  {fieldErrors.maxParticipantes && (
                    <p className="text-sm text-red-500">{fieldErrors.maxParticipantes}</p>
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

                {isLoadingVehicles ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Cargando vehículos...</p>
                  </div>
                ) : availableVehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay vehículos disponibles para asignar.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <RadioGroup
                      value={selectedVehicleId || ""}
                      onValueChange={setSelectedVehicleId}
                      className={fieldErrors.vehiculo ? "border border-red-500 rounded-md p-4" : ""}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableVehicles.map((vehicle) => (
                          <div
                            key={vehicle.ficha}
                            className={`border rounded-lg p-4 ${
                              selectedVehicleId === vehicle.ficha ? "border-primary bg-primary/5" : "border-border"
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
                    {fieldErrors.vehiculo && <p className="text-sm text-red-500 mt-2">{fieldErrors.vehiculo}</p>}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push("/")}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación para guardar */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cambios</DialogTitle>
            <DialogDescription>¿Estás seguro de que deseas guardar los cambios en esta subasta?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Los cambios se guardarán y la subasta permanecerá en estado <strong>Pendiente</strong>.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={saveAuctionChanges} disabled={isSaving || !selectedVehicleId}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
