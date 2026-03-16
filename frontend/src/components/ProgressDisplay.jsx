import React from 'react'
import { motion } from 'framer-motion'
import { GlowingCard } from './ui/GlowingCard'
import { AnimatedProgressBar } from './ui/AnimatedProgressBar'

function ProgressDisplay({ progress }) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0
  const isComplete = progress.current === progress.total && progress.total > 0

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <GlowingCard>
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Progress</span>
            <motion.span
              className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              key={`${progress.current}-${progress.total}`}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              {progress.current}/{progress.total}
            </motion.span>
          </div>
          <AnimatedProgressBar percentage={percentage} isComplete={isComplete} />
        </motion.div>

        <motion.div variants={itemVariants} className="text-center py-8 space-y-4">
          <div className="space-y-3">
            <p className="text-lg font-semibold text-muted-foreground">
              {isComplete
                ? '✨ Generation complete!'
                : progress.total > 0
                ? 'Generating synthetic data...'
                : 'Ready to generate'}
            </p>
          </div>

          {progress.total > 0 && !isComplete && (
            <motion.div
              className="flex justify-center gap-2 pt-4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-gradient-to-r from-primary to-accent rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        {progress.errors.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3"
          >
            <h3 className="text-sm font-semibold text-destructive">⚠️ Errors</h3>
            <ul className="space-y-2">
              {progress.errors.map((error, idx) => (
                <motion.li
                  key={idx}
                  className="text-sm text-destructive/80"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  • {error}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {isComplete && (
          <motion.div
            variants={itemVariants}
            className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(34, 197, 94, 0.3)',
                '0 0 0 10px rgba(34, 197, 94, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-sm font-semibold text-green-500">
              ✓ Successfully generated {progress.current} items
            </p>
            <p className="text-xs text-green-500/70">
              Your JSONL file is ready in the outputs directory
            </p>
          </motion.div>
        )}
      </motion.div>
    </GlowingCard>
  )
}

export default ProgressDisplay
