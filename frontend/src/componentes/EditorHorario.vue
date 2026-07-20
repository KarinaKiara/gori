<template>
  <div class="space-y-2">
    <div v-for="(dia, i) in dias" :key="dia.dia"
         class="flex flex-wrap items-center gap-3 p-3 rounded-xl border transition-colors"
         :class="dia.cerrado ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'">

      <span class="w-24 font-bold text-sm capitalize"
            :class="dia.cerrado ? 'text-slate-400' : 'text-slate-700'">{{ NOMBRES[dia.dia] }}</span>

      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" v-model="dia.cerrado" @change="emitir"
               class="w-4 h-4 accent-[#E4C07A] cursor-pointer">
        <span class="text-xs font-bold" :class="dia.cerrado ? 'text-rose-500' : 'text-slate-400'">
          {{ dia.cerrado ? 'Cerrado' : 'Abierto' }}
        </span>
      </label>

      <div class="flex items-center gap-2 ml-auto" :class="{ 'opacity-40 pointer-events-none': dia.cerrado }">
        <input type="time" v-model="dia.abre" @change="emitir" :disabled="dia.cerrado"
               class="p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
        <span class="text-slate-400 text-sm">a</span>
        <input type="time" v-model="dia.cierra" @change="emitir" :disabled="dia.cerrado"
               class="p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
      </div>

      <p v-if="errores[i]" class="w-full text-xs font-bold text-rose-600">{{ errores[i] }}</p>
    </div>

    <div class="flex flex-wrap gap-2 pt-1">
      <button type="button" @click="copiarALaSemana"
              class="text-xs font-bold text-gori-primary hover:underline">
        Aplicar el horario del lunes a toda la semana
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

// Editor del horario de atención: 7 días, cada uno con "cerrado" y su rango de horas.
// Lo usan el panel del administrador (al crear/editar una sucursal) y el del gerente.
const NOMBRES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const props = defineProps({
  modelValue: { type: Array, default: null }
})
const emit = defineEmits(['update:modelValue', 'validez'])

const porDefecto = () =>
  NOMBRES.map((_, dia) => ({ dia, cerrado: false, abre: '12:00', cierra: '21:00' }))

// Normaliza lo que llegue (puede venir incompleto o desordenado desde la BD)
const normalizar = (valor) => {
  const base = porDefecto()
  if (!Array.isArray(valor)) return base
  return base.map(d => {
    const encontrado = valor.find(v => Number(v?.dia) === d.dia)
    if (!encontrado) return d
    return {
      dia: d.dia,
      cerrado: encontrado.cerrado === true,
      abre: encontrado.abre || d.abre,
      cierra: encontrado.cierra || d.cierra
    }
  })
}

const dias = ref(normalizar(props.modelValue))
const errores = ref(Array(7).fill(''))

// Huella estable de un horario, para comparar dos versiones sin depender del
// orden de las claves.
const huella = (lista) => lista.map(d => `${d.dia}|${d.cerrado ? 1 : 0}|${d.abre}|${d.cierra}`).join(';')

// Si el padre carga el horario después (por ejemplo al abrir "Editar"), se refleja.
// Se ignora el eco de nuestro propio emit: sin esta comparación, emitir provocaría
// otro watch, que volvería a emitir, y el navegador se quedaría en ese bucle.
watch(() => props.modelValue, (nuevo) => {
  const normalizado = normalizar(nuevo)
  if (huella(normalizado) === huella(dias.value)) return
  dias.value = normalizado
  validar()
})

const aMin = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN
}

// Marca los errores de cada día y avisa al padre si el horario es usable.
// No toca el modelo, así que puede llamarse desde el watch sin realimentarlo.
const validar = () => {
  let valido = true
  errores.value = dias.value.map(d => {
    if (d.cerrado) return ''
    const a = aMin(d.abre), c = aMin(d.cierra)
    if (Number.isNaN(a) || Number.isNaN(c)) { valido = false; return 'Falta la hora' }
    if (a >= c) { valido = false; return 'La apertura debe ser antes del cierre' }
    return ''
  })
  emit('validez', valido)
}

// Valida y además entrega el horario al padre. Solo desde interacción del usuario.
const emitir = () => {
  validar()
  emit('update:modelValue', dias.value.map(d => ({ ...d })))
}

const copiarALaSemana = () => {
  const lunes = dias.value.find(d => d.dia === 1)
  dias.value = dias.value.map(d => ({ ...d, cerrado: lunes.cerrado, abre: lunes.abre, cierra: lunes.cierra }))
  emitir()
}

// Estado inicial hacia el padre (cubre el caso "crear sucursal nueva")
emitir()
</script>
