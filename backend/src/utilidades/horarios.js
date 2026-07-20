// Horarios de atención por sucursal.
//
// El horario ya NO está escrito en el código: vive en la columna `horario` de la
// sucursal y lo configura el administrador al crearla (el gerente puede ajustar
// el de la suya). Aquí quedan solo las REGLAS: cómo validarlo y cómo saber si la
// sucursal está abierta en un momento dado.
//
// IMPORTANTE: el servidor puede correr en UTC (Render). Convertimos a hora de
// Bolivia (America/La_Paz, UTC-4 sin horario de verano) antes de comparar.

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Fecha "ahora" pero en hora de Bolivia, sin importar la zona del servidor.
export function ahoraBolivia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
}

const ES_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Horario por defecto: abierto todos los días de 12:00 a 21:00.
// Sirve para precargar el formulario de una sucursal nueva.
export function horarioPorDefecto() {
  return DIAS.map((_, dia) => ({ dia, cerrado: false, abre: '12:00', cierra: '21:00' }));
}

// Valida el horario que llega del formulario. Devuelve { valido, error, horario }
// donde `horario` es la versión limpia y ordenada lista para guardar.
export function validarHorario(horario) {
  if (!Array.isArray(horario) || horario.length !== 7) {
    return { valido: false, error: 'El horario debe tener los 7 días de la semana' };
  }

  const limpio = [];
  const vistos = new Set();

  for (const entrada of horario) {
    const dia = Number(entrada?.dia);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      return { valido: false, error: 'Cada día debe estar numerado del 0 (domingo) al 6 (sábado)' };
    }
    if (vistos.has(dia)) {
      return { valido: false, error: `El día ${DIAS[dia]} está repetido` };
    }
    vistos.add(dia);

    // Un día cerrado no necesita horas: se guardan igual para no perder lo que
    // el usuario ya había escrito si vuelve a abrirlo.
    if (entrada?.cerrado === true) {
      limpio.push({ dia, cerrado: true, abre: entrada.abre || '12:00', cierra: entrada.cierra || '21:00' });
      continue;
    }

    const abre = String(entrada?.abre || '');
    const cierra = String(entrada?.cierra || '');
    if (!ES_HORA.test(abre) || !ES_HORA.test(cierra)) {
      return { valido: false, error: `Las horas del ${DIAS[dia]} deben tener el formato HH:MM (por ejemplo 12:00)` };
    }
    if (aMin(abre) >= aMin(cierra)) {
      return { valido: false, error: `El ${DIAS[dia]} la hora de apertura debe ser anterior a la de cierre` };
    }

    limpio.push({ dia, cerrado: false, abre, cierra });
  }

  limpio.sort((a, b) => a.dia - b.dia);
  return { valido: true, horario: limpio };
}

// ¿La sucursal está abierta AHORA? Recibe la sucursal completa (o su horario).
// Si no tiene horario configurado se asume abierta: nunca se bloquea una venta
// por un dato faltante (solo puede pasar con sucursales anteriores a esta función).
export function sucursalAbierta(sucursal, ahora = ahoraBolivia()) {
  const horario = Array.isArray(sucursal) ? sucursal : sucursal?.horario;
  if (!Array.isArray(horario) || horario.length === 0) return { abierta: true };

  const hoy = horario.find(d => Number(d.dia) === ahora.getDay());
  if (!hoy) return { abierta: true };

  if (hoy.cerrado === true) {
    return { abierta: false, motivo: `Hoy (${DIAS[ahora.getDay()]}) la sucursal no atiende` };
  }

  const min = ahora.getHours() * 60 + ahora.getMinutes();
  if (min < aMin(hoy.abre)) return { abierta: false, motivo: `La sucursal abre a las ${hoy.abre}` };
  if (min >= aMin(hoy.cierra)) return { abierta: false, motivo: `La sucursal ya cerró (atiende hasta las ${hoy.cierra})` };
  return { abierta: true };
}

// La ensalada solo se sirve fresca de 12:00 a 21:00 (hora de Bolivia).
// Es una regla del producto, no de la sucursal, por eso no se configura.
export function ensaladaDisponible(ahora = ahoraBolivia()) {
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  return min >= 12 * 60 && min < 21 * 60;
}
