// Deja una sucursal nueva lista para vender, copiando el catálogo de otra.
//
// Una sucursal recién creada solo tiene nombre y horario: sin insumos no hay
// inventario, sin platos el pedido se rechaza con "Producto no válido", sin
// recetas no se descuenta nada, y sin usuario tótem el canal del cliente
// responde "Este local aún no está disponible para pedidos".
//
// El orden importa: los insumos y los platos deben existir ANTES que las
// recetas, que son las que los unen.

import bcrypt from 'bcrypt';

const ROLES = [
  { rol: 'GERENTE',  prefijo: 'gerente', etiqueta: 'Gerente' },
  { rol: 'CAJERO',   prefijo: 'caja',    etiqueta: 'Cajero' },
  { rol: 'COCINERO', prefijo: 'cocina',  etiqueta: 'Cocinero' },
  { rol: 'TOTEM',    prefijo: 'totem',   etiqueta: 'Tótem' },
];

const DOMINIO = 'gorichicken.com';

// Busca el primer número libre para los correos del personal, siguiendo la
// convención que ya usa el sistema: gerente1@, caja1@, cocina1@, totem1@.
async function siguienteNumeroDePersonal(tx) {
  for (let n = 1; n <= 999; n++) {
    const correos = ROLES.map(r => `${r.prefijo}${n}@${DOMINIO}`);
    const ocupados = await tx.usuario.count({ where: { correo: { in: correos } } });
    if (ocupados === 0) return n;
  }
  throw new Error('No hay números libres para los correos del personal');
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

  // ── 4. Personal ──
  // El usuario TOTEM es el que hace falta para que el canal del cliente pueda
  // tomar pedidos en esta sucursal; los otros tres son para operarla.
  const numero = await siguienteNumeroDePersonal(tx);
  const hash = await bcrypt.hash(contrasena, 10);
  const usuarios = [];
  for (const r of ROLES) {
    const correo = `${r.prefijo}${numero}@${DOMINIO}`;
    await tx.usuario.create({
      data: { sucursalId: destinoId, nombre: `${r.etiqueta} Gori ${numero}`, correo, contrasena: hash, rol: r.rol }
    });
    usuarios.push({ rol: r.rol, correo });
  }

  return {
    insumos: insumosOrigen.length,
    platos: platosOrigen.length,
    recetas: recetasCreadas,
    usuarios,
  };
}
