const DEFAULT_TIMEOUT_MS = 15000

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...requestInit } = init
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const abortFromCaller = () => controller.abort()
  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener("abort", abortFromCaller, { once: true })
    }
  }

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Сервер не ответил вовремя. Проверьте, что backend запущен и доступен.")
    }
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", abortFromCaller)
  }
}
