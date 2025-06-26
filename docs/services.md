# Servicios de Supabase - Documentación

Este documento describe todos los servicios disponibles en el archivo `lib/supabase.ts` para interactuar con la base de datos.

## 🏗️ Arquitectura

Los servicios están organizados por entidad:
- **auctionService**: Operaciones de subastas
- **vehicleService**: Gestión de vehículos  
- **pujasService**: Manejo de pujas
- **userService**: Información de usuarios
- **adjudicacionService**: Verificación de adjudicaciones

## 📋 Servicios Disponibles

### 🔨 auctionService

#### `getAuctionsByAuctioneer(subastadorId: string)`
Obtiene todas las subastas de un subastador específico.

**Parámetros:**
- `subastadorId`: ID del subastador

**Retorna:**
\`\`\`typescript
{ data: Auction[] | null, error: any }
\`\`\`

#### `getAuctionById(auctionId: string)`
Obtiene una subasta por su ID.

**Parámetros:**
- `auctionId`: ID de la subasta

**Retorna:**
\`\`\`typescript
{ data: Auction | null, error: any }
\`\`\`

#### `checkAuctioneerPermission(auctionId: string, subastadorId: string)`
Verifica si un subastador tiene permisos sobre una subasta.

**Parámetros:**
- `auctionId`: ID de la subasta
- `subastadorId`: ID del subastador

**Retorna:**
\`\`\`typescript
{ hasPermission: boolean, error: any }
\`\`\`

#### `createAuction(auctionData: Omit<Auction, "id_subasta" | "created_at">, subastadorId: string)`
Crea una nueva subasta con transacción automática.

**Parámetros:**
- `auctionData`: Datos de la subasta (sin ID ni fecha de creación)
- `subastadorId`: ID del subastador

**Retorna:**
\`\`\`typescript
{ data: any, error: any }
\`\`\`

#### `updateAuction(auctionId: string, updateData: Partial<Auction>)`
Actualiza una subasta existente.

**Parámetros:**
- `auctionId`: ID de la subasta
- `updateData`: Datos a actualizar

**Retorna:**
\`\`\`typescript
{ error: any }
\`\`\`

#### `deleteAuction(auctionId: string, subastadorId: string)`
Elimina una subasta y todas sus relaciones.

**Parámetros:**
- `auctionId`: ID de la subasta
- `subastadorId`: ID del subastador

**Retorna:**
\`\`\`typescript
{ error: any }
\`\`\`

#### `changeAuctionState(auctionId: string, newState: string, motivoCancelacion?: string)`
Cambia el estado de una subasta.

**Parámetros:**
- `auctionId`: ID de la subasta
- `newState`: Nuevo estado
- `motivoCancelacion`: Motivo (opcional, para cancelaciones)

**Retorna:**
\`\`\`typescript
{ error: any }
\`\`\`

### 🚗 vehicleService

#### `getAllVehicles()`
Obtiene todos los vehículos.

**Retorna:**
\`\`\`typescript
{ data: Vehicle[] | null, error: any }
\`\`\`

#### `getAvailableVehicles(excludeAuctionId?: string)`
Obtiene vehículos disponibles (no asignados a subastas).

**Parámetros:**
- `excludeAuctionId`: ID de subasta a excluir (opcional)

**Retorna:**
\`\`\`typescript
{ data: Vehicle[] | null, error: any }
\`\`\`

#### `getVehicleByFicha(ficha: string)`
Obtiene un vehículo por su ficha.

**Parámetros:**
- `ficha`: Ficha del vehículo

**Retorna:**
\`\`\`typescript
{ data: Vehicle | null, error: any }
\`\`\`

### 💰 pujasService

#### `getPujasByAuction(auctionId: string)`
Obtiene las pujas de una subasta con información del postor.

**Parámetros:**
- `auctionId`: ID de la subasta

**Retorna:**
\`\`\`typescript
{ data: Puja[] | null, error: any }
\`\`\`

### 👤 userService

#### `getAuctioneerInfo(subastadorId: string)`
Obtiene información de un subastador.

**Parámetros:**
- `subastadorId`: ID del subastador

**Retorna:**
\`\`\`typescript
{ data: { nombre: string } | null, error: any }
\`\`\`

### 🏆 adjudicacionService

#### `hasAdjudication(auctionId: string)`
Verifica si una subasta tiene adjudicación.

**Parámetros:**
- `auctionId`: ID de la subasta

**Retorna:**
\`\`\`typescript
{ hasAdjudication: boolean, error: any }
\`\`\`

## 🔧 Tipos de Datos

### Auction
\`\`\`typescript
interface Auction {
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
\`\`\`

### Vehicle
\`\`\`typescript
interface Vehicle {
  ficha: string
  anio: number
  modelo: string
  descripcion: string
  imagen_url?: string
}
\`\`\`

### Puja
\`\`\`typescript
interface Puja {
  id_puja: string
  monto: number
  fecha: string
  hora: string
  id_postor: string
  postor_nombre?: string
}
\`\`\`

## 🚀 Uso Recomendado

### Ejemplo: Crear una subasta
\`\`\`typescript
import { auctionService } from "@/lib/supabase"

const newAuction = {
  titulo: "Toyota Corolla 2020",
  descripcion: "Vehículo en buen estado",
  estado: "Pendiente",
  inicio: new Date().toISOString(),
  fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  precio_base: 5000,
  monto_minimo_puja: 100,
  cantidad_max_participantes: 50,
  ficha: "VEH001"
}

const { data, error } = await auctionService.createAuction(newAuction, "SUBASTADOR_ID")

if (error) {
  console.error("Error:", error)
} else {
  console.log("Subasta creada:", data)
}
\`\`\`

### Ejemplo: Obtener vehículos disponibles
\`\`\`typescript
import { vehicleService } from "@/lib/supabase"

const { data: vehicles, error } = await vehicleService.getAvailableVehicles()

if (error) {
  console.error("Error:", error)
} else {
  console.log("Vehículos disponibles:", vehicles)
}
\`\`\`

## ⚠️ Manejo de Errores

Todos los servicios retornan un objeto con `data` y `error`. Siempre verifica el error antes de usar los datos:

\`\`\`typescript
const { data, error } = await someService.someMethod()

if (error) {
  // Manejar error
  console.error("Error:", error)
  return
}

// Usar datos
console.log("Datos:", data)
\`\`\`

## 🔒 Seguridad

- Las credenciales están en variables de entorno
- Los servicios incluyen validaciones de permisos
- Las operaciones críticas usan transacciones
- Se incluye rollback automático en caso de errores
