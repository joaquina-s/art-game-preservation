# revenant

**Una herramienta de preservación de _art games_.** Mantiene las obras web vivas,
autocontenidas y **latiendo** — en vez de congelar un cadáver en una caja.

🌊 **Demo en vivo:** <https://joaquina-s.github.io/art-game-preservation/>
_(funciona en modo demo, sin instalar nada; para preservar de verdad, corré el motor local — ver abajo)_

> No preservamos archivos. Preservamos memoria jugable.

revenant agarra un art game que vive en una URL, lo captura con todas sus
dependencias, lo **suelta de los servidores y CDNs que se mueren**, detecta de
qué está hecho y qué se va a pudrir primero, y sella todo en un **manifiesto con
un hash raíz: el latido**. El artista firma un **contrato de intención** (qué es
sagrado, qué puede cambiar), y el resultado es una _edición viva_: la obra que
vuelve a correr sola, su pasaporte, su contrato y su latido.

---

## Qué hace, en concreto

| Paso | Qué pasa |
|------|----------|
| **Captura** | Baja la obra y cada asset que carga (HTML, JS, WASM, shaders, audio, texturas, librerías de CDN). |
| **Suelta** | Reescribe las referencias externas a copias locales: la obra sobrevive a la muerte de sus CDNs. Una respuesta `403`/muerta **no** se guarda como si fuera el asset — se marca como _dependencia en riesgo_. |
| **Lee** | Detección **determinista** del stack: Three.js, Unity WebGL, p5.js, PixiJS, WebGL/WebGL2, Web Audio, Gamepad, WASM, tecnología muerta (Flash, applets)… + reporte de riesgo de obsolescencia. |
| **Pasaporte** | Registro estructurado (JSON + narrativa legible) que viaja con la obra. |
| **Contrato** | El artista define las _propiedades significativas_: el feel, el tempo, qué no se toca, hasta dónde puede reconstruir la IA. |
| **Sella** | SHA-256 de todo → hash raíz = el **latido**. Detecta _drift_ (si alguien toca un archivo, el latido cambia). Ese hash es lo que después anclás a una cadena para el _token-latido_. |

La **IA es opcional** y nunca genera la obra: si hay una `ANTHROPIC_API_KEY`,
Claude solo escribe la narrativa técnica más rica sobre los hechos deterministas.
Todo lo que se sella en el manifiesto es determinista e inspeccionable.

---

## Cómo correrlo (Windows / Mac / Linux)

Solo necesitás **Node.js 18 o más**. No hace falta `npm install` ni nada más:
el servidor usa únicamente módulos nativos de Node.

```bash
node server/server.js
```

Y abrís **http://localhost:5000**. Pegás la URL de tu obra, le ponés título y
artista, y apretás **"Traer al archivo"**.

> **En Windows (PowerShell):** abrí la carpeta del proyecto, hacé clic en la barra
> de dirección, escribí `powershell` y Enter. Después escribí `node server/server.js`.
> Dejá esa ventana abierta mientras usás la herramienta (es el motor corriendo).
> Para frenarlo: `Ctrl + C`.

Si `node` no te lo reconoce, instalá Node desde <https://nodejs.org> (versión LTS)
y abrí una ventana **nueva** de PowerShell.

### Captura profunda con navegador real (opcional)

La captura por defecto baja el HTML y sus assets sin ejecutar JavaScript. Para
obras que cargan todo en runtime (muchos juegos de engine), instalá Playwright:

```bash
npm install playwright
npx playwright install chromium
```

### IA opcional

```bash
# PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
node server/server.js
```

---

## Modo demo (sin instalar nada)

Abrí `web/index.html` directamente en el navegador, o publicá la carpeta en
**GitHub Pages**: la interfaz funciona en _modo demo_ con datos de ejemplo, ideal
para mostrar la experiencia sin levantar el motor. Los números reales salen
cuando corrés el servidor.

---

## Estructura

```
web/            la interfaz (HTML/CSS/JS, sin frameworks ni build)
  index.html
  styles.css
  app.js
server/         el motor (Node, cero dependencias de runtime)
  server.js     servidor HTTP + API
  pipeline.js   orquesta el descenso completo
  capture.js    captura + autocontención
  detect.js     detección determinista de stack + riesgo
  passport.js   pasaporte de preservación
  contract.js   contrato de intención
  manifest.js   hashing, latido y detección de drift
  ai.js         enriquecimiento opcional con Claude
editions/       las ediciones preservadas (se crean al usar la herramienta)
```

---

## Honestidad sobre el alcance

- **Funciona de verdad, hoy:** capturar y autocontener obras web, detectar el
  stack, marcar lo que se pudre, generar pasaporte y contrato, y sellar el latido
  con detección de drift.
- **Visión, no feature (R&D):** el agente que _juega_ la obra, aprende sus
  sistemas y **re-performa lo que murió** (jugadores de un multiplayer caído,
  datos generativos que ya no existen). La emulación no puede hacer esto ni en
  teoría; es el horizonte que el proyecto persigue.

---

## Por qué

Las herramientas que existen (Rhizome/EaaS, Webrecorder/WARC, Archivematica,
Preservica, BitCurator) preservan **el objeto**: capturar, emular, guardar. El
hueco libre es preservar **el comportamiento y la intención** — y que archivar se
sienta como un ritual de descenso y revival, no como llenar un formulario.

Hecho para [One More Sim](https://onemoresim.viennadigitalcultures.at) y para los
art games (como los de Sybil) que se van a pudrir solos.

## Licencia

MIT — ver [LICENSE](LICENSE).
