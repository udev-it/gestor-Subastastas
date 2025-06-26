// Este script es solo para referencia
// Deberías ejecutarlo en tu entorno de desarrollo o mediante la interfaz de Supabase

/*
Para crear un usuario de prueba:

1. Primero, crea el usuario en la autenticación de Supabase:
   - Ve a Authentication > Users en el panel de Supabase
   - Haz clic en "Add User"
   - Email: subastador@zagoom.com
   - Password: password123

2. Obtén el ID de autenticación del usuario creado (auth_id)

3. Inserta el usuario en la tabla USUARIO:
*/

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Reemplaza 'auth_id_del_usuario' con el ID real del usuario creado en Authentication
const authId = "auth_id_del_usuario"

const { data: userData, error: userError } = await supabase
  .from("USUARIO")
  .insert({
    nombre: "Miguel",
    primer_apellido: "Rodríguez",
    segundo_apellido: "López",
    auth_id: authId,
  })
  .select("id_usuario")
  .single()

if (userError) {
  console.error("Error al crear el usuario:", userError)
  process.exit(1)
}

// 4. Inserta el subastador usando el ID de usuario:
const { data: subastadorData, error: subastadorError } = await supabase
  .from("SUBASTADOR")
  .insert({
    id_usuario: userData.id_usuario,
  })
  .select("id_subastador")
  .single()

if (subastadorError) {
  console.error("Error al crear el subastador:", subastadorError)
  process.exit(1)
}

// 5. Crea algunas subastas de prueba:
await supabase.from("SUBASTA").insert([
  {
    titulo: "Toyota Corolla",
    descripcion: "Subasta de Toyota Corolla 2019 con daños laterales",
    estado: "Pendiente",
    inicio: new Date("2025-04-12").toISOString(),
    fin: new Date("2025-04-20").toISOString(),
    precio_base: 2000.0,
    monto_minimo_puja: 100.0,
    cantidad_max_pujas: 50,
    cantidad_max_participantes: 30,
    id_subastador: subastadorData.id_subastador,
  },
  {
    titulo: "Moto Yamaha",
    descripcion: "Subasta de Moto Yamaha 2020 con daños menores",
    estado: "Activa",
    inicio: new Date("2025-04-01").toISOString(),
    fin: new Date("2025-04-15").toISOString(),
    precio_base: 1500.0,
    monto_minimo_puja: 50.0,
    cantidad_max_pujas: 40,
    cantidad_max_participantes: 25,
    id_subastador: subastadorData.id_subastador,
  },
  {
    titulo: "Moto Yamaha",
    descripcion: "Subasta de Moto Yamaha 2018 con daños moderados",
    estado: "Finalizada",
    inicio: new Date("2025-03-15").toISOString(),
    fin: new Date("2025-03-30").toISOString(),
    precio_base: 1200.0,
    monto_minimo_puja: 50.0,
    cantidad_max_pujas: 40,
    cantidad_max_participantes: 25,
    id_subastador: subastadorData.id_subastador,
  },
])

console.log("Usuario de prueba creado con éxito:")
console.log("Email:", "subastador@zagoom.com")
console.log("Contraseña:", "password123")
console.log("ID de usuario:", userData.id_usuario)
console.log("ID de subastador:", subastadorData.id_subastador)
