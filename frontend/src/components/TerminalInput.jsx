import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

export function TerminalInput({ onCommand, disabled = false }) {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (command.trim() && !disabled) {
      onCommand(command.trim())
      setHistory([...history, command])
      setCommand('')
      setHistoryIndex(-1)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (command.trim() && !disabled) {
        onCommand(command.trim())
        setHistory([...history, command])
        setCommand('')
        setHistoryIndex(-1)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand('')
      }
    }
  }

  return (
    <div className="terminal-text">
      <div className="flex items-center gap-2">
        <span className="text-terminal-green">ITERABEAST@TERMINAL:</span>
        <span className="text-terminal-cyan">~$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          onSubmit={handleSubmit}
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-terminal-green placeholder-terminal-green/50"
          placeholder="Enter command..."
        />
        <span className="terminal-cursor"></span>
      </div>
      
      {history.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Press ↑/↓ for command history
        </div>
      )}
    </div>
  )
}
