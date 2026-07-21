// Horarios de atención de cada sucursal (lado del cliente).
//
// El horario lo configura el administrador y viaja dentro del objeto de la
// sucursal. Aquí NO hay ninguna tabla escrita a mano: estas funciones solo
// interpretan el horario que reciben.
//
// El horario viaja dentro de la sesión (usuario.horario), que los almacenes auth
// y totem guardan en el dispositivo. Por eso el tótem sabe si está abierto aunque
// no haya internet.
//
// getDay(): 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado
const DIAS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']

// La hora que vale es la de Bolivia, no la del dispositivo: un celular con la
// zona horaria mal puesta mostraría la sucursal cerrada sin estarlo.
export function ahoraBolivia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }))
}

const aMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

// "21:30" -> "9:30 pm"
function enDoceHoras(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  const sufijo = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`
}

// Acepta la sucursal completa, o directamente su horario.
function horarioDe(sucursal) {
  const h = Array.isArray(sucursal) ? sucursal : sucursal?.horario
  return Array.isArray(h) && h.length > 0 ? h : null
}

const SIN_HORARIO = { abierto: true, motivo: null, titulo: '', detalle: '', horarioTxt: '' }

// Estado actual de la sucursal. Devuelve siempre { abierto, titulo, detalle, ... }
// Si no hay horario (sucursal sin configurar, o un dispositivo que todavía no
// alcanzó a guardar su copia), NO se bloquea: el servidor revalida al recibir el
// pedido, así que nunca se pierde una venta legítima por un dato faltante.
export function estadoSucursal(sucursal, ahora = ahoraBolivia()) {
  const horario = horarioDe(sucursal)
  if (!horario) return SIN_HORARIO

  const hoy = horario.find(d => Number(d.dia) === ahora.getDay())
  if (!hoy) return SIN_HORARIO

  const abreTxt = enDoceHoras(hoy.abre)
  const cierraTxt = enDoceHoras(hoy.cierra)
  const horarioTxt = `${abreTxt} a ${cierraTxt}`

  // 1. ¿Hoy no atiende?
  if (hoy.cerrado === true) {
    return {
      abierto: false,
      motivo: 'dia',
      titulo: 'Hoy no atendemos',
      detalle: `Esta sucursal no abre los ${DIAS[ahora.getDay()]}. Puedes ver el menú.`,
      abreTxt, cierraTxt, horarioTxt,
    }
  }

  // 2. ¿Está fuera del horario de hoy?
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  if (minutosAhora < aMinutos(hoy.abre)) {
    return {
      abierto: false,
      motivo: 'antes',
      titulo: 'Fuera de servicio',
      detalle: `Abrimos a las ${abreTxt}. Mientras tanto puedes ver el menú.`,
      abreTxt, cierraTxt, horarioTxt,
    }
  }
  if (minutosAhora >= aMinutos(hoy.cierra)) {
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

// Texto corto para la lista de locales. Como el horario ahora puede cambiar día a
// día, se muestra el de HOY: "Hoy 12:00 pm a 9:00 pm" o "Hoy cerrado".
export function resumenHorario(sucursal, ahora = ahoraBolivia()) {
  const horario = horarioDe(sucursal)
  if (!horario) return ''

  const hoy = horario.find(d => Number(d.dia) === ahora.getDay())
  if (!hoy) return ''
  if (hoy.cerrado === true) return 'Hoy cerrado'
  return `Hoy ${enDoceHoras(hoy.abre)} a ${enDoceHoras(hoy.cierra)}`
}
