import React, { createContext, useCallback, useContext, useState } from 'react'
import { TOOLS } from '../utils/workflowEngine'

const WorkflowContext = createContext(null)

export function WorkflowProvider({ children }) {
  const [handoff, setHandoff] = useState(null)

  const startHandoff = useCallback(({ file, files, sourceToolId, targetToolId }) => {
    const source = TOOLS[sourceToolId]
    setHandoff({
      file: file || null,
      files: files || null,
      sourceToolId,
      sourceTitle: source?.title || 'Previous tool',
      targetToolId,
      createdAt: Date.now(),
    })
  }, [])

  const consumeHandoff = useCallback((toolId) => {
    setHandoff((current) => {
      if (!current || current.targetToolId !== toolId) return current
      return null
    })
  }, [])

  const peekHandoff = useCallback((toolId) => {
    if (!handoff || handoff.targetToolId !== toolId) return null
    return handoff
  }, [handoff])

  const clearHandoff = useCallback(() => setHandoff(null), [])

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