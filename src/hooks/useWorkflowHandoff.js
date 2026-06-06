import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkflow } from '../context/WorkflowContext'

/**
 * Consumes a pending workflow handoff when landing on a tool page.
 * @param {string} toolId - must match workflowEngine tool id
 * @param {{ onFile?: (f: File) => void, onFiles?: (fs: File[]) => void }} handlers
 */
export function useWorkflowHandoff(toolId, { onFile, onFiles } = {}) {
  const { peekHandoff, consumeHandoff } = useWorkflow()
  const [notice, setNotice] = useState(null)
  const appliedRef = useRef(null)

  useEffect(() => {
    const pending = peekHandoff(toolId)
    if (!pending) return
    if (appliedRef.current === pending.createdAt) return

    if (pending.files?.length && onFiles) {
      onFiles(pending.files)
      setNotice(`Loaded ${pending.files.length} file(s) from ${pending.sourceTitle}`)
    } else if (pending.file && onFile) {
      onFile(pending.file)
      setNotice(`Loaded "${pending.file.name}" from ${pending.sourceTitle}`)
    } else if (pending.file && onFiles) {
      onFiles([pending.file])
      setNotice(`Loaded "${pending.file.name}" from ${pending.sourceTitle}`)
    } else if (pending.files?.length && onFile) {
      onFile(pending.files[0])
      setNotice(`Loaded "${pending.files[0].name}" from ${pending.sourceTitle}`)
    }

    appliedRef.current = pending.createdAt
    consumeHandoff(toolId)
  }, [toolId, peekHandoff, consumeHandoff, onFile, onFiles])

  return { handoffNotice: notice, clearHandoffNotice: () => setNotice(null) }
}

/**
 * Handoff helper for tools that must run a loader (e.g. handleFile) — not just setState.
 * Call after `handleFile` / `loadFile` is defined in the component.
 */
export function useFileLoaderHandoff(toolId, loadFile) {
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

  return useWorkflowHandoff(toolId, { onFile: onHandoffFile, onFiles: onHandoffFiles })
}