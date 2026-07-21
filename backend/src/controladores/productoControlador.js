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

// ── ADMIN: listar los platos agregados manualmente (con su sucursal) ──
export const listarProductosManual = async (req, res) => {
  try {
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
