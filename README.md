# 13×13

Visor de rangos preflop de póker para 6-max 100bb: aperturas (RFI), defensa contra RFI y respuesta ante 3-bet.

Es un sitio estático (HTML + CSS + JS, sin build).

## Desarrollo local

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python3 -m http.server
```

Con Docker:

```bash
docker build -t poker .
docker run --rm -p 8080:80 poker
```

## Estructura

- `index.html`, `styles.css`, `app.js`: la interfaz.
- `ranges.js`: los datos de los rangos.
- `resource/`: capturas originales de las tablas (no se incluyen en la imagen).

## Deploy

Se despliega en la VPS con Komodo como Stack desde este repo (`docker-compose.yaml`), detrás de Traefik:

- La imagen es `nginx:alpine` con solo los 4 archivos del sitio.
- El Stack necesita la variable `DOMAIN` y queda en `https://poker.<DOMAIN>`.
- Un webhook de GitHub vuelve a desplegar en cada push a `master`.
