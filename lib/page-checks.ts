import { API_URL } from "@/lib/config"
import { fetchWithTimeout } from "@/lib/http"

export type HeadingItem = {
  level: string
  text: string
}

export type TopWord = {
  word: string
  count: number
}

export type PageResource = {
  url: string
  type: string
  bytes: number | null
  status_code: number | null
  error: string
}

export type PageCheckResult = {
  url: string
  final_url: string | null
  server_status_code: number | null
  redirect_count: number
  response_time_ms: number | null
  content_type: string
  title: string
  h1: string
  meta_description: string
  canonical: string | null
  meta_robots: string
  last_modified: string
  modified_tags: Array<{ source: string; value: string }>
  is_indexable: boolean | null
  heading_structure: HeadingItem[]
  html_weight_bytes: number
  resource_summary: {
    found: number
    checked: number
    top_heavy_resources: PageResource[]
  }
  image_checks: {
    total: number
    with_alt: number
    missing_alt: number
    with_width_height: number
    missing_width_height: number
    missing_alt_samples: string[]
    missing_width_height_samples: string[]
  }
  navigation_checks: {
    total: number
    with_aria_label: number
    without_aria_label: number
  }
  text_stats: {
    characters: number
    words: number
    top_words: TopWord[]
  }
  warnings: string[]
  markup_checks: {
    schema_org_found: boolean
    schema_org_types: string[]
    opengraph_found: boolean
    opengraph_types: string[]
  }
  error_message: string
  status: string
}

export type PageCheckRun = {
  id: number
  status: "pending" | "running" | "done" | "error" | "cancelled"
  cancel_requested: boolean
  urls: string[]
  results: PageCheckResult[]
  warnings: Array<{ url: string; warning: string }>
  total: number
  checked: number
  error_message: string
  created_at: string
  updated_at: string
}

function getErrorMessage(data: unknown) {
  const body = data as { urls?: string[]; detail?: string; error?: string; error_message?: string } | null
  return body?.urls?.[0] ?? body?.detail ?? body?.error ?? body?.error_message ?? "Не удалось запустить проверку"
}

export async function startPageCheckRun(urls: string[]) {
  const response = await fetchWithTimeout(`${API_URL}/api/page-checks/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(data))
  }

  return data as PageCheckRun
}

export async function getPageCheckRun(id: number) {
  const response = await fetchWithTimeout(`${API_URL}/api/page-checks/${id}/`, {
    method: "GET",
    cache: "no-store",
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(data))
  }

  return data as PageCheckRun
}

export async function downloadPageCheckRun(id: number) {
  const response = await fetchWithTimeout(`${API_URL}/api/page-checks/${id}/download-xlsx/`, {
    method: "GET",
    timeoutMs: 60000,
  })

  if (!response.ok) {
    throw new Error("Не удалось скачать XLSX")
  }

  return response.blob()
}

export async function cancelPageCheckRun(id: number) {
  const response = await fetchWithTimeout(`${API_URL}/api/page-checks/${id}/cancel/`, {
    method: "POST",
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(data))
  }

  return data as PageCheckRun
}
