import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

// ── ADMIN: crear un plato en una o varias sucursales ──
export const crearProducto = async (req, res) => {
  try {
    const { nombre, categoria, descripcion, precio, imagen, sucursalIds } = req.body;
    if (!nombre || precio == null || !Array.isArray(sucursalIds) || sucursalIds.length === 0) {
      return res.status(400).json({ error: 'Faltan datos: nombre, precio y al menos una sucursal.' });
    }
    const creados = await prisma.$transaction(
      sucursalIds.map((sid) => prisma.producto.create({
        data: {
          sucursalId: sid,
          nombre: String(nombre).trim(),
          categoria: categoria || 'Extras Gori',
          descripcion: descripcion ? String(descripcion).trim() : null,
          precio: parseFloat(precio) || 0,
          imagen: imagen || null,
          agregadoManual: true,
          estaDisponible: true
        }
      }))
    );
    res.status(201).json({ creados: creados.length });
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
    if (nombre !== undefined) data.nombre = String(nombre).trim();
    if (categoria !== undefined) data.categoria = categoria;
    if (descripcion !== undefined) data.descripcion = descripcion ? String(descripcion).trim() : null;
    if (precio !== undefined) data.precio = parseFloat(precio) || 0;
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

    try {
      // Borrar su receta (si tuviera) y luego el producto
      const receta = await prisma.receta.findUnique({ where: { productoId: id } });
      if (receta) {
        await prisma.recetaInsumo.deleteMany({ where: { recetaId: receta.id } });
        await prisma.receta.delete({ where: { id: receta.id } });
      }
      await prisma.producto.delete({ where: { id } });
      res.json({ eliminado: true });
    } catch (fkError) {
      // Si el plato ya fue vendido (tiene items de pedido), no se puede borrar: lo desactivamos
      await prisma.producto.update({ where: { id }, data: { estaDisponible: false } });
      res.json({ eliminado: false, desactivado: true });
    }
  } catch (error) {
    console.error('Error al eliminar el plato:', error);
    res.status(500).json({ error: 'Error al eliminar el plato' });
  }
};
