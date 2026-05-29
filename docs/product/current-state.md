# Almacen - Estado actual del frontend

Fecha de actualizacion: 2026-05-16

## Estado general

`frontend-alamcen` ya no se mantiene solo como demo base.

## Objetivo del corte actual

- montar el primer slice real del producto sobre auth SaaS
- validar scanner y panel mínimos contra backend
- dejar una base reutilizable para seguir clonando `LaClaudia`

## Base actual disponible

La estructura actual ya separa:

- `src/app`
- `src/features/alamcen`
- `src/shared`
- `src/styles`

## Capacidades reales del corte actual

- login con usuario del SaaS
- acceso rapido `Ramon` para entrar al tenant operativo de almacen
- validación de acceso al módulo `alamcen`
- scanner con lookup por barcode
- alta manual por barcode no encontrado
- edición de producto
- confirmación real de venta
- panel básico con pagos, métricas, movimientos y ranking
- búsqueda simple de productos por nombre

## Regla tecnica del corte

El frontend ya quedó acoplado al backend real del módulo, pero todavía está en etapa de sprint base.

## Nota operativa reciente

- la URL de la API sigue siendo configurable desde la propia app
- el checkout ya registra ventas reales en backend
- el panel ya consume datos reales del dashboard del módulo
- el tab `Productos` permite una consulta básica para edición rápida

- el scanner ya muestra el error real del backend o la API activa cuando falla el lookup por barcode

## Estado de instalacion

El frontend queda listo para instalarse como app web progresiva.
