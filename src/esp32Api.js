/**
 * esp32Api.js
 * -----------
 * All calls go through Vite's dev-server proxy (/api → ESP32 IP).
 * In production build, set BASE_URL to your ESP32's full address,
 * e.g.  const BASE_URL = 'http://192.168.1.100'
 *
 * During development the vite.config.js proxy handles it so you
 * can just use /api as the prefix and avoid CORS headaches.
 */

const BASE_URL = '/api'

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

/** Toggle the relay. Returns 'ON' or 'OFF' */
export async function relaySwitch() {
  return get('/relaySwitch')
}

/** Measure water distance (cm). Returns numeric string */
export async function measureWaterDist() {
  return get('/measureWaterDist')
}

/** Measure temperature (°C). Returns numeric string */
export async function measureTemp() {
  return get('/measureTemp')
}

/** Set pump ON duration (seconds). Returns confirmation string */
export async function changeOnTime(val) {
  return get(`/changeOnTime?val=${encodeURIComponent(val)}`)
}

/** Set pump OFF duration (seconds). Returns confirmation string */
export async function changeOffTime(val) {
  return get(`/changeOffTime?val=${encodeURIComponent(val)}`)
}
