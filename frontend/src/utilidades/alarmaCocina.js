// Aviso sonoro del KDS cuando un pedido se atrasa.
//
// No usa ningún archivo de audio: el sonido se genera con el propio navegador
// (Web Audio API). Así no hay que descargar nada, funciona sin internet y suena
// idéntico en cualquier equipo de la cocina.
//
// El timbre es un arpegio corto de tres notas (Sol–Do–Mi), con ataque y caída
// suaves. Llama la atención sin ser una sirena, que en una cocina con ruido
// termina molestando y la gente la apaga.

let contexto = null;

// El navegador no deja sonar nada hasta que la persona toca la pantalla al
// menos una vez. Por eso el contexto se crea en el primer toque y se guarda.
const obtenerContexto = () => {
  if (!contexto) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null; // navegador sin soporte: el aviso queda solo visual
    contexto = new AC();
  }
  if (contexto.state === 'suspended') contexto.resume().catch(() => {});
  return contexto;
};

// Prepara el audio en el primer toque/clic de la pantalla. Se llama al montar
// el KDS; el navegador considera ese gesto como permiso para reproducir.
export const prepararSonido = () => {
  const activar = () => {
    obtenerContexto();
    window.removeEventListener('pointerdown', activar);
    window.removeEventListener('keydown', activar);
  };
  window.addEventListener('pointerdown', activar, { once: true });
  window.addEventListener('keydown', activar, { once: true });
};

// ¿El navegador ya nos dejó sonar? Sirve para avisar en pantalla si falta el toque.
export const sonidoListo = () => !!contexto && contexto.state === 'running';

// Una nota con envolvente suave (sin el "clic" que hace un tono que arranca seco)
const nota = (ctx, frecuencia, inicio, duracion, volumen) => {
  const osc = ctx.createOscillator();
  const gan = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frecuencia;
  gan.gain.setValueAtTime(0, inicio);
  gan.gain.linearRampToValueAtTime(volumen, inicio + 0.02);          // ataque
  gan.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);  // caída
  osc.connect(gan).connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.02);
};

const ARPEGIO = [784, 1047, 1319]; // Sol5, Do6, Mi6

/**
 * Suena el aviso.
 * @param {'nuevo'|'recordatorio'} tipo  'nuevo' cuando un pedido se acaba de
 *        atrasar (se toca dos veces, más presente); 'recordatorio' mientras siga
 *        habiendo atrasados (una sola vez y más suave, para no cansar).
 */
export const sonarAlerta = (tipo = 'nuevo') => {
  const ctx = obtenerContexto();
  if (!ctx || ctx.state !== 'running') return false;

  const volumen = tipo === 'recordatorio' ? 0.12 : 0.22;
  const repeticiones = tipo === 'recordatorio' ? 1 : 2;

  for (let r = 0; r < repeticiones; r++) {
    const base = ctx.currentTime + r * 0.55;
    ARPEGIO.forEach((f, i) => nota(ctx, f, base + i * 0.13, 0.35, volumen));
  }
  return true;
};
