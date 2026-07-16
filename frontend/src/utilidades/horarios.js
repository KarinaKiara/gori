// Horarios de atención de cada sucursal.
//
// Vive en el frontend (y no en la base de datos) a propósito: el tótem y el
// celular deben saber si la sucursal está abierta AUNQUE NO HAYA INTERNET.
// Se resuelve por palabra clave del nombre de la sucursal.
//
// getDay(): 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado
const HORARIOS = [
  { clave: 'lincoln',  diaCerrado: 2, abre: '12:00', cierra: '21:30' }, // no atiende martes
  { clave: 'prado',    diaCerrado: 0, abre: '12:00', cierra: '21:00' }, // no atiende domingos
  { clave: 'recoleta', diaCerrado: 1, abre: '12:00', cierra: '21:00' }, // no atiende lunes
  { clave: 'centro',   diaCerrado: 0, abre: '11:00', cierra: '20:15' }, // no atiende domingos
]

const DIAS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']

// Busca el horario por el nombre de la sucursal (ej: "Gori 3 (Recoleta)" -> recoleta).
// Ojo: se compara solo contra el NOMBRE, no la ubicación (la de El Prado menciona
// la palabra "Centro" en su descripción y confundiría la búsqueda).
function horarioDe(nombreSucursal) {
  const n = (nombreSucursal || '').toLowerCase()
  return HORARIOS.find(h => n.includes(h.clave)) || null
}

const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// "21:30" -> "9:30 pm"
export function enDoceHoras(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const sufijo = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`
}

// Estado actual de la sucursal. Devuelve siempre { abierto, titulo, detalle, ... }
// Si la sucursal no tiene horario configurado, NO se bloquea (abierto = true).
export function estadoSucursal(nombreSucursal, ahora = new Date()) {
  const h = horarioDe(nombreSucursal)
  if (!h) return { abierto: true, motivo: null, titulo: '', detalle: '', horarioTxt: '' }

  const abreTxt = enDoceHoras(h.abre)
  const cierraTxt = enDoceHoras(h.cierra)
  const horarioTxt = `${abreTxt} a ${cierraTxt}`

  // 1. ¿Hoy es su día de cierre?
  if (ahora.getDay() === h.diaCerrado) {
    return {
      abierto: false,
      motivo: 'dia',
      titulo: 'Hoy no atendemos',
      detalle: `Esta sucursal no abre los ${DIAS[h.diaCerrado]}. Los demás días atendemos de ${horarioTxt}.`,
      abreTxt, cierraTxt, horarioTxt,
    }
  }

  // 2. ¿Está fuera del horario de hoy?
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  if (minutosAhora < aMinutos(h.abre)) {
    return {
      abierto: false,
      motivo: 'antes',
      titulo: 'Fuera de servicio',
      detalle: `Abrimos a las ${abreTxt}. Mientras tanto puedes ver el menú.`,
      abreTxt, cierraTxt, horarioTxt,
    }
  }
  if (minutosAhora >= aMinutos(h.cierra)) {
    return {
      abierto: false,
      motivo: 'despues',
      titulo: 'Fuera de servicio',
      detalle: `Ya cerramos por hoy (atendemos de ${horarioTxt}). Puedes ver el menú.`,
      abreTxt, cierraTxt, horarioTxt,
    }
  }

  return { abierto: true, motivo: null, titulo: '', detalle: '', abreTxt, cierraTxt, horarioTxt }
}

// Texto corto para la lista de locales: "Cierra los lunes · 12:00 pm a 9:00 pm"
export function resumenHorario(nombreSucursal) {
  const h = horarioDe(nombreSucursal)
  if (!h) return ''
  return `Cierra los ${DIAS[h.diaCerrado]} · ${enDoceHoras(h.abre)} a ${enDoceHoras(h.cierra)}`
}
