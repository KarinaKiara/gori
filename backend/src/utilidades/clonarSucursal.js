// Deja una sucursal nueva lista para vender, copiando el catálogo de otra.
//
// Una sucursal recién creada solo tiene nombre y horario: sin insumos no hay
// inventario, sin platos el pedido se rechaza con "Producto no válido", sin
// recetas no se descuenta nada, y sin usuario tótem el canal del cliente
// responde "Este local aún no está disponible para pedidos".
//
// El personal NO se crea acá: el admin asigna el gerente desde su panel y el
// gerente da de alta a su cajero y su cocinero. Lo único que se crea es la
// cuenta del TÓTEM, que no es un empleado sino el kiosco en sí, y sin ella la
// sucursal no podría recibir pedidos del cliente.
//
// El orden importa: los insumos y los platos deben existir ANTES que las
// recetas, que son las que los unen.

import bcrypt from 'bcrypt';

const DOMINIO = 'gorichicken.com';

// Busca el primer número libre para el correo del tótem, siguiendo la
// convención que ya usa el sistema: totem1@, totem2@, ...
async function siguienteNumeroDeTotem(tx) {
  for (let n = 1; n <= 999; n++) {
    const ocupado = await tx.usuario.count({ where: { correo: `totem${n}@${DOMINIO}` } });
    if (ocupado === 0) return n;
  }
  throw new Error('No hay números libres para el correo del tótem');
}

/**
 * Copia insumos, platos, recetas y personal desde `origenId` hacia `destinoId`.
 * Se ejecuta dentro de la transacción `tx` de quien la llama, así que si algo
 * falla no queda una sucursal a medio armar.
 *
 * @returns {Promise<{insumos:number, platos:number, recetas:number, usuarios:Array}>}
 */
export async function clonarCatalogo(tx, origenId, destinoId, contrasena) {
  // ── 1. Insumos ──
  // El stock arranca en CERO: una sucursal que abre no tiene mercadería. El
  // gerente la carga con una reposición, que además queda en el kardex.
  const insumosOrigen = await tx.insumo.findMany({ where: { sucursalId: origenId } });
  for (const ins of insumosOrigen) {
    await tx.insumo.create({
      data: {
        sucursalId: destinoId,
        nombre: ins.nombre,
        unidad: ins.unidad,
        stockActual: 0,
        stockMinimo: ins.stockMinimo,
      }
    });
  }

  // ── 2. Platos ──
  const platosOrigen = await tx.producto.findMany({ where: { sucursalId: origenId } });
  for (const pro of platosOrigen) {
    await tx.producto.create({
      data: {
        sucursalId: destinoId,
        nombre: pro.nombre,
        categoria: pro.categoria,
        descripcion: pro.descripcion,
        precio: pro.precio,
        imagen: pro.imagen,
        estaDisponible: pro.estaDisponible,
        agregadoManual: pro.agregadoManual,
      }
    });
  }

  // ── 3. Recetas ──
  // Se emparejan por NOMBRE contra lo que acabamos de crear, porque cada
  // sucursal tiene sus propios insumos y platos con identificadores distintos.
  const nuevosInsumos = await tx.insumo.findMany({
    where: { sucursalId: destinoId }, select: { id: true, nombre: true }
  });
  const nuevosPlatos = await tx.producto.findMany({
    where: { sucursalId: destinoId }, select: { id: true, nombre: true }
  });
  const insumoPorNombre = new Map(nuevosInsumos.map(i => [i.nombre, i.id]));
  const platoPorNombre = new Map(nuevosPlatos.map(p => [p.nombre, p.id]));

  const recetasOrigen = await tx.receta.findMany({
    where: { sucursalId: origenId },
    include: {
      producto: { select: { nombre: true } },
      insumos: { include: { insumo: { select: { nombre: true } } } }
    }
  });

  let recetasCreadas = 0;
  for (const rec of recetasOrigen) {
    const platoId = platoPorNombre.get(rec.producto.nombre);
    if (!platoId) continue;

    const ingredientes = rec.insumos
      .map(ri => ({ insumoId: insumoPorNombre.get(ri.insumo.nombre), cantidad: ri.cantidad }))
      .filter(i => i.insumoId);

    // Una receta incompleta descontaría de menos sin que nadie lo note.
    if (ingredientes.length !== rec.insumos.length) continue;

    await tx.receta.create({
      data: { sucursalId: destinoId, productoId: platoId, insumos: { create: ingredientes } }
    });
    recetasCreadas++;
  }

  // ── 4. Cuenta del tótem ──
  // Es el único usuario que se crea automáticamente: sin él, el canal del
  // cliente no puede tomar pedidos en esta sucursal. El gerente y el resto del
  // personal se dan de alta después, cada uno desde su panel.
  const numero = await siguienteNumeroDeTotem(tx);
  const correoTotem = `totem${numero}@${DOMINIO}`;
  await tx.usuario.create({
    data: {
      sucursalId: destinoId,
      nombre: `Tótem Gori ${numero}`,
      correo: correoTotem,
      contrasena: await bcrypt.hash(contrasena, 10),
      rol: 'TOTEM',
    }
  });

  return {
    insumos: insumosOrigen.length,
    platos: platosOrigen.length,
    recetas: recetasCreadas,
    usuarios: [{ rol: 'TOTEM', correo: correoTotem }],
  };
}
