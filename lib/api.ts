import { API_URL } from "@/lib/config"
import { fetchWithTimeout } from "@/lib/http"

export async function createAudit(domain: string) {
  const response = await fetchWithTimeout(`${API_URL}/api/audits/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain }),
    timeoutMs: 120000,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data?.domain?.[0] ??
      data?.detail ??
      data?.error ??
      "Ошибка создания аудита"

    throw new Error(message)
  }

  return data
}

export async function getAuditList() {
  const response = await fetchWithTimeout(`${API_URL}/api/audits/`, {
    method: "GET",
    cache: "no-store",
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data?.detail ??
      data?.error ??
      "Ошибка загрузки аудитов"

    throw new Error(message)
  }

  return data
}

export async function getAudit(id: string | number) {
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/api/audits/${id}/`,
      {
        method: "GET",
        cache: "no-store",
      }
    )

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const message =
        data?.detail ??
        data?.error ??
        "Ошибка загрузки аудита"

      throw new Error(message)
    }

    return data
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error("Сервер недоступен")
  }
}

export async function deleteAudit(id: string | number) {
  const response = await fetchWithTimeout(`${API_URL}/api/audits/${id}/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    let data: unknown = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    const body = data as { detail?: string; error?: string } | null
    const message = body?.detail ?? body?.error ?? "Ошибка удаления аудита"
    throw new Error(message)
  }
}
