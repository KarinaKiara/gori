// Horarios de atención por sucursal (espejo del frontend), para REVALIDAR en el
// servidor y no confiar en el reloj del cliente (que se puede cambiar a mano).
//
// IMPORTANTE: el servidor puede correr en UTC (Render). Convertimos a hora de
// Bolivia (America/La_Paz, UTC-4 sin horario de verano) antes de comparar.

const HORARIOS = [
  { clave: 'lincoln',  diaCerrado: 2, abre: '12:00', cierra: '21:30' }, // martes cerrado
  { clave: 'prado',    diaCerrado: 0, abre: '12:00', cierra: '21:00' }, // domingo cerrado
  { clave: 'recoleta', diaCerrado: 1, abre: '12:00', cierra: '21:00' }, // lunes cerrado
  { clave: 'centro',   diaCerrado: 0, abre: '11:00', cierra: '20:15' }, // domingo cerrado
];

const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Fecha "ahora" pero en hora de Bolivia, sin importar la zona del servidor.
function ahoraBolivia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
}

function horarioDe(nombreSucursal) {
  const n = (nombreSucursal || '').toLowerCase();
  return HORARIOS.find(h => n.includes(h.clave)) || null;
}

// ¿La sucursal está abierta AHORA? Si no tiene horario configurado, se asume abierta.
export function sucursalAbierta(nombreSucursal, ahora = ahoraBolivia()) {
  const h = horarioDe(nombreSucursal);
  if (!h) return { abierta: true };
  if (ahora.getDay() === h.diaCerrado) return { abierta: false, motivo: 'Hoy la sucursal no atiende' };
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  if (min < aMin(h.abre)) return { abierta: false, motivo: `La sucursal abre a las ${h.abre}` };
  if (min >= aMin(h.cierra)) return { abierta: false, motivo: `La sucursal ya cerró (atiende hasta las ${h.cierra})` };
  return { abierta: true };
}

// La ensalada solo se sirve fresca de 12:00 a 21:00 (hora de Bolivia).
export function ensaladaDisponible(ahora = ahoraBolivia()) {
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  return min >= 12 * 60 && min < 21 * 60;
}
