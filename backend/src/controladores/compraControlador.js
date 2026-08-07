import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Avisa a las pantallas de la sucursal (caja/tótem) que cambió el stock, para que
// quiten el cartel de "Agotado" sin recargar. Mismo canal que usa el inventario.
const avisarStock = (req, sucursalId, insumos) => {
  const io = req.app.get('io');
  if (!io || !insumos?.length) return;
  io.to(sucursalId).emit('inventario-actualizado', insumos.map((i) => ({
    id: i.id, nombre: i.nombre, unidad: i.unidad,
    stockActual: i.stockActual, stockMinimo: i.stockMinimo,
  })));
};

const incluirDetalle = {
  sucursal: { select: { id: true, nombre: true } },
  proveedor: { select: { id: true, nombre: true, telefono: true, contacto: true } },
  items: { include: { insumo: { select: { id: true, nombre: true, unidad: true } } } },
};

// ============================================================
//  ADMIN  ·  crea, lista y cancela pedidos de compra
// ============================================================

// El admin arma el pedido (una sola vez): sucursal + proveedor + líneas de insumo
// con su cantidad y costo opcional. Queda PENDIENTE hasta que el gerente lo reciba.
export const crearPedidoCompra = async (req, res) => {
  try {
    const { sucursalId, proveedorId, nota, items } = req.body;

    if (!sucursalId || !proveedorId) {
      return res.status(400).json({ error: 'Elegí la sucursal y el proveedor' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Agregá al menos un insumo al pedido' });
    }

    // Normaliza y valida las líneas.
    // La "cantidad" que llega YA está convertida a la unidad base (ml, g, unidad):
    // el frontend hace la cuenta (unidades × factor) y manda el total. Además viaja
    // la equivalencia (unidadPedido + factorConversion) para RECORDARLA en el insumo.
    const lineas = [];
    for (const it of items) {
      const cantidad = parseFloat(it.cantidad);
      if (!it.insumoId || !(cantidad > 0)) {
        return res.status(400).json({ error: 'Cada línea necesita un insumo y una cantidad mayor a 0' });
      }
      const costoNum = it.costo !== undefined && it.costo !== null && it.costo !== '' ? parseFloat(it.costo) : null;
      const factor = parseFloat(it.factorConversion);
      lineas.push({
        insumoId: it.insumoId,
        cantidad,
        costo: Number.isFinite(costoNum) && costoNum >= 0 ? costoNum : null,
        unidadPedido: it.unidadPedido ? String(it.unidadPedido).trim() : null,
        factorConversion: Number.isFinite(factor) && factor > 0 ? factor : null,
      });
    }

    const sucursal = await prisma.sucursal.findUnique({ where: { id: sucursalId }, select: { id: true } });
    if (!sucursal) return res.status(400).json({ error: 'La sucursal no existe' });

    // El proveedor debe abastecer TODOS los insumos pedidos EN ESA SUCURSAL.
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: proveedorId },
      include: { insumos: { where: { insumo: { sucursalId } }, select: { insumoId: true } } },
    });
    if (!proveedor) return res.status(400).json({ error: 'El proveedor no existe' });
    const abastece = new Set(proveedor.insumos.map((ip) => ip.insumoId));

    // Todos los insumos deben ser de la sucursal elegida.
    const idsPedidos = lineas.map((l) => l.insumoId);
    const insumosSuc = await prisma.insumo.findMany({
      where: { id: { in: idsPedidos }, sucursalId }, select: { id: true, nombre: true },
    });
    const validos = new Map(insumosSuc.map((i) => [i.id, i.nombre]));

    for (const l of lineas) {
      if (!validos.has(l.insumoId)) {
        return res.status(400).json({ error: 'Uno de los insumos no pertenece a la sucursal elegida' });
      }
      if (!abastece.has(l.insumoId)) {
        return res.status(400).json({ error: `El proveedor no provee "${validos.get(l.insumoId)}". Quitá esa línea o elegí otro proveedor.` });
      }
    }

    // Nombre del admin que lo generó (informativo)
    let creadoPor = null;
    if (req.usuarioId) {
      const admin = await prisma.usuario.findUnique({ where: { id: req.usuarioId }, select: { nombre: true } });
      creadoPor = admin?.nombre || null;
    }

    const pedido = await prisma.pedidoCompra.create({
      data: {
        sucursalId, proveedorId,
        nota: nota ? String(nota).trim() : null,
        creadoPor,
        // En el kardex solo se guarda insumo + cantidad (base) + costo; la unidad de
        // pedido y el factor NO son del pedido, son del insumo (se guardan abajo).
        items: { create: lineas.map(({ insumoId, cantidad, costo }) => ({ insumoId, cantidad, costo })) },
      },
      include: incluirDetalle,
    });

    // Recuerda la equivalencia en cada insumo: la próxima vez el admin ya la ve
    // pre-cargada y solo escribe cuántas unidades compra.
    for (const l of lineas) {
      if (l.unidadPedido && l.factorConversion) {
        await prisma.insumo.update({
          where: { id: l.insumoId },
          data: { unidadPedido: l.unidadPedido, factorConversion: l.factorConversion },
        });
      }
    }

    res.status(201).json(pedido);
  } catch (error) {
    console.error('Error al crear pedido de compra:', error);
    res.status(500).json({ error: 'Error al crear el pedido de compra' });
  }
};

// Lista todos los pedidos (todas las sucursales). Filtro opcional ?estado=
export const listarPedidosCompraAdmin = async (req, res) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = String(req.query.estado).toUpperCase();
    const pedidos = await prisma.pedidoCompra.findMany({
      where, orderBy: { createdAt: 'desc' }, include: incluirDetalle,
    });
    res.json(pedidos);
  } catch (error) {
    console.error('Error al listar pedidos de compra:', error);
    res.status(500).json({ error: 'Error al listar los pedidos de compra' });
  }
};

// El admin cancela un pedido que todavía está PENDIENTE (nunca uno ya recibido).
export const cancelarPedidoCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoCompra.findUnique({ where: { id }, select: { estado: true } });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (pedido.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Solo se puede cancelar un pedido pendiente' });
    }
    const actualizado = await prisma.pedidoCompra.update({
      where: { id }, data: { estado: 'CANCELADO' }, include: incluirDetalle,
    });
    res.json(actualizado);
  } catch (error) {
    console.error('Error al cancelar pedido de compra:', error);
    res.status(500).json({ error: 'Error al cancelar el pedido de compra' });
  }
};

// ============================================================
//  GERENTE  ·  ve los pedidos de SU sucursal y confirma el ingreso
// ============================================================

export const listarPedidosCompraGerente = async (req, res) => {
  try {
    const pedidos = await prisma.pedidoCompra.findMany({
      where: { sucursalId: req.sucursalId },
      // Pendientes primero (los que tiene que atender), luego por fecha reciente.
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
      include: incluirDetalle,
    });
    res.json(pedidos);
  } catch (error) {
    console.error('Error al listar pedidos de compra (gerente):', error);
    res.status(500).json({ error: 'Error al listar los pedidos de compra' });
  }
};

// El gerente confirma que la mercadería llegó: el stock se suma solo (sin volver a
// escribir cantidades) y cada línea queda asentada en el kardex con su proveedor.
export const confirmarPedidoCompra = async (req, res) => {
  try {
    const { id } = req.params;

    // Solo pedidos de SU sucursal (aislamiento multi-tenant)
    const pedido = await prisma.pedidoCompra.findFirst({
      where: { id, sucursalId: req.sucursalId },
      include: { items: true },
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado en esta sucursal' });
    if (pedido.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Este pedido ya fue procesado' });
    }

    const PRESAS = ['Pecho', 'Ala', 'Pierna', 'Entrepierna']; // 1 pollo = 2 de cada una
    const actualizados = []; // para avisar a la caja y al tótem al terminar
    await prisma.$transaction(async (tx) => {
      for (const it of pedido.items) {
        const insumo = await tx.insumo.findFirst({ where: { id: it.insumoId, sucursalId: req.sucursalId } });
        if (!insumo) continue; // insumo borrado: se omite esa línea

        // DESPIECE AUTOMÁTICO: si lo que llega es "Pollo", no se guarda como pollo entero:
        // se corta en sus 8 presas (2 pecho, 2 ala, 2 pierna, 2 entrepierna por pollo) y
        // esas presas son las que consumen los platos. Así 1 pollo alcanza para varios.
        if (insumo.nombre === 'Pollo') {
          const presas = await tx.insumo.findMany({ where: { sucursalId: req.sucursalId, nombre: { in: PRESAS } } });
          if (presas.length === 4) {
            for (const pr of presas) {
              const cant = it.cantidad * 2; // 2 de cada presa por cada pollo recibido
              const upd = await tx.insumo.update({ where: { id: pr.id }, data: { stockActual: { increment: cant } } });
              await tx.movimientoInventario.create({
                data: {
                  sucursalId: req.sucursalId, insumoId: pr.id, tipo: 'ENTRADA_REPOSICION',
                  cantidad: cant, stockAntes: upd.stockActual - cant, stockDespues: upd.stockActual,
                  motivo: 'Despiece de pollo (ingreso de compra)', proveedorId: pedido.proveedorId, costo: null,
                },
              });
              actualizados.push(upd);
            }
            continue; // no se suma stock del "Pollo" entero: ya se repartió en presas
          }
          // Si por algún motivo faltan las presas, cae al ingreso normal (abajo).
        }

        const actualizado = await tx.insumo.update({
          where: { id: insumo.id }, data: { stockActual: { increment: it.cantidad } },
        });
        await tx.movimientoInventario.create({
          data: {
            sucursalId: req.sucursalId, insumoId: insumo.id, tipo: 'ENTRADA_REPOSICION',
            cantidad: it.cantidad,
            stockAntes: actualizado.stockActual - it.cantidad,
            stockDespues: actualizado.stockActual,
            motivo: 'Ingreso de pedido de compra',
            proveedorId: pedido.proveedorId,
            costo: it.costo ?? null,
          },
        });
        actualizados.push(actualizado);
      }
      await tx.pedidoCompra.update({
        where: { id: pedido.id }, data: { estado: 'RECIBIDO', recibidoEn: new Date() },
      });
    });

    avisarStock(req, req.sucursalId, actualizados);

    const completo = await prisma.pedidoCompra.findUnique({ where: { id: pedido.id }, include: incluirDetalle });
    res.json(completo);
  } catch (error) {
    console.error('Error al confirmar pedido de compra:', error);
    res.status(500).json({ error: 'Error al confirmar el ingreso del pedido' });
  }
};
