// Rellena el horario de las sucursales que todavía no lo tienen.
//
// Antes los horarios estaban escritos en el código y se buscaban por una palabra
// del nombre de la sucursal. Al pasarlos a la base de datos, las sucursales que
// ya existían quedarían sin horario (y por lo tanto abiertas siempre). Esta
// función les pone exactamente el horario que tenían, para que nada cambie de
// comportamiento.
//
// Se ejecuta al arrancar el servidor y es idempotente: solo toca las sucursales
// cuyo horario está vacío, así que correrla mil veces da el mismo resultado.
// Una vez que todas tengan horario, no vuelve a escribir nada.

import { horarioPorDefecto } from './horarios.js';

// Los horarios que estaban en el código, con su día de cierre semanal.
const HEREDADOS = [
  { clave: 'lincoln',  diaCerrado: 2, abre: '12:00', cierra: '21:30' },
  { clave: 'prado',    diaCerrado: 0, abre: '12:00', cierra: '21:00' },
  { clave: 'recoleta', diaCerrado: 1, abre: '12:00', cierra: '21:00' },
  { clave: 'centro',   diaCerrado: 0, abre: '11:00', cierra: '20:15' },
];

// Convierte "cierra los martes, 12:00 a 21:30" en las 7 entradas por día.
const expandir = ({ diaCerrado, abre, cierra }) =>
  Array.from({ length: 7 }, (_, dia) => ({ dia, cerrado: dia === diaCerrado, abre, cierra }));

export async function sembrarHorarios(prisma) {
  try {
    const sucursales = await prisma.sucursal.findMany({ select: { id: true, nombre: true, horario: true } });
    const sinHorario = sucursales.filter(s => !Array.isArray(s.horario) || s.horario.length === 0);
    if (sinHorario.length === 0) return;

    for (const suc of sinHorario) {
      const nombre = (suc.nombre || '').toLowerCase();
      const heredado = HEREDADOS.find(h => nombre.includes(h.clave));
      // Una sucursal desconocida arranca abierta de 12:00 a 21:00 toda la semana;
      // el administrador la ajusta desde su panel.
      const horario = heredado ? expandir(heredado) : horarioPorDefecto();
      await prisma.sucursal.update({ where: { id: suc.id }, data: { horario } });
    }

    console.log(`Horarios: se completaron ${sinHorario.length} sucursal(es) sin horario configurado`);
  } catch (error) {
    // Nunca debe impedir que el servidor arranque.
    console.error('Horarios: no se pudo completar el respaldo inicial:', error.message);
  }
}
