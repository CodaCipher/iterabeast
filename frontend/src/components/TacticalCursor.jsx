import React, { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue } from 'framer-motion'

export function TacticalCursor() {
  // Use MotionValues for high-performance updates without re-renders
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Refs for direct DOM manipulation of coordinates
  const xCoordRef = useRef(null)
  const yCoordRef = useRef(null)
  
  const [isClicking, setIsClicking] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    // We remove the global * { cursor: none !important; } style here.
    // Let's use standard CSS or Tailwind classes on body or specific elements instead 
    // to avoid overriding cursors globally and causing huge default cursors to appear 
    // due to conflicting global styles or OS-level cursor settings on some machines.

    const handleMouseMove = (e) => {
      // Update motion values directly
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      
      // Update text content directly via refs to avoid re-renders
      if (xCoordRef.current) {
        xCoordRef.current.innerText = Math.round(e.clientX).toString().padStart(4, '0')
      }
      if (yCoordRef.current) {
        yCoordRef.current.innerText = Math.round(e.clientY).toString().padStart(4, '0')
      }
      
      // Check if hovering over interactive elements
      const target = e.target
      const isInteractive = target.tagName === 'BUTTON' || 
                           target.tagName === 'A' || 
                           target.tagName === 'INPUT' || 
                           target.tagName === 'SELECT' || 
                           target.tagName === 'TEXTAREA' ||
                           target.closest('button') || 
                           target.closest('.interactive')
                           
      setIsHovering(!!isInteractive)
    }

    const handleMouseDown = () => setIsClicking(true)
    const handleMouseUp = () => setIsClicking(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [mouseX, mouseY])

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 will-change-transform"
          style={{
            x: mouseX,
            y: mouseY
          }}
          transition={{
            type: "tween",
            ease: "linear",
            duration: 0
          }}
        >
          {/* Main Cursor Group */}
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            
            {/* Center Reticle (Precise) */}
            <motion.div 
              className={`relative flex items-center justify-center transition-all duration-200 ${isClicking ? 'scale-75' : ''} ${isHovering ? 'scale-125' : ''}`}
            >
              {/* Center Dot with White Core for visibility */}
              <div className={`w-2 h-2 rounded-full bg-nerv-orange shadow-[0_0_10px_hsl(var(--nerv-orange))] flex items-center justify-center ${isClicking ? 'bg-nerv-red shadow-[0_0_15px_hsl(var(--nerv-red))]' : ''} ${isHovering ? 'bg-terminal-cyan shadow-[0_0_15px_hsl(var(--nerv-cyan))]' : ''}`}>
                <div className="w-0.5 h-0.5 bg-white rounded-full" />
              </div>
              
              {/* Corner Brackets (Corners of the target box) */}
              <div className={`absolute w-6 h-6 border-2 border-nerv-orange transition-all duration-300 ${isHovering ? 'rotate-90 border-terminal-cyan w-8 h-8' : 'w-5 h-5 opacity-90'}`} 
                   style={{ 
                     clipPath: 'polygon(0 0, 30% 0, 30% 10%, 10% 10%, 10% 30%, 0 30%, 0 100%, 30% 100%, 30% 90%, 10% 90%, 10% 70%, 0 70%, 100% 70%, 90% 70%, 90% 90%, 70% 90%, 70% 100%, 100% 100%, 100% 30%, 70% 30%, 70% 10%, 90% 10%, 90% 0, 100% 0)' 
                   }}
              />
            </motion.div>

            {/* Coordinate Display (Offset slightly for visibility) */}
            <div className="absolute top-4 left-6 flex flex-col gap-0.5 text-[8px] font-mono text-nerv-orange pointer-events-none whitespace-nowrap">
              <div className="flex gap-2 bg-background/60 backdrop-blur-md px-1 border-l border-nerv-orange/30">
                <span className="w-2 opacity-70">X</span>
                <span ref={xCoordRef}>0000</span>
              </div>
              <div className="flex gap-2 bg-background/60 backdrop-blur-md px-1 border-l border-nerv-orange/30">
                <span className="w-2 opacity-70">Y</span>
                <span ref={yCoordRef}>0000</span>
              </div>
              {isHovering && (
                <motion.div 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-terminal-cyan font-bold tracking-widest mt-1"
                >
                  TARGET_LOCKED
                </motion.div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </>
  )
}
