import { useState, useEffect, useRef } from 'react'
import ChartCanvas from './ChartCanvas.jsx'
import Toast from './Toast.jsx'
import * as api from './esp32Api.js'

// ── Helpers ──────────────────────────────────────────────────────────────────
function rnd(base, amp, n) {
  return Array.from({ length: n }, (_, i) =>
    +(base + (Math.sin(i * 0.7) + Math.random() - 0.5) * amp).toFixed(2)
  )
}
function hrs(n) {
  const a = [], now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * 3_600_000)
    a.push(d.getHours() + ':00')
  }
  return a
}

// ── Static pill data ──────────────────────────────────────────────────────────
const PILL_DEFS = [
  { key: 'airTemp',   label: 'Air Temp',   unit: '°C',  bg: '#f4c87a', color: '#4a2800' },
  { key: 'waterDist', label: 'Water Dist', unit: 'cm',  bg: '#7ac8f4', color: '#00293a' },
  { key: 'tds',       label: 'TDS',        unit: 'ppm', bg: '#a8e87a', color: '#1a3a00' },
  { key: 'ph',        label: 'pH Level',   unit: 'pH',  bg: '#c87af4', color: '#2a0040' },
  { key: 'hum',       label: 'Humidity',   unit: '%',   bg: '#f4a07a', color: '#3a1200' },
]

const SENSOR_DEFS = [
  { key: 'airTemp',   label: 'Air Temp',   unit: '°C',  accent: '#f4a030', status: 'ok'   },
  { key: 'waterDist', label: 'Water Dist', unit: 'cm',  accent: '#4ab0f0', status: 'ok'   },
  { key: 'tds',       label: 'TDS',        unit: 'ppm', accent: '#70c840', status: 'ok'   },
  { key: 'ph',        label: 'pH Level',   unit: '',    accent: '#a050e0', status: 'ok'   },
  { key: 'ec',        label: 'EC',         unit: 'mS',  accent: '#f07050', status: 'warn' },
  { key: 'light',     label: 'Light',      unit: 'lux', accent: '#f0c030', status: 'ok'   },
]

const DEFAULT_READINGS = {
  airTemp: '24.2', waterDist: '—', tds: '840',
  ph: '6.2', ec: '1.68', light: '820', hum: '65',
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
const mkOpts = (ymin, ymax, gc, tc) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index', intersect: false,
      backgroundColor: 'rgba(20,20,20,0.8)',
      titleColor: '#fff', bodyColor: '#ddd',
      borderColor: 'rgba(150,150,150,0.3)', borderWidth: 1,
    },
  },
  scales: {
    x: { grid: { color: gc }, ticks: { color: tc, font: { size: 9 }, maxTicksLimit: 5 } },
    y: { min: ymin, max: ymax, grid: { color: gc }, ticks: { color: tc, font: { size: 9 } } },
  },
})

// ── Shared styles ─────────────────────────────────────────────────────────────
const panelTitleStyle = {
  fontFamily: "'Georgia',serif", fontSize: 17, fontStyle: 'italic',
  color: '#1a3a08', fontWeight: 600, paddingBottom: 10,
  borderBottom: '1.5px solid rgba(0,0,0,0.12)', marginBottom: 14,
}
const thStyle = {
  textAlign: 'left', padding: '9px 10px', fontSize: 11,
  letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 700,
  color: '#2a5a08', borderBottom: '2px solid rgba(0,0,0,0.13)',
}
const tdStyle = {
  padding: '12px 10px', color: '#1a2a0a',
  verticalAlign: 'middle', fontSize: 14, fontWeight: 500,
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function App() {
  const [clock, setClock]         = useState('--:--:--')
  const [readings, setReadings]   = useState(DEFAULT_READINGS)
  const [relay, setRelay]         = useState('OFF')   // 'ON' | 'OFF'
  const [onTime, setOnTime]       = useState('30')
  const [offTime, setOffTime]     = useState('30')
  const [loading, setLoading]     = useState({})      // { key: true } per action
  const [toast, setToast]         = useState('')

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setClock(
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── API call wrapper ───────────────────────────────────────────────────────
  const call = async (key, fn, onSuccess) => {
    setLoading(l => ({ ...l, [key]: true }))
    try {
      const result = await fn()
      onSuccess(result)
    } catch (e) {
      showToast(`⚠ ${key} failed: ${e.message}`)
    } finally {
      setLoading(l => ({ ...l, [key]: false }))
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRelay = () =>
    call('relay', api.relaySwitch, (res) => {
      const state = res.trim()
      setRelay(state)
      showToast(`Relay is now ${state}`)
    })

  const handleWaterDist = () =>
    call('waterDist', api.measureWaterDist, (res) => {
      const val = parseFloat(res).toFixed(1)
      const displayVal = 24.5-val
      setReadings(r => ({ ...r, waterDist: displayVal }))
      showToast(`Water distance updated: ${displayVal} cm`)
    })

  const handleTemp = () =>
    call('temp', api.measureTemp, (res) => {
      const val = parseFloat(res).toFixed(1)
      setReadings(r => ({ ...r, airTemp: val }))
      showToast(`Temperature refreshed: ${val} °C`)
    })

  const handleOnTime = () =>
    call('onTime', () => api.changeOnTime(onTime), (res) => {
      showToast(res.trim())
    })

  const handleOffTime = () =>
    call('offTime', () => api.changeOffTime(offTime), (res) => {
      showToast(res.trim())
    })

  // ── Chart inits ────────────────────────────────────────────────────────────
  const initTemp = (canvas) => new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: hrs(13),
      datasets: [
        { label: 'Air',   data: rnd(24, 1.2, 13),  borderColor: '#d4882a', backgroundColor: 'rgba(212,136,42,0.12)', tension: 0.4, pointRadius: 0, borderWidth: 2,   fill: true },
        { label: 'Water', data: rnd(19.8, 0.6, 13), borderColor: '#a06820', backgroundColor: 'rgba(160,104,32,0.07)', tension: 0.4, pointRadius: 0, borderWidth: 1.5, fill: true },
      ],
    },
    options: {
      ...mkOpts(15, 28, 'rgba(200,140,50,0.15)', '#b08040'),
      plugins: {
        legend: { display: true, labels: { color: '#a06030', boxWidth: 8, font: { size: 10 } } },
        tooltip: { mode: 'index', intersect: false },
      },
    },
  })

  const initTds = (canvas) => new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: hrs(13),
      datasets: [
        { label: 'TDS', data: rnd(840, 25, 13), borderColor: '#2878b0', backgroundColor: 'rgba(40,120,176,0.1)',  tension: 0.4, pointRadius: 0, borderWidth: 2,   fill: true },
        { label: 'pH',  data: rnd(620, 18, 13), borderColor: '#1050a0', backgroundColor: 'rgba(16,80,160,0.05)', tension: 0.4, pointRadius: 0, borderWidth: 1.5, fill: true },
      ],
    },
    options: mkOpts(500, 950, 'rgba(40,120,176,0.12)', '#507090'),
  })

  const initHum = (canvas) => new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: hrs(8),
      datasets: [{ label: 'Humidity', data: rnd(65, 5, 8), backgroundColor: 'rgba(150,60,220,0.3)', borderColor: 'rgba(150,60,220,0.7)', borderWidth: 1.5, borderRadius: 4 }],
    },
    options: mkOpts(40, 90, 'rgba(150,60,220,0.1)', '#9060b0'),
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Hind',sans-serif", background: '#1c3a18', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Topbar ── */}
      <div style={{ background: '#2d6e22', padding: '14px 28px 10px', borderBottom: '2px solid rgba(100,200,80,0.25)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Georgia',serif", fontSize: 30, color: '#e2ffc8', letterSpacing: 1, fontStyle: 'italic', margin: 0 }}>Gaia</h1>
          <p style={{ fontSize: 11, color: 'rgba(210,255,160,0.65)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>The Earth's Friend</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(200,255,150,0.7)' }}>
          <div className="gaia-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#7ed640' }} />
          Systems Online
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 150, flexShrink: 0, background: 'rgba(20,55,12,0.7)', padding: '20px 0', borderRight: '1px solid rgba(100,180,60,0.15)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(190,250,130,0.7)', padding: '6px 18px 10px', letterSpacing: 1, textTransform: 'uppercase' }}>Analytics</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13, color: '#c8f090', fontWeight: 500, background: 'rgba(110,190,50,0.18)', borderLeft: '3px solid #7ed640' }}>
            ● Dashboard
          </div>
        </div>

        {/* ── Main ── */}
        <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Stat pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {PILL_DEFS.map(({ key, label, unit, bg, color }) => (
              <div key={key} className="stat-pill" style={{ background: bg, color, borderRadius: 12, padding: '13px 14px', display: 'grid', gridTemplateRows: 'auto auto', gap: 4, cursor: 'default' }}>
                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.55, whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 24, lineHeight: 1, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{readings[key] ?? '—'}</span>
                  <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 500, opacity: 0.5, alignSelf: 'flex-end', marginBottom: 1 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Lower row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: 14, flex: 1 }}>

            {/* ── Left panel ── */}
            <div style={{ background: '#9ed152', borderRadius: 14, border: '1px solid #c8e890', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Water Level */}
              <div style={panelTitleStyle}>Water Level</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#1a3a08', fontWeight: 600 }}>
                  <span>Reservoir A</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>78%</span>
                </div>
                <div style={{ height: 14, background: 'rgba(255,255,255,0.45)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ width: '78%', height: '100%', borderRadius: 8, background: '#2a7a2a', transition: 'width 1.2s ease' }} />
                </div>
              </div>

              {/* Sensor Readings */}
              <div style={panelTitleStyle}>Sensor Readings</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, flex: 1 }}>
                <thead>
                  <tr>
                    {['Sensor', 'Value', 'Status'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SENSOR_DEFS.map(({ key, label, unit, accent, status }, i) => (
                    <tr key={key} className="sensor-row">
                      <td style={{ ...tdStyle, borderBottom: i === SENSOR_DEFS.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.08)', borderLeft: `3px solid ${accent}`, paddingLeft: 12 }}>{label}</td>
                      <td style={{ ...tdStyle, borderBottom: i === SENSOR_DEFS.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
                        {readings[key] ?? '—'} {unit}
                      </td>
                      <td style={{ ...tdStyle, borderBottom: i === SENSOR_DEFS.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: status === 'ok' ? '#1a6a1a' : '#8a4000' }}>
                          {status === 'ok' ? 'Good' : 'Check'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ── Controls section ── */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1.5px solid rgba(0,0,0,0.12)' }}>
                <div style={{ ...panelTitleStyle, marginBottom: 12, fontSize: 15, borderBottom: 'none', paddingBottom: 0 }}>Controls</div>

                {/* Row 1: Relay + Read Temp + Read Water Dist */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button
                    className="ctrl-btn"
                    onClick={handleRelay}
                    disabled={loading.relay}
                    style={{ background: relay === 'ON' ? '#2a8a2a' : '#c84040', color: '#fff', flex: 1 }}
                  >
                    {loading.relay ? '…' : `Relay ${relay === 'ON' ? '● ON' : '○ OFF'}`}
                  </button>

                  <button
                    className="ctrl-btn"
                    onClick={handleTemp}
                    disabled={loading.temp}
                    style={{ background: '#d4882a', color: '#fff', flex: 1 }}
                  >
                    {loading.temp ? '…' : '🌡 Read Temp'}
                  </button>

                  <button
                    className="ctrl-btn"
                    onClick={handleWaterDist}
                    disabled={loading.waterDist}
                    style={{ background: '#2878b0', color: '#fff', flex: 1 }}
                  >
                    {loading.waterDist ? '…' : '📏 Water Dist'}
                  </button>
                </div>

                {/* Row 2: On Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2a5a08', whiteSpace: 'nowrap', flex: 1 }}>Pump ON (s)</span>
                  <input
                    type="number"
                    className="ctrl-input"
                    value={onTime}
                    min="1"
                    onChange={e => setOnTime(e.target.value)}
                  />
                  <button
                    className="ctrl-btn"
                    onClick={handleOnTime}
                    disabled={loading.onTime}
                    style={{ background: '#3a8a3a', color: '#fff' }}
                  >
                    {loading.onTime ? '…' : 'Set'}
                  </button>
                </div>

                {/* Row 3: Off Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2a5a08', whiteSpace: 'nowrap', flex: 1 }}>Pump OFF (s)</span>
                  <input
                    type="number"
                    className="ctrl-input"
                    value={offTime}
                    min="1"
                    onChange={e => setOffTime(e.target.value)}
                  />
                  <button
                    className="ctrl-btn"
                    onClick={handleOffTime}
                    disabled={loading.offTime}
                    style={{ background: '#3a8a3a', color: '#fff' }}
                  >
                    {loading.offTime ? '…' : 'Set'}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <div className="gaia-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#3aaa3a' }} />
                <span style={{ fontSize: 12, color: '#2a5a0a', fontWeight: 500 }}>All sensors live</span>
                <span style={{ fontSize: 12, color: '#2a5a0a', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{clock}</span>
              </div>
            </div>

            {/* ── Right charts ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ borderRadius: 14, padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', background: '#fff7e8', border: '1px solid #f0d090' }}>
                <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2, color: '#a06020' }}>Live — 12h</div>
                <div style={{ fontFamily: "'Georgia',serif", fontSize: 14, fontStyle: 'italic', marginBottom: 10, color: '#5a3010' }}>Temperature</div>
                <ChartCanvas init={initTemp} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
                <div style={{ borderRadius: 14, padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', background: '#f0f8ff', border: '1px solid #90c8f0' }}>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2, color: '#206090' }}>Chemistry</div>
                  <div style={{ fontFamily: "'Georgia',serif", fontSize: 14, fontStyle: 'italic', marginBottom: 10, color: '#103050' }}>TDS &amp; pH</div>
                  <ChartCanvas init={initTds} />
                </div>
                <div style={{ borderRadius: 14, padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', background: '#f8f0ff', border: '1px solid #c890f0' }}>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2, color: '#602090' }}>Environment</div>
                  <div style={{ fontFamily: "'Georgia',serif", fontSize: 14, fontStyle: 'italic', marginBottom: 10, color: '#300850' }}>Humidity</div>
                  <ChartCanvas init={initHum} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  )
}
