# Alamcen - Estado actual del frontend

Fecha de actualizacion: 2026-05-16

## Estado general

`frontend-alamcen` hoy se mantiene como demo base del modulo.

## Objetivo del corte actual

- arrancar rapido con un frontend separado
- tener una demo usable para discovery
- no acoplarse todavia a backend real

## Base actual disponible

La estructura actual ya separa:

- `src/app`
- `src/features/alamcen`
- `src/shared`
- `src/styles`

## Regla tecnica del corte

El frontend sirve como base inicial para ordenar la experiencia del producto antes de cerrar integracion formal.

## Nota operativa reciente

El flujo de escaneo ya diferencia mejor entre:

- producto no encontrado
- error real de conexion con backend

Ademas, la URL de la API puede configurarse desde la propia app para uso desde otros dispositivos.
