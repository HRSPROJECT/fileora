# Changelog

All notable changes to Fileora are documented here.

## [1.0.0] — 2026-06-06

### Added
- **Continue with workflows** across all 30+ tools — contextual next-step suggestions after each tool finishes (e.g. Compress → Image to PDF, Resizer, Scanner, Share; Merge PDF → Split, Protect, Sign).
- In-browser **workflow handoff** — output files pass to the next tool without re-upload.
- **Offline vs online policy** — clear messaging that all tools work offline after first load; only P2P Share needs internet to pair devices.
- `WorkflowContext`, `workflowEngine.js`, and `ContinueWithPanel` UI components.
- Network status hook and Wi‑Fi badges on Share-related actions.

### Improved
- Home page copy, FAQs, and How it works section for workflow chaining.
- P2P Share reliability and error diagnostics.
- PDF decrypt support for encrypted object streams.
- Client-side PDF encryption in Protect PDF.
- Blob URL lifecycle management (`useBlobUrl`) to prevent memory leaks.
- ESLint clean build (0 errors).

### Fixed
- Scanner camera stop ordering.
- P2P control message detection for chunked transfers.
- Video tool OPFS cleanup timing for Share handoff.
- Passport Photo helper script order.