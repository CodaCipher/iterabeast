import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { GlowingCard } from './ui/GlowingCard'
import { PremiumTextarea } from './ui/PremiumTextarea'
import { AnimatedButton } from './ui/AnimatedButton'
import Label from './ui/Label'

function PromptInput({ onGenerate, isGenerating }) {
  const [scenario, setScenario] = useState('')
  const [objective, setObjective] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (scenario.trim() && objective.trim()) {
      onGenerate(scenario, objective)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
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
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="space-y-3">
          <Label htmlFor="scenario">Scenario</Label>
          <PremiumTextarea
            id="scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            disabled={isGenerating}
            placeholder="Describe the scenario for synthetic data generation..."
            rows="5"
          />
          <p className="text-xs text-muted-foreground">
            Provide context and details about what kind of data you want to generate
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <Label htmlFor="objective">Objective</Label>
          <PremiumTextarea
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            disabled={isGenerating}
            placeholder="What should the generated data achieve or represent?"
            rows="5"
          />
          <p className="text-xs text-muted-foreground">
            Define the purpose and expected output format
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AnimatedButton
            className="w-full"
            type="submit"
            disabled={isGenerating || !scenario.trim() || !objective.trim()}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>✨</span>
                Generate Data
              </span>
            )}
          </AnimatedButton>
        </motion.div>
      </motion.form>
    </GlowingCard>
  )
}

export default PromptInput
