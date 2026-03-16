import React from 'react'
import { motion } from 'framer-motion'
import { GlowingCard } from './ui/GlowingCard'
import { PremiumInput } from './ui/PremiumInput'
import { PremiumTextarea } from './ui/PremiumTextarea'
import Label from './ui/Label'

function SettingsPanel({ settings, onSettingsChange, isGenerating }) {
  const handleChange = (field, value) => {
    onSettingsChange({
      ...settings,
      [field]: value
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
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
    <GlowingCard className="sticky top-6 h-fit">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
            Settings
          </h2>
          <p className="text-sm text-muted-foreground">Configure your data generation</p>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            value={settings.provider}
            onChange={(e) => handleChange('provider', e.target.value)}
            disabled={isGenerating}
            className="w-full h-10 px-4 py-2 rounded-lg bg-background border border-primary/20 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 disabled:opacity-50"
          >
            <option value="ollama">Ollama (Local)</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </motion.div>

        {settings.provider === 'openrouter' && (
          <motion.div variants={itemVariants} className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <PremiumInput
              id="apiKey"
              type="password"
              value={settings.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              disabled={isGenerating}
              placeholder="sk-..."
            />
          </motion.div>
        )}

        {settings.provider === 'ollama' && (
          <motion.div variants={itemVariants} className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <PremiumInput
              id="baseUrl"
              type="text"
              value={settings.baseUrl}
              onChange={(e) => handleChange('baseUrl', e.target.value)}
              disabled={isGenerating}
              placeholder="http://localhost:11434"
            />
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <PremiumInput
            id="model"
            type="text"
            value={settings.model}
            onChange={(e) => handleChange('model', e.target.value)}
            disabled={isGenerating}
            placeholder="llama2"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="batchSize">Batch Size</Label>
          <PremiumInput
            id="batchSize"
            type="number"
            value={settings.batchSize}
            onChange={(e) => handleChange('batchSize', parseInt(e.target.value))}
            disabled={isGenerating}
            min="1"
            max="1000"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="outputFilename">Output Filename</Label>
          <PremiumInput
            id="outputFilename"
            type="text"
            value={settings.outputFilename}
            onChange={(e) => handleChange('outputFilename', e.target.value)}
            disabled={isGenerating}
            placeholder="synthetic_data.jsonl"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <PremiumTextarea
            id="systemPrompt"
            value={settings.systemPrompt}
            onChange={(e) => handleChange('systemPrompt', e.target.value)}
            disabled={isGenerating}
            rows="6"
            className="text-sm"
          />
        </motion.div>
      </motion.div>
    </GlowingCard>
  )
}

export default SettingsPanel
