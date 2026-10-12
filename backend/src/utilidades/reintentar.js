// Reintento de transacciones elegidas como "víctima" por MySQL.
//
// Con varios pedidos simultáneos de platos distintos, dos transacciones pueden
// esperar cada una un registro que tiene la otra (por ejemplo, el bloqueo de la
// sucursal para el turno y la fila de un insumo para el descuento). InnoDB detecta
// ese interbloqueo (deadlock), cancela una de las dos y la otra sigue. La práctica
// recomendada es volver a ejecutar la transacción cancelada: como se deshizo
// completa, repetirla no duplica nada.
const ES_INTERBLOQUEO = (e) =>
  e?.code === 'P2034' || // Prisma: write conflict or deadlock
  e?.code === 'P2028' || // Prisma: no consiguió conexión a tiempo (la transacción no empezó)
  (e?.code === 'P2010' && String(e?.meta?.code) === '1213') || // MySQL 1213: deadlock
  String(e?.meta?.code) === '1205'; // MySQL 1205: lock wait timeout

// Tiempos de las transacciones: con muchos pedidos a la vez, esperar hasta 10 s por una
// conexión libre en vez de los 2 s por defecto.
export const OPCIONES_TX = { maxWait: 10000, timeout: 20000 };

export async function conReintento(fn, intentos = 5) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!ES_INTERBLOQUEO(e) || i >= intentos) throw e;
      // espera corta y aleatoria para que las transacciones no choquen otra vez
      await new Promise((ok) => setTimeout(ok, 20 * i + Math.random() * 40));
    }
  }
}
