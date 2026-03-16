import React from 'react'
import { motion } from 'framer-motion'

export function AnimatedProgressBar({ percentage, isComplete }) {
  return (
    <div className="space-y-4">
      <div className="relative h-3 bg-background border border-primary/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-accent to-primary"
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      <div className="flex justify-between items-center">
        <motion.div
          className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.5 }}
        >
          {Math.round(percentage)}%
        </motion.div>

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-2xl"
          >
            ✨
          </motion.div>
        )}
      </div>
    </div>
  )
}
