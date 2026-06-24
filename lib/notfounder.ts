import { API_URL } from "@/lib/config"
import { fetchWithTimeout } from "@/lib/http"

export type NotfounderResult = {
  url: string
  status_code: number | null
  final_url: string
  error: string
}

export type NotfounderStreamEvent =
  | { event: "started"; source_url: string }
  | { event: "page_loaded"; source_url: string; page_status: number; total: number }
  | { event: "link_checked"; index: number; total: number; result: NotfounderResult }
  | { event: "finished"; total: number }
  | { event: "error"; message: string }

export function createNotfounderStreamUrl(url: string) {
  const params = new URLSearchParams({ url })
  return `${API_URL}/api/notfounder/stream/?${params.toString()}`
}

export async function downloadNotfounderResults(results: NotfounderResult[]) {
  const response = await fetchWithTimeout(`${API_URL}/api/notfounder/download-xlsx/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ results }),
  })

  if (!response.ok) {
    throw new Error("Не удалось скачать XLSX")
  }

  return response.blob()
}
