import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { TOOLS } from '../utils/workflowEngine'

const WorkflowContext = createContext(null)

export function WorkflowProvider({ children }) {
  const [handoff, setHandoff] = useState(null)
  const deliveredRef = useRef(null)

  const startHandoff = useCallback(({ file, files, sourceToolId, targetToolId }) => {
    const source = TOOLS[sourceToolId]
    const payload = {
      file: file || null,
      files: files?.length ? files : null,
      sourceToolId,
      sourceTitle: source?.title || 'Previous tool',
      targetToolId,
      createdAt: Date.now(),
    }
    deliveredRef.current = null
    setHandoff(payload)
  }, [])

  const consumeHandoff = useCallback((toolId) => {
    setHandoff((current) => {
      if (!current || current.targetToolId !== toolId) return current
      deliveredRef.current = current
      return null
    })
  }, [])

  const peekHandoff = useCallback((toolId) => {
    if (handoff && handoff.targetToolId === toolId) return handoff
    if (deliveredRef.current?.targetToolId === toolId) return deliveredRef.current
    return null
  }, [handoff])

  const clearHandoff = useCallback(() => {
    deliveredRef.current = null
    setHandoff(null)
  }, [])

  return (
    <WorkflowContext.Provider
      value={{
        handoff,
        startHandoff,
        consumeHandoff,
        peekHandoff,
        clearHandoff,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext)
  if (!ctx) {
    return {
      handoff: null,
      startHandoff: () => {},
      consumeHandoff: () => {},
      peekHandoff: () => null,
      clearHandoff: () => {},
    }
  }
  return ctx
}