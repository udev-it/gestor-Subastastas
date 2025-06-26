// Configuración central del sistema
// Aquí se definen valores que se utilizan en toda la aplicación

// ID del subastador (reemplaza con un ID real de tu base de datos)
export const SUBASTADOR_ID = "e7d2f6f6-51b0-4f5a-b613-9fb9f78ed524"

// Otras configuraciones globales pueden agregarse aquí
export const APP_NAME = "ZAGOOM"
export const APP_DESCRIPTION = "Plataforma de subastas de vehículos con daños a precios competitivos"

// Configuración de la base de datos
export const DB_CONFIG = {
  TABLES: {
    SUBASTA: "subasta",
    VEHICULO: "vehiculo",
    GESTIONA: "gestiona",
    PUJA: "puja",
    PARTICIPA: "participa",
    ADJUDICACION: "adjudicacion",
    USUARIO: "usuario",
    SUBASTADOR: "subastador",
    POSTOR: "postor",
  },
}

// Estados de subasta
export const AUCTION_STATES = {
  PENDING: "Pendiente",
  ACTIVE: "Activa",
  FINISHED: "Finalizada",
}
