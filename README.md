# Gaia Dashboard

React + Vite dashboard for the Gaia ESP32 hydroponics controller.

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## ESP32 Setup

1. Open `vite.config.js` and change the proxy target to your ESP32's IP:

```js
proxy: {
  '/api': {
    target: 'http://YOUR_ESP32_IP_HERE',  // ← change this
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
},
```

All API calls in `src/esp32Api.js` go through `/api` which Vite proxies to the
ESP32 during development, so you won't hit CORS issues.

## API Endpoints (ESP32)

| Button         | Endpoint                    | Response             |
|----------------|-----------------------------|----------------------|
| Relay toggle   | `GET /relaySwitch`          | `ON` or `OFF`        |
| Read temp      | `GET /measureTemp`          | e.g. `24.2`          |
| Water distance | `GET /measureWaterDist`     | e.g. `15.3` (cm)     |
| Set pump ON    | `GET /changeOnTime?val=30`  | confirmation string  |
| Set pump OFF   | `GET /changeOffTime?val=30` | confirmation string  |

## Production Build

```bash
npm run build
npm run preview
```

For production, update `BASE_URL` in `src/esp32Api.js` to the full ESP32 IP:

```js
const BASE_URL = 'http://192.168.1.100'  // your ESP32 IP
```

## Project Structure

```
gaia-dashboard/
├── index.html          # HTML entry, loads Chart.js CDN + Google Fonts
├── vite.config.js      # Vite config + dev proxy to ESP32
├── package.json
└── src/
    ├── main.jsx        # React root
    ├── App.jsx         # Main dashboard component with all controls
    ├── ChartCanvas.jsx # Chart.js wrapper component
    ├── Toast.jsx       # Toast notification component
    ├── esp32Api.js     # All ESP32 API calls in one place
    └── index.css       # Global styles, animations
```
