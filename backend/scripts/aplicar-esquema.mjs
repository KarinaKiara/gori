// Aplica el esquema de Prisma a la base al arrancar (Render).
// `prisma db push` se detiene ante cualquier "aviso de pérdida de datos". Uno de esos
// avisos es solo agregar una llave única: no borra nada, y si hubiera duplicados la
// operación falla sola. Ese caso se acepta; cualquier otro aviso (borrar una columna,
// cambiar un tipo) se sigue bloqueando y el servidor arranca con el esquema anterior.
import { execSync } from 'child_process';

const push = (extra = '') => {
  try {
    return { ok: true, salida: execSync(`npx prisma db push --skip-generate ${extra}`, { encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { ok: false, salida: `${e.stdout || ''}${e.stderr || ''}` };
  }
};

let r = push();
if (r.ok) {
  console.log('[esquema] la base está al día');
  process.exit(0);
}
const avisos = [...r.salida.matchAll(/•\s+(.+)/g)].map((m) => m[1]);
const soloLlavesUnicas = avisos.length > 0 && avisos.every((a) => a.startsWith('A unique constraint covering the columns'));
if (r.salida.includes('--accept-data-loss') && soloLlavesUnicas) {
  r = push('--accept-data-loss');
  console.log(r.ok ? `[esquema] aplicado: ${avisos.length} llaves únicas nuevas` : `[esquema] no se pudo aplicar:\n${r.salida}`);
  process.exit(r.ok ? 0 : 1);
}
console.log(`[esquema] no se aplicó:\n${r.salida}`);
process.exit(1);
