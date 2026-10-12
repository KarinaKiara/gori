import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

// Aislamiento multi-tenant forzado en la capa de acceso a datos.
//
// El middleware de autenticación guarda la sucursal del token en este contexto
// (contextoSucursal.run). Mientras dure la petición, la extensión de Prisma de
// abajo agrega sucursalId a TODAS las consultas de las tablas que pertenecen a
// una sucursal, aunque el controlador se olvide de ponerlo en el where. Así un
// usuario de la sucursal A nunca lee, modifica ni borra datos de la sucursal B:
// para él esos registros simplemente no existen (el controlador responde 404).
//
// El administrador no tiene sucursal en su token, por eso no se le aplica filtro
// y conserva la vista de toda la cadena. Las rutas públicas (login, lista de
// sucursales) tampoco tienen contexto y funcionan igual que antes.
export const contextoSucursal = new AsyncLocalStorage();

// Tablas con columna sucursalId (las demás cuelgan de una de estas).
const MODELOS_CON_SUCURSAL = new Set([
  'Usuario', 'Producto', 'Receta', 'Insumo', 'MovimientoInventario',
  'SolicitudInsumo', 'PedidoCompra', 'Pedido',
]);
const CON_WHERE = new Set([
  'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow', 'findMany',
  'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert',
]);

function conSucursal(data, sucursalId, model) {
  if (data.sucursalId !== undefined && data.sucursalId !== sucursalId) {
    throw new Error(`Intento de escribir ${model} en otra sucursal`);
  }
  return { ...data, sucursalId };
}

export const prismaBase = new PrismaClient();

export const prisma = prismaBase.$extends({
  name: 'aislamientoPorSucursal',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const sucursalId = contextoSucursal.getStore()?.sucursalId;
        if (!sucursalId || !MODELOS_CON_SUCURSAL.has(model)) return query(args);

        const a = { ...args };
        if (CON_WHERE.has(operation)) a.where = { ...(a.where || {}), sucursalId };
        if (operation === 'create') a.data = conSucursal(a.data || {}, sucursalId, model);
        if (operation === 'createMany') {
          a.data = (Array.isArray(a.data) ? a.data : [a.data]).map(d => conSucursal(d, sucursalId, model));
        }
        if (operation === 'upsert') a.create = conSucursal(a.create || {}, sucursalId, model);
        return query(a);
      },
    },
  },
});
