# frontend-alamcen

Frontend del producto `alamcen` dentro de `SaasPro`.

## Estado actual

- demo base del modulo
- persistencia local
- sin integracion formal con backend todavia
- estructura inicial lista para discovery

## Regla importante de este corte

`alamcen` sigue como cascaron inicial de producto.

La prioridad hoy es:

- ordenar el frontend base
- validar direccion funcional minima
- no acoplarse todavia a backend real

## Conexion desde otros dispositivos

La app ahora permite configurar la URL base de la API desde la propia interfaz.

Casos practicos:

- si la abres por LAN en `http://<ip-local>:5173`, intenta usar `http://<ip-local>:3000/api/v1`
- si la abres desde GitHub Pages, necesitas un backend publicado por `https`
- si el backend esta en otra URL, puedes pegarla y probar la conexion dentro de la app

## Documentacion

- arquitectura general del SaaS: `backend/docs`
- documentacion propia del modulo: `frontend-alamcen/docs`
