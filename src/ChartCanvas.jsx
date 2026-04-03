import { useEffect, useRef } from 'react'

export default function ChartCanvas({ init }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !window.Chart) return
    const instance = init(ref.current)
    return () => instance?.destroy()
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 90 }}>
      <canvas ref={ref} />
    </div>
  )
}
