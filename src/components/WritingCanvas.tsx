import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import './WritingCanvas.css'

export type Point = { x: number; y: number; pressure: number }
export type Stroke = Point[]

export type WritingCanvasHandle = {
  clear: () => void
  hasInk: () => boolean
  toDataURL: () => string
  loadStrokes: (strokes: Stroke[]) => void
  getStrokes: () => Stroke[]
}

type WritingCanvasProps = {
  className?: string
  onStrokeStart?: () => void
}

export const WritingCanvas = forwardRef<WritingCanvasHandle, WritingCanvasProps>(
  function WritingCanvas({ className, onStrokeStart }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const strokesRef = useRef<Stroke[]>([])
    const drawingRef = useRef(false)
    const rafRef = useRef<number | null>(null)
    const [epoch, setEpoch] = useState(0)

    const paint = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      if (w < 1 || h < 1) return

      const nextW = Math.round(w * dpr)
      const nextH = Math.round(h * dpr)
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW
        canvas.height = nextH
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#2c3540'

      for (const stroke of strokesRef.current) {
        if (stroke.length === 1) {
          const p = stroke[0]
          ctx.beginPath()
          ctx.fillStyle = '#2c3540'
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
          ctx.fill()
          continue
        }
        if (stroke.length < 2) continue
        ctx.beginPath()
        ctx.moveTo(stroke[0].x, stroke[0].y)
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineWidth = 2.2 + stroke[i].pressure * 2.4
          ctx.lineTo(stroke[i].x, stroke[i].y)
        }
        ctx.stroke()
      }
    }

    const schedulePaint = () => {
      if (rafRef.current != null) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        paint()
      })
    }

    useEffect(() => {
      paint()
      const onResize = () => paint()
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('resize', onResize)
        if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [epoch])

    useImperativeHandle(ref, () => ({
      clear: () => {
        strokesRef.current = []
        setEpoch((n) => n + 1)
      },
      hasInk: () => strokesRef.current.some((s) => s.length > 0),
      getStrokes: () => strokesRef.current.map((s) => s.map((p) => ({ ...p }))),
      loadStrokes: (strokes: Stroke[]) => {
        strokesRef.current = strokes.map((s) => s.map((p) => ({ ...p })))
        setEpoch((n) => n + 1)
      },
      toDataURL: () => {
        const canvas = canvasRef.current
        if (!canvas) return ''
        paint()
        return canvas.toDataURL('image/png')
      },
    }))

    const posFromEvent = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const rect = e.currentTarget.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      }
    }

    return (
      <canvas
        ref={canvasRef}
        className={`writing-canvas${className ? ` ${className}` : ''}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drawingRef.current = true
          onStrokeStart?.()
          strokesRef.current = [...strokesRef.current, [posFromEvent(e)]]
          schedulePaint()
        }}
        onPointerMove={(e) => {
          if (!drawingRef.current) return
          const strokes = strokesRef.current
          const current = strokes[strokes.length - 1]
          if (!current) return
          current.push(posFromEvent(e))
          schedulePaint()
        }}
        onPointerUp={() => {
          drawingRef.current = false
        }}
        onPointerCancel={() => {
          drawingRef.current = false
        }}
      />
    )
  },
)
