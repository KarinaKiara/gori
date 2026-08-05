<template>
  <div class="space-y-6">
    <!-- Sub-pestañas -->
    <div class="flex flex-wrap gap-2">
      <button v-for="t in tabs" :key="t.id" @click="subTab = t.id"
              :class="['px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2',
                       subTab === t.id ? 'text-[#17120c]' : 'text-gray-400 border border-white/10 hover:border-[#E4C07A]/40']"
              :style="subTab === t.id ? 'background: linear-gradient(135deg,#E4C07A,#caa24f);' : ''">
        {{ t.icono }} {{ t.nombre }}
        <span v-if="t.id === 'compras' && pedidosPendientes.length"
              class="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500 text-[#17120c] font-bold">{{ pedidosPendientes.length }}</span>
      </button>
    </div>

    <p v-if="mensaje" class="p-3 rounded-xl text-sm font-semibold"
       :style="mensajeEsError ? 'background:rgba(239,68,68,.15);color:#fca5a5;' : 'background:rgba(34,197,94,.15);color:#86efac;'">
      {{ mensaje }}
    </p>

    <!-- ===================== INSUMOS ===================== -->
    <section v-show="subTab === 'insumos'" class="space-y-5">
      <!-- Alta de insumo -->
      <div class="p-5 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
        <h3 class="text-white font-bold mb-3">➕ Nuevo insumo</h3>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input v-model="nuevo.nombre" placeholder="Nombre (ej: Ajo, Presa, Aceite)" class="col-span-2 md:col-span-1 in" />
          <!-- Unidad guiada: se elige de la lista, sin necesidad de convertir a gramos -->
          <input v-model="nuevo.unidad" list="unidades-comunes" placeholder="Unidad (elige o escribe)" class="in" />
          <datalist id="unidades-comunes">
            <option value="unidad">se cuenta de a uno (huevo, botella)</option>
            <option value="presa">presa de pollo</option>
            <option value="diente">diente de ajo</option>
            <option value="rodaja">rodaja / porción</option>
            <option value="atado">atado (perejil, cebolla verde)</option>
            <option value="g">gramos (se pesa)</option>
            <option value="kg">kilos (se pesa)</option>
            <option value="ml">mililitros (líquidos)</option>
            <option value="litro">litros (líquidos)</option>
            <option value="cucharada">cucharada (condimentos)</option>
          </datalist>
          <input v-model.number="nuevo.stockActual" type="number" min="0" step="any" @keydown="soloNumero" placeholder="Cuánto tienes" class="in" />
          <input v-model.number="nuevo.stockMinimo" type="number" min="0" step="any" @keydown="soloNumero" placeholder="Aviso cuando baje a" class="in" />
          <button @click="crearInsumo" class="btn-naranja">Agregar</button>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          💡 <b>Cuenta lo que se cuenta</b> (ajo en <i>dientes</i>, huevos en <i>unidad</i>) y <b>pesa lo que se pesa</b>
          (arroz en <i>g</i>, aceite en <i>ml</i>). Así no tienes que hacer cálculos y el descuento sale exacto.
        </p>
      </div>

      <!-- Compra de pollos enteros: se despieza solo en presas -->
      <div class="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl border"
           style="background: rgba(228,192,122,0.06); border-color: rgba(228,192,122,0.25);">
        <div class="text-sm text-gray-300">
          🐔 <b class="text-white">¿Compraste pollos enteros?</b>
          Regístralo y el sistema reparte las presas solo (2 de cada una por pollo).
        </div>
        <button @click="abrirComprarPollos" class="btn-naranja" :disabled="!presas.length"
                :style="!presas.length ? 'opacity:.5;cursor:not-allowed;' : ''">
          Comprar pollos enteros
        </button>
      </div>

      <!-- Tabla de insumos -->
      <div class="rounded-2xl border overflow-hidden" style="border-color: rgba(228,192,122,0.2);">
        <table class="w-full text-sm">
          <thead style="background: rgba(255,255,255,0.05);">
            <tr class="text-left text-gray-300">
              <th class="p-3">Insumo</th>
              <th class="p-3">Unidad</th>
              <th class="p-3">Stock actual</th>
              <th class="p-3">Stock mínimo</th>
              <th class="p-3">🍽️ Rinde para</th>
              <th class="p-3">Estado</th>
              <th class="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in insumos" :key="i.id" class="border-t border-white/5"
                :style="bajoMinimo(i) ? 'background: rgba(239,68,68,0.08);' : ''">
              <td class="p-3 text-white font-semibold">{{ i.nombre }}</td>
              <td class="p-3 text-gray-400">{{ i.unidad }}</td>
              <!-- Stock actual: SOLO LECTURA. Lo calcula el sistema a partir de las ventas
                   y las reposiciones, así que no se escribe a mano. -->
              <td class="p-3">
                <span class="font-bold tabular-nums" :class="destacados.has(i.id) ? 'flash-stock' : ''"
                      :style="bajoMinimo(i) ? 'color:#fca5a5;' : 'color:#fff;'">{{ i.stockActual }}</span>
                <span class="text-gray-500 text-xs ml-1">{{ i.unidad }}</span>
              </td>
              <!-- Stock mínimo: SOLO LECTURA. Lo fija el administrador; el gerente no lo edita. -->
              <td class="p-3">
                <span class="text-gray-300 tabular-nums font-semibold">{{ i.stockMinimo }}</span>
                <span class="text-gray-500 text-xs ml-1">{{ i.unidad }}</span>
              </td>
              <td class="p-3">
                <span v-if="rindePorInsumo(i) !== null"
                      class="px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                      :style="rindePorInsumo(i) <= 0 ? 'background:#7f1d1d;color:#fff;'
                            : rindePorInsumo(i) <= 5 ? 'background:rgba(234,179,8,.2);color:#fde047;'
                            : 'background:rgba(228,192,122,.18);color:#E4C07A;'">
                  {{ rindePorInsumo(i) <= 0 ? '¡Agotado!' : '~' + rindePorInsumo(i) + ' platos' }}
                </span>
                <span v-else class="text-gray-600 text-xs">sin receta</span>
              </td>
              <td class="p-3">
                <span v-if="bajoMinimo(i)" class="px-2 py-1 rounded-full text-xs font-bold bg-red-600 text-white">⚠ Bajo</span>
                <span v-else class="px-2 py-1 rounded-full text-xs font-bold" style="background:rgba(34,197,94,.2);color:#86efac;">OK</span>
              </td>
              <td class="p-3 text-right whitespace-nowrap">
                <button v-if="solicitados.has(i.id)" disabled class="btn-mini"
                        style="background:rgba(148,163,184,.15);color:#94a3b8;cursor:default;">✓ Solicitado</button>
                <button v-else @click="solicitar(i)" class="btn-mini"
                        style="background:linear-gradient(135deg,#E4C07A,#caa24f);color:#17120c;">📩 Solicitar insumo</button>
              </td>
            </tr>
            <tr v-if="!insumos.length"><td colspan="7" class="p-6 text-center text-gray-500">Aún no hay insumos. Agrega el primero arriba.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-500">
        El <b class="text-white">stock actual</b> lo lleva el sistema solo: baja con cada venta y sube al confirmar
        los <b class="text-green-400">pedidos por recibir</b>. El <b class="text-white">stock mínimo</b> lo fija el administrador.
        Cuando un insumo está bajo, tocá <b style="color:#E4C07A;">📩 Solicitar insumo</b> y le llega la solicitud al administrador
        para que arme la compra.
      </p>
    </section>

    <!-- Modal REPONER stock -->
    <Teleport to="body">
    <div v-if="reponerInsumo" class="pi-overlay" @click.self="reponerInsumo = null">
      <div class="pi-modal">
        <h3 class="text-white font-bold text-lg mb-1">➕ Reponer stock</h3>
        <p class="text-[#E4C07A] font-bold mb-4">{{ reponerInsumo.nombre }}</p>
        <div class="space-y-3">
          <div class="flex justify-between text-sm text-gray-300">
            <span>Stock actual:</span>
            <b>{{ reponerInsumo.stockActual }} {{ reponerInsumo.unidad }}</b>
          </div>
          <label class="block text-sm text-gray-300">¿Cuánto compraste? (en {{ reponerInsumo.unidad }})</label>
          <input v-model.number="cantidadRepone" type="number" min="0" step="any" @keydown="soloNumero" class="in w-full" placeholder="Ej: 11500" @keyup.enter="confirmarReponer" />

          <label class="block text-sm text-gray-300">Proveedor <span class="text-gray-500">(opcional)</span></label>
          <select v-model="proveedorSel" class="in w-full">
            <option value="">— Sin especificar —</option>
            <option v-for="p in proveedoresParaInsumo" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
          <p v-if="!proveedores.length" class="text-xs text-gray-500 -mt-1">El administrador aún no cargó proveedores. Podés reponer igual.</p>
          <p v-else-if="!proveedoresParaInsumo.length" class="text-xs text-amber-400/90 -mt-1">Ningún proveedor está habilitado para este insumo. Pedí al administrador que lo asigne, o repón sin especificar proveedor.</p>

          <label class="block text-sm text-gray-300">Costo de la compra en Bs <span class="text-gray-500">(opcional)</span></label>
          <input v-model.number="costoRepone" type="number" min="0" step="any" @keydown="soloNumero" class="in w-full" placeholder="Ej: 150" @keyup.enter="confirmarReponer" />

          <div class="flex justify-between text-sm p-2 rounded-lg" style="background:rgba(34,197,94,.1);">
            <span class="text-gray-300">Nuevo stock:</span>
            <b class="text-green-400">{{ (Number(reponerInsumo.stockActual) + (Number(cantidadRepone) || 0)) }} {{ reponerInsumo.unidad }}</b>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="confirmarReponer" class="btn-naranja flex-1">Confirmar reposición</button>
          <button @click="reponerInsumo = null" class="btn-mini" style="background:rgba(255,255,255,.08);color:#cbd5e1;padding:.6rem 1rem;">Cancelar</button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Modal COMPRAR POLLOS ENTEROS -->
    <Teleport to="body">
    <div v-if="comprarAbierto" class="pi-overlay" @click.self="comprarAbierto = false">
      <div class="pi-modal" style="max-width: 460px;">
        <h3 class="text-white font-bold text-lg mb-1">🐔 Comprar pollos enteros</h3>
        <p class="text-gray-400 text-sm mb-4">Metes cuántos pollos compraste y el sistema los reparte solo en sus presas. Ajusta cuántas presas salen de cada pollo si hace falta.</p>
        <label class="block text-sm text-gray-300 mb-1">¿Cuántos pollos compraste?</label>
        <input v-model.number="nPollos" type="number" min="1" step="1" @keydown="soloNumero" class="in w-full mb-4" placeholder="Ej: 10" @keyup.enter="confirmarComprarPollos" />
        <div class="rounded-xl border overflow-hidden mb-4" style="border-color: rgba(228,192,122,0.2);">
          <table class="w-full text-sm">
            <thead style="background: rgba(255,255,255,0.05);">
              <tr class="text-left text-gray-300">
                <th class="p-2">Presa</th><th class="p-2">Por pollo</th><th class="p-2 text-right">Se agregará</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in distribucion" :key="d.insumoId" class="border-t border-white/5">
                <td class="p-2 text-white">{{ d.nombre }}</td>
                <td class="p-2"><input v-model.number="d.porPollo" type="number" min="0" step="1" @keydown="soloNumero" class="in w-20" /></td>
                <td class="p-2 text-right text-[#E4C07A] font-bold">+{{ (Number(nPollos) || 0) * (Number(d.porPollo) || 0) }}</td>
              </tr>
              <tr v-if="!distribucion.length"><td colspan="3" class="p-4 text-center text-gray-500">No hay presas registradas. Crea insumos con unidad "presa" primero.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="flex gap-2">
          <button @click="confirmarComprarPollos" class="btn-naranja flex-1">Confirmar compra</button>
          <button @click="comprarAbierto = false" class="btn-mini" style="background:rgba(255,255,255,.08);color:#cbd5e1;padding:.6rem 1rem;">Cancelar</button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- ===================== RECETAS ===================== -->
    <section v-show="subTab === 'recetas'" class="grid md:grid-cols-3 gap-5">
      <!-- Lista de productos -->
      <div class="rounded-2xl border overflow-hidden md:col-span-1" style="border-color: rgba(228,192,122,0.2); max-height: 60vh; overflow-y:auto;">
        <div class="p-3 text-gray-300 font-bold" style="background: rgba(255,255,255,0.05);">Productos</div>
        <button v-for="p in productos" :key="p.id" @click="abrirReceta(p)"
                :class="['w-full text-left px-4 py-3 border-t border-white/5 flex justify-between items-center',
                         productoSel && productoSel.id === p.id ? 'text-white' : 'text-gray-300 hover:bg-white/5']"
                :style="productoSel && productoSel.id === p.id ? 'background: rgba(228,192,122,0.15);' : ''">
          <span>{{ p.nombre }}</span>
          <span v-if="p.receta && p.receta.insumos && p.receta.insumos.length"
                class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(34,197,94,.2);color:#86efac;">✓ receta</span>
        </button>
      </div>

      <!-- Editor de receta -->
      <div class="md:col-span-2 p-5 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
        <div v-if="!productoSel" class="text-gray-500 text-center py-16">Selecciona un producto para definir su receta.</div>
        <div v-else class="space-y-4">
          <h3 class="text-white font-bold text-lg">📖 Receta de: <span class="text-[#E4C07A]">{{ productoSel.nombre }}</span></h3>
          <p class="text-xs text-gray-400">Define cuánto de cada insumo consume UN plato. Al vender, se descuenta esta cantidad × cantidad pedida.</p>

          <!-- Resumen: para cuántos platos alcanza con el stock actual -->
          <div v-if="rindeReceta !== null" class="flex items-center gap-3 p-4 rounded-2xl"
               :style="rindeReceta <= 0 ? 'background:rgba(127,29,29,.25);border:1px solid rgba(239,68,68,.5);'
                     : rindeReceta <= 5 ? 'background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.4);'
                     : 'background:rgba(228,192,122,.1);border:1px solid rgba(228,192,122,.35);'">
            <span class="text-3xl">🍽️</span>
            <div>
              <p class="text-xs uppercase tracking-widest" style="color:rgba(228,192,122,.7);">Con el stock actual, esta receta rinde para</p>
              <p class="text-2xl font-black" :style="rindeReceta <= 0 ? 'color:#fca5a5;' : rindeReceta <= 5 ? 'color:#fde047;' : 'color:#F7E3A1;'">
                {{ rindeReceta <= 0 ? '¡No alcanza para ninguno!' : rindeReceta + ' plato' + (rindeReceta === 1 ? '' : 's') }}
              </p>
            </div>
          </div>

          <div v-for="(fila, idx) in detalle" :key="idx"
               class="flex gap-2 items-center p-2 rounded-xl"
               :style="esCuelloDeBotella(fila) ? 'background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.35);' : ''">
            <span v-if="esPresa(fila.insumoId)" class="text-lg" title="Es una presa de pollo">🍗</span>
            <select v-model="fila.insumoId" class="in flex-1">
              <option value="">— Insumo —</option>
              <optgroup label="🍗 Presas">
                <option v-for="i in insumos.filter(x => x.unidad === 'presa')" :key="i.id" :value="i.id">{{ i.nombre }}</option>
              </optgroup>
              <optgroup label="Otros insumos">
                <option v-for="i in insumos.filter(x => x.unidad !== 'presa')" :key="i.id" :value="i.id">{{ i.nombre }} ({{ i.unidad }})</option>
              </optgroup>
            </select>
            <input v-model.number="fila.cantidad" type="number" min="0" step="0.01" @keydown="soloNumero" placeholder="Cantidad" class="in w-28" />
            <span class="text-gray-400 text-sm w-12">{{ unidadDe(fila.insumoId) }}</span>
            <!-- Para cuántos platos alcanza ESTE insumo -->
            <span v-if="platosDeFila(fila) !== null" class="text-xs font-bold whitespace-nowrap w-24 text-right"
                  :style="esCuelloDeBotella(fila) ? 'color:#fde047;' : 'color:rgba(228,192,122,.7);'">
              {{ platosDeFila(fila) }} platos {{ esCuelloDeBotella(fila) ? '⚠️' : '' }}
            </span>
            <span v-else class="text-xs text-gray-600 w-24 text-right">—</span>
            <button @click="detalle.splice(idx,1)" class="btn-mini" style="background:rgba(239,68,68,.2);color:#fca5a5;">✕</button>
          </div>
          <p v-if="detalle.some(f => esCuelloDeBotella(f)) && rindeReceta > 0" class="text-xs" style="color:rgba(234,179,8,.85);">
            ⚠️ El insumo marcado es el que se agota primero: es el que limita cuántos platos puedes hacer.
          </p>

          <button @click="detalle.push({ insumoId:'', cantidad:null })" class="text-sm text-[#E4C07A] hover:text-[#E4C07A] font-bold">+ Agregar insumo</button>

          <div class="pt-3 border-t border-white/10">
            <button @click="guardarReceta" class="btn-naranja">💾 Guardar receta</button>
          </div>
        </div>
      </div>
    </section>

    <!-- (Las alertas de stock bajo ahora se muestran en el cuadro rojo fijo del layout,
         siempre visible en todas las pestañas — ver componente AlertaStockBajo.) -->

    <!-- ===================== CONSUMO ===================== -->
    <section v-show="subTab === 'consumo'" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3 p-4 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
        <span class="text-white font-bold text-sm">📅 Periodo:</span>
        <input type="date" v-model="consumoDesde" class="in" />
        <span class="text-gray-400">a</span>
        <input type="date" v-model="consumoHasta" class="in" />
        <button @click="cargarConsumo" class="btn-naranja">Ver consumo</button>
        <button @click="exportarConsumoPDF" class="btn-mini" style="background:#16a34a;color:#fff;padding:.5rem 1rem;">📄 Exportar PDF</button>
      </div>
      <div class="rounded-2xl border overflow-hidden" style="border-color: rgba(228,192,122,0.2);">
        <table class="w-full text-sm">
          <thead style="background: rgba(255,255,255,0.05);">
            <tr class="text-left text-gray-300"><th class="p-3">Insumo</th><th class="p-3">Total consumido</th><th class="p-3">N° de salidas</th></tr>
          </thead>
          <tbody>
            <tr v-for="(c, idx) in consumo" :key="idx" class="border-t border-white/5">
              <td class="p-3 text-white font-semibold">{{ c.insumo }}</td>
              <td class="p-3 text-[#E4C07A] font-bold">{{ c.totalConsumido }} {{ c.unidad }}</td>
              <td class="p-3 text-gray-400">{{ c.salidas }}</td>
            </tr>
            <tr v-if="!consumo.length"><td colspan="3" class="p-6 text-center text-gray-500">Sin consumo registrado en el periodo.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===================== PEDIDOS POR RECIBIR ===================== -->
    <section v-show="subTab === 'compras'" class="space-y-4">
      <p class="text-sm text-gray-400">
        Pedidos que el administrador generó para tu sucursal. Cuando llegue la mercadería, dale
        <b class="text-[#E4C07A]">Confirmar ingreso</b> y el stock se suma solo.
      </p>

      <!-- Pendientes -->
      <div v-if="!pedidosPendientes.length" class="p-10 text-center text-gray-500 rounded-2xl border" style="border-color: rgba(228,192,122,0.2);">
        ✅ No tenés pedidos por recibir.
      </div>
      <div v-for="p in pedidosPendientes" :key="p.id" class="p-5 rounded-2xl border"
           style="background: rgba(228,192,122,0.06); border-color: rgba(228,192,122,0.3);">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <div class="text-white font-bold">🧾 {{ p.proveedor?.nombre }}</div>
            <div class="text-xs text-gray-400 mt-0.5">
              Pedido del {{ fechaCompra(p.createdAt) }}<span v-if="p.creadoPor"> · por {{ p.creadoPor }}</span>
              <span v-if="p.proveedor?.telefono"> · 📞 {{ p.proveedor.telefono }}</span>
            </div>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 whitespace-nowrap">Pendiente</span>
        </div>
        <table class="w-full text-sm mb-3">
          <tbody>
            <tr v-for="it in p.items" :key="it.id" class="border-t border-white/5">
              <td class="py-1.5 text-gray-200">{{ it.insumo?.nombre }}</td>
              <td class="py-1.5 text-right text-[#E4C07A] font-bold whitespace-nowrap">+{{ it.cantidad }} {{ it.insumo?.unidad }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="p.nota" class="text-xs text-gray-400 italic mb-3">"{{ p.nota }}"</p>
        <button @click="confirmarPedido(p)" :disabled="confirmando === p.id"
                class="btn-naranja w-full disabled:opacity-50">
          {{ confirmando === p.id ? 'Confirmando…' : '✓ Confirmar ingreso' }}
        </button>
      </div>

      <!-- Historial (recibidos / cancelados) -->
      <div v-if="pedidosHistorial.length" class="pt-2">
        <h4 class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Historial</h4>
        <div v-for="p in pedidosHistorial" :key="p.id" class="p-4 rounded-xl border flex items-center justify-between gap-3 mb-2"
             style="background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08);">
          <div class="text-sm">
            <span class="text-gray-200 font-semibold">{{ p.proveedor?.nombre }}</span>
            <span class="text-gray-500 ml-2">{{ p.items.length }} insumo(s) · {{ fechaCompra(p.createdAt) }}</span>
          </div>
          <span :class="['text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap', p.estado === 'RECIBIDO' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-gray-400']">
            {{ p.estado === 'RECIBIDO' ? '✓ Recibido' : 'Cancelado' }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { useAuthStore } from '../../almacenes/auth';
import { confirmar } from '../../utilidades/dialogo';
import { exportarReporteInventario } from '../../utilidades/reportesPdf';

const authStore = useAuthStore();
const API = '/api/gerente';
const headers = () => ({ 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' });

const tabs = [
  { id: 'insumos', nombre: 'Insumos', icono: '📦' },
  { id: 'recetas', nombre: 'Recetas', icono: '📖' },
  { id: 'compras', nombre: 'Pedidos por recibir', icono: '🧾' },
  { id: 'consumo', nombre: 'Consumo', icono: '📉' },
];
const subTab = ref('insumos');

const insumos = ref([]);
const productos = ref([]);
const alertas = ref([]);
const solicitados = ref(new Set()); // ids de insumos con solicitud pendiente al admin
const consumo = ref([]);
const productoSel = ref(null);
const detalle = ref([]);

const nuevo = ref({ nombre: '', unidad: '', stockActual: null, stockMinimo: null });
const consumoDesde = ref('');
const consumoHasta = ref('');

// Reposición de stock (cuando el gerente compra más materia prima)
const reponerInsumo = ref(null);
const cantidadRepone = ref(null);
const proveedores = ref([]);
const proveedorSel = ref('');
const costoRepone = ref(null);
const abrirReponer = (i) => { reponerInsumo.value = i; cantidadRepone.value = null; proveedorSel.value = ''; costoRepone.value = null; };

// Solo los proveedores habilitados para el insumo que se está reponiendo.
// Así el gerente no puede, p. ej., asociar cebolla al proveedor de huevos.
const proveedoresParaInsumo = computed(() => {
  if (!reponerInsumo.value) return [];
  return proveedores.value.filter((p) => (p.insumoIds || []).includes(reponerInsumo.value.id));
});

const cargarProveedores = async () => {
  try { const r = await fetch(`${API}/proveedores`, { headers: headers() }); if (r.ok) proveedores.value = await r.json(); } catch (e) { /* opcional */ }
};

// --- Pedidos de compra por recibir (los genera el admin, el gerente confirma) ---
const pedidosCompra = ref([]);
const confirmando = ref(null);
const pedidosPendientes = computed(() => pedidosCompra.value.filter((p) => p.estado === 'PENDIENTE'));
const pedidosHistorial = computed(() => pedidosCompra.value.filter((p) => p.estado !== 'PENDIENTE'));
const fechaCompra = (iso) => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('es-BO') + ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }); };

const cargarPedidosCompra = async () => {
  try { const r = await fetch(`${API}/pedidos-compra`, { headers: headers() }); if (r.ok) pedidosCompra.value = await r.json(); } catch (e) { /* opcional */ }
};

const confirmarPedido = async (p) => {
  if (!(await confirmar(`¿Confirmar el ingreso del pedido a "${p.proveedor?.nombre}"? El stock se sumará automáticamente.`, { titulo: 'Confirmar ingreso', textoAceptar: 'Confirmar ingreso' }))) return;
  confirmando.value = p.id;
  try {
    const r = await fetch(`${API}/pedidos-compra/${p.id}/confirmar`, { method: 'PUT', headers: headers() });
    const data = await leerJson(r);
    if (!r.ok) { avisar(data.error || 'No se pudo confirmar', true); return; }
    avisar(`Ingreso confirmado: stock actualizado desde "${p.proveedor?.nombre}"`);
    await Promise.all([cargarPedidosCompra(), cargarInsumos(), cargarAlertas()]);
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); } finally { confirmando.value = null; }
};
// Helper: lee la respuesta como JSON aunque el servidor devuelva HTML (proxy caído),
// para que nunca reviente con SyntaxError.
const leerJson = async (res) => { try { return await res.json(); } catch { return {}; } };

const confirmarReponer = async () => {
  const cant = Number(cantidadRepone.value);
  if (!cant || cant <= 0) return avisar('Ingresa cuánto compraste', true);
  const nombre = reponerInsumo.value.nombre;
  try {
    // Mandamos CUÁNTO se compró, no el total: el servidor lo suma sobre el stock real.
    const res = await fetch(`${API}/insumos/${reponerInsumo.value.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({
        agregar: cant,
        motivo: 'Reposición por compra',
        proveedorId: proveedorSel.value || null,
        costo: (costoRepone.value !== null && costoRepone.value !== '') ? Number(costoRepone.value) : null,
      })
    });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'Error al reponer', true);
    reponerInsumo.value = null;
    await cargarInsumos(); await cargarAlertas();
    avisar(`Repuesto: +${cant} de "${nombre}"`);
  } catch (e) {
    avisar('Sin conexión. Revisa tu internet e intenta de nuevo.', true);
  }
};

// ── Compra de pollos enteros (despiece automático en presas) ──
const presas = computed(() => insumos.value.filter(i => i.unidad === 'presa'));
const comprarAbierto = ref(false);
const nPollos = ref(1);
const distribucion = ref([]);
const abrirComprarPollos = () => {
  // Cada pollo trae 2 de cada presa por defecto (2 piernas, 2 alas, 2 pechos...).
  distribucion.value = presas.value.map(i => ({ insumoId: i.id, nombre: i.nombre, porPollo: 2 }));
  nPollos.value = 1;
  comprarAbierto.value = true;
};
const confirmarComprarPollos = async () => {
  const pollos = Number(nPollos.value);
  if (!pollos || pollos < 1) return avisar('Ingresa cuántos pollos compraste', true);
  const dist = distribucion.value.filter(d => Number(d.porPollo) > 0);
  if (!dist.length) return avisar('Indica cuántas presas salen de cada pollo', true);
  try {
    const res = await fetch(`${API}/insumos/comprar-pollos`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ cantidadPollos: pollos, distribucion: dist })
    });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'Error al registrar la compra', true);
    comprarAbierto.value = false;
    await cargarInsumos(); await cargarAlertas();
    avisar(`Listo: ${pollos} pollo(s) repartido(s) en sus presas`);
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};

// Exportar el reporte de inventario (consumo + stock) a PDF
const exportarConsumoPDF = () => {
  exportarReporteInventario({
    sucursal: authStore.usuario?.sucursal,
    desde: consumoDesde.value,
    hasta: consumoHasta.value,
    consumo: consumo.value,
    insumos: insumos.value
  });
};

const mensaje = ref('');
const mensajeEsError = ref(false);
const avisar = (texto, error = false) => {
  mensaje.value = texto; mensajeEsError.value = error;
  setTimeout(() => { mensaje.value = ''; }, 3500);
};

// ---- Validación de campos numéricos ----
// Acepta 0 y decimales; rechaza vacío, null y texto que no sea número.
const esNumeroValido = (v) => v !== '' && v !== null && v !== undefined && !isNaN(Number(v));
// Bloquea en el teclado lo que no sea número en los campos de cantidad (deja navegar,
// borrar, copiar/pegar con Ctrl y escribir el punto decimal).
const soloNumero = (e) => {
  const permitidas = ['Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'Home', 'End',
                      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  if (permitidas.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/^[0-9.,]$/.test(e.key)) e.preventDefault();
};

const bajoMinimo = (i) => Number(i.stockActual) <= Number(i.stockMinimo);
const insumoPorId = (id) => insumos.value.find(i => i.id === id);
const unidadDe = (insumoId) => insumoPorId(insumoId)?.unidad || '';
const esPresa = (id) => insumoPorId(id)?.unidad === 'presa';

// ── "¿Para cuántos platos alcanza?" ──
// Por FILA de receta: stock del insumo ÷ lo que consume un plato (redondeado abajo).
const platosDeFila = (fila) => {
  const ins = insumoPorId(fila.insumoId);
  const cant = Number(fila.cantidad);
  if (!ins || !(cant > 0)) return null;
  return Math.floor(Number(ins.stockActual) / cant);
};
// La receta rinde para = el insumo que se agota PRIMERO (el mínimo de todas las filas).
const rindeReceta = computed(() => {
  const nums = detalle.value.map(platosDeFila).filter(n => n !== null);
  return nums.length ? Math.min(...nums) : null;
});
// ¿Esta fila es la que limita? (la que se agota primero)
const esCuelloDeBotella = (fila) => {
  const n = platosDeFila(fila);
  return n !== null && rindeReceta.value !== null && n === rindeReceta.value;
};

// Para la TABLA de insumos: para cuántos platos alcanza cada insumo, mirando la
// receta que lo consume más rápido (el caso más exigente). null = no está en ninguna receta.
const rindePorInsumo = (insumo) => {
  let min = null;
  for (const p of productos.value) {
    const ri = p.receta?.insumos?.find(x => x.insumoId === insumo.id);
    if (ri && Number(ri.cantidad) > 0) {
      const n = Math.floor(Number(insumo.stockActual) / Number(ri.cantidad));
      min = (min === null) ? n : Math.min(min, n);
    }
  }
  return min;
};

// ---- Cargas ----  (silenciosas: si fallan, no rompen la pantalla)
const cargarInsumos = async () => {
  try { const res = await fetch(`${API}/insumos`, { headers: headers() }); if (res.ok) insumos.value = await res.json(); } catch {}
};
const cargarProductos = async () => {
  try { const res = await fetch(`${API}/productos`, { headers: headers() }); if (res.ok) productos.value = await res.json(); } catch {}
};
const cargarAlertas = async () => {
  try { const res = await fetch(`${API}/inventario/alertas`, { headers: headers() }); if (res.ok) alertas.value = await res.json(); } catch {}
};
// Insumos que ya tienen una solicitud pendiente (para mostrar "✓ Solicitado")
const cargarSolicitudes = async () => {
  try { const res = await fetch(`${API}/inventario/solicitudes`, { headers: headers() }); if (res.ok) solicitados.value = new Set(await res.json()); } catch {}
};
// El gerente pide reposición de un insumo → le llega al administrador
const solicitar = async (i) => {
  try {
    const res = await fetch(`${API}/inventario/solicitar`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ insumoId: i.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return avisar(data.error || 'No se pudo enviar la solicitud', true);
    solicitados.value = new Set([...solicitados.value, i.id]);
    avisar(`Solicitud enviada al administrador: "${i.nombre}"`);
  } catch { avisar('Sin conexión. Intentá de nuevo.', true); }
};
const cargarConsumo = async () => {
  try {
    const params = new URLSearchParams();
    if (consumoDesde.value) params.set('desde', consumoDesde.value);
    if (consumoHasta.value) params.set('hasta', consumoHasta.value);
    const res = await fetch(`${API}/reportes/consumo?${params}`, { headers: headers() });
    if (res.ok) consumo.value = (await res.json()).consumo || [];
  } catch {}
};

// ---- Insumos ----
const crearInsumo = async () => {
  if (!nuevo.value.nombre?.trim() || !nuevo.value.unidad?.trim()) return avisar('Nombre y unidad son obligatorios', true);
  if (!esNumeroValido(nuevo.value.stockActual)) return avisar('El stock inicial debe ser un número', true);
  if (!esNumeroValido(nuevo.value.stockMinimo)) return avisar('El stock mínimo debe ser un número', true);
  if (Number(nuevo.value.stockActual) < 0 || Number(nuevo.value.stockMinimo) < 0) {
    return avisar('El stock y el mínimo no pueden ser negativos', true);
  }
  try {
    const res = await fetch(`${API}/insumos`, { method: 'POST', headers: headers(), body: JSON.stringify(nuevo.value) });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'Error al crear', true);
    nuevo.value = { nombre: '', unidad: '', stockActual: null, stockMinimo: null };
    await cargarInsumos(); await cargarAlertas();
    avisar('Insumo agregado');
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};
const guardarInsumo = async (i) => {
  if (!i.nombre?.trim() || !i.unidad?.trim()) return avisar('El nombre y la unidad no pueden quedar vacíos', true);
  if (!esNumeroValido(i.stockMinimo)) return avisar('El stock mínimo debe ser un número válido', true);
  if (Number(i.stockMinimo) < 0) return avisar('El stock mínimo no puede ser negativo', true);
  try {
    // NO se envía stockActual: ese valor lo calcula el servidor con las ventas y las
    // reposiciones. Mandarlo desde aquí pisaría con un dato viejo de pantalla las
    // ventas ocurridas mientras el gerente la tenía abierta.
    const res = await fetch(`${API}/insumos/${i.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ stockMinimo: i.stockMinimo, nombre: i.nombre, unidad: i.unidad })
    });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'Error al guardar', true);
    await cargarAlertas();
    avisar(`"${i.nombre}" actualizado`);
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};
const eliminarInsumo = async (i) => {
  try {
    const res = await fetch(`${API}/insumos/${i.id}`, { method: 'DELETE', headers: headers() });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'No se pudo eliminar', true);
    await cargarInsumos(); await cargarAlertas();
    avisar('Insumo eliminado');
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};

// ---- Recetas ----
const abrirReceta = async (p) => {
  productoSel.value = p;
  try {
    const res = await fetch(`${API}/recetas/${p.id}`, { headers: headers() });
    const receta = res.ok ? await res.json() : { insumos: [] };
    detalle.value = (receta.insumos || []).map(ri => ({ insumoId: ri.insumoId, cantidad: ri.cantidad }));
  } catch { detalle.value = []; }
  if (!detalle.value.length) detalle.value = [{ insumoId: '', cantidad: null }];
};
const guardarReceta = async () => {
  const limpio = detalle.value.filter(f => f.insumoId && Number(f.cantidad) > 0);
  try {
    const res = await fetch(`${API}/recetas/${productoSel.value.id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify({ insumos: limpio })
    });
    if (!res.ok) { const d = await leerJson(res); return avisar(d.error || 'Error al guardar receta', true); }
    await cargarProductos();
    avisar(`Receta de "${productoSel.value.nombre}" guardada`);
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};

onMounted(async () => {
  // Las fechas se fijan ANTES de cargar, así la pestaña Consumo nunca queda sin fechas
  // aunque una carga falle.
  const hoy = new Date();
  const hace7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  consumoHasta.value = hoy.toISOString().split('T')[0];
  consumoDesde.value = hace7.toISOString().split('T')[0];
  await Promise.all([cargarInsumos(), cargarProductos(), cargarAlertas(), cargarProveedores(), cargarPedidosCompra(), cargarSolicitudes()]);
  await cargarConsumo();
  conectarEnVivo();
});

// ---- Actualización EN VIVO del stock ----
// Cuando la caja cobra un pedido, el servidor descuenta los insumos y avisa por socket
// a la sucursal. Así el gerente ve bajar el stock solo, sin refrescar la página.
let socket = null;
const destacados = ref(new Set()); // ids que acaban de cambiar, para resaltarlos

function conectarEnVivo() {
  const sucursalId = authStore.usuario?.sucursalId;
  if (!sucursalId) return;
  socket = io();
  socket.on('connect', () => socket.emit('unirse-sucursal', sucursalId));

  socket.on('inventario-actualizado', (filas) => {
    let hubo = false;
    for (const f of filas) {
      const i = insumoPorId(f.id);
      if (!i) continue;                       // insumo nuevo: se trae en la recarga
      i.stockActual = f.stockActual;
      destacados.value.add(f.id);
      hubo = true;
      setTimeout(() => {
        destacados.value.delete(f.id);
        destacados.value = new Set(destacados.value); // fuerza el repintado
      }, 2500);
    }
    destacados.value = new Set(destacados.value);
    if (!hubo) cargarInsumos();               // llegó algo que no tenemos: recargar
    cargarAlertas();                          // el aviso de stock bajo también cambia
  });
}

onUnmounted(() => { if (socket) { socket.disconnect(); socket = null; } });
</script>

<style scoped>
/* Destello del stock cuando baja por una venta: el gerente ve QUE cambio, no solo el numero */
.flash-stock {
  animation: flashStock 2.5s ease-out;
  border-radius: 6px;
}
@keyframes flashStock {
  0%   { background: rgba(228,192,122,0.75); color: #17120c; box-shadow: 0 0 0 6px rgba(228,192,122,0.45); }
  35%  { background: rgba(228,192,122,0.35); box-shadow: 0 0 0 4px rgba(228,192,122,0.2); }
  100% { background: transparent; box-shadow: none; }
}
@media (prefers-reduced-motion: reduce) { .flash-stock { animation: none; } }

.in {
  padding: 0.5rem 0.75rem;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  color: #fff;
  outline: none;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(228,192,122,0.3);
}
.in::placeholder { color: #6b7280; }
.in option { background: #17120c; }
.btn-naranja {
  padding: 0.5rem 1rem;
  border-radius: 0.6rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: #17120c;
  background: linear-gradient(135deg, #E4C07A, #caa24f);
  border: none;
  cursor: pointer;
}
.btn-mini {
  padding: 0.35rem 0.7rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  border: none;
  cursor: pointer;
  margin-left: 0.35rem;
}
.pi-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.pi-modal {
  max-width: 360px; width: 100%;
  background: #17120c;
  border: 1px solid rgba(228,192,122,.35);
  border-radius: 18px;
  padding: 22px;
}
</style>
