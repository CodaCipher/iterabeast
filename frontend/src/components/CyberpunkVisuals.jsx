import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export function CircuitBoard() {
  return (
    <svg className="w-full h-full absolute inset-0 pointer-events-none opacity-20" viewBox="0 0 1000 1000">
      <defs>
        <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--terminal-cyan))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--nerv-orange))" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Simple grid lines */}
      {[200, 500, 800].map((y, i) => (
        <line key={`h-${i}`} x1="0" y1={y} x2="1000" y2={y} stroke="url(#circuitGradient)" strokeWidth="1" />
      ))}

      {[200, 500, 800].map((x, i) => (
        <line key={`v-${i}`} x1={x} y1="0" x2={x} y2="1000" stroke="url(#circuitGradient)" strokeWidth="1" />
      ))}

      {/* Simple nodes at intersections */}
      {[200, 500, 800].map((x, i) => 
        [200, 500, 800].map((y, j) => (
          <circle key={`node-${i}-${j}`} cx={x} cy={y} r="3" fill="hsl(var(--terminal-cyan))" opacity="0.4" />
        ))
      )}

      {/* Single animated pulse */}
      <motion.circle
        cx="500"
        cy="500"
        r="4"
        fill="hsl(var(--nerv-orange))"
        animate={{
          r: [4, 12, 4],
          opacity: [0.8, 0.2, 0.8]
        }}
        transition={{
          duration: 3,
          repeat: Infinity
        }}
      />
    </svg>
  )
}

export function GlitchEffect({ children }) {
  return (
    <div className="relative">
      {/* Original content */}
      <div className="relative z-10">{children}</div>

      {/* Glitch layers */}
      <motion.div
        className="absolute inset-0 z-0 text-terminal-cyan opacity-0"
        animate={{
          opacity: [0, 0.3, 0],
          x: [-2, 2, -2],
          y: [1, -1, 1]
        }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          repeatDelay: 3
        }}
      >
        {children}
      </motion.div>

      <motion.div
        className="absolute inset-0 z-0 text-nerv-red opacity-0"
        animate={{
          opacity: [0, 0.2, 0],
          x: [2, -2, 2],
          y: [-1, 1, -1]
        }}
        transition={{
          duration: 0.3,
          delay: 0.1,
          repeat: Infinity,
          repeatDelay: 3
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export function Scanlines() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <svg className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id="scanlines" x="0" y="0" width="100%" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(0,255,0,0.03)" strokeWidth="2" />
            <line x1="0" y1="2" x2="100%" y2="2" stroke="rgba(0,255,0,0.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#scanlines)" />
      </svg>
    </div>
  )
}

export function HolographicText({ children, className = '' }) {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        textShadow: [
          '0 0 10px hsl(var(--nerv-orange)), 0 0 20px hsl(var(--nerv-orange))',
          '0 0 20px hsl(var(--terminal-cyan)), 0 0 40px hsl(var(--terminal-cyan))',
          '0 0 10px hsl(var(--nerv-orange)), 0 0 20px hsl(var(--nerv-orange))'
        ]
      }}
      transition={{
        duration: 3,
        repeat: Infinity
      }}
    >
      {children}
    </motion.div>
  )
}

export function DataStream() {
  const characters = '01'

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(10)].map((_, col) => (
        <div key={col} className="absolute top-0 text-terminal-green/20 font-mono text-xs" style={{ left: `${5 + col * 10}%` }}>
          {[...Array(30)].map((_, row) => {
            const randomChar = characters[Math.floor(Math.random() * characters.length)]
            const randomDuration = 6 + Math.random() * 6
            const randomDelay = Math.random() * 10
            
            return (
              <motion.div
                key={`${col}-${row}-${randomChar}`}
                style={{ 
                  position: 'absolute',
                  top: `${row * 20}px`,
                  left: 0
                }}
                animate={{ 
                  y: [-1000, 1000],
                  opacity: [0, 1, 1, 0]
                }}
                transition={{
                  duration: randomDuration,
                  delay: randomDelay,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 5,
                  ease: "linear"
                }}
                className="leading-5"
              >
                {randomChar}
              </motion.div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function NeonBorder({ children, color = 'terminal-green' }) {
  // Using clip-path for the chamfered/cut-corner Evangelion look
  return (
    <div className="relative group">
      {/* Decorative corner brackets */}
      <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-${color} opacity-70 group-hover:opacity-100 transition-opacity z-10`} />
      <div className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-${color} opacity-70 group-hover:opacity-100 transition-opacity z-10`} />
      <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-${color} opacity-70 group-hover:opacity-100 transition-opacity z-10`} />
      <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-${color} opacity-70 group-hover:opacity-100 transition-opacity z-10`} />
      
      <motion.div
        className={`relative border border-${color}/40 bg-black/60`}
        style={{
          clipPath: 'polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)'
        }}
        animate={{
          boxShadow: [
            `0 0 10px hsl(var(--${color})), inset 0 0 10px hsl(var(--${color})) / 0.1)`,
            `0 0 20px hsl(var(--${color})), inset 0 0 20px hsl(var(--${color})) / 0.2)`,
            `0 0 10px hsl(var(--${color})), inset 0 0 10px hsl(var(--${color})) / 0.1)`
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      >
        <div className={`absolute top-0 right-0 w-8 h-8 bg-${color}/10`} style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
        <div className={`absolute bottom-0 left-0 w-8 h-8 bg-${color}/10`} style={{ clipPath: 'polygon(0 100%, 100% 100%, 0 0)' }} />
        {children}
      </motion.div>
    </div>
  )
}
