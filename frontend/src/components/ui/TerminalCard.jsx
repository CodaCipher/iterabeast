import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function TerminalCard({ children, className, title = "ITERABEAST_CORE", onClose, showClock = false, headerAction, ...props }) {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString())

  React.useEffect(() => {
    if (!showClock) return
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [showClock])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative bg-[#050505] overflow-hidden flex flex-col',
        className
      )}
      {...props}
    >
      {/* Decorative inner border matching NERV style */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 m-1" style={{ clipPath: 'polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }} />
      
      {/* Tactical Window Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-terminal-green/20 relative overflow-hidden shrink-0 select-none min-h-[32px]">
        {/* Background Scanline for Header */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-terminal-green/5 to-transparent -translate-x-full animate-[scan_4s_linear_infinite] pointer-events-none" />
        
        {/* Left: Path/Title Breadcrumbs */}
        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <div className="w-1.5 h-1.5 bg-terminal-green/50" />
          <div className="flex items-center text-[9px] font-mono tracking-widest text-terminal-green/60">
            <span className="opacity-50">ROOT</span>
            <span className="mx-1 opacity-30">/</span>
            <span className="opacity-50">SYSTEMS</span>
            <span className="mx-1 opacity-30">/</span>
            <span className="text-terminal-green font-bold bg-terminal-green/10 px-1 rounded-sm">{title}</span>
          </div>
        </div>

        {/* Right Group: Clock + Controls + Action */}
        <div className="flex items-center gap-4 relative z-10 shrink-0">
           {headerAction && (
             <div className="mr-2">
               {headerAction}
             </div>
           )}
           {showClock && (
             <div className="text-[9px] font-mono text-terminal-green/40 tracking-[0.2em] flex items-center gap-2 hidden sm:flex">
               <span>SYS_TIME</span>
               <span className="text-terminal-cyan/80 font-bold">{time}</span>
             </div>
           )}
           <div className="flex items-center gap-1">
              <button className="w-5 h-4 flex items-center justify-center border border-terminal-green/20 hover:bg-terminal-green/10 text-terminal-green/50 hover:text-terminal-green transition-colors group">
                <div className="w-2 h-[1px] bg-current" />
              </button>
              <button className="w-5 h-4 flex items-center justify-center border border-terminal-green/20 hover:bg-terminal-green/10 text-terminal-green/50 hover:text-terminal-green transition-colors group">
                <div className="w-2 h-2 border border-current" />
              </button>
              {onClose ? (
                <button 
                  onClick={onClose}
                  className="w-5 h-4 flex items-center justify-center border border-terminal-green/20 hover:bg-nerv-red/20 text-terminal-green/50 hover:text-nerv-red transition-colors group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              ) : (
                <div className="w-5 h-4 flex items-center justify-center border border-terminal-green/20 opacity-30 cursor-not-allowed">
                  <div className="w-2 h-2 bg-terminal-green/50 rounded-full" />
                </div>
              )}
           </div>
        </div>
      </div>
      
      {/* Terminal content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {children}
      </div>
      
      {/* Scanlines effect - Subtle */}
      <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-20">
        <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.1) 2px, rgba(0,255,0,0.1) 4px)' }}></div>
      </div>
    </motion.div>
  )
}

export function TerminalButton({ children, onClick, disabled = false, variant = 'primary', className, ...props }) {
  const variants = {
    primary: 'bg-terminal-green/10 border-terminal-green/50 text-terminal-green hover:bg-terminal-green/30 hover:border-terminal-green hover:shadow-[0_0_15px_rgba(0,255,0,0.3)]',
    secondary: 'bg-terminal-cyan/10 border-terminal-cyan/50 text-terminal-cyan hover:bg-terminal-cyan/30 hover:border-terminal-cyan hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]',
    danger: 'bg-nerv-red/10 border-nerv-red/50 text-nerv-red hover:bg-nerv-red/30 hover:border-nerv-red hover:shadow-[0_0_15px_rgba(255,0,0,0.3)]'
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
      className={cn(
        'relative px-5 py-2.5 border font-mono text-xs font-bold uppercase tracking-widest',
        'transition-all duration-300',
        'backdrop-blur-sm',
        variants[variant],
        disabled && 'opacity-50 cursor-not-allowed saturate-50',
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        <span className="w-1 h-1 bg-current animate-pulse" />
        {children}
      </span>
      {/* Interactive scanning line */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-scan-horizontal pointer-events-none" />
    </motion.button>
  )
}

export function TerminalInput({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2 bg-[#050505] border border-terminal-green/30 rounded-none',
        'text-terminal-green placeholder-terminal-green/50',
        'font-mono text-sm',
        'focus:outline-none focus:border-terminal-green focus:bg-[#0f0f0a]',
        'transition-all duration-200',
        '[color-scheme:dark]',
        className
      )}
      {...props}
    />
  )
}

export function TerminalSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full px-3 py-2 bg-[#050505] border border-terminal-green/30 rounded-none',
        'text-terminal-green',
        'font-mono text-sm',
        'focus:outline-none focus:border-terminal-green focus:bg-[#0f0f0a]',
        'transition-all duration-200',
        '[color-scheme:dark]',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function TerminalTextarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 bg-[#050505] border border-terminal-green/30 rounded-none resize-y min-h-[100px]',
        'text-terminal-green placeholder-terminal-green/50',
        'font-mono text-sm custom-scrollbar',
        'focus:outline-none focus:border-terminal-green focus:bg-[#0f0f0a]',
        'transition-all duration-200',
        '[color-scheme:dark]',
        className
      )}
      {...props}
    />
  )
}
