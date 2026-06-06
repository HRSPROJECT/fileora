import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkflow } from '../context/WorkflowContext'

/**
 * Consumes a pending workflow handoff when landing on a tool page.
 * @param {string} toolId - must match workflowEngine tool id
 * @param {{ onFile?: (f: File) => void, onFiles?: (fs: File[]) => void, onSnapshot?: (s: unknown) => void }} handlers
 */
export function useWorkflowHandoff(toolId, { onFile, onFiles, onSnapshot } = {}) {
  const location = useLocation()
  const { handoff, peekHandoff, consumeHandoff, clearDeliveredForTool } = useWorkflow()
  const [notice, setNotice] = useState(null)
  const appliedOnMountRef = useRef(false)

  useLayoutEffect(() => {
    appliedOnMountRef.current = false
  }, [])

  useLayoutEffect(() => {
    const workflowNav = location.state?.workflowHandoff === true

    if (!workflowNav && !handoff) {
      clearDeliveredForTool(toolId)
    }

    const pending = peekHandoff(toolId)
    if (!pending) return
    if (appliedOnMountRef.current) return

    const restoreLabel = pending.isWorkflowRestore
      ? `Restored your work in ${pending.sourceTitle}`
      : null

    if (pending.isWorkflowRestore && pending.snapshot != null && onSnapshot) {
      onSnapshot(pending.snapshot)
      setNotice(restoreLabel || `Restored your work in ${pending.sourceTitle}`)
      appliedOnMountRef.current = true
      consumeHandoff(toolId)
      return
    }

    if (pending.files?.length && onFiles) {
      onFiles(pending.files)
      setNotice(
        restoreLabel || `Loaded ${pending.files.length} file(s) from ${pending.sourceTitle}`
      )
    } else if (pending.file && onFile) {
      onFile(pending.file)
      setNotice(
        restoreLabel || `Loaded "${pending.file.name}" from ${pending.sourceTitle}`
      )
    } else if (pending.file && onFiles) {
      onFiles([pending.file])
      setNotice(
        restoreLabel || `Loaded "${pending.file.name}" from ${pending.sourceTitle}`
      )
    } else if (pending.files?.length && onFile) {
      onFile(pending.files[0])
      setNotice(
        restoreLabel || `Loaded "${pending.files[0].name}" from ${pending.sourceTitle}`
      )
    } else {
      return
    }

    appliedOnMountRef.current = true
    consumeHandoff(toolId)
  }, [
    toolId,
    handoff,
    location.state,
    peekHandoff,
    consumeHandoff,
    clearDeliveredForTool,
    onFile,
    onFiles,
    onSnapshot,
  ])

  return { handoffNotice: notice, clearHandoffNotice: () => setNotice(null) }
}

/**
 * Handoff helper for tools that must run a loader (e.g. handleFile) — not just setState.
 * Call after `handleFile` / `loadFile` is defined in the component.
 */
export function useFileLoaderHandoff(toolId, loadFile, { onSnapshot } = {}) {
  const loadRef = useRef(loadFile)

  useEffect(() => {
    loadRef.current = loadFile
  }, [loadFile])

  const onHandoffFile = useCallback((file) => {
    if (file) void loadRef.current(file)
  }, [])

  const onHandoffFiles = useCallback((files) => {
    if (files?.length) void loadRef.current(files[0])
  }, [])

  return useWorkflowHandoff(toolId, { onFile: onHandoffFile, onFiles: onHandoffFiles, onSnapshot })
}

/**
 * Restore a PDF tool to its finished output view (signed, rotated, etc.).
 */
export function restorePdfOutputSnapshot(snap, {
  setFile,
  setDownloadableBlob,
  setError,
  setProcessing,
  resetPreview,
  extra,
}) {
  if (!snap?.file) return false

  setFile(snap.file)
  setError('')
  setProcessing(false)

  if (snap.downloadableBlob) {
    setDownloadableBlob(snap.downloadableBlob)
    resetPreview?.()
    extra?.(snap)
    return true
  }

  return false
}