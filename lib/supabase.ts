import { createClient } from "@supabase/supabase-js"

// Verificar que las variables de entorno estén definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno de Supabase. Verifica tu archivo .env.local")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ==========================================
// TIPOS DE DATOS
// ==========================================

export interface Auction {
  id_subasta: string
  titulo: string
  descripcion?: string
  estado: string
  created_at?: string
  inicio?: string
  fin?: string
  precio_base?: number
  monto_minimo_puja?: number
  cantidad_max_participantes?: number
  ficha?: string | null
  motivo_cancelacion?: string | null
}

export interface Vehicle {
  ficha: string
  anio: number
  modelo: string
  descripcion: string
  imagen_url?: string
}

export interface Puja {
  id_puja: string
  monto: number
  fecha: string
  hora: string
  id_postor: string
  postor_nombre?: string
}

export interface Usuario {
  id_usuario: string
  nombre: string
  primer_apellido: string
  segundo_apellido?: string
  auth_id?: string
}

export interface Subastador {
  id_subastador: string
  id_usuario: string
}

// ==========================================
// SERVICIOS DE SUBASTAS
// ==========================================

export const auctionService = {
  // Obtener todas las subastas de un subastador
  async getAuctionsByAuctioneer(subastadorId: string): Promise<{ data: Auction[] | null; error: any }> {
    try {
      // Obtener las subastas gestionadas por este subastador
      const { data: gestionaData, error: gestionaError } = await supabase
        .from("gestiona")
        .select("id_subasta, fecha_creacion")
        .eq("id_subastador", subastadorId)
        .order("fecha_creacion", { ascending: false })

      if (gestionaError) {
        return { data: null, error: gestionaError }
      }

      if (!gestionaData || gestionaData.length === 0) {
        return { data: [], error: null }
      }

      // Obtener los IDs de las subastas gestionadas
      const subastaIds = gestionaData.map((item) => item.id_subasta)

      // Obtener los detalles de las subastas
      const { data: subastasData, error: subastasError } = await supabase
        .from("subasta")
        .select("*")
        .in("id_subasta", subastaIds)
        .order("inicio", { ascending: false })

      if (subastasError) {
        return { data: null, error: subastasError }
      }

      // Combinar los datos de gestiona (fecha_creacion) con los datos de subasta
      const subastasConFechaCreacion = subastasData.map((subasta) => {
        const gestionaItem = gestionaData.find((item) => item.id_subasta === subasta.id_subasta)
        return {
          ...subasta,
          created_at: gestionaItem?.fecha_creacion || subasta.created_at,
        }
      })

      return { data: subastasConFechaCreacion, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Obtener una subasta por ID
  async getAuctionById(auctionId: string): Promise<{ data: Auction | null; error: any }> {
    try {
      const { data, error } = await supabase.from("subasta").select("*").eq("id_subasta", auctionId).single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Verificar permisos de un subastador sobre una subasta
  async checkAuctioneerPermission(
    auctionId: string,
    subastadorId: string,
  ): Promise<{ hasPermission: boolean; error: any }> {
    try {
      const { data, error } = await supabase
        .from("gestiona")
        .select("*")
        .eq("id_subasta", auctionId)
        .eq("id_subastador", subastadorId)
        .single()

      if (error) {
        return { hasPermission: false, error }
      }

      return { hasPermission: !!data, error: null }
    } catch (error) {
      return { hasPermission: false, error }
    }
  },

  // Crear una nueva subasta
  async createAuction(
    auctionData: Omit<Auction, "id_subasta" | "created_at">,
    subastadorId: string,
  ): Promise<{ data: any; error: any }> {
    try {
      // 1. Crear la subasta
      const { data: newAuction, error: createError } = await supabase
        .from("subasta")
        .insert(auctionData)
        .select("id_subasta")
        .single()

      if (createError) {
        return { data: null, error: createError }
      }

      // 2. Crear la relación en la tabla gestiona
      const gestionaData = {
        id_subastador: subastadorId,
        id_subasta: newAuction.id_subasta,
        fecha_creacion: new Date().toISOString(),
      }

      const { error: gestionaError } = await supabase.from("gestiona").insert(gestionaData)

      if (gestionaError) {
        // Si falla la relación, eliminar la subasta creada
        await supabase.from("subasta").delete().eq("id_subasta", newAuction.id_subasta)
        return { data: null, error: gestionaError }
      }

      return { data: newAuction, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Actualizar una subasta
  async updateAuction(auctionId: string, updateData: Partial<Auction>): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from("subasta").update(updateData).eq("id_subasta", auctionId)

      return { error }
    } catch (error) {
      return { error }
    }
  },

  // Eliminar una subasta y todas sus relaciones
  async deleteAuction(auctionId: string, subastadorId: string): Promise<{ error: any }> {
    try {
      // 1. Eliminar pujas
      const { error: pujasError } = await supabase.from("puja").delete().eq("id_subasta", auctionId)

      if (pujasError) return { error: pujasError }

      // 2. Eliminar participaciones
      const { error: participaError } = await supabase.from("participa").delete().eq("id_subasta", auctionId)

      if (participaError) return { error: participaError }

      // 3. Eliminar adjudicaciones
      const { error: adjudicacionError } = await supabase.from("adjudicacion").delete().eq("id_subasta", auctionId)

      if (adjudicacionError) return { error: adjudicacionError }

      // 4. Eliminar relación gestiona
      const { error: gestionaError } = await supabase
        .from("gestiona")
        .delete()
        .eq("id_subasta", auctionId)
        .eq("id_subastador", subastadorId)

      if (gestionaError) return { error: gestionaError }

      // 5. Eliminar la subasta
      const { error: auctionError } = await supabase.from("subasta").delete().eq("id_subasta", auctionId)

      return { error: auctionError }
    } catch (error) {
      return { error }
    }
  },

  // Cambiar estado de una subasta
  async changeAuctionState(auctionId: string, newState: string, motivoCancelacion?: string): Promise<{ error: any }> {
    try {
      const updateData: any = { estado: newState }

      if (motivoCancelacion) {
        updateData.motivo_cancelacion = motivoCancelacion
      }

      const { error } = await supabase.from("subasta").update(updateData).eq("id_subasta", auctionId)

      return { error }
    } catch (error) {
      return { error }
    }
  },
}

// ==========================================
// SERVICIOS DE VEHÍCULOS
// ==========================================

export const vehicleService = {
  // Obtener todos los vehículos
  async getAllVehicles(): Promise<{ data: Vehicle[] | null; error: any }> {
    try {
      const { data, error } = await supabase.from("vehiculo").select("*")
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Obtener vehículos disponibles (no asignados a subastas)
  async getAvailableVehicles(excludeAuctionId?: string): Promise<{ data: Vehicle[] | null; error: any }> {
    try {
      // Obtener todos los vehículos
      const { data: allVehicles, error: vehiclesError } = await supabase.from("vehiculo").select("*")

      if (vehiclesError) return { data: null, error: vehiclesError }

      // Obtener vehículos ya asignados a subastas
      let query = supabase.from("subasta").select("ficha").not("ficha", "is", null)

      // Excluir una subasta específica si se proporciona (útil para edición)
      if (excludeAuctionId) {
        query = query.not("id_subasta", "eq", excludeAuctionId)
      }

      const { data: assignedVehicles, error: assignedError } = await query

      if (assignedError) return { data: null, error: assignedError }

      // Filtrar vehículos disponibles
      const assignedVehicleIds = assignedVehicles.map((item) => item.ficha).filter(Boolean)
      const availableVehicles = allVehicles.filter((vehicle) => !assignedVehicleIds.includes(vehicle.ficha))

      return { data: availableVehicles, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Obtener un vehículo por ficha
  async getVehicleByFicha(ficha: string): Promise<{ data: Vehicle | null; error: any }> {
    try {
      const { data, error } = await supabase.from("vehiculo").select("*").eq("ficha", ficha).single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },
}

// ==========================================
// SERVICIOS DE PUJAS
// ==========================================

export const pujasService = {
  // Obtener pujas de una subasta
  async getPujasByAuction(auctionId: string): Promise<{ data: Puja[] | null; error: any }> {
    try {
      const { data: pujasData, error } = await supabase
        .from("puja")
        .select(`
          id_puja,
          monto,
          fecha,
          hora,
          id_postor,
          postor:id_postor (
            usuario:id_usuario (
              nombre,
              primer_apellido
            )
          )
        `)
        .eq("id_subasta", auctionId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })

      if (error) return { data: null, error }

      // Formatear los datos de las pujas
      const pujasFormateadas =
        pujasData?.map((puja: any) => ({
          id_puja: puja.id_puja,
          monto: puja.monto,
          fecha: puja.fecha,
          hora: puja.hora,
          id_postor: puja.id_postor,
          postor_nombre: puja.postor?.usuario
            ? `${puja.postor.usuario.nombre || ""} ${puja.postor.usuario.primer_apellido || ""}`.trim()
            : "Usuario desconocido",
        })) || []

      return { data: pujasFormateadas, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
}

// ==========================================
// SERVICIOS DE USUARIOS
// ==========================================

export const userService = {
  // Obtener información de un subastador
  async getAuctioneerInfo(subastadorId: string): Promise<{ data: { nombre: string } | null; error: any }> {
    try {
      // Obtener el subastador
      const { data: subastadorData, error: subastadorError } = await supabase
        .from("subastador")
        .select("id_usuario")
        .eq("id_subastador", subastadorId)
        .single()

      if (subastadorError) return { data: null, error: subastadorError }

      if (!subastadorData) return { data: null, error: "Subastador no encontrado" }

      // Obtener el usuario
      const { data: userData, error: userError } = await supabase
        .from("usuario")
        .select("nombre, primer_apellido")
        .eq("id_usuario", subastadorData.id_usuario)
        .single()

      if (userError) return { data: null, error: userError }

      if (userData) {
        const nombre = `${userData.nombre || ""} ${userData.primer_apellido || ""}`.trim() || "Usuario"
        return { data: { nombre }, error: null }
      }

      return { data: null, error: "Usuario no encontrado" }
    } catch (error) {
      return { data: null, error }
    }
  },
}

// ==========================================
// SERVICIOS DE ADJUDICACIÓN
// ==========================================

export const adjudicacionService = {
  // Verificar si una subasta tiene adjudicación
  async hasAdjudication(auctionId: string): Promise<{ hasAdjudication: boolean; error: any }> {
    try {
      const { data, error } = await supabase
        .from("adjudicacion")
        .select("id_adjudicacion")
        .eq("id_subasta", auctionId)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 es "no rows returned"
        return { hasAdjudication: false, error }
      }

      return { hasAdjudication: !!data, error: null }
    } catch (error) {
      return { hasAdjudication: false, error }
    }
  },
}
