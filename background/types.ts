export interface Provider {
  generate: (prompt: string, signal?: AbortSignal) => Promise<string>
  generateWithFormat: <T>(prompt: string, signal?: AbortSignal) => Promise<T>
}
