# Resultados de la prueba de estrés

**Sistema:** Gori Chicken

## Criterios de aceptación

La prueba somete al servidor a una rampa de carga creciente. Los umbrales se
fijaron **antes** de ejecutarla:

| Parámetro | Valor |
|---|---|
| Tasa de error máxima admitida | 1 % |
| Latencia p95 máxima admitida | 3000 ms |
| Tiempo límite por petición | 15000 ms |
| Corte anticipado de la rampa | error > 25 % |

Un escalón **cumple** si respeta ambos umbrales. El primer escalón que los
incumple es el **punto de quiebre**; el último que los cumple define la
**capacidad máxima sostenible**.

## Entorno: local

**Servidor:** http://localhost:3000 · **Fecha:** 25/8/2026, 8:59:08 p. m.

**Rampa aplicada:** 10 → 25 → 50 → 100 → 200 → 400 peticiones simultáneas

**Arranque en frío (primera petición, excluida de la rampa):** 205 ms

### Rampa de escritura — plato de prueba: "Cuarto (Brasa)"

| Usuarios simultáneos | Peticiones | Éxitos | Fallos | Tasa de error (%) | Latencia media (ms) | Latencia p95 (ms) | Latencia máx. (ms) | Rendimiento (pet/s) | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| 10 | 10 | 10 | 0 | 0 | 775 | 1286.7 | 1286.7 | 7.8 | Sí |
| 25 | 25 | 25 | 0 | 0 | 1805.7 | 3233.7 | 3398.4 | 7.3 | No |
| 50 | 50 | 40 | 10 | 20 | 2994.4 | 5228.4 | 5419.5 | 7.4 | No |
| 100 | 100 | 61 | 39 | 39 | 4164.6 | 7248.6 | 7741.1 | 7.8 | No |

**Capacidad máxima sostenible:** 10 peticiones simultáneas.

**Punto de quiebre:** 25 peticiones simultáneas.

En el escalón de 25 el sistema dejó de cumplir el criterio (p95 3233.7 ms > 3000 ms).

**Naturaleza de los fallos**

| Usuarios simultáneos | Fallos | Tipo | Mensaje devuelto |
|---|---|---|---|
| 50 | 10 | error del servidor: 10 | 500: Error al crear el pedido |
| 100 | 39 | error del servidor: 39 | 500: Error al crear el pedido |

### Rampa de lectura

| Usuarios simultáneos | Peticiones | Éxitos | Fallos | Tasa de error (%) | Latencia media (ms) | Latencia p95 (ms) | Latencia máx. (ms) | Rendimiento (pet/s) | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| 10 | 20 | 20 | 0 | 0 | 89.1 | 116.2 | 120.2 | 88.9 | Sí |
| 25 | 50 | 50 | 0 | 0 | 180 | 255.9 | 296.9 | 106.3 | Sí |
| 50 | 100 | 100 | 0 | 0 | 371.5 | 600.2 | 616.6 | 99.2 | Sí |
| 100 | 200 | 200 | 0 | 0 | 788.3 | 1211.1 | 1277.9 | 92.3 | Sí |
| 200 | 400 | 400 | 0 | 0 | 1585.7 | 2522.4 | 2641.9 | 91.2 | Sí |
| 400 | 800 | 800 | 0 | 0 | 2963.1 | 4478.6 | 4560 | 102 | No |

**Capacidad máxima sostenible:** 200 peticiones simultáneas.

**Punto de quiebre:** 400 peticiones simultáneas.

En el escalón de 400 el sistema dejó de cumplir el criterio (p95 4478.6 ms > 3000 ms).

### Integridad del inventario bajo estrés

| Verificación | Resultado |
|---|---|
| Insumos revisados | 28 |
| Insumos con stock negativo | 0 |
| Cumple | Sí |

## Entorno: render

**Servidor:** https://gori-chicken.onrender.com · **Fecha:** 25/8/2026, 9:11:52 p. m.

**Rampa aplicada:** 10 → 25 → 50 → 100 peticiones simultáneas

**Arranque en frío (primera petición, excluida de la rampa):** 42283 ms

### Rampa de lectura

| Usuarios simultáneos | Peticiones | Éxitos | Fallos | Tasa de error (%) | Latencia media (ms) | Latencia p95 (ms) | Latencia máx. (ms) | Rendimiento (pet/s) | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| 10 | 20 | 20 | 0 | 0 | 1098.4 | 1792.3 | 1895.2 | 7.9 | Sí |
| 25 | 50 | 50 | 0 | 0 | 1471.1 | 3041.4 | 3258.4 | 13.8 | No |
| 50 | 100 | 100 | 0 | 0 | 2099.6 | 5367.5 | 6066.8 | 15.6 | No |
| 100 | 200 | 200 | 0 | 0 | 4111.3 | 11242.3 | 12452.9 | 15.6 | No |

**Capacidad máxima sostenible:** 10 peticiones simultáneas.

**Punto de quiebre:** 25 peticiones simultáneas.

En el escalón de 25 el sistema dejó de cumplir el criterio (p95 3041.4 ms > 3000 ms).

_Fuente: Elaboración propia (2026)._
