# Prueba de estrés del sistema Gori Chicken: metodología, resultados y análisis

> Documento de redacción para el Marco Práctico. Las tablas completas y los
> datos crudos están en `pruebas/ESTRES.md`, `pruebas/estres-local.json` y
> `pruebas/estres-render.json`. Si se vuelven a ejecutar las pruebas, los
> números de este análisis deben actualizarse.

---

## 1. Objetivo y justificación

Las pruebas de carga documentadas previamente (`pruebas/RESULTADOS.md`) verifican
que el sistema **soporta** un nivel de demanda predefinido: 50 pedidos
simultáneos con 0 % de error. Esa prueba responde a la pregunta *"¿aguanta lo
que se espera de él?"*, pero deja sin responder *"¿hasta dónde aguanta?"*.

La prueba de estrés responde esa segunda pregunta. Somete al servidor a una
**rampa de carga creciente** hasta que deja de cumplir los criterios de servicio,
con dos fines:

1. Determinar la **capacidad máxima sostenible** del sistema, dato necesario para
   afirmar que el dimensionamiento es adecuado para el caso de estudio.
2. Identificar el **componente que limita** esa capacidad, para que la limitación
   quede documentada y no aparezca como una falla inexplicada.

## 2. Metodología

### 2.1 Instrumento

Se desarrolló el script `pruebas/pruebas-estres.mjs` (Node.js), que ejecuta la
rampa, mide cada petición individualmente y genera el informe de resultados. No
se empleó una herramienta externa (JMeter, k6) porque la prueba requiere
interactuar con la lógica de negocio del sistema —autenticación por rol,
reposición de inventario entre escalones y verificación posterior de la
integridad del stock—, lo que exige un cliente propio.

### 2.2 Criterios de aceptación

Los umbrales se fijaron **antes** de ejecutar la prueba. Definirlos después de
observar los resultados invalidaría la medición, ya que permitiría ajustarlos
hasta que el sistema "aprobara".

| Parámetro | Valor | Fundamento |
|---|---|---|
| Tasa de error máxima admitida | 1 % | En un punto de venta, una petición perdida es un pedido perdido |
| Latencia p95 máxima admitida | 3000 ms | Umbral de espera tolerable frente al cliente en caja |
| Tiempo límite por petición | 15 000 ms | Más allá, la petición se considera perdida |
| Corte anticipado de la rampa | error > 25 % | El sistema ya se quebró; continuar solo genera datos de prueba inútiles |

Un escalón **cumple** si respeta ambos umbrales simultáneamente. El primer
escalón que incumple alguno constituye el **punto de quiebre**; el último que
los cumple define la **capacidad máxima sostenible**.

### 2.3 Diseño de la rampa

Se aplicaron dos rampas independientes, porque el sistema tiene dos perfiles de
uso muy distintos:

- **Rampa de escritura:** creación concurrente de pedidos (`POST /api/pedidos`),
  que abre una transacción y descuenta inventario por receta. Es la operación
  crítica del sistema.
- **Rampa de lectura:** consulta del menú con disponibilidad y refresco de la
  pantalla de cocina (KDS). Es la operación más frecuente en volumen.

Niveles de concurrencia: 10 → 25 → 50 → 100 → 200 → 400 peticiones simultáneas,
con 3 segundos de enfriamiento entre escalones para no contaminar un escalón con
la cola del anterior.

### 2.4 Controles metodológicos

Tres decisiones de diseño evitan que la prueba mida algo distinto de lo que
pretende medir:

**a) Reposición del inventario antes de cada escalón.** Si el stock se agota
durante la rampa, los pedidos empiezan a ser rechazados por falta de materia
prima y no por saturación. El "punto de quiebre" mediría entonces el inventario
disponible, no el rendimiento. Por eso, antes de cada escalón se repone el stock
de los insumos de la receta del plato de prueba.

**b) Exclusión del arranque en frío.** El plan gratuito de Render suspende el
servicio tras un período de inactividad. La primera petición paga ese tiempo de
reanudación, que no representa el comportamiento del sistema en operación. Se
mide por separado y se excluye de la rampa.

**c) Clasificación de los fallos.** Una tasa de error agregada no es
interpretable: no es equivalente que el servidor falle (HTTP 5xx) a que rechace
una petición por una regla de negocio legítima (HTTP 4xx). Cada fallo se
clasifica en *error del servidor*, *rechazo de negocio*, *límite de peticiones* o
*red/tiempo agotado*.

### 2.5 Entornos

| Entorno | Descripción | Rampa aplicada |
|---|---|---|
| Local | Servidor Node.js y MySQL en la misma máquina | 10 → 400, escritura y lectura |
| Render | Despliegue en producción, plan gratuito, región Oregon, base MySQL externa | 10 → 100, solo lectura |

En el entorno de producción se ejecutó **únicamente la rampa de lectura**. La
rampa de escritura habría creado cientos de pedidos ficticios y alterado el
inventario real de las sucursales, corrompiendo los datos operativos y los
reportes del propio trabajo. Las operaciones de lectura no modifican estado, por
lo que pueden ejecutarse sobre producción sin consecuencias.

La base de datos local contenía 4 sucursales, 136 productos, 112 insumos y 255
pedidos al momento de la prueba.

## 3. Resultados

### 3.1 Entorno local — rampa de escritura

| Usuarios simultáneos | Éxitos | Fallos | Error (%) | Latencia media (ms) | p95 (ms) | Rendimiento (ped/s) | Cumple |
|---|---|---|---|---|---|---|---|
| 10 | 10 | 0 | 0 | 775.0 | 1286.7 | 7.8 | Sí |
| 25 | 25 | 0 | 0 | 1805.7 | 3233.7 | 7.3 | No |
| 50 | 40 | 10 | 20.0 | 2994.4 | 5228.4 | 7.4 | No |
| 100 | 61 | 39 | 39.0 | 4164.6 | 7248.6 | 7.8 | No |

**Capacidad máxima sostenible: 10 pedidos simultáneos. Punto de quiebre: 25.**

La rampa se detuvo en 100 por el criterio de corte anticipado (39 % > 25 %).

Naturaleza de los fallos: los 49 fallos registrados fueron **todos del mismo
tipo** —HTTP 500 con código Prisma `P2028`, *"Unable to start a transaction in
the given time"*— originados en la transacción de creación de pedido
(`backend/src/controladores/pedidoControlador.js`, línea 148). No se registró
ningún otro tipo de error.

### 3.2 Entorno local — rampa de lectura

| Usuarios simultáneos | Peticiones | Error (%) | Latencia media (ms) | p95 (ms) | Rendimiento (pet/s) | Cumple |
|---|---|---|---|---|---|---|
| 10 | 20 | 0 | 89.1 | 116.2 | 88.9 | Sí |
| 25 | 50 | 0 | 180.0 | 255.9 | 106.3 | Sí |
| 50 | 100 | 0 | 371.5 | 600.2 | 99.2 | Sí |
| 100 | 200 | 0 | 788.3 | 1211.1 | 92.3 | Sí |
| 200 | 400 | 0 | 1585.7 | 2522.4 | 91.2 | Sí |
| 400 | 800 | 0 | 2963.1 | 4478.6 | 102.0 | No |

**Capacidad máxima sostenible: 200 usuarios simultáneos. Punto de quiebre: 400.**

Debe notarse que incluso en el punto de quiebre la tasa de error fue **0 %**: el
sistema no perdió ninguna petición, solo dejó de responder dentro del umbral de
tiempo establecido.

### 3.3 Entorno de producción (Render) — rampa de lectura

Tiempo de reanudación del servicio suspendido: **42,3 segundos**.

| Usuarios simultáneos | Peticiones | Error (%) | Latencia media (ms) | p95 (ms) | Rendimiento (pet/s) | Cumple |
|---|---|---|---|---|---|---|
| 10 | 20 | 0 | 1098.4 | 1792.3 | 7.9 | Sí |
| 25 | 50 | 0 | 1471.1 | 3041.4 | 13.8 | No |
| 50 | 100 | 0 | 2099.6 | 5367.5 | 15.6 | No |
| 100 | 200 | 0 | 4111.3 | 11242.3 | 15.6 | No |

**Capacidad máxima sostenible: 10 usuarios simultáneos. Punto de quiebre: 25.**

Al igual que en local, la tasa de error se mantuvo en 0 % en todos los escalones.

### 3.4 Integridad del inventario bajo estrés

Tras someter al sistema a una carga que provocó un 39 % de fallos, se verificó el
estado de los 28 insumos de la sucursal de prueba:

| Verificación | Resultado |
|---|---|
| Insumos revisados | 28 |
| Insumos con stock negativo | 0 |
| Cumple | Sí |

## 4. Análisis

### 4.1 El factor limitante de la escritura es la serialización por sucursal

El dato más revelador de la rampa de escritura no es la latencia sino el
**rendimiento**: 7,8 → 7,3 → 7,4 → 7,8 pedidos por segundo. El valor permanece
**constante** mientras la concurrencia se multiplica por diez. Un sistema
limitado por CPU, memoria o volumen de datos mostraría un rendimiento creciente
antes de saturarse; un rendimiento plano desde el primer escalón indica que las
operaciones **no se están ejecutando en paralelo**.

La causa está en el diseño de la transacción de creación de pedido, que comienza
bloqueando la fila de la sucursal:

```sql
SELECT id FROM `Sucursal` WHERE id = ? FOR UPDATE
```

Este bloqueo es **deliberado**. Sin él, dos pedidos simultáneos leen el mismo
"último número de turno" y ambos se lo asignan, entregando al cliente un número
duplicado. El bloqueo garantiza que los turnos sean únicos y consecutivos, a
costa de que los pedidos de una misma sucursal se procesen **uno detrás de otro**.

De ahí se sigue el comportamiento observado: aumentar la concurrencia no aumenta
el rendimiento, solo alarga la cola de espera, hasta que las transacciones
encoladas agotan su tiempo límite y el servidor responde `P2028`. Los 49 fallos
no son errores aleatorios ni corrupción: son peticiones que esperaron su turno
más de lo permitido.

El resultado, por tanto, no describe una falla del sistema sino el **costo medido
de una garantía de correctitud**. El bloqueo es por sucursal, de modo que los
cuatro locales no compiten entre sí: la capacidad total del sistema es cuatro
veces la de una sucursal.

### 4.2 Suficiencia frente a la demanda real

Un rendimiento sostenido de aproximadamente 7,5 pedidos por segundo equivale a
**450 pedidos por minuto** o **27 000 pedidos por hora** en una sola sucursal.
Según los datos de demanda recogidos en el Marco Práctico, la sucursal de mayor
exigencia atiende de 3500 a 4200 comensales al mes, esto es, unos 160 comensales
diarios. Aun suponiendo que la totalidad de esa demanda diaria se concentrara en
una sola hora, el flujo sería de 0,04 pedidos por segundo: aproximadamente
**170 veces inferior** a la capacidad medida.

Del mismo modo, el punto de quiebre de 25 pedidos simultáneos corresponde a un
escenario en el que veinticinco terminales de la misma sucursal confirman un
pedido **en el mismo instante**. Gori Chicken opera con una caja y un tótem por
local. El margen entre la capacidad medida y la demanda real es, por
consiguiente, de aproximadamente dos órdenes de magnitud.

La rampa de lectura confirma el mismo holgado margen por el lado del consumo:
200 usuarios simultáneos consultando menú y pantalla de cocina, con latencia
media de 1,6 segundos y sin ninguna pérdida.

### 4.3 La infraestructura, no el software, limita el entorno de producción

Comparando ambos entornos en el mismo nivel de carga (10 usuarios simultáneos,
operaciones de lectura):

| Métrica | Local | Render (plan gratuito) | Factor |
|---|---|---|---|
| Latencia media | 89,1 ms | 1098,4 ms | 12,3 × |
| Rendimiento | 88,9 pet/s | 7,9 pet/s | 11,3 × |
| Capacidad máxima sostenible | 200 usuarios | 10 usuarios | 20 × |

Se trata del **mismo código** ejecutando las **mismas consultas**. La diferencia
proviene íntegramente del entorno de despliegue: recursos de cómputo compartidos
del plan gratuito, latencia de red hacia la región Oregon y base de datos MySQL
alojada en un servicio externo, lo que agrega una ida y vuelta de red a cada
consulta.

A esto se suman los **42,3 segundos de reanudación** del servicio suspendido. Es
la limitación más relevante en términos prácticos: no afecta el rendimiento bajo
carga, pero implica que el primer usuario del día espera más de medio minuto. El
sistema ya contempla este escenario mediante el bloqueo del tótem y el aviso al
cliente ante cortes prolongados, pero la medición cuantifica el costo.

La conclusión operativa es que la capacidad del sistema desplegado no está
determinada por su arquitectura sino por el nivel de servicio contratado, y que
migrar a un plan pago elevaría el rendimiento sin modificar una línea de código.

### 4.4 Degradación segura

El hallazgo más importante desde la perspectiva de la confiabilidad es el
comportamiento del sistema **una vez superado su límite**. Con un 39 % de las
peticiones fallando, ningún insumo quedó con stock negativo.

Esto significa que la transacción cumple su función: un pedido que no puede
completarse **no descuenta inventario parcialmente**. El sistema rechaza la
operación de forma explícita —devuelve un error que el cliente puede reintentar—
en lugar de aceptarla dejando la base de datos en un estado inconsistente. En
combinación con la idempotencia de la cola offline ya verificada, el pedido
rechazado puede reenviarse sin riesgo de duplicación.

Sobrepasar la capacidad del sistema, por lo tanto, degrada la **disponibilidad**
pero no la **integridad de los datos**.

## 5. Limitaciones de la prueba

Se declaran explícitamente para delimitar el alcance de las conclusiones:

1. **Valores absolutos dependientes del equipo.** Las cifras del entorno local
   corresponden a la máquina de desarrollo empleada y varían con su carga. Lo
   que resulta independiente del equipo es la **forma** de los resultados —el
   rendimiento plano de la escritura y su interpretación—, no las cifras exactas.
2. **Carga instantánea, no sostenida.** Cada escalón concentra la carga en un
   pico de pocos segundos. No se ejecutó una prueba de resistencia prolongada,
   por lo que no se evaluó la degradación por fugas de memoria o crecimiento de
   la base a lo largo del tiempo.
3. **Escritura no medida en producción.** Por la razón expuesta en 2.5, el punto
   de quiebre de escritura corresponde exclusivamente al entorno local. Cabe
   suponer que en Render sería menor.
4. **Perfil de carga homogéneo.** Todos los pedidos de la rampa de escritura
   solicitan el mismo plato desde el mismo usuario. No se simuló una mezcla
   realista de productos ni múltiples cajeros concurrentes.
5. **Una sola sucursal por corrida.** No se midió el efecto de carga simultánea
   sobre las cuatro sucursales, escenario en el que el bloqueo por sucursal
   debería permitir paralelismo real.

## 6. Conclusiones

1. El sistema soporta **10 pedidos simultáneos** por sucursal cumpliendo los
   criterios de servicio, y **200 usuarios simultáneos** en operaciones de
   consulta, en el entorno local.
2. El factor que limita la escritura es el bloqueo de fila que garantiza la
   unicidad del número de turno. Es una decisión de diseño consciente, y la
   prueba cuantifica su costo: aproximadamente 7,5 pedidos por segundo y por
   sucursal.
3. Ese límite excede la demanda real del caso de estudio en cerca de dos órdenes
   de magnitud, por lo que el dimensionamiento se considera adecuado.
4. La capacidad del entorno de producción está determinada por el plan gratuito
   de Render —hasta 20 veces menor que en local, con 42,3 segundos de
   reanudación— y no por la arquitectura del sistema.
5. Bajo condiciones de saturación el sistema degrada de forma segura: rechaza
   operaciones de manera explícita y preserva la integridad del inventario.

## 7. Trabajo futuro

Si se quisiera elevar el límite de escritura sin renunciar a la unicidad del
turno, la vía natural sería reemplazar el bloqueo pesimista de la fila de
sucursal por un contador atómico o una secuencia por sucursal y día, que
garantice la misma propiedad sin serializar la transacción completa. La presente
medición proporciona la línea base contra la cual evaluar esa optimización.

---

## Anexo: reproducción de la prueba

```bash
# Entorno local (rampa completa: escritura y lectura)
node pruebas/pruebas-estres.mjs

# Entorno de producción (solo lectura; no altera datos)
BASE=https://gori-chicken.onrender.com node pruebas/pruebas-estres.mjs

# Regenerar el informe sin volver a ejecutar las pruebas
node pruebas/pruebas-estres.mjs --solo-informe

# Eliminar los pedidos de prueba (vista previa y luego borrado)
node pruebas/limpiar-estres.mjs
node pruebas/limpiar-estres.mjs --borrar
```

Parámetros configurables por variable de entorno: `NIVELES`, `UMBRAL_ERROR`,
`UMBRAL_P95`, `CORTE_ERROR`, `TIMEOUT`, `ENFRIAMIENTO`, `ESCRITURA`, `ETIQUETA`.

_Fuente: Elaboración propia (2026)._
