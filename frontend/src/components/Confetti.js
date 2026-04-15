'use client'
import { useEffect, useRef } from 'react'

// Pure canvas confetti — no library needed
export default function Confetti({ active }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const pieces = useRef([])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = [
      '#00ff88',
      '#00d4ff',
      '#ffd700',
      '#ff3388',
      '#ffffff',
      '#00ffcc',
    ]

    // Spawn confetti pieces
    pieces.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.3 - 50,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 8,
      opacity: 1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false

      pieces.current.forEach((p) => {
        if (p.opacity <= 0) return
        alive = true
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.12 // gravity
        p.rot += p.vrot
        if (p.y > canvas.height * 0.7) p.opacity -= 0.025

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })

      if (alive) animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  )
}
