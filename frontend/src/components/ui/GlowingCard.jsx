import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function GlowingCard({ children, className, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative group',
        className
      )}
      {...props}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30 rounded-lg blur opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
      <div className="relative bg-background border border-primary/20 rounded-lg p-6 group-hover:border-primary/50 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
        {children}
      </div>
    </motion.div>
  )
}
