import React, { useState, useEffect } from 'react'
import axios from 'axios'
import gsap from 'gsap'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from './lib/utils'
import { MatrixRain } from './components/MatrixRain'
import { TerminalInput } from './components/TerminalInput'
import { TerminalCard, TerminalButton, TerminalInput as TerminalInputField, TerminalSelect, TerminalTextarea } from './components/ui/TerminalCard'
import { HolographicGrid } from './components/HolographicGrid'
import { CircuitBoard, GlitchEffect, Scanlines, HolographicText, NeonBorder } from './components/CyberpunkVisuals'
import { TacticalCursor } from './components/TacticalCursor'
import { ScreenEffects } from './components/ScreenEffects'

const themeThemes = {
  magi: {
    primary: 'terminal-cyan',
    secondary: 'terminal-cyan/20',
    accent: 'terminal-cyan/40',
    bg: '#050505',
    border: 'terminal-cyan/20'
  },
  'eva-01': {
    primary: 'eva-purple',
    secondary: 'eva-purple/20',
    accent: 'eva-purple/40',
    bg: '#0a050f',
    border: 'eva-purple/20'
  }
}

const MODEL_PRICING = {
  // OpenRouter Models (per 1M tokens)
  'x-ai/grok-4.1-fast': { input: 0.5, output: 1.5 },
  'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-opus': { input: 15.0, output: 75.0 },
  'meta-llama/llama-3.1-405b-instruct': { input: 2.7, output: 2.7 },
  'meta-llama/llama-3.1-70b-instruct': { input: 0.88, output: 0.88 },
  'meta-llama/llama-3.1-8b-instruct': { input: 0.17, output: 0.17 },
  'google/gemini-pro-1.5': { input: 1.25, output: 5.0 },
  'openai/gpt-4o': { input: 5.0, output: 15.0 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'deepseek/deepseek-chat': { input: 0.2, output: 0.2 },
  // Groq Models (per 1M tokens)
  'llama3-70b-8192': { input: 0.59, output: 0.79 },
  'llama3-8b-8192': { input: 0.05, output: 0.08 },
  'mixtral-8x7b-32768': { input: 0.27, output: 0.27 },
  'gemma-7b-it': { input: 0.07, output: 0.07 },
  'groq': { input: 0, output: 0 },
  // DeepInfra Models (per 1M tokens)
  'meta-llama/Llama-3.3-70B-Instruct': { input: 0.13, output: 0.40 },
  'Qwen/Qwen2.5-72B-Instruct': { input: 0.12, output: 0.40 },
  'microsoft/WizardLM-2-8x22B': { input: 0.13, output: 0.40 },
  'Cohere/c4ai-command-r-plus-08-2024': { input: 0.45, output: 0.90 },
  'deepinfra': { input: 0, output: 0 },
  'ollama': { input: 0, output: 0 }
};

function App() {
  const [settings, setSettings] = useState({
    objective: 'Generate realistic, in-character dialogues where a Junior Developer interacts with a Senior Developer about coding problems.',
    batchSize: 10,
    outputFilename: 'synthetic_data.jsonl',
    systemPrompt: 'You are an assistant that generates synthetic data in JSONL format.\n\nIMPORTANT: Every response MUST be exactly one valid JSONL line with this structure:\n{"messages":[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}\n\nCRITICAL CONSTRAINTS:\n1. DO NOT include any greetings, pleasantries, or preambles (e.g., "Sure!", "Here is the data", "Hello").\n2. DO NOT explain the task or provide any conversational filler.\n3. START IMMEDIATELY with the JSON structure.\n4. Ensure the output is a single line.\n\nSTRUCTURAL VARIETY MANDATE:\nThe "user" content MUST vary its opening structure. DO NOT always start with "I, ...". Use diverse patterns:\n- Direct statements: "The server is down..."\n- Questions: "Why does this API..."\n- Actions: "Running the build script..."\n- Observations: "The logs show a memory leak..."\n- Confessions: "I accidentally deleted the..."\n- Emotional outbursts: "This legacy code is..."\n- Internal conflict: "I can\'t decide between..."\n\nVARIATION DIRECTIVE:\nEach item provides a VARIATION_KEYWORD. The Junior Developer\'s spoken line must naturally include that keyword exactly once. Do NOT reuse keywords between items. No keyword = no output.',
    variations: 'morning routine\nevening activity\nwork situation\nleisure time\nspecial event\ndaily task\nsocial gathering',
    variationThreshold: 0.35,
    similarityThreshold: 0.82,
    distributionStrategy: 'round-robin',
    formatter: {
      enabled: false,
      provider: 'ollama',
      model: 'gemma3:270m-instruct-q4',
      baseUrl: 'http://localhost:11434',
      apiKey: ''
    }
  })

  const [providers, setProviders] = useState([
    {
      id: 'default-ollama',
      name: 'Local Ollama',
      provider: 'ollama',
      model: 'llama2',
      baseUrl: 'http://localhost:11434',
      apiKey: '',
      enabled: true,
      temperature: 0.7,
      frequency_penalty: 0,
      presence_penalty: 0
    },
    {
      id: 'groq-default',
      name: 'Groq',
      provider: 'groq',
      model: 'llama3-70b-8192',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: '',
      enabled: false,
      temperature: 0.7,
      frequency_penalty: 0,
      presence_penalty: 0
    },
    {
      id: 'deepinfra-default',
      name: 'DeepInfra',
      provider: 'deepinfra',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      baseUrl: 'https://api.deepinfra.com/v1/openai',
      apiKey: '',
      enabled: false,
      temperature: 0.7,
      frequency_penalty: 0,
      presence_penalty: 0
    }
  ])

  const [activeProviderId, setActiveProviderId] = useState('default-ollama')
  const [showProvidersPanel, setShowProvidersPanel] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] })
  const [terminalOutput, setTerminalOutput] = useState([])
  const [currentCommand, setCurrentCommand] = useState('')
  const [availableModels, setAvailableModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showBatchInfo, setShowBatchInfo] = useState(false)
  const [showDistributionHelp, setShowDistributionHelp] = useState(false)
  const [showFormatterHelp, setShowFormatterHelp] = useState(false)
  const [openHelp, setOpenHelp] = useState(null) // 'temp', 'freq', 'pres' or null
  const [theme, setTheme] = useState('magi') // 'magi' (default) or 'eva-01'
  const [fileHandle, setFileHandle] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [fetchedModels, setFetchedModels] = useState({})
  const [showVariationGenerator, setShowVariationGenerator] = useState(false)
  const [variationGeneratorConfig, setVariationGeneratorConfig] = useState({
    providerId: 'default-ollama',
    count: 5,
    prompt: ''
  })
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false)
  const [recentGeneratedVariations, setRecentGeneratedVariations] = useState([])

  const estimateCost = () => {
    const activeProviders = providers.filter(p => p.enabled)
    if (activeProviders.length === 0) return { estimated: 0, currency: 'FREE', totalItems: 0 }

    // Calculate total items based on distribution strategy
    const totalItems = settings.distributionStrategy === 'sequential' 
      ? settings.batchSize * activeProviders.length 
      : settings.batchSize; // round-robin or hybrid

    // If all active providers are ollama, it's free
    if (activeProviders.every(p => p.provider === 'ollama')) return { estimated: 0, currency: 'FREE', totalItems }
    
    let totalEstimated = 0
    const promptLength = (settings.systemPrompt + settings.objective).length
    const inputTokensPerItem = Math.ceil(promptLength / 4)
    const outputTokensPerItem = 300

    activeProviders.forEach((p, index) => {
      if (p.provider === 'ollama') return
      
      const pricing = MODEL_PRICING[p.model]
      if (!pricing) return

      let providerItemCount = 0;
      if (settings.distributionStrategy === 'sequential') {
        providerItemCount = settings.batchSize;
      } else {
        // Round-robin or hybrid: distribute totalItems across providers
        providerItemCount = Math.floor(totalItems / activeProviders.length);
        // Add remainder to early providers
        if (index < totalItems % activeProviders.length) {
          providerItemCount += 1;
        }
      }
      
      const inputCost = (inputTokensPerItem * providerItemCount / 1000000) * pricing.input
      const outputCost = (outputTokensPerItem * providerItemCount / 1000000) * pricing.output
      totalEstimated += (inputCost + outputCost)
    })
    
    return { 
      estimated: totalEstimated.toFixed(4), 
      currency: 'USD',
      totalItems
    }
  }

  const handleOpenVariationGenerator = () => {
    if (!providers.length) {
      addTerminalOutput('VARIATION_GENERATOR: No providers configured', 'error')
      return
    }
    const currentValid = providers.some(p => p.id === variationGeneratorConfig.providerId)
    const fallbackProviderId = currentValid
      ? variationGeneratorConfig.providerId
      : (activeProviderId && providers.some(p => p.id === activeProviderId) ? activeProviderId : providers[0].id)
    setVariationGeneratorConfig(prev => ({
      ...prev,
      providerId: fallbackProviderId
    }))
    setShowVariationGenerator(true)
  }

  const handleGenerateVariations = async () => {
    const provider = providers.find(p => p.id === variationGeneratorConfig.providerId)
    if (!provider) {
      addTerminalOutput('VARIATION_GENERATOR: Provider not found', 'error')
      return
    }

    setIsGeneratingVariations(true)
    addTerminalOutput(`VARIATION_GENERATOR: Synthesizing ${variationGeneratorConfig.count} keywords via ${provider.name}`, 'info')

    const existingList = parseVariationList(settings.variations)

    const payload = {
      provider_config: {
        id: provider.id,
        name: provider.name,
        provider: provider.provider,
        api_key: provider.apiKey || undefined,
        base_url: provider.baseUrl,
        model: provider.model,
        temperature: provider.temperature,
        frequency_penalty: provider.frequency_penalty,
        presence_penalty: provider.presence_penalty,
        enabled: provider.enabled
      },
      count: variationGeneratorConfig.count,
      system_prompt: settings.systemPrompt,
      objective: settings.objective,
      existing_variations: existingList,
      variations_prompt: variationGeneratorConfig.prompt || undefined
    }

    try {
      const response = await axios.post('/api/variations/generate', payload)
      const generated = response.data?.variations || []
      if (!generated.length) {
        addTerminalOutput('VARIATION_GENERATOR: Provider returned no keywords', 'warn')
      } else {
        const normalizedExisting = new Set(existingList.map(v => v.toLowerCase()))
        const merged = [...existingList]
        const fresh = []
        generated.forEach(item => {
          const clean = sanitizeVariationKeyword(item)
          if (!clean) return
          if (normalizedExisting.has(clean.toLowerCase())) return
          normalizedExisting.add(clean.toLowerCase())
          merged.push(clean)
          fresh.push(clean)
        })
        if (!fresh.length) {
          addTerminalOutput('VARIATION_GENERATOR: All generated keywords were duplicates', 'warn')
        } else {
          setSettings(prev => ({
            ...prev,
            variations: merged.join('\n')
          }))
          setRecentGeneratedVariations(fresh)
          addTerminalOutput(`VARIATION_GENERATOR: Added ${fresh.length} new keywords`, 'success')
        }
      }
    } catch (error) {
      const message = error.response?.data?.detail || error.message
      addTerminalOutput(`VARIATION_GENERATOR ERROR: ${message}`, 'error')
    } finally {
      setIsGeneratingVariations(false)
    }
  }

  const estimatedCost = estimateCost();

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const savedProviders = localStorage.getItem('sdg_providers')
      if (savedProviders) {
        const parsed = JSON.parse(savedProviders)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProviders(parsed)
          const savedActiveId = localStorage.getItem('sdg_active_provider_id')
          if (savedActiveId && parsed.some(p => p.id === savedActiveId)) {
            setActiveProviderId(savedActiveId)
          } else {
            setActiveProviderId(parsed[0].id)
          }
        }
      }

      const savedSettings = localStorage.getItem('sdg_general_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      }

      const savedVariationGenerator = localStorage.getItem('sdg_variation_generator')
      if (savedVariationGenerator) {
        const parsed = JSON.parse(savedVariationGenerator)
        setVariationGeneratorConfig(prev => ({
          ...prev,
          ...parsed,
          prompt: typeof parsed?.prompt === 'string' ? parsed.prompt : ''
        }))
      }
    } catch (err) {
      console.warn('Failed to load settings from localStorage', err)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      localStorage.setItem('sdg_providers', JSON.stringify(providers))
      localStorage.setItem('sdg_active_provider_id', activeProviderId)
      localStorage.setItem('sdg_general_settings', JSON.stringify({
        objective: settings.objective,
        batchSize: settings.batchSize,
        outputFilename: settings.outputFilename,
        systemPrompt: settings.systemPrompt,
        variations: settings.variations,
        variationThreshold: settings.variationThreshold,
        similarityThreshold: settings.similarityThreshold,
        distributionStrategy: settings.distributionStrategy,
        formatter: settings.formatter
      }))
      localStorage.setItem('sdg_variation_generator', JSON.stringify(variationGeneratorConfig))
    } catch (err) {
      console.warn('Failed to persist settings', err)
    }
  }, [hydrated, providers, activeProviderId, settings, variationGeneratorConfig])

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings)
  }

  const handleSelectFile = async () => {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: settings.outputFilename,
        types: [{
          description: 'JSON Lines',
          accept: { 'application/json': ['.jsonl'] },
        }],
      })
      setFileHandle(handle)
      setSettings(prev => ({ ...prev, outputFilename: handle.name }))
      addTerminalOutput(`FILE_SELECTED: ${handle.name}`, 'success')
    } catch (err) {
      if (err.name !== 'AbortError') {
        addTerminalOutput(`SELECTION_FAILED: ${err.message}`, 'error')
      }
    }
  }

  const addTerminalOutput = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setTerminalOutput(prev => [{ id: Date.now() + Math.random(), timestamp, message, type }, ...prev])
  }

  const fetchOllamaModels = async () => {
    setIsLoadingModels(true)
    addTerminalOutput('FETCHING MODELS...', 'info')
    
    try {
      const response = await axios.get(`${settings.baseUrl}/api/tags`)
      const models = response.data.models.map(model => model.name)
      setAvailableModels(models)
      addTerminalOutput(`FOUND ${models.length} MODELS: ${models.join(', ')}`, 'success')
    } catch (error) {
      addTerminalOutput(`ERROR FETCHING MODELS: ${error.message}`, 'error')
      setAvailableModels([])
    } finally {
      setIsLoadingModels(false)
    }
  }

  const parseVariationList = (text) => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }

  const sanitizeVariationKeyword = (value = '') => {
    let cleaned = value.trim()
    // Remove wrapping quotes/backticks repeatedly
    while (cleaned.length > 1 && ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith('\'') && cleaned.endsWith('\'')) || (cleaned.startsWith('`') && cleaned.endsWith('`')))) {
      cleaned = cleaned.slice(1, -1).trim()
    }
    cleaned = cleaned.replace(/^['"`]+/, '').replace(/['"`]+$/, '')
    cleaned = cleaned.replace(/^[-•\s]+/, '')
    cleaned = cleaned.replace(/[\s]+/g, ' ')
    cleaned = cleaned.replace(/^[“”]+|[“”]+$/g, '')
    if (cleaned.endsWith(',')) cleaned = cleaned.slice(0, -1).trim()
    return cleaned
  }

  const handleCommand = async (command) => {
    addTerminalOutput(`> ${command}`, 'command')
    
    const parts = command.split(' ')
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

    switch (cmd) {
      case 'help':
        addTerminalOutput('================ SYSTEM_HELP ================', 'info')
        addTerminalOutput('SYNTHETIC DATA GENERATOR - USER PROTOCOLS', 'info')
        addTerminalOutput('------------------------------------------------', 'info')
        addTerminalOutput('COMMANDS:', 'command')
        addTerminalOutput('  help      : Display this manual', 'info')
        addTerminalOutput('  config    : Show current settings', 'info')
        addTerminalOutput('  set       : Modify parameters. Usage: set [key] [value]', 'info')
        addTerminalOutput('              Valid keys: batchSize, outputFilename', 'info')
        addTerminalOutput('  generate  : START GENERATION', 'info')
        addTerminalOutput('  status    : Display current status', 'info')
        addTerminalOutput('  clear     : Clear terminal logs', 'info')
        addTerminalOutput('------------------------------------------------', 'info')
        break
        
      case 'config':
        addTerminalOutput('Current Configuration:', 'info')
        addTerminalOutput(`  Active Nodes: ${providers.filter(p => p.enabled).length}/${providers.length}`, 'info')
        providers.filter(p => p.enabled).forEach(p => {
          addTerminalOutput(`    - ${p.name}: ${p.provider}::${p.model}`, 'info')
        })
        addTerminalOutput(`  Batch Size: ${settings.batchSize}`, 'info')
        addTerminalOutput(`  Output: ${settings.outputFilename}`, 'info')
        break
        
      case 'set':
        if (args.length < 2) {
          addTerminalOutput('Usage: set <key> <value>', 'error')
          return
        }
        const key = args[0]
        const value = args.slice(1).join(' ')
        
        if (['batchsize', 'outputfilename', 'objective', 'systemprompt'].includes(key.toLowerCase())) {
          const mapping = {
            batchsize: 'batchSize',
            outputfilename: 'outputFilename',
            objective: 'objective',
            systemprompt: 'systemPrompt'
          }
          const actualKey = mapping[key.toLowerCase()]
          setSettings(prev => ({ ...prev, [actualKey]: key.toLowerCase() === 'batchsize' ? parseInt(value) : value }))
          addTerminalOutput(`Set ${actualKey} = ${value}`, 'success')
        } else {
          addTerminalOutput(`Key '${key}' cannot be set directly via terminal in multi-provider mode. Use provider settings UI.`, 'warn')
        }
        break
        
      case 'generate':
        await handleGenerate()
        break
        
      case 'status':
        if (isGenerating) {
          addTerminalOutput(`Generation in progress: ${progress.current}/${progress.total}`, 'info')
        } else {
          addTerminalOutput('No active generation', 'info')
        }
        break
        
      case 'clear':
        setTerminalOutput([])
        break
        
      default:
        addTerminalOutput(`Unknown command: ${cmd}`, 'error')
        addTerminalOutput('Type "help" for available commands', 'info')
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    const activeProviders = providers.filter(p => p.enabled)
    const totalItems = settings.batchSize * activeProviders.length
    setProgress({ current: 0, total: totalItems, errors: [] })
    addTerminalOutput('STARTING DATA GENERATION...', 'info')
    
    if (activeProviders.length === 0) {
      addTerminalOutput('ERROR: No active providers configured.', 'error')
      setIsGenerating(false)
      return
    }

    addTerminalOutput(`Active Providers: ${activeProviders.length}`, 'info')
    addTerminalOutput(`Batch Size: ${settings.batchSize}`, 'info')

    const variationList = settings.variations
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    try {
      const requestPayload = {
        objective: settings.objective,
        system_prompt: settings.systemPrompt,
        batch_size: settings.batchSize,
        provider_configs: activeProviders.map(p => ({
          id: p.id,
          name: p.name,
          provider: p.provider,
          api_key: p.apiKey || undefined,
          base_url: p.baseUrl,
          model: p.model,
          temperature: p.temperature,
          frequency_penalty: p.frequency_penalty,
          presence_penalty: p.presence_penalty,
          enabled: p.enabled
        })),
        output_filename: settings.output_filename || settings.outputFilename,
        stream: !!fileHandle,
        variations: variationList,
        variation_similarity_threshold: settings.variationThreshold,
        similarity_threshold: settings.similarityThreshold,
        distribution_strategy: settings.distributionStrategy || 'round-robin',
        formatter_config: settings.formatter.enabled ? {
          enabled: true,
          provider: settings.formatter.provider,
          model: settings.formatter.model,
          base_url: settings.formatter.provider === 'ollama' ? settings.formatter.baseUrl : undefined,
          api_key: settings.formatter.provider === 'openrouter' ? settings.formatter.apiKey : undefined
        } : undefined
      }

      if (fileHandle) {
        addTerminalOutput('STREAMING ENABLED', 'info')
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || response.statusText)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        const writable = await fileHandle.createWritable()
        
        let generatedCount = 0
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          await writable.write(value)
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(l => l.trim())
          
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line)
              
              if (!parsed._error && parsed.messages) {
                generatedCount++
              }
            } catch (e) {}
          }
          
          setProgress(prev => ({
            ...prev,
            current: Math.min(generatedCount, totalItems)
          }))
        }
        
        await writable.close()
        addTerminalOutput(`SUCCESS: Data streamed to ${fileHandle.name}`, 'success')
        
      } else {
        const response = await axios.post('/api/generate', requestPayload)
        addTerminalOutput(`SUCCESS: Generated ${response.data.generated_count} items`, 'success')
        setProgress({
          current: response.data.generated_count,
          total: totalItems,
          errors: response.data.errors
        })
      }
    } catch (error) {
      addTerminalOutput(`ERROR: ${error.message}`, 'error')
      setProgress(prev => ({
        ...prev,
        errors: [...prev.errors, error.message]
      }))
    } finally {
      setIsGenerating(false)
    }
  }

  const sharedTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 1
  }

  return (
    <div data-theme={theme === 'eva-01' ? 'eva-01' : undefined} className="min-h-screen bg-black text-terminal-green relative overflow-hidden font-mono selection:bg-terminal-green selection:text-black transition-colors duration-500">
      <ScreenEffects />
      <TacticalCursor />
      <HolographicGrid theme={theme} />
      <MatrixRain theme={theme} />
      <CircuitBoard />
      <Scanlines />
      
      {/* NERV Header */}
      <div className="relative z-20 border-b border-terminal-green/30 bg-[#0a0a0a] transition-colors duration-500">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <GlitchEffect>
                <HolographicText className="text-4xl nerv-text font-black tracking-tighter text-terminal-green transition-colors duration-500">
                  {theme === 'eva-01' ? 'UNSTABLE_CORE' : 'ITERABEAST_ENGINE'}
                </HolographicText>
              </GlitchEffect>
              <div className="h-8 w-[1px] bg-terminal-green/20" />
              <div className="text-[10px] terminal-text opacity-50 tracking-[0.3em] uppercase">
                ITERABEAST_v0.4
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* Theme Switcher */}
              <button 
                onClick={() => setTheme(prev => prev === 'magi' ? 'eva-01' : 'magi')}
                className="group flex items-center gap-2 px-3 py-1 border border-terminal-green/30 hover:bg-terminal-green/10 transition-all cursor-none"
              >
                <div className={`w-2 h-2 rounded-full ${theme === 'eva-01' ? 'bg-purple-500 shadow-[0_0_8px_#a855f7]' : 'bg-orange-500 shadow-[0_0_8px_#f97316]'}`} />
                <span className="text-[9px] font-bold tracking-widest text-terminal-green group-hover:text-white transition-colors">
                  [THEME_SELECTION]
                </span>
              </button>

              <div className={cn(
                "flex items-center gap-4 px-4 py-1 border transition-colors duration-500",
                isGenerating 
                  ? "bg-terminal-cyan/10 border-terminal-cyan/30" 
                  : "bg-terminal-green/5 border-terminal-green/10"
              )}>
                <div className="flex items-center gap-2">
                  <motion.div 
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isGenerating 
                        ? "bg-terminal-cyan shadow-[0_0_10px_#0ff]" 
                        : "bg-terminal-green shadow-[0_0_10px_#0f0]"
                    )}
                    animate={{ opacity: isGenerating ? [1, 0.2, 1] : [0.4, 1, 0.4] }}
                    transition={{ duration: isGenerating ? 0.8 : 2, repeat: Infinity }}
                  />
                  <span className={cn(
                    "text-[10px] font-bold tracking-widest",
                    isGenerating ? "text-terminal-cyan" : "terminal-text"
                  )}>
                    {isGenerating ? 'SYSTEM_BUSY' : 'SYSTEM_READY'}
                  </span>
                </div>
                <div className={cn(
                  "text-[10px] font-mono border-l pl-4 flex items-center gap-4",
                  isGenerating ? "border-terminal-cyan/30 text-terminal-cyan/80" : "border-terminal-green/20 text-terminal-green/50"
                )}>
                  {isGenerating ? (
                    <>
                      <span>PROG: {Math.round((progress.current / (progress.total || 1)) * 100)}%</span>
                      <span>[{progress.current}/{progress.total}]</span>
                      {progress.errors?.length > 0 && (
                        <span className="text-nerv-red font-bold animate-pulse">
                          ERR: {progress.errors.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>MODELS: {providers.filter(p => p.enabled).length}</span>
                      <span>BATCH: {settings.batchSize}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="relative z-10 max-w-[1800px] mx-auto p-8 mt-4">
        <div className="flex flex-wrap justify-center items-start gap-x-6 gap-y-8">
          
          {/* Terminal Panel */}
          <AnimatePresence>
            {showTerminal && (
              <motion.div
                key="terminal-panel"
                initial={{ opacity: 0, width: 0, x: -30 }}
                animate={{ opacity: 1, width: '45%', x: 0 }}
                exit={{ opacity: 0, width: 0, x: -30 }}
                transition={sharedTransition}
                className="shrink-0 overflow-hidden"
              >
                <div className="pr-6">
                  <NeonBorder color="terminal-green">
                    <TerminalCard 
                      title="Log_Terminal"
                      onClose={() => setShowTerminal(false)}
                      className="h-[700px] flex flex-col bg-[#050505] border-terminal-green/20 relative overflow-hidden group"
                    >
                      {/* Scanning Line Overlay */}
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-terminal-green/5 to-transparent h-20 w-full -translate-y-full group-hover:animate-scan" />
                      
                      <div className="shrink-0 px-4 pb-4 border-b border-terminal-green/20 mb-4 mt-2">
                        <TerminalInput onCommand={handleCommand} disabled={isGenerating} />
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar font-mono px-4 pb-4">
                        <div className="space-y-1.5 flex flex-col">
                          {terminalOutput.length === 0 ? (
                            <div className="text-terminal-green/30 text-[10px] space-y-1">
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>&gt; CONNECTING_TO_BACKEND...</motion.p>
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>&gt; STATUS: READY</motion.p>
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>&gt; READY_FOR_COMMAND</motion.p>
                            </div>
                          ) : (
                            <AnimatePresence>
                              {terminalOutput.map((output) => (
                                <motion.div 
                                  key={output.id} 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, ease: 'easeOut' }}
                                  className="flex gap-3 text-[10px] leading-relaxed group/line border-l-2 border-transparent hover:border-terminal-green/30 pl-2 transition-colors"
                                >
                                  <span className="text-terminal-green/20 shrink-0 select-none font-bold">[{output.timestamp}]</span>
                                  <span 
                                    className={cn(
                                      'flex-1 break-all',
                                      output.type === 'command' && 'text-terminal-cyan font-bold',
                                      output.type === 'error' && 'text-nerv-red bg-nerv-red/5 px-1',
                                      output.type === 'success' && 'text-terminal-green font-bold shadow-[0_0_5px_rgba(0,255,0,0.2)]',
                                      output.type === 'info' && 'text-terminal-green/60'
                                    )}
                                  >
                                    <span className="opacity-30 mr-2">{output.type === 'command' ? '$' : '»'}</span>
                                    {output.message}
                                  </span>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          )}
                        </div>
                      </div>
                    </TerminalCard>
                  </NeonBorder>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Configuration Panel */}
          <motion.div
            key="config-panel"
            animate={{ 
              width: (showTerminal && (showBatchInfo || showFormatterHelp)) ? '30%' : 
                     (showTerminal || showBatchInfo || showFormatterHelp) ? '45%' : '700px'
            }}
            transition={sharedTransition}
            className="shrink-0"
          >
            <NeonBorder color="terminal-cyan">
              <TerminalCard 
                title="Generation_Settings"
                showClock={true}
                headerAction={!showTerminal && (
                  <TerminalButton 
                    onClick={() => setShowTerminal(true)} 
                    variant="secondary"
                    className="px-3 py-1 text-[9px] border-terminal-cyan/50 text-terminal-cyan hover:bg-terminal-cyan/20 h-5 flex items-center"
                    style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                  >
                    [OPEN_TERMINAL]
                  </TerminalButton>
                )}
                className="h-[700px] flex flex-col bg-[#050505] border-terminal-cyan/20 relative overflow-hidden group"
              >
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-terminal-cyan/5 to-transparent h-20 w-full -translate-y-full group-hover:animate-scan" />
                
                <div className="flex-1 overflow-y-auto space-y-6 px-4 custom-scrollbar mt-4">
                  <div className="space-y-8 py-2">
                    {/* AI Provider Nodes */}
                    <div className="relative border border-terminal-cyan/20 bg-terminal-cyan/5 rounded p-4 group/prov transition-all hover:border-terminal-cyan/40 shadow-[inset_0_0_20px_rgba(0,255,255,0.02)]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            providers.some(p => p.enabled) ? "bg-terminal-green shadow-[0_0_8px_#00ff00]" : "bg-nerv-red shadow-[0_0_8px_#ff0000]"
                          )} />
                          <div>
                            <h2 className="text-[11px] font-bold text-terminal-cyan uppercase tracking-widest leading-none">
                              AI_Providers
                            </h2>
                            <span className="text-[8px] text-terminal-cyan/40 font-mono uppercase tracking-tighter">
                              {providers.filter(p => p.enabled).length} active providers
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowProvidersPanel(!showProvidersPanel)}
                          className={cn(
                            "px-3 py-1 text-[9px] border transition-all uppercase font-bold",
                            showProvidersPanel 
                              ? "bg-terminal-cyan/20 border-terminal-cyan text-terminal-cyan" 
                              : "border-terminal-cyan/20 text-terminal-cyan/60 hover:border-terminal-cyan/40 hover:text-terminal-cyan"
                          )}
                        >
                          {showProvidersPanel ? <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> : '[EDIT_PROVIDERS]'}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {providers.filter(p => p.enabled).map(p => (
                          <div key={p.id} className="flex items-center gap-2 px-2 py-1 bg-black/40 border border-terminal-cyan/10 rounded-sm hover:border-terminal-cyan/30 transition-colors">
                            <div className="w-1 h-1 rounded-full bg-terminal-green/60" />
                            <span className="text-[9px] font-mono text-terminal-cyan/70 uppercase">{p.name}</span>
                            <span className="text-[8px] font-mono text-terminal-cyan/30 px-1 border-l border-terminal-cyan/10">{p.model}</span>
                          </div>
                        ))}
                        {providers.filter(p => p.enabled).length === 0 && (
                          <div className="w-full py-2 text-center border border-dashed border-nerv-red/20 rounded bg-nerv-red/5">
                            <span className="text-[9px] text-nerv-red/60 font-bold tracking-widest">NO_PROVIDERS_ENABLED</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2">
                        <label className="text-[9px] text-terminal-cyan/40 block uppercase tracking-[0.2em] font-bold">
                          Batch Size
                          <button onClick={() => setShowBatchInfo(!showBatchInfo)} className="ml-2 text-terminal-cyan hover:text-white transition-colors opacity-40 hover:opacity-100">[INFO]</button>
                        </label>
                        <TerminalInputField
                          type="number"
                          value={settings.batchSize}
                          onChange={(e) => setSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                          disabled={isGenerating}
                          min="1"
                          className="border-terminal-cyan/20 bg-terminal-cyan/5 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-terminal-cyan/40 block uppercase tracking-[0.2em] font-bold">
                          Output File
                          <button onClick={handleSelectFile} className="ml-2 text-terminal-cyan hover:text-white transition-colors opacity-60 hover:opacity-100 uppercase">[BROWSE]</button>
                        </label>
                        <TerminalInputField
                          value={settings.outputFilename}
                          onChange={(e) => setSettings(prev => ({ ...prev, outputFilename: e.target.value }))}
                          disabled={isGenerating || fileHandle}
                          className="border-terminal-cyan/20 bg-terminal-cyan/5 text-xs font-mono disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border border-terminal-cyan/20 p-4 bg-terminal-cyan/5 rounded">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-terminal-cyan font-bold uppercase tracking-widest flex items-center gap-2">
                          [JSON_FORMATTER]
                          <button 
                            onClick={() => setShowFormatterHelp(!showFormatterHelp)}
                            className="text-terminal-cyan hover:text-white transition-colors opacity-40 hover:opacity-100"
                          >
                            [HELP]
                          </button>
                        </label>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            formatter: { ...prev.formatter, enabled: !prev.formatter.enabled }
                          }))}
                          className={cn(
                            "px-3 py-1 text-[9px] border transition-all",
                            settings.formatter.enabled 
                              ? "bg-terminal-cyan/20 border-terminal-cyan text-terminal-cyan" 
                              : "border-terminal-cyan/30 text-terminal-cyan/40"
                          )}
                        >
                          {settings.formatter.enabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>

                      <AnimatePresence>
                        {settings.formatter.enabled && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 pt-2 overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] text-terminal-cyan/40 uppercase tracking-tighter font-bold">Provider</label>
                                <TerminalSelect
                                  value={settings.formatter.provider}
                                  onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    formatter: { ...prev.formatter, provider: e.target.value }
                                  }))}
                                  className="border-terminal-cyan/20 bg-terminal-cyan/5 text-[10px]"
                                >
                                  <option value="ollama">Ollama</option>
                                  <option value="openrouter">OpenRouter</option>
                                </TerminalSelect>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] text-terminal-cyan/40 uppercase tracking-tighter font-bold">Model</label>
                                <TerminalInputField
                                  value={settings.formatter.model}
                                  onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    formatter: { ...prev.formatter, model: e.target.value }
                                  }))}
                                  placeholder="e.g. gemma3:270m"
                                  className="border-terminal-cyan/20 bg-terminal-cyan/5 text-[10px]"
                                />
                              </div>
                            </div>

                            {settings.formatter.provider === 'ollama' ? (
                              <div className="space-y-2">
                                <label className="text-[9px] text-terminal-cyan/40 uppercase tracking-tighter font-bold">Base URL</label>
                                <TerminalInputField
                                  value={settings.formatter.baseUrl}
                                  onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    formatter: { ...prev.formatter, baseUrl: e.target.value }
                                  }))}
                                  className="border-terminal-cyan/20 bg-terminal-cyan/5 text-[10px]"
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="text-[9px] text-terminal-cyan/40 uppercase tracking-tighter font-bold">API Key</label>
                                <TerminalInputField
                                  type="password"
                                  value={settings.formatter.apiKey}
                                  onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    formatter: { ...prev.formatter, apiKey: e.target.value }
                                  }))}
                                  placeholder="sk-..."
                                  className="border-terminal-cyan/20 bg-terminal-cyan/5 text-[10px]"
                                />
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-xs text-terminal-green/70 uppercase tracking-widest font-bold">System_Instructions</label>
                      <TerminalTextarea
                        value={settings.systemPrompt}
                        onChange={e => handleSettingsChange({ ...settings, systemPrompt: e.target.value })}
                        className="h-48"
                        placeholder="Enter system prompt..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-terminal-cyan/40 block uppercase tracking-[0.2em] font-bold">Task Description</label>
                      <TerminalTextarea
                        value={settings.objective}
                        onChange={(e) => setSettings(prev => ({ ...prev, objective: e.target.value }))}
                        disabled={isGenerating}
                        className="h-32"
                        placeholder="e.g. Generate 5 items focusing on..."
                      />
                    </div>

                    <div className="space-y-2 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] text-terminal-cyan/40 uppercase tracking-[0.2em] font-bold">Variations (One Per Line)</label>
                          <button 
                            onClick={() => setOpenHelp('variations')}
                            className="text-[9px] text-terminal-cyan/60 hover:text-terminal-cyan underline cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                          >
                            [HELP]
                          </button>
                        </div>
                        <button
                          onClick={handleOpenVariationGenerator}
                          className="text-[9px] font-bold tracking-widest border border-terminal-cyan/40 text-terminal-cyan px-2 py-1 hover:bg-terminal-cyan/10 transition-colors"
                        >
                          [AUTO_GENERATE]
                        </button>
                      </div>
                      <TerminalTextarea
                        value={settings.variations}
                        onChange={(e) => setSettings(prev => ({ ...prev, variations: e.target.value }))}
                        disabled={isGenerating}
                        className="h-28"
                        placeholder={"late-night coding\neating noodle\nmidnight rooftop walk"}
                      />
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-terminal-cyan/40 block uppercase tracking-[0.2em] font-bold">Variation Threshold</label>
                          <TerminalInputField
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.variationThreshold}
                            onChange={(e) => setSettings(prev => ({ ...prev, variationThreshold: parseFloat(e.target.value) || 0 }))}
                            disabled={isGenerating}
                            className="border-terminal-cyan/20 bg-terminal-cyan/5 text-xs font-mono"
                          />
                          <p className="text-[8px] text-terminal-cyan/30 mt-1">Lower = Loose; Higher = Strict</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-terminal-cyan/40 block uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                            Similarity Threshold
                            <span className="text-terminal-cyan/50 text-[8px] tracking-normal">(Dup filter)</span>
                          </label>
                          <TerminalInputField
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={settings.similarityThreshold}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              similarityThreshold: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0))
                            }))}
                            disabled={isGenerating}
                            className="border-terminal-cyan/20 bg-terminal-cyan/5 text-xs font-mono"
                          />
                          <p className="text-[8px] text-terminal-cyan/30 mt-1">Lower ⇒ more aggressive duplicate filtering.</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-terminal-cyan/40 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                            Distribution
                            <button onClick={() => setShowDistributionHelp(!showDistributionHelp)} className="text-terminal-cyan hover:text-white transition-colors opacity-40 hover:opacity-100">[HELP]</button>
                          </label>
                          <TerminalSelect
                            value={settings.distributionStrategy}
                            onChange={(e) => setSettings(prev => ({ ...prev, distributionStrategy: e.target.value }))}
                            disabled={isGenerating}
                            className="border-terminal-cyan/20 bg-terminal-cyan/5 text-[10px] w-full"
                          >
                            <option value="round-robin">Round-Robin Cyclic</option>
                            <option value="sequential">Sequential per Model</option>
                            <option value="hybrid">Hybrid</option>
                          </TerminalSelect>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-8 border-t border-terminal-cyan/20 mt-auto bg-black/20 p-6">
                  <TerminalButton 
                    onClick={() => handleCommand('generate')} 
                    disabled={isGenerating} 
                    className="w-full font-black text-xl py-6 border-terminal-cyan shadow-[0_0_20px_rgba(0,255,255,0.05)] hover:shadow-[0_0_30px_rgba(0,255,255,0.15)] transition-all uppercase tracking-[0.4em]"
                  >
                    {isGenerating ? 'GENERATING...' : 'GENERATE'}
                  </TerminalButton>

                  {/* Cost Estimation & Total Items */}
                  <div className="mt-4 p-3 bg-black/40 border border-terminal-cyan/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="text-[9px] font-mono text-terminal-cyan/60 uppercase tracking-widest">Total_Items</div>
                      <div className="text-[10px] font-bold font-mono text-terminal-cyan">
                        {estimatedCost.totalItems || 0} 
                        {settings.distributionStrategy === 'sequential' && ` (${settings.batchSize} × ${providers.filter(p => p.enabled).length})`}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-terminal-cyan/10">
                      <div className="text-[9px] font-mono text-terminal-cyan/60 uppercase tracking-widest">Est_Cost</div>
                      <div className={`text-[10px] font-bold font-mono ${estimatedCost.currency === 'FREE' ? 'text-terminal-cyan' : 'text-terminal-green'}`}>
                        {estimatedCost.currency === 'FREE' ? 'FREE (LOCAL)' : `$${estimatedCost.estimated}`}
                      </div>
                    </div>
                  </div>
                  
                  {isGenerating && (
                    <div className="mt-6 p-3 bg-terminal-cyan/5 border border-terminal-cyan/10">
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-[9px] font-mono text-terminal-cyan/60 tracking-[0.2em] uppercase">Progress</div>
                        <div className="text-[10px] font-bold text-terminal-cyan font-mono">{Math.round((progress.current / progress.total) * 100)}%</div>
                      </div>
                      <div className="w-full bg-black/60 h-1.5 relative overflow-hidden">
                        <motion.div 
                          className="bg-terminal-cyan h-full shadow-[0_0_15px_#00ffff] relative z-10"
                          initial={{ width: 0 }}
                          animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                          transition={{ type: "spring", stiffness: 50, damping: 20 }}
                        />
                        <div className="absolute inset-0 bg-terminal-cyan/10 animate-pulse" />
                      </div>
                      <div className="mt-2 text-[8px] font-mono text-terminal-cyan/30 text-center uppercase tracking-widest">
                        Items: {progress.current} / {progress.total}
                      </div>
                    </div>
                  )}
                </div>
              </TerminalCard>
            </NeonBorder>
          </motion.div>

          {/* Info Panels */}
          <AnimatePresence>
            {showBatchInfo && (
              <motion.div
                key="batch-info-panel"
                initial={{ opacity: 0, width: 0, x: 20 }}
                animate={{ opacity: 1, width: 320, x: 0 }}
                exit={{ opacity: 0, width: 0, x: 20 }}
                transition={sharedTransition}
                className="shrink-0 overflow-hidden"
              >
                <div className="pl-6">
                  <NeonBorder color="terminal-cyan">
                    <TerminalCard 
                      title="Batch_Info"
                      onClose={() => setShowBatchInfo(false)}
                      className="h-[700px] flex flex-col bg-[#050505] backdrop-blur-sm border-terminal-cyan/20 relative overflow-hidden group"
                    >
                      <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 text-[12px] leading-relaxed">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 bg-terminal-cyan/5 border-l-4 border-terminal-cyan">
                            <div className="text-3xl font-black text-terminal-cyan opacity-50 select-none">#</div>
                            <div>
                              <h4 className="text-terminal-cyan font-black uppercase text-sm leading-none mb-1">Batch Size</h4>
                              <p className="opacity-70 text-[11px]">Total items to generate per active provider.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 pt-4">
                            <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-terminal-cyan shadow-[0_0_5px_#00ffff]" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Definition</span>
                              </div>
                              <p className="opacity-60 text-[10px]">Specifies the exact number of unique JSONL lines to be generated for each active provider.</p>
                            </div>

                            <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-terminal-cyan shadow-[0_0_5px_#00ffff]" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Concurrency</span>
                              </div>
                              <p className="opacity-60 text-[10px]">Tasks are processed in parallel. Larger batches automatically queue across active providers.</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-nerv-red/5 border-l-2 border-nerv-red/40 rounded-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-nerv-red animate-pulse" />
                            <h4 className="text-[10px] text-nerv-red font-black uppercase tracking-widest">GENERATION_ADVICE</h4>
                          </div>
                          <p className="text-[10px] opacity-70 leading-relaxed text-terminal-green/80">
                            To maintain high diversity and prevent repetition, ensure your <span className="text-terminal-cyan">Variations</span> list length matches your expected Batch Size.
                          </p>
                        </div>
                      </div>
                    </TerminalCard>
                  </NeonBorder>
                </div>
              </motion.div>
            )}

            {showFormatterHelp && (
              <motion.div
                key="formatter-help-panel"
                initial={{ opacity: 0, width: 0, x: 20 }}
                animate={{ opacity: 1, width: 320, x: 0 }}
                exit={{ opacity: 0, width: 0, x: 20 }}
                transition={sharedTransition}
                className="shrink-0 overflow-hidden"
              >
                <div className="pl-6">
                  <NeonBorder color="terminal-cyan">
                    <TerminalCard 
                      title="Formatting_Settings"
                      onClose={() => setShowFormatterHelp(false)}
                      className="h-[700px] flex flex-col bg-[#050505] backdrop-blur-sm border-terminal-cyan/20 relative overflow-hidden group"
                    >
                      <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-[11px] leading-relaxed">
                        <div className="p-4 bg-terminal-cyan/5 border-l-4 border-terminal-cyan">
                          <h4 className="text-terminal-cyan font-black mb-1 uppercase tracking-tighter text-xs">JSON Structure</h4>
                          <p className="opacity-70">Ensures model outputs conform to strict JSONL schema requirements.</p>
                        </div>

                        <div className="space-y-4">
                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">What it does</h4>
                            <p className="opacity-60 text-[10px]">Highly recommended for smaller models (Llama-3 8B, Gemma-2 9B) which often output extra conversational text.</p>
                          </div>

                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">Recovery</h4>
                            <p className="opacity-60 text-[10px]">Malformed output is rerouted to a lightweight Formatter model to extract and rebuild valid JSON structures.</p>
                          </div>

                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">Processing</h4>
                            <ul className="text-[9px] opacity-50 space-y-1 mt-1">
                              <li>• Strips markdown blocks (```json)</li>
                              <li>• Fixes broken braces</li>
                              <li>• Removes extra text</li>
                              <li>• Corrects encoding</li>
                            </ul>
                          </div>
                        </div>

                        <div className="p-3 bg-orange-500/5 border-l-2 border-orange-500/40">
                          <h4 className="text-orange-500 font-bold mb-1 uppercase tracking-tighter text-[9px]">Resource Warning</h4>
                          <p className="opacity-60 text-[9px]">Enabling this formatter adds latency per malformed item. Use with efficient local models.</p>
                        </div>
                      </div>
                    </TerminalCard>
                  </NeonBorder>
                </div>
              </motion.div>
            )}

            {showDistributionHelp && (
              <motion.div
                key="distribution-help-panel"
                initial={{ opacity: 0, width: 0, x: 20 }}
                animate={{ opacity: 1, width: 360, x: 0 }}
                exit={{ opacity: 0, width: 0, x: 20 }}
                transition={sharedTransition}
                className="shrink-0 overflow-hidden"
              >
                <div className="pl-6">
                  <NeonBorder color="terminal-cyan">
                    <TerminalCard 
                      title="Distribution_Strategy"
                      onClose={() => setShowDistributionHelp(false)}
                      className="h-[700px] flex flex-col bg-[#050505] backdrop-blur-sm border-terminal-cyan/20 relative overflow-hidden group"
                    >
                      <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-[11px] leading-relaxed">
                        <div className="p-4 bg-terminal-cyan/5 border-l-4 border-terminal-cyan">
                          <h4 className="text-terminal-cyan font-black mb-1 uppercase tracking-tighter text-xs">Variation Handling</h4>
                          <p className="opacity-70">How variation keywords are assigned to the models when generating batches.</p>
                        </div>

                        <div className="space-y-4">
                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">Round-Robin (Recommended)</h4>
                            <p className="opacity-60 text-[10px]">Distributes variations cyclically across all active tasks. Maximizes diversity (SFT focus).</p>
                            <p className="opacity-40 text-[9px] mt-1 font-mono">M1-V1, M2-V2, M3-V3, M1-V4...</p>
                          </div>

                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">Sequential per Model</h4>
                            <p className="opacity-60 text-[10px]">Every model processes the exact same variations from the top of the list down. Great for Benchmarking / DPO.</p>
                            <p className="opacity-40 text-[9px] mt-1 font-mono">M1-[V1,V2,V3], M2-[V1,V2,V3]...</p>
                          </div>

                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">Hybrid</h4>
                            <p className="opacity-60 text-[10px]">Models process the list sequentially but start at different offsets to avoid overlap.</p>
                            <p className="opacity-40 text-[9px] mt-1 font-mono">Example: With 100 items & 2 models, M1 starts at #1, M2 starts at #51.</p>
                          </div>
                        </div>
                      </div>
                    </TerminalCard>
                  </NeonBorder>
                </div>
              </motion.div>
            )}

            {openHelp === 'variations' && (
              <motion.div
                key="variations-help-panel"
                initial={{ opacity: 0, width: 0, x: 20 }}
                animate={{ opacity: 1, width: 320, x: 0 }}
                exit={{ opacity: 0, width: 0, x: 20 }}
                transition={sharedTransition}
                className="shrink-0 overflow-hidden"
              >
                <div className="pl-6">
                  <NeonBorder color="terminal-cyan">
                    <TerminalCard 
                      title="Variations_Help"
                      onClose={() => setOpenHelp(null)}
                      className="h-[700px] flex flex-col bg-[#050505] backdrop-blur-sm border-terminal-cyan/20 relative overflow-hidden group"
                    >
                      <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-[11px] leading-relaxed">
                        <div className="p-4 bg-terminal-cyan/5 border-l-4 border-terminal-cyan">
                          <h4 className="text-terminal-cyan font-black mb-1 uppercase tracking-tighter text-xs">Keyword Injection</h4>
                          <p className="opacity-70">Forces the model to include specific keywords or themes in the generation output.</p>
                        </div>

                        <div className="space-y-4">
                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">How it works</h4>
                            <p className="opacity-60 text-[10px]">Each line becomes a VARIATION_KEYWORD. The generated content will be forced to include it, ensuring unique outputs and diversity.</p>
                          </div>

                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">Usage</h4>
                            <p className="opacity-60 text-[10px]">Enter one variation per line. These can be topics, emotions, settings, or specific objects you want to appear in the generated data.</p>
                            <div className="mt-2 p-2 bg-black/60 rounded border border-terminal-cyan/10 font-mono text-[9px] opacity-70">
                              late-night coding<br/>
                              eating noodle<br/>
                              midnight rooftop walk
                            </div>
                          </div>

                          <div className="p-3 border border-terminal-cyan/10 bg-black/40 group/item hover:bg-terminal-cyan/5 transition-colors">
                            <h4 className="text-terminal-cyan font-bold mb-1 uppercase tracking-tighter text-[10px]">Impact</h4>
                            <p className="opacity-60 text-[10px]">Helps prevent the model from getting stuck in repetitive loops by introducing mandatory creative constraints for each item.</p>
                          </div>
                        </div>
                      </div>
                    </TerminalCard>
                  </NeonBorder>
                </div>
              </motion.div>
            )}

            {showVariationGenerator && (
              <motion.div
                key="variation-generator-panel"
                initial={{ opacity: 0, width: 0, x: 20 }}
                animate={{ opacity: 1, width: 360, x: 0 }}
                exit={{ opacity: 0, width: 0, x: 20 }}
                transition={sharedTransition}
                className="shrink-0 overflow-hidden"
              >
                <div className="pl-6">
                  <NeonBorder color="terminal-cyan">
                    <TerminalCard 
                      title="Variation_Forge"
                      onClose={() => setShowVariationGenerator(false)}
                      className="h-[700px] flex flex-col bg-[#050505] backdrop-blur-sm border-terminal-cyan/20 relative overflow-hidden group"
                    >
                      <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 text-[11px] leading-relaxed">
                        <div className="p-4 bg-terminal-cyan/5 border-l-4 border-terminal-cyan">
                          <h4 className="text-terminal-cyan font-black uppercase tracking-tight text-xs mb-1">
                            Auto Keyword Synthesizer
                          </h4>
                          <p className="opacity-70">
                            Select a provider node and generate fresh variation keywords that will append to your existing list.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-[0.2em] text-terminal-cyan/50 font-bold flex items-center justify-between">
                              Provider Node
                              <span className="text-terminal-cyan/40 text-[8px]">{providers.length} available</span>
                            </label>
                            <TerminalSelect
                              value={variationGeneratorConfig.providerId}
                              onChange={(e) => setVariationGeneratorConfig(prev => ({ ...prev, providerId: e.target.value }))}
                              disabled={!providers.length || isGeneratingVariations}
                              className="border-terminal-cyan/30 bg-terminal-cyan/5 text-[10px]"
                            >
                              {providers.map(node => (
                                <option key={node.id} value={node.id}>
                                  {node.name} · {node.provider}::{node.model}
                                </option>
                              ))}
                            </TerminalSelect>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-[0.2em] text-terminal-cyan/50 font-bold">Keyword Count</label>
                              <TerminalInputField
                                type="number"
                                min="1"
                                max="200"
                                value={variationGeneratorConfig.count}
                                onChange={(e) => setVariationGeneratorConfig(prev => ({ ...prev, count: Math.max(1, Math.min(200, parseInt(e.target.value) || 1)) }))}
                                disabled={isGeneratingVariations}
                                className="border-terminal-cyan/30 bg-terminal-cyan/5 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-[0.2em] text-terminal-cyan/50 font-bold">Status</label>
                              <div className={cn(
                                "text-[10px] font-mono border px-3 py-1",
                                isGeneratingVariations ? "border-terminal-cyan/40 text-terminal-cyan" : "border-terminal-green/30 text-terminal-green/70"
                              )}>
                                {isGeneratingVariations ? 'SYNTHESIZING...' : 'IDLE'}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-[0.2em] text-terminal-cyan/50 font-bold flex items-center gap-2">
                              Variations Specific Prompt
                              <span className="text-[8px] text-terminal-cyan/40">(Optional)</span>
                            </label>
                            <TerminalTextarea
                              value={variationGeneratorConfig.prompt}
                              onChange={(e) => setVariationGeneratorConfig(prev => ({ ...prev, prompt: e.target.value }))}
                              disabled={isGeneratingVariations}
                              className="h-32"
                              placeholder="e.g. focus on neon-drenched city heists with synthwave mood"
                            />
                          </div>
                        </div>

                        <div className="flex items-center pt-2">
                          <TerminalButton
                            onClick={handleGenerateVariations}
                            disabled={isGeneratingVariations || !providers.length}
                            className="w-full text-[10px]"
                          >
                            {isGeneratingVariations ? '[PROCESSING]' : '[GENERATE]'}
                          </TerminalButton>
                        </div>

                        {recentGeneratedVariations.length > 0 && (
                          <div className="border border-terminal-cyan/20 p-3 bg-black/40 space-y-2">
                            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-terminal-cyan/60 font-bold">
                              <span>Recent Additions</span>
                              <button
                                onClick={() => setRecentGeneratedVariations([])}
                                className="text-terminal-cyan/40 hover:text-terminal-cyan text-[8px]"
                              >
                                [CLEAR]
                              </button>
                            </div>
                            <ul className="text-[10px] text-terminal-green/80 space-y-1 font-mono max-h-48 overflow-y-auto pr-1 custom-scrollbar slim-scrollbar">
                              {recentGeneratedVariations.map((item, idx) => (
                                <li key={`${item}-${idx}`}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TerminalCard>
                  </NeonBorder>
                </div>
              </motion.div>
            )}

            {showProvidersPanel && (
              <motion.div
                key="providers-panel"
                initial={{ opacity: 0, width: 0, x: 20 }}
                animate={{ opacity: 1, width: 450, x: 0 }}
                exit={{ opacity: 0, width: 0, x: 20 }}
                transition={sharedTransition}
                className="shrink-0 overflow-hidden"
              >
                <div className="pl-6">
                  <NeonBorder color="terminal-cyan">
                    <TerminalCard 
                      title="AI_Providers"
                      onClose={() => setShowProvidersPanel(false)}
                      className="h-[700px] flex flex-col bg-[#050505] backdrop-blur-sm border-terminal-cyan/20 relative overflow-hidden group"
                    >
                      
                      <div className="p-4 border-b border-terminal-cyan/10 flex gap-2">
                        <TerminalButton 
                          onClick={() => {
                            const newP = {
                              id: Math.random().toString(36).substr(2, 9),
                              name: `Provider_${providers.length + 1}`,
                              provider: 'ollama',
                              model: 'llama3',
                              baseUrl: 'http://localhost:11434',
                              apiKey: '',
                              enabled: true,
                              temperature: 0.7,
                              frequency_penalty: 0,
                              presence_penalty: 0
                            }
                            setProviders([...providers, newP])
                            setActiveProviderId(newP.id)
                          }}
                          className="flex-1 text-[10px] py-2 border-terminal-cyan/30 text-terminal-cyan hover:bg-terminal-cyan/10 transition-all font-bold"
                        >
                          [ADD_PROVIDER]
                        </TerminalButton>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {providers.map((p) => (
                          <div 
                            key={p.id} 
                            className={cn(
                              "border p-3 space-y-3 transition-all relative group/node",
                              activeProviderId === p.id ? "border-terminal-cyan bg-terminal-cyan/5" : "border-terminal-cyan/10 hover:border-terminal-cyan/30 bg-black/40",
                              !p.enabled && "opacity-50 grayscale"
                            )}
                            onClick={() => setActiveProviderId(p.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", p.enabled ? "bg-terminal-green shadow-[0_0_5px_#00ff00]" : "bg-gray-600")} />
                                <input 
                                  value={p.name}
                                  onChange={(e) => {
                                    const next = [...providers]
                                    const idx = next.findIndex(x => x.id === p.id)
                                    next[idx].name = e.target.value
                                    setProviders(next)
                                  }}
                                  className="bg-transparent border-none text-[11px] font-bold text-terminal-cyan focus:outline-none w-32"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const next = [...providers]
                                    const idx = next.findIndex(x => x.id === p.id)
                                    next[idx].enabled = !next[idx].enabled
                                    setProviders(next)
                                  }}
                                  className={cn(
                                    "text-[8px] px-3 py-1 border transition-all font-bold tracking-wider",
                                    p.enabled ? "border-terminal-green text-terminal-green bg-terminal-green/10 hover:bg-terminal-green/20 shadow-[0_0_8px_rgba(0,255,0,0.3)]" : "border-gray-600 text-gray-600 bg-gray-600/10 hover:bg-gray-600/20"
                                  )}
                                >
                                  {p.enabled ? 'ACTIVE' : 'INACTIVE'}
                                </button>
                                {providers.length > 1 && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setProviders(providers.filter(x => x.id !== p.id))
                                      if (activeProviderId === p.id) setActiveProviderId(providers.find(x => x.id !== p.id).id)
                                    }}
                                    className="text-nerv-red opacity-0 group-hover/node:opacity-30 transition-all hover:opacity-100 hover:text-white"
                                    title="Delete node (consider deactivating instead)"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {activeProviderId === p.id && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-3 pt-2 border-t border-terminal-cyan/10"
                              >
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-terminal-cyan/40 uppercase">Provider</label>
                                    <TerminalSelect 
                                      value={p.provider}
                                      onChange={(e) => {
                                        const next = [...providers]
                                        const idx = next.findIndex(x => x.id === p.id)
                                        next[idx].provider = e.target.value
                                        if (e.target.value === 'ollama') {
                                          next[idx].baseUrl = 'http://localhost:11434'
                                        } else if (e.target.value === 'groq') {
                                          next[idx].baseUrl = 'https://api.groq.com/openai/v1'
                                        } else if (e.target.value === 'deepinfra') {
                                          next[idx].baseUrl = 'https://api.deepinfra.com/v1/openai'
                                        } else {
                                          next[idx].baseUrl = 'https://openrouter.ai'
                                        }
                                        setProviders(next)
                                      }}
                                      className="text-[10px] py-1"
                                    >
                                      <option value="ollama">Ollama</option>
                                      <option value="openrouter">OpenRouter</option>
                                      <option value="groq">Groq</option>
                                      <option value="deepinfra">DeepInfra</option>
                                    </TerminalSelect>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-terminal-cyan/40 uppercase">Model</label>
                                    <div className="flex gap-1">
                                      {fetchedModels[p.id] ? (
                                        <TerminalSelect 
                                          value={p.model}
                                          onChange={(e) => {
                                            const next = [...providers]
                                            const idx = next.findIndex(x => x.id === p.id)
                                            next[idx].model = e.target.value
                                            setProviders(next)
                                          }}
                                          className="text-[10px] py-1 flex-1"
                                        >
                                          {fetchedModels[p.id].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                          ))}
                                        </TerminalSelect>
                                      ) : (
                                        <TerminalInputField 
                                          value={p.model}
                                          onChange={(e) => {
                                            const next = [...providers]
                                            const idx = next.findIndex(x => x.id === p.id)
                                            next[idx].model = e.target.value
                                            setProviders(next)
                                          }}
                                          className="text-[10px] py-1 flex-1"
                                        />
                                      )}
                                      {p.provider === 'ollama' && (
                                        <TerminalButton
                                          onClick={async (e) => {
                                            e.stopPropagation()
                                            try {
                                              const resp = await axios.get(`/api/ollama/tags?base_url=${encodeURIComponent(p.baseUrl)}`)
                                              if (resp.data && resp.data.models) {
                                                const models = resp.data.models.map(m => m.name)
                                                if (models.length > 0) {
                                                  setFetchedModels(prev => ({ ...prev, [p.id]: models }))
                                                  
                                                  // If current model is not in list, auto-select first
                                                  if (!models.includes(p.model)) {
                                                    const next = [...providers]
                                                    const idx = next.findIndex(x => x.id === p.id)
                                                    next[idx].model = models[0]
                                                    setProviders(next)
                                                  }
                                                } else {
                                                  alert("No models found.")
                                                }
                                              } else {
                                                alert("Failed to fetch models: " + resp.data.error)
                                              }
                                            } catch (err) {
                                              alert("Failed to fetch models: " + err.message)
                                            }
                                          }}
                                          variant="secondary"
                                          className="text-[8px] px-2 border border-terminal-cyan/30 text-terminal-cyan hover:bg-terminal-cyan/10 transition-all font-bold"
                                          title="Fetch Models"
                                        >
                                          [FETCH]
                                        </TerminalButton>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[8px] text-terminal-cyan/40 uppercase">
                                    {p.provider === 'ollama' ? 'Base URL' : 'API Key'}
                                  </label>
                                  <TerminalInputField 
                                    type={p.provider === 'openrouter' || p.provider === 'groq' ? 'password' : 'text'}
                                    value={p.provider === 'ollama' ? p.baseUrl : p.apiKey}
                                    onChange={(e) => {
                                      const next = [...providers]
                                      const idx = next.findIndex(x => x.id === p.id)
                                      if (p.provider === 'ollama') next[idx].baseUrl = e.target.value
                                      else next[idx].apiKey = e.target.value
                                      setProviders(next)
                                    }}
                                    className="text-[10px] py-1"
                                  />
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8px] text-terminal-cyan/40 uppercase">Temp</label>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenHelp(openHelp === 'temp' ? null : 'temp') }}
                                        className={cn("text-[8px] px-1 rounded border transition-colors", openHelp === 'temp' ? "bg-terminal-cyan/20 border-terminal-cyan text-terminal-cyan" : "border-terminal-cyan/20 text-terminal-cyan/40 hover:text-terminal-cyan")}
                                      >?</button>
                                    </div>
                                    <TerminalInputField 
                                      type="number" step="0.1"
                                      value={p.temperature}
                                      onChange={(e) => {
                                        const next = [...providers]
                                        const idx = next.findIndex(x => x.id === p.id)
                                        next[idx].temperature = parseFloat(e.target.value)
                                        setProviders(next)
                                      }}
                                      className="text-[9px] py-1"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8px] text-terminal-cyan/40 uppercase">Freq</label>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenHelp(openHelp === 'freq' ? null : 'freq') }}
                                        className={cn("text-[8px] px-1 rounded border transition-colors", openHelp === 'freq' ? "bg-terminal-cyan/20 border-terminal-cyan text-terminal-cyan" : "border-terminal-cyan/20 text-terminal-cyan/40 hover:text-terminal-cyan")}
                                      >?</button>
                                    </div>
                                    <TerminalInputField 
                                      type="number" step="0.1"
                                      value={p.frequency_penalty}
                                      onChange={(e) => {
                                        const next = [...providers]
                                        const idx = next.findIndex(x => x.id === p.id)
                                        next[idx].frequency_penalty = parseFloat(e.target.value)
                                        setProviders(next)
                                      }}
                                      className="text-[9px] py-1"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8px] text-terminal-cyan/40 uppercase">Pres</label>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenHelp(openHelp === 'pres' ? null : 'pres') }}
                                        className={cn("text-[8px] px-1 rounded border transition-colors", openHelp === 'pres' ? "bg-terminal-cyan/20 border-terminal-cyan text-terminal-cyan" : "border-terminal-cyan/20 text-terminal-cyan/40 hover:text-terminal-cyan")}
                                      >?</button>
                                    </div>
                                    <TerminalInputField 
                                      type="number" step="0.1"
                                      value={p.presence_penalty}
                                      onChange={(e) => {
                                        const next = [...providers]
                                        const idx = next.findIndex(x => x.id === p.id)
                                        next[idx].presence_penalty = parseFloat(e.target.value)
                                        setProviders(next)
                                      }}
                                      className="text-[9px] py-1"
                                    />
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {openHelp && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="mt-2 p-2 bg-terminal-cyan/5 border border-terminal-cyan/10 rounded overflow-hidden"
                                    >
                                      <div className="flex items-start gap-2">
                                        <div className="text-terminal-cyan mt-0.5">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        </div>
                                        <div className="text-[9px] text-terminal-cyan/70 leading-relaxed">
                                          {openHelp === 'temp' && (
                                            <>
                                              <span className="text-terminal-cyan font-bold">TEMPERATURE:</span> Controls randomness. Higher values (e.g., 1.0) make output more creative but less predictable. Lower values (e.g., 0.2) make it more deterministic and focused.
                                            </>
                                          )}
                                          {openHelp === 'freq' && (
                                            <>
                                              <span className="text-terminal-cyan font-bold">FREQUENCY PENALTY:</span> Decreases the likelihood of the model repeating the same lines verbatim. Higher values (0.1 to 2.0) reduce repetition of specific words and phrases.
                                            </>
                                          )}
                                          {openHelp === 'pres' && (
                                            <>
                                              <span className="text-terminal-cyan font-bold">PRESENCE PENALTY:</span> Increases the likelihood of the model talking about new topics. Higher values encourage the model to be more diverse in content and vocabulary.
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="p-4 bg-terminal-cyan/5 border-t border-terminal-cyan/10">
                        <p className="text-[9px] text-terminal-cyan/40 leading-relaxed italic">
                          Tasks are distributed across ACTIVE providers in a round-robin sequence for load balance.
                        </p>
                      </div>
                    </TerminalCard>
                  </NeonBorder>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default App
