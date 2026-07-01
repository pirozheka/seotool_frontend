'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Download, ExternalLink, FileSpreadsheet, Loader2, SearchX } from "lucide-react"

import {
  createNotfounderStreamUrl,
  downloadNotfounderResults,
  type NotfounderResult,
  type NotfounderStreamEvent,
} from "@/lib/notfounder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type RunStatus = "idle" | "running" | "done" | "error"

function getStatusClass(statusCode: number | null) {
  if (statusCode === 404) return "status-pill status-pill-danger"
  if (statusCode == null) return "status-pill status-pill-warning"
  if (statusCode >= 200 && statusCode < 400) return "status-pill status-pill-success"
  if (statusCode >= 400) return "status-pill status-pill-warning"
  return "status-pill status-pill-neutral"
}

function getStatusLabel(statusCode: number | null) {
  if (statusCode == null) return "Ошибка"
  return String(statusCode)
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function NotfounderPage() {
  const [url, setUrl] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [pageStatus, setPageStatus] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [checked, setChecked] = useState(0)
  const [results, setResults] = useState<NotfounderResult[]>([])
  const [status, setStatus] = useState<RunStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const streamRef = useRef<EventSource | null>(null)

  const brokenCount = useMemo(
    () => results.filter((item) => item.status_code === 404).length,
    [results]
  )
  const errorCount = useMemo(
    () => results.filter((item) => item.status_code == null || item.error).length,
    [results]
  )
  const redirectCount = useMemo(
    () => results.filter((item) => item.final_url && item.final_url !== item.url).length,
    [results]
  )
  const progress = total > 0 ? Math.round((checked / total) * 100) : 0

  useEffect(() => {
    return () => {
      streamRef.current?.close()
    }
  }, [])

  const handleSubmit = () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl || status === "running") return

    streamRef.current?.close()
    setStatus("running")
    setError(null)
    setDownloadError(null)
    setSourceUrl("")
    setPageStatus(null)
    setTotal(0)
    setChecked(0)
    setResults([])

    const stream = new EventSource(createNotfounderStreamUrl(trimmedUrl))
    streamRef.current = stream

    stream.onmessage = (message) => {
      const data = JSON.parse(message.data) as NotfounderStreamEvent

      if (data.event === "started") {
        setSourceUrl(data.source_url)
        return
      }

      if (data.event === "page_loaded") {
        setSourceUrl(data.source_url)
        setPageStatus(data.page_status)
        setTotal(data.total)
        return
      }

      if (data.event === "link_checked") {
        setChecked(data.index)
        setTotal(data.total)
        setResults((current) => [...current, data.result])
        return
      }

      if (data.event === "finished") {
        setTotal(data.total)
        setStatus("done")
        stream.close()
        streamRef.current = null
        return
      }

      if (data.event === "error") {
        setError(data.message)
        setStatus("error")
        stream.close()
        streamRef.current = null
      }
    }

    stream.onerror = () => {
      setError("Соединение с анализатором прервано")
      setStatus("error")
      stream.close()
      streamRef.current = null
    }
  }

  const handleDownload = async () => {
    if (!results.length) return

    try {
      setDownloading(true)
      setDownloadError(null)
      const blob = await downloadNotfounderResults(results)
      saveBlob(blob, "notfounder-results.xlsx")
    } catch (downloadError: unknown) {
      setDownloadError(downloadError instanceof Error ? downloadError.message : "Не удалось скачать XLSX")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="page-shell space-y-6">
      <section className="surface-card motion-fade-up relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/25" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/20" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Notfounder</p>
            <h1 className="section-title text-3xl sm:text-4xl">Поиск битых ссылок</h1>
            <p className="section-subtitle max-w-3xl">
              Проверяет ссылки на выбранной странице, исключает header и footer, показывает 404, ошибки доступа и итоговые URL после редиректов.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleDownload}
            disabled={!results.length || downloading}
            className="h-11 rounded-xl bg-cyan-600 px-4 text-white shadow-sm shadow-cyan-700/20 hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/70 dark:hover:bg-cyan-400"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Скачать XLSX
          </Button>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-500">Найдено ссылок</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-500">Проверено</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-700 dark:text-cyan-300">{checked}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-500">404</p>
            <p className="mt-1 text-2xl font-semibold text-rose-700 dark:text-rose-300">{brokenCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-500">Редиректы</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300">{redirectCount}</p>
          </div>
        </div>
      </section>

      <main className="grid grid-cols-1 gap-6">
        <section className="surface-card motion-fade-up motion-delay-1">
          <div className="space-y-2">
            <h2 className="section-title">Новая проверка</h2>
            <p className="section-subtitle">Введите страницу, с которой нужно собрать ссылки и проверить их HTTP-статусы.</p>
          </div>

          <div className="mt-5 space-y-3">
            <label htmlFor="notfounder-url" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              URL страницы
            </label>
            <Input
              id="notfounder-url"
              type="text"
              value={url}
              placeholder="https://example.com/page"
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleSubmit()
                }
              }}
              disabled={status === "running"}
              className="h-11 rounded-xl border-slate-300 bg-white/90 dark:border-slate-600 dark:bg-slate-900/70"
            />
            <p className="text-xs text-slate-500">Можно вводить адрес с протоколом или без него.</p>
          </div>

          <Button
            className="mt-5 h-11 w-full rounded-xl bg-cyan-600 text-white shadow-sm shadow-cyan-700/20 hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/70 dark:hover:bg-cyan-400"
            onClick={handleSubmit}
            disabled={status === "running" || !url.trim()}
          >
            {status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchX className="h-4 w-4" />}
            {status === "running" ? "Проверяем..." : "Запустить проверку"}
          </Button>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Прогресс</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-600 transition-all dark:bg-cyan-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {sourceUrl ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-xs uppercase tracking-wide text-slate-500">Источник</p>
              <p className="mt-1 break-all font-medium text-slate-800 dark:text-slate-100">{sourceUrl}</p>
              <p className="mt-2 text-slate-500">HTTP страницы: {pageStatus ?? "-"}</p>
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          {downloadError ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300">
              {downloadError}
            </p>
          ) : null}
        </section>

        <section className="surface-card motion-fade-up motion-delay-2">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="section-title">Результаты</h2>
              <p className="section-subtitle">Ссылки появляются по мере проверки. Красным выделяются найденные 404.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              Ошибок: {errorCount}
            </span>
          </div>

          {status === "idle" ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-10 text-center dark:border-slate-700/70 dark:bg-slate-900/60">
              <Download className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-slate-700 dark:text-slate-200">Результатов пока нет.</p>
              <p className="mt-1 text-sm text-slate-500">Запустите проверку в форме слева.</p>
            </div>
          ) : null}

          {status === "running" && results.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/70 dark:border-slate-700/70 dark:bg-slate-800/70" />
              ))}
            </div>
          ) : null}

          {results.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-700/70 dark:bg-slate-900/60">
              <div className="max-h-[620px] overflow-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">Статус</th>
                      <th className="px-4 py-3 text-left">URL</th>
                      <th className="px-4 py-3 text-left">Финальный URL</th>
                      <th className="px-4 py-3 text-left">Ошибка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/70">
                    {results.map((item, index) => (
                      <tr key={`${item.url}-${index}`} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={getStatusClass(item.status_code)}>
                            {item.status_code === 404 ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {getStatusLabel(item.status_code)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[280px] items-start gap-1 break-all font-medium text-cyan-700 hover:underline dark:text-cyan-300">
                            {item.url}
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {item.final_url ? (
                            <span className="block max-w-[260px] break-all">{item.final_url}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-rose-700 dark:text-rose-300">
                          {item.error || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
