import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function AnimatedButton({ children, className, disabled, ...props }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'relative px-6 py-3 font-semibold text-sm rounded-lg overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300',
        'bg-gradient-to-r from-primary via-accent to-primary bg-size-200 bg-pos-0 hover:bg-pos-100',
        'border border-primary/50 hover:border-primary',
        'text-primary-foreground',
        'shadow-lg shadow-primary/20 hover:shadow-primary/40',
        className
      )}
      disabled={disabled}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.button>
  )
}
