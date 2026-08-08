# Resultados de las pruebas de rendimiento

**Sistema:** Gori Chicken · **Servidor:** http://localhost:3000
**Fecha:** 25/7/2026, 11:15:21 p. m.

## Tabla 1. Tiempo de respuesta de los endpoints críticos

| Petición | Muestras | Mínimo (ms) | Media (ms) | p95 (ms) | Máximo (ms) |
|---|---|---|---|---|---|
| Inicio de sesión | 30 | 58.6 | 60.2 | 63 | 63 |
| Consultar menú/disponibilidad | 30 | 13.6 | 15.5 | 18 | 18.1 |
| Listar pedidos activos (KDS) | 30 | 8.3 | 9.3 | 10.4 | 12.2 |

## Tabla 2. Prueba de carga

| Métrica | Valor |
|---|---|
| Pedidos simultáneos | 50 |
| Pedidos procesados con éxito | 50 |
| Pedidos fallidos | 0 |
| Tasa de error | 0 % |
| Tiempo total | 2804.2 ms |
| Rendimiento | 17.8 pedidos/s |
| Latencia media | 1607.6 ms |
| Latencia p95 | 2712.4 ms |
| Latencia máxima | 2797.1 ms |

## Tabla 3. Verificación de integridad y seguridad

| Prueba | Criterio esperado | Resultado | Cumple |
|---|---|---|---|
| Idempotencia offline | 5 reenvíos → 1 solo pedido | 1 pedido(s) en BD | ✔ |
| Integridad de inventario | Ningún insumo con stock negativo | 0 insumos negativos | ✔ |
| Descuento por receta | Se descuenta al confirmar el pedido | 8 insumos descontados | ✔ |
| Aislamiento de sucursales | Sucursal 1 no ve pedidos de Sucursal 2 | No los ve | ✔ |
| Control de roles | Cajero no accede a rutas de Gerente | HTTP 403 | ✔ |

_Fuente: Elaboración propia (2026)._
