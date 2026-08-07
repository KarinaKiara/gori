import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Valida un precio: debe ser un número real, no negativo y con tope razonable.
// Devuelve { ok, valor } o { ok:false, error }.
function validarPrecio(precio) {
  const p = parseFloat(precio);
  if (!Number.isFinite(p)) return { ok: false, error: 'El precio debe ser un número válido' };
  if (p < 0) return { ok: false, error: 'El precio no puede ser negativo' };
  if (p > 100000) return { ok: false, error: 'El precio es demasiado alto' };
  return { ok: true, valor: p };
}

// ── MENÚ (tótem y caja): platos agregados manualmente, disponibles, de ESTA sucursal ──
export const listarMenu = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    if (!sucursalId) return res.json([]); // ADMIN u otros sin sucursal: no hay menú propio
    const productos = await prisma.producto.findMany({
      where: { sucursalId, agregadoManual: true, estaDisponible: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }]
    });
    res.json(productos);
  } catch (error) {
    console.error('Error al listar el menú:', error);
    res.status(500).json({ error: 'Error al obtener el menú' });
  }
};

// ── DISPONIBILIDAD (tótem/caja): qué platos alcanzan según el stock de su receta ──
// Devuelve un mapa { "Nombre del plato": { disponible, quedan } } de ESTA sucursal.
// - Si el plato no tiene receta (bebidas, reventa) -> siempre disponible.
// - "quedan" = para cuántos platos alcanza el insumo que se agota primero.
export const disponibilidadMenu = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    if (!sucursalId) return res.json({}); // sin sucursal (admin): no aplica
    const productos = await prisma.producto.findMany({
      where: { sucursalId },
      include: { receta: { include: { insumos: { include: { insumo: true } } } } }
    });

    const mapa = {};
    for (const p of productos) {
      // "activo" = el gerente lo dejó a la venta en esta sucursal. Si lo apagó, el
      // tótem y la caja lo ocultan aunque haya stock de sobra.
      const activo = p.estaDisponible;
      const insumos = p.receta?.insumos || [];
      if (!insumos.length) { mapa[p.nombre] = { disponible: true, quedan: null, activo }; continue; }
      let quedan = Infinity;
      for (const ri of insumos) {
        const stock = ri.insumo?.stockActual ?? 0;
        const n = ri.cantidad > 0 ? Math.floor(stock / ri.cantidad) : Infinity;
        if (n < quedan) quedan = n;
      }
      mapa[p.nombre] = { disponible: quedan >= 1, quedan: quedan === Infinity ? null : quedan, activo };
    }
    res.json(mapa);
  } catch (error) {
    console.error('Error al calcular disponibilidad:', error);
    res.status(500).json({ error: 'Error al calcular la disponibilidad' });
  }
};

// ── ADMIN: crear un plato en una o varias sucursales ──
export const crearProducto = async (req, res) => {
  try {
    const { nombre, categoria, descripcion, precio, imagen, sucursalIds, copiarDeId } = req.body;
    if (!nombre || String(nombre).trim().length < 2 || precio == null || !Array.isArray(sucursalIds) || sucursalIds.length === 0) {
      return res.status(400).json({ error: 'Faltan datos: nombre, precio y al menos una sucursal.' });
    }
    const chkPrecio = validarPrecio(precio);
    if (!chkPrecio.ok) return res.status(400).json({ error: chkPrecio.error });

    // Todas las sucursales elegidas deben existir (si no, la transacción revienta con 500)
    const existentes = await prisma.sucursal.count({ where: { id: { in: sucursalIds } } });
    if (existentes !== sucursalIds.length) {
      return res.status(400).json({ error: 'Una o más sucursales seleccionadas no existen' });
    }

    const nombreLimpio = String(nombre).trim();

    // Si la sucursal ya tiene un plato con ese nombre, se omite: repetirlo dejaría dos
    // platos idénticos y el pedido no sabría a cuál de los dos descontarle inventario.
    const yaLoTienen = await prisma.producto.findMany({
      where: { nombre: nombreLimpio, sucursalId: { in: sucursalIds } },
      select: { sucursalId: true }
    });
    const omitidas = new Set(yaLoTienen.map(p => p.sucursalId));
    const destinos = sucursalIds.filter(id => !omitidas.has(id));

    if (destinos.length === 0) {
      return res.status(400).json({ error: `"${nombreLimpio}" ya existe en todas las sucursales elegidas` });
    }

    // Al copiar de un plato existente se trae también su receta, para que en la
    // sucursal nueva descuente inventario igual. Los insumos se emparejan POR NOMBRE,
    // porque cada sucursal tiene los suyos propios.
    let recetaOrigen = null;
    if (copiarDeId) {
      recetaOrigen = await prisma.receta.findUnique({
        where: { productoId: copiarDeId },
        include: { insumos: { include: { insumo: { select: { nombre: true } } } } }
      });
    }

    const creados = [];
    const sinReceta = [];

    for (const sid of destinos) {
      const producto = await prisma.producto.create({
        data: {
          sucursalId: sid,
          nombre: nombreLimpio,
          categoria: categoria || 'Extras Gori',
          descripcion: descripcion ? String(descripcion).trim() : null,
          precio: chkPrecio.valor,
          imagen: imagen || null,
          agregadoManual: true,
          estaDisponible: true
        }
      });
      creados.push(producto);

      if (!recetaOrigen || recetaOrigen.insumos.length === 0) continue;

      // Buscar en la sucursal destino un insumo con el mismo nombre que cada uno del origen
      const nombresInsumos = recetaOrigen.insumos.map(ri => ri.insumo.nombre);
      const equivalentes = await prisma.insumo.findMany({
        where: { sucursalId: sid, nombre: { in: nombresInsumos } },
        select: { id: true, nombre: true }
      });
      const porNombre = new Map(equivalentes.map(i => [i.nombre, i.id]));

      // Solo se copia la receta si están TODOS los insumos: una receta a medias
      // descontaría de menos y descuadraría el inventario sin que nadie lo note.
      if (porNombre.size !== new Set(nombresInsumos).size) {
        sinReceta.push(sid);
        continue;
      }

      await prisma.receta.create({
        data: {
          sucursalId: sid,
          productoId: producto.id,
          insumos: {
            create: recetaOrigen.insumos.map(ri => ({
              insumoId: porNombre.get(ri.insumo.nombre),
              cantidad: ri.cantidad
            }))
          }
        }
      });
    }

    res.status(201).json({
      creados: creados.length,
      omitidas: omitidas.size,
      recetaCopiada: !!recetaOrigen && sinReceta.length < destinos.length,
      sinReceta: sinReceta.length
    });
  } catch (error) {
    console.error('Error al crear el plato:', error);
    res.status(500).json({ error: 'Error al crear el plato' });
  }
};

// ── ADMIN: listar platos ──
// Sin ?sucursalId: solo los agregados a mano (gestión de platos manuales, como antes).
// Con ?sucursalId=X: TODOS los platos de esa sucursal (incluye el menú fijo), para poder
// editar la receta de cada uno. Se omite la imagen (no hace falta acá y aliviana la carga).
export const listarProductosManual = async (req, res) => {
  try {
    const { sucursalId } = req.query;
    if (sucursalId) {
      const productos = await prisma.producto.findMany({
        where: { sucursalId },
        select: { id: true, nombre: true, categoria: true, precio: true, estaDisponible: true, agregadoManual: true, sucursalId: true },
        orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      });
      return res.json(productos);
    }
    const productos = await prisma.producto.findMany({
      where: { agregadoManual: true },
      include: { sucursal: { select: { nombre: true } } },
      orderBy: [{ nombre: 'asc' }, { categoria: 'asc' }]
    });
    res.json(productos);
  } catch (error) {
    console.error('Error al listar platos:', error);
    res.status(500).json({ error: 'Error al obtener los platos' });
  }
};

// ── ADMIN: editar un plato (solo los agregados manualmente) ──
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, descripcion, precio, imagen, estaDisponible } = req.body;

    const existe = await prisma.producto.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Plato no encontrado' });
    if (!existe.agregadoManual) return res.status(400).json({ error: 'Solo se pueden editar los platos agregados manualmente' });

    const data = {};
    if (nombre !== undefined) {
      if (String(nombre).trim().length < 2) return res.status(400).json({ error: 'El nombre es demasiado corto' });
      data.nombre = String(nombre).trim();
    }
    if (categoria !== undefined) data.categoria = categoria;
    if (descripcion !== undefined) data.descripcion = descripcion ? String(descripcion).trim() : null;
    if (precio !== undefined) {
      const chk = validarPrecio(precio);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      data.precio = chk.valor;
    }
    if (imagen !== undefined) data.imagen = imagen || null;
    if (estaDisponible !== undefined) data.estaDisponible = !!estaDisponible;

    const producto = await prisma.producto.update({ where: { id }, data });
    res.json(producto);
  } catch (error) {
    console.error('Error al editar el plato:', error);
    res.status(500).json({ error: 'Error al editar el plato' });
  }
};

// ── ADMIN: prender/apagar un plato en su sucursal (cualquier plato, base o manual) ──
// Sirve para desactivar temporalmente un plato ("hoy no hay Trica en El Prado") sin
// borrarlo. Avisa por socket a la sucursal para que el tótem y la caja lo reflejen.
export const cambiarDisponibilidadProductoAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { estaDisponible } = req.body;
    const producto = await prisma.producto.findUnique({ where: { id } });
    if (!producto) return res.status(404).json({ error: 'Plato no encontrado' });
    const actualizado = await prisma.producto.update({
      where: { id },
      data: { estaDisponible: !!estaDisponible },
    });
    req.app.get('io')?.to(producto.sucursalId).emit('inventario-actualizado', []);
    res.json({ id: actualizado.id, nombre: actualizado.nombre, estaDisponible: actualizado.estaDisponible });
  } catch (error) {
    console.error('Error al cambiar disponibilidad (admin):', error);
    res.status(500).json({ error: 'Error al cambiar la disponibilidad del plato' });
  }
};

// ── ADMIN: migrar el pollo al modelo de un solo insumo "Pollo" (fracción por plato) ──
// Antes el pollo se llevaba como 4 presas (Pecho/Ala/Pierna/Entrepierna). Esto crea un
// insumo "Pollo" por sucursal y reescribe las recetas de pollo para que usen una FRACCIÓN
// de pollo (Octavo=1/8, Cuarto=1/4, Trica=3/8, Medio=1/2, Entero=1) + sus condimentos.
// Los marcadores "Presa: X" (elección del cliente) quedan sin descuento, para no descontar
// doble: el cliente sigue eligiendo su presa, pero el stock sale del pollo del plato.
// Es idempotente: se puede correr varias veces sin duplicar nada.
const PRESAS_POLLO = ['Pecho', 'Ala', 'Pierna', 'Entrepierna'];
function fraccionPolloDe(nombre) {
  const n = (nombre || '').toLowerCase();
  if (n.startsWith('presa:')) return 0;           // marcador de elección -> receta vacía
  if (n.startsWith('presa extra')) return 1 / 8;  // una presa suelta
  if (n.startsWith('octavo')) return 1 / 8;
  if (n.startsWith('cuarto')) return 2 / 8;
  if (n.startsWith('trica')) return 3 / 8;
  if (n.includes('medio pollo')) return 4 / 8;
  if (n.includes('pollo entero')) return 8 / 8;
  return null; // no es un plato de pollo -> no se toca
}

export const migrarModeloPollo = async (req, res) => {
  try {
    const sucursales = await prisma.sucursal.findMany({ select: { id: true, nombre: true } });
    let polloCreado = 0, recetasPollo = 0, marcadoresVaciados = 0;

    for (const suc of sucursales) {
      // 1) Asegurar el insumo "Pollo" (comprado en caja de 20 pollos)
      let pollo = await prisma.insumo.findFirst({ where: { sucursalId: suc.id, nombre: 'Pollo' } });
      if (!pollo) {
        // Stock inicial a partir de las presas (min/2 = pollos enteros) si existen, si no 20.
        const presas = await prisma.insumo.findMany({ where: { sucursalId: suc.id, nombre: { in: PRESAS_POLLO } }, select: { stockActual: true } });
        const stockPollo = presas.length ? Math.max(0, Math.floor(Math.min(...presas.map((p) => p.stockActual)) / 2)) : 20;
        pollo = await prisma.insumo.create({
          data: { sucursalId: suc.id, nombre: 'Pollo', unidad: 'pollo', stockActual: stockPollo, stockMinimo: 5, unidadPedido: 'caja', factorConversion: 20 },
        });
        polloCreado++;
      }

      // 2) Reescribir las recetas de los platos de pollo
      const productos = await prisma.producto.findMany({
        where: { sucursalId: suc.id },
        include: { receta: { include: { insumos: { include: { insumo: { select: { nombre: true } } } } } } },
      });
      for (const p of productos) {
        const frac = fraccionPolloDe(p.nombre);
        if (frac === null) continue; // no es de pollo

        // Se conservan los condimentos/salsas actuales; se quitan las presas y cualquier "Pollo" viejo.
        const condimentos = (p.receta?.insumos || [])
          .filter((ri) => !PRESAS_POLLO.includes(ri.insumo.nombre) && ri.insumo.nombre !== 'Pollo')
          .map((ri) => ({ insumoId: ri.insumoId, cantidad: ri.cantidad }));
        const nuevos = frac > 0 ? [{ insumoId: pollo.id, cantidad: frac }, ...condimentos] : condimentos;

        await prisma.$transaction(async (tx) => {
          let r = await tx.receta.findUnique({ where: { productoId: p.id } });
          if (!r) r = await tx.receta.create({ data: { productoId: p.id, sucursalId: suc.id } });
          else await tx.recetaInsumo.deleteMany({ where: { recetaId: r.id } });
          if (nuevos.length) await tx.recetaInsumo.createMany({ data: nuevos.map((d) => ({ recetaId: r.id, ...d })) });
        });
        if (frac > 0) recetasPollo++; else marcadoresVaciados++;
      }
    }

    res.json({ ok: true, sucursales: sucursales.length, polloCreado, recetasPollo, marcadoresVaciados });
  } catch (error) {
    console.error('Error en la migración de pollo:', error);
    res.status(500).json({ error: 'Error en la migración de pollo' });
  }
};

// ── ADMIN: matriz del menú (platos × sucursales) ──
// Devuelve cada plato UNA vez (por nombre) con: un id representante para editar su receta
// (que es la misma para todas), y en qué sucursales está y si se vende o está apagado.
// Sirve para: (1) la lista de recetas (una por plato) y (2) la tabla de qué plato va en
// qué sucursal. No trae imágenes: es liviano.
export const menuMatriz = async (req, res) => {
  try {
    const sucursales = await prisma.sucursal.findMany({
      select: { id: true, nombre: true }, orderBy: { nombre: 'asc' },
    });
    const productos = await prisma.producto.findMany({
      select: { id: true, nombre: true, categoria: true, sucursalId: true, estaDisponible: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });
    const porNombre = new Map();
    for (const p of productos) {
      if (!porNombre.has(p.nombre)) {
        porNombre.set(p.nombre, { nombre: p.nombre, categoria: p.categoria, representanteId: p.id, porSucursal: {} });
      }
      porNombre.get(p.nombre).porSucursal[p.sucursalId] = { productoId: p.id, estaDisponible: p.estaDisponible };
    }
    res.json({ sucursales, platos: [...porNombre.values()] });
  } catch (error) {
    console.error('Error al armar la matriz del menú:', error);
    res.status(500).json({ error: 'Error al obtener el menú' });
  }
};

// ── ADMIN: obtener la receta de un plato + los insumos de su sucursal (para el editor) ──
// Devuelve qué insumos lleva el plato y cuánto de cada uno (en su unidad base: g, ml, u),
// más la lista de insumos disponibles para elegir. El insumo es COMPARTIDO: el mismo
// "Arroz" que usa este plato lo usan los demás; descuenta del mismo stock.
export const obtenerRecetaAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: { receta: { include: { insumos: { include: { insumo: { select: { id: true, nombre: true, unidad: true } } } } } } },
    });
    if (!producto) return res.status(404).json({ error: 'Plato no encontrado' });

    const insumosDisponibles = await prisma.insumo.findMany({
      where: { sucursalId: producto.sucursalId },
      select: { id: true, nombre: true, unidad: true },
      orderBy: { nombre: 'asc' },
    });
    const receta = (producto.receta?.insumos || []).map((ri) => ({
      insumoId: ri.insumoId, nombre: ri.insumo.nombre, unidad: ri.insumo.unidad, cantidad: ri.cantidad,
    }));
    res.json({ productoId: id, nombre: producto.nombre, receta, insumosDisponibles });
  } catch (error) {
    console.error('Error al obtener la receta (admin):', error);
    res.status(500).json({ error: 'Error al obtener la receta' });
  }
};

// ── ADMIN: guardar la receta de un plato y aplicarla a TODAS las sucursales ──
// Se define una sola vez. Como cada sucursal tiene sus propios insumos (mismo nombre),
// se replica emparejando POR NOMBRE, igual que al clonar una sucursal. En una sucursal
// donde falte algún insumo, esa línea se omite (no se descuadra el inventario).
export const guardarRecetaAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { insumos } = req.body; // [{ insumoId, cantidad }] con insumos de la sucursal del plato

    const productoBase = await prisma.producto.findUnique({ where: { id } });
    if (!productoBase) return res.status(404).json({ error: 'Plato no encontrado' });

    // Normaliza las líneas válidas
    const limpio = (Array.isArray(insumos) ? insumos : [])
      .filter((x) => x.insumoId && parseFloat(x.cantidad) > 0)
      .map((x) => ({ insumoId: x.insumoId, cantidad: parseFloat(x.cantidad) }));

    // Traduce los insumos elegidos a NOMBRE + cantidad (para poder replicar por nombre)
    const insumosBase = await prisma.insumo.findMany({
      where: { id: { in: limpio.map((l) => l.insumoId) }, sucursalId: productoBase.sucursalId },
      select: { id: true, nombre: true },
    });
    const nombrePorId = new Map(insumosBase.map((i) => [i.id, i.nombre]));
    const recetaPorNombre = limpio
      .filter((l) => nombrePorId.has(l.insumoId))
      .map((l) => ({ nombre: nombrePorId.get(l.insumoId), cantidad: l.cantidad }));

    // Todos los platos con el mismo nombre (todas las sucursales, incluido el base)
    const gemelos = await prisma.producto.findMany({
      where: { nombre: productoBase.nombre },
      select: { id: true, sucursalId: true },
    });

    let aplicadas = 0;
    for (const g of gemelos) {
      // Empareja los nombres con los insumoIds DE ESA sucursal
      const insumosSuc = await prisma.insumo.findMany({
        where: { sucursalId: g.sucursalId, nombre: { in: recetaPorNombre.map((r) => r.nombre) } },
        select: { id: true, nombre: true },
      });
      const idPorNombre = new Map(insumosSuc.map((i) => [i.nombre, i.id]));
      const detalle = recetaPorNombre
        .filter((r) => idPorNombre.has(r.nombre))
        .map((r) => ({ insumoId: idPorNombre.get(r.nombre), cantidad: r.cantidad }));

      await prisma.$transaction(async (tx) => {
        let r = await tx.receta.findUnique({ where: { productoId: g.id } });
        if (!r) r = await tx.receta.create({ data: { productoId: g.id, sucursalId: g.sucursalId } });
        else await tx.recetaInsumo.deleteMany({ where: { recetaId: r.id } });
        if (detalle.length) await tx.recetaInsumo.createMany({ data: detalle.map((d) => ({ recetaId: r.id, ...d })) });
      });
      aplicadas++;
    }

    res.json({ ok: true, aplicadas, plato: productoBase.nombre });
  } catch (error) {
    console.error('Error al guardar la receta (admin):', error);
    res.status(500).json({ error: 'Error al guardar la receta' });
  }
};

// ── ADMIN: eliminar un plato (si ya se vendió, se desactiva en vez de borrar) ──
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const existe = await prisma.producto.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Plato no encontrado' });
    if (!existe.agregadoManual) return res.status(400).json({ error: 'Solo se pueden eliminar los platos agregados manualmente' });

    // PRIMERO averiguamos si el plato ya se vendió. Si tiene ventas NO se puede borrar
    // (rompería el historial), así que solo se desactiva —y NO se toca su receta—.
    // El bug anterior borraba la receta y recién ahí fallaba: el plato quedaba vivo
    // pero sin receta, y al reactivarlo se vendía sin descontar inventario.
    const tieneVentas = await prisma.itemPedido.count({ where: { productoId: id } });

    if (tieneVentas > 0) {
      await prisma.producto.update({ where: { id }, data: { estaDisponible: false } });
      return res.json({ eliminado: false, desactivado: true });
    }

    // Sin ventas: se borra de verdad, receta incluida, todo en una transacción
    await prisma.$transaction(async (tx) => {
      const receta = await tx.receta.findUnique({ where: { productoId: id } });
      if (receta) {
        await tx.recetaInsumo.deleteMany({ where: { recetaId: receta.id } });
        await tx.receta.delete({ where: { id: receta.id } });
      }
      await tx.producto.delete({ where: { id } });
    });
    res.json({ eliminado: true });
  } catch (error) {
    console.error('Error al eliminar el plato:', error);
    res.status(500).json({ error: 'Error al eliminar el plato' });
  }
};
