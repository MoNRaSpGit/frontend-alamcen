# frontend-alamcen

Frontend del producto `almacen` dentro de `SaasPro`.

## Estado actual

- auth SaaS real
- sesión persistida con refresh token
- integración formal con backend `alamcen`
- scanner operativo con registro real de ventas
- panel básico con pagos, movimientos y ranking
- consulta básica de productos por nombre

## Regla importante de este corte

`alamcen` ya no es solo un cascarón visual.

La prioridad de este corte es:

- sostener un slice vertical mínimo real
- validar el flujo `login -> caja -> venta -> pago -> dashboard`
- seguir clonando comportamiento de `LaClaudia` sobre el core SaaS

## Conexion desde otros dispositivos

La app ahora permite configurar la URL base de la API desde la propia interfaz.

Casos practicos:

- si la abres por LAN en `http://<ip-local>:5173`, intenta usar `http://<ip-local>:3000/api/v1`
- si la abres desde GitHub Pages, necesitas un backend publicado por `https`
- si el backend esta en otra URL, puedes pegarla y probar la conexion dentro de la app

## PWA

`frontend-alamcen` ahora queda preparado como `PWA`:

- manifest web
- service worker con actualizacion automatica
- instalable en celular, tablet o desktop
- iconos construidos a partir de `almacen.png`

## Documentacion

- arquitectura general del SaaS: `backend/docs`
- documentacion propia del modulo: `frontend-alamcen/docs`
