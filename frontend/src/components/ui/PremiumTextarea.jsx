import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function PremiumTextarea({ className, ...props }) {
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <motion.div
      className="relative"
      animate={{ scale: isFocused ? 1.01 : 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        'absolute -inset-0.5 rounded-lg blur opacity-0 transition duration-300',
        isFocused ? 'opacity-60 bg-gradient-to-r from-primary/30 to-accent/40' : ''
      )}></div>
      <textarea
        className={cn(
          'relative w-full px-4 py-3 rounded-lg resize-none',
          'bg-background border border-primary/20',
          'text-foreground placeholder-muted-foreground',
          'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
          'transition-all duration-300',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    </motion.div>
  )
}
