import React, { useEffect, useRef } from 'react'

export function MatrixRain({ theme = 'magi' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}<>?_"
    const matrixArray = matrix.split("")
    const fontSize = 10
    const columns = canvas.width / fontSize
    const drops = []

    for (let x = 0; x < columns; x++) {
      drops[x] = 1
    }

    // EVA-01 Colors
    const magiColor = '#0F0'
    const evaPrimary = '#a855f7' // Purple
    const evaSecondary = '#22c55e' // Green

    function draw() {
      // Background fade
      ctx.fillStyle = theme === 'eva-01' ? 'rgba(20, 5, 30, 0.05)' : 'rgba(0, 15, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = fontSize + 'px monospace'

      for (let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)]
        
        // Color selection
        if (theme === 'eva-01') {
            // Mostly purple, sometimes green for EVA feel
            ctx.fillStyle = Math.random() > 0.9 ? evaSecondary : evaPrimary
        } else {
            ctx.fillStyle = magiColor
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 35)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, [theme]) // Re-run when theme changes

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-20"
      style={{ zIndex: 1 }}
    />
  )
}
