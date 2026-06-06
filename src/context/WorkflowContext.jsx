import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { TOOLS } from '../utils/workflowEngine'

const WorkflowContext = createContext(null)

export function WorkflowProvider({ children }) {
  const [handoff, setHandoff] = useState(null)
  const [workflowStack, setWorkflowStack] = useState([])
  const deliveredRef = useRef(null)

  const startHandoff = useCallback(({ file, files, sourceToolId, targetToolId, isWorkflowRestore = false }) => {
    const source = TOOLS[sourceToolId]
    const payload = {
      file: file || null,
      files: files?.length ? files : null,
      sourceToolId,
      sourceTitle: source?.title || (isWorkflowRestore ? 'Previous step' : 'Previous tool'),
      targetToolId,
      isWorkflowRestore,
      createdAt: Date.now(),
    }
    deliveredRef.current = null
    setHandoff(payload)
  }, [])

  const pushWorkflowStep = useCallback(({ sourceToolId, restore }) => {
    if (!restore?.file && !restore?.files?.length && restore?.snapshot == null) return

    const source = TOOLS[sourceToolId]
    setWorkflowStack((stack) => [
      ...stack,
      {
        toolId: sourceToolId,
        route: source?.route,
        title: source?.title || 'Previous tool',
        restore: {
          file: restore.file || null,
          files: restore.files?.length ? restore.files : null,
          snapshot: restore.snapshot ?? null,
        },
      },
    ])
  }, [])

  const getBackTarget = useCallback(() => {
    if (!workflowStack.length) return null
    return workflowStack[workflowStack.length - 1]
  }, [workflowStack])

  const goBack = useCallback(() => {
    if (!workflowStack.length) return null

    const step = workflowStack[workflowStack.length - 1]
    setWorkflowStack((stack) => stack.slice(0, -1))

    const payload = {
      file: step.restore.file || null,
      files: step.restore.files?.length ? step.restore.files : null,
      snapshot: step.restore.snapshot ?? null,
      sourceToolId: step.toolId,
      sourceTitle: step.title,
      targetToolId: step.toolId,
      isWorkflowRestore: true,
      createdAt: Date.now(),
    }
    deliveredRef.current = null
    setHandoff(payload)
    return step.route
  }, [workflowStack])

  const clearWorkflowStack = useCallback(() => {
    setWorkflowStack([])
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

  const clearDeliveredForTool = useCallback((toolId) => {
    if (deliveredRef.current?.targetToolId === toolId) {
      deliveredRef.current = null
    }
  }, [])

  const canGoBack = workflowStack.length > 0

  return (
    <WorkflowContext.Provider
      value={{
        handoff,
        startHandoff,
        pushWorkflowStep,
        getBackTarget,
        goBack,
        canGoBack,
        clearWorkflowStack,
        consumeHandoff,
        peekHandoff,
        clearHandoff,
        clearDeliveredForTool,
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
      pushWorkflowStep: () => {},
      getBackTarget: () => null,
      goBack: () => null,
      canGoBack: false,
      clearWorkflowStack: () => {},
      consumeHandoff: () => {},
      peekHandoff: () => null,
      clearHandoff: () => {},
      clearDeliveredForTool: () => {},
    }
  }
  return ctx
}