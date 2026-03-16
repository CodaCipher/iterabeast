import React from 'react'

export function ScreenEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9000] overflow-hidden">
      {/* 1. Vignette (Dark corners) */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* 2. Film Grain / Noise */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          filter: 'contrast(150%) brightness(100%)'
        }}
      />

      {/* 3. Subtle RGB Shift / Chromatic Aberration Simulation (CSS Mix Blend) 
         This is a lightweight fake effect using a gradient overlay 
      */}
      <div 
        className="absolute inset-0 mix-blend-overlay opacity-20"
        style={{
          background: 'linear-gradient(90deg, rgba(255,0,0,0.05), rgba(0,255,0,0.05), rgba(0,0,255,0.05))',
          backgroundSize: '3px 3px'
        }}
      />
    </div>
  )
}
