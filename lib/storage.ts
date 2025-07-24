// Global storage that persists through Next.js recompilations
declare global {
  var __jobResultsStorage: Map<string, any[]> | undefined
}

const globalResultsStorage = globalThis.__jobResultsStorage ?? (globalThis.__jobResultsStorage = new Map<string, any[]>())

export function storeResults(jobId: string, results: any[]) {
  globalResultsStorage.set(jobId, results)
  console.log(`Storage: ${results.length} results stored for job ${jobId}`)
  
  // Auto-cleanup after 1 hour
  setTimeout(() => {
    globalResultsStorage.delete(jobId)
    console.log(`Storage: Auto-cleaned job ${jobId}`)
  }, 60 * 60 * 1000)
}

export function getResults(jobId: string): any[] | undefined {
  const results = globalResultsStorage.get(jobId)
  return results
}

export function deleteResults(jobId: string) {
  const deleted = globalResultsStorage.delete(jobId)
  console.log(`Storage: Deleted job ${jobId}, success: ${deleted}`)
  return deleted
}

export function getAllStoredJobIds(): string[] {
  return Array.from(globalResultsStorage.keys())
}

export function clearAllResults() {
  const count = globalResultsStorage.size
  globalResultsStorage.clear()
  console.log(`Storage: Cleared ${count} jobs`)
  return count
} 