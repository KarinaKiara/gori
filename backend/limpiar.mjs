/**
 * limpiar.mjs — Deja la base en limpio para una demostracion.
 *
 * BORRA: pedidos, items de pedido y movimientos de inventario (kardex).
 * CONSERVA: sucursales, usuarios, productos, recetas e insumos.
 *
 * Uso:
 *   node limpiar.mjs                 -> solo muestra que se borraria (simulacro)
 *   node limpiar.mjs --confirmar     -> borra de verdad
 *
 * Para apuntar a otra base (por ejemplo la de Render):
 *   DATABASE_URL="mysql://..." node limpiar.mjs --confirmar
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const confirmar = process.argv.includes('--confirmar')

const contar = async () => ({
  pedidos: await prisma.pedido.count(),
  items: await prisma.itemPedido.count(),
  movimientos: await prisma.movimientoInventario.count()
})

const main = async () => {
  const url = new URL(process.env.DATABASE_URL)
  console.log(`Base   : ${url.pathname.slice(1)} en ${url.hostname}`)
  console.log(`Modo   : ${confirmar ? 'BORRADO REAL' : 'simulacro (agrega --confirmar para borrar)'}\n`)

  const antes = await contar()
  console.log('Se van a borrar:')
  console.log(`  pedidos             : ${antes.pedidos}`)
  console.log(`  items de pedido     : ${antes.items}`)
  console.log(`  movimientos (kardex): ${antes.movimientos}`)

  // Se conserva el catalogo: es lo que hace que el sistema siga funcionando.
  console.log('\nSe conservan:')
  console.log(`  sucursales          : ${await prisma.sucursal.count()}`)
  console.log(`  usuarios            : ${await prisma.usuario.count()}`)
  console.log(`  productos           : ${await prisma.producto.count()}`)
  console.log(`  recetas             : ${await prisma.receta.count()}`)
  console.log(`  insumos             : ${await prisma.insumo.count()}`)

  if (!confirmar) {
    console.log('\nSimulacro: no se borro nada.')
    return
  }

  // Los items se borran primero porque apuntan al pedido (llave foranea).
  await prisma.$transaction([
    prisma.itemPedido.deleteMany({}),
    prisma.pedido.deleteMany({}),
    prisma.movimientoInventario.deleteMany({})
  ])

  const despues = await contar()
  console.log('\nListo. Quedaron:')
  console.log(`  pedidos             : ${despues.pedidos}`)
  console.log(`  items de pedido     : ${despues.items}`)
  console.log(`  movimientos (kardex): ${despues.movimientos}`)
  console.log('\nLos turnos vuelven a empezar en 1.')
}

main()
  .catch((e) => { console.error('ERROR:', e.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
