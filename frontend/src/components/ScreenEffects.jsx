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
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANYy0DAAAACHRSTlMAAAAAAAB/AAB+PZ4ZAAABEUlEQVQ4y+2UPQ7DMAiEHRnyl+u3X8tLhMhYqWJg8f8PRbGNVDF06hR5IAQ/YJkxxswxxsy/EWeM/fV2zBhj7X/njDF7TnfOGPvo2zFjzH10zjnjvN6OOeO8+nbMGOO13o4ZY7z22zFjzLvejjnjvOvtOGPMV2/HjDE+9XbMGONbb8eMMe71dswY47nfjjlj3PftmDHGfd+OGWPc9+2YMcZ9344ZY9z37Zgxxn3fjhlj3PftmDHGfd+OGWPc9+2YMcZ9344ZY9z37Zgxxn3fjhlj3PftmDHGfd+OGWPc9+2YMcZ9344ZY9z37Zgxxn3fjhlj3PftmDHGfd+OGWPc9+2YMcZ9344ZY9z37Zgxxn3fjvlLfwBi6wY9K5kH4gAAAABJRU5ErkJggg==")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '100px 100px',
          mixBlendMode: 'overlay'
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
