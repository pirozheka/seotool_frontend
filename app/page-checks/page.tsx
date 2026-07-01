'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Navigation,
  Ruler,
  Search,
  Tags,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  cancelPageCheckRun,
  downloadPageCheckRun,
  getPageCheckRun,
  startPageCheckRun,
  type PageCheckResult,
  type PageCheckRun,
  type PageResource,
} from "@/lib/page-checks"

const WARNINGS_PER_PAGE = 8

function parseUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatBytes(value: number | null | undefined) {
  if (value == null) return "-"
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

function statusPill(result: PageCheckResult) {
  if (result.status === "error") return "status-pill status-pill-danger"
  if (result.warnings.length) return "status-pill status-pill-warning"
  return "status-pill status-pill-success"
}

function runStatusLabel(status: PageCheckRun["status"] | null) {
  if (status === "pending") return "В очереди"
  if (status === "running") return "В работе"
  if (status === "done") return "Готово"
  if (status === "error") return "Ошибка"
  if (status === "cancelled") return "Остановлена"
  return "Не запускалась"
}

function boolLabel(value: boolean | null) {
  if (value == null) return "-"
  return value ? "Да" : "Нет"
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

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}

function WideField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 break-words text-sm leading-6 text-slate-800 dark:text-slate-100">{value || "-"}</div>
    </div>
  )
}

function ResourceList({ resources }: { resources: PageResource[] }) {
  if (!resources.length) {
    return <p className="text-sm text-slate-500">Тяжелые ресурсы не определены.</p>
  }

  return (
    <div className="space-y-2">
      {resources.map((resource) => (
        <div
          key={`${resource.type}-${resource.url}`}
          className="grid gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60"
        >
          <span className="font-medium text-slate-700 dark:text-slate-200">{resource.type}</span>
          <span className="text-slate-500">{formatBytes(resource.bytes)}</span>
          <span className="break-all text-cyan-700 dark:text-cyan-300">{resource.url}</span>
        </div>
      ))}
    </div>
  )
}

function TypeList({ label, values, fallback }: { label: string; values: string[]; fallback?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {values.length ? (
        <div className="mt-2 space-y-1">
          {values.map((value) => (
            <div key={value} className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {value}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{fallback ?? "-"}</p>
      )}
    </div>
  )
}

export default function PageChecksPage() {
  const [rawUrls, setRawUrls] = useState("")
  const [run, setRun] = useState<PageCheckRun | null>(null)
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentResultIndex, setCurrentResultIndex] = useState(0)
  const [warningPage, setWarningPage] = useState(1)
  const pollStartedAtRef = useRef<number | null>(null)

  const urls = useMemo(() => parseUrls(rawUrls), [rawUrls])
  const results = run?.results ?? []
  const allWarnings = run?.warnings ?? []
  const warningPages = results.filter((result) => result.warnings.length > 0).length
  const indexablePages = results.filter((result) => result.is_indexable).length
  const isRunning = run?.status === "pending" || run?.status === "running"
  const progress = run && run.total > 0 ? Math.round((run.checked / run.total) * 100) : 0
  const totalWarningPages = Math.max(1, Math.ceil(allWarnings.length / WARNINGS_PER_PAGE))
  const activeResultIndex = Math.min(currentResultIndex, Math.max(results.length - 1, 0))
  const activeWarningPage = Math.min(warningPage, totalWarningPages)
  const currentResult = results[activeResultIndex] ?? null
  const visibleWarnings = allWarnings.slice(
    (activeWarningPage - 1) * WARNINGS_PER_PAGE,
    activeWarningPage * WARNINGS_PER_PAGE
  )

  useEffect(() => {
    if (true) return

    const timer = window.setInterval(async () => {
      try {
        const nextRun = await getPageCheckRun(run!.id)
        setRun(nextRun)
      } catch (pollError: unknown) {
        setError(pollError instanceof Error ? pollError.message : "Не удалось обновить статус")
      }
    }, 1500)

    return () => window.clearInterval(timer)
  }, [isRunning, run])

  useEffect(() => {
    if (!run?.id || !isRunning) {
      pollStartedAtRef.current = null
      return
    }

    pollStartedAtRef.current ??= Date.now()

    const pollRun = async () => {
      try {
        const nextRun = await getPageCheckRun(run.id)
        setRun(nextRun)

        const waitingTooLong =
          (nextRun.status === "pending" || nextRun.status === "running") &&
          nextRun.checked === 0 &&
          pollStartedAtRef.current != null &&
          Date.now() - pollStartedAtRef.current > 30000

        if (waitingTooLong) {
          setError("Проверка слишком долго стоит в очереди. Проверьте, что Redis и Celery worker запущены.")
        } else if (nextRun.status !== "error") {
          setError(null)
        }
      } catch (pollError: unknown) {
        setError(pollError instanceof Error ? pollError.message : "Не удалось обновить статус")
      }
    }

    void pollRun()
    const timer = window.setInterval(() => {
      void pollRun()
    }, 1500)

    return () => window.clearInterval(timer)
  }, [isRunning, run?.id])

  const handleSubmit = async () => {
    if (!urls.length) return

    try {
      setStarting(true)
      setError(null)
      setCurrentResultIndex(0)
      setWarningPage(1)
      pollStartedAtRef.current = Date.now()
      const createdRun = await startPageCheckRun(urls)
      setRun(createdRun)
    } catch (startError: unknown) {
      setError(startError instanceof Error ? startError.message : "Не удалось запустить проверку")
    } finally {
      setStarting(false)
    }
  }

  const handleDownload = async () => {
    if (!run || !results.length) return

    try {
      setDownloading(true)
      setError(null)
      const blob = await downloadPageCheckRun(run.id)
      saveBlob(blob, `page-checks-${run.id}.xlsx`)
    } catch (downloadError: unknown) {
      setError(downloadError instanceof Error ? downloadError.message : "Не удалось скачать XLSX")
    } finally {
      setDownloading(false)
    }
  }

  const handleCancel = async () => {
    if (!run || !isRunning) return

    try {
      setCancelling(true)
      setError(null)
      const cancelledRun = await cancelPageCheckRun(run.id)
      setRun(cancelledRun)
    } catch (cancelError: unknown) {
      setError(cancelError instanceof Error ? cancelError.message : "Не удалось остановить проверку")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="page-shell space-y-6">
      <section className="surface-card motion-fade-up relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/25" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/20" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Page checks</p>
            <h1 className="section-title text-3xl sm:text-4xl">Массовая проверка страниц</h1>
            <p className="section-subtitle max-w-3xl">
              Фоновая проверка нескольких URL: код и время ответа, индексация, мета-теги, H1-H6, canonical, modified, разметка, вес HTML, ресурсы, изображения, навигация и текст.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleDownload}
            disabled={!run || !results.length || downloading}
            className="h-11 rounded-xl bg-cyan-600 px-4 text-white shadow-sm shadow-cyan-700/20 hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/70 dark:hover:bg-cyan-400"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Скачать XLSX
          </Button>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3">
          <Metric label="URL в форме" value={urls.length} />
          <Metric label="Статус" value={runStatusLabel(run?.status ?? null)} />
          <Metric label="Прогресс" value={`${run?.checked ?? 0}/${run?.total ?? 0}`} />
          <Metric label="Индексируемые" value={indexablePages} />
          <Metric label="С warnings" value={warningPages} />
        </div>

        <div className="relative mt-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Фоновый прогресс</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-600 transition-all dark:bg-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <main className="grid grid-cols-1 gap-6">
        <section className="surface-card motion-fade-up motion-delay-1">
          <div className="space-y-2">
            <h2 className="section-title">Список URL</h2>
            <p className="section-subtitle">Каждый адрес с новой строки или через запятую. Максимум 50 URL за один запуск.</p>
          </div>

          <textarea
            value={rawUrls}
            onChange={(event) => setRawUrls(event.target.value)}
            placeholder={"https://example.com/\nhttps://example.com/catalog/"}
            disabled={starting || isRunning}
            className="mt-5 min-h-48 w-full resize-y rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
          />

          <Button
            className="mt-5 h-11 w-full rounded-xl bg-cyan-600 text-white shadow-sm shadow-cyan-700/20 hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/70 dark:hover:bg-cyan-400"
            onClick={handleSubmit}
            disabled={starting || isRunning || !urls.length}
          >
            {starting || isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {starting || isRunning ? "Проверка запущена..." : "Запустить фоновую проверку"}
          </Button>

          {isRunning ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-11 w-full rounded-xl border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
              onClick={handleCancel}
              disabled={cancelling || run?.cancel_requested}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {cancelling || run?.cancel_requested ? "Остановка запрошена" : "Остановить проверку"}
            </Button>
          ) : null}

          {run ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-xs uppercase tracking-wide text-slate-500">Запуск #{run.id}</p>
              <p className="mt-1 text-slate-700 dark:text-slate-200">
                {runStatusLabel(run.status)} · проверено {run.checked} из {run.total}
              </p>
              {run.error_message ? <p className="mt-2 text-rose-700 dark:text-rose-300">{run.error_message}</p> : null}
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          ) : null}
        </section>

        <div className="space-y-6">
          {allWarnings.length ? (
            <section className="surface-card motion-fade-up motion-delay-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                  <h2 className="section-title">Warnings</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setWarningPage((page) => Math.max(1, page - 1))}
                    disabled={activeWarningPage === 1}
                    aria-label="Предыдущая страница warnings"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-500">
                    {activeWarningPage} / {totalWarningPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setWarningPage((page) => Math.min(totalWarningPages, page + 1))}
                    disabled={activeWarningPage === totalWarningPages}
                    aria-label="Следующая страница warnings"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {visibleWarnings.map((item, index) => (
                  <div key={`${item.url}-${item.warning}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <span className="font-semibold">{item.warning}</span>
                    <span className="mt-1 block break-all text-xs text-amber-700/80 dark:text-amber-200/75">{item.url}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="surface-card motion-fade-up motion-delay-3">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="section-title">Результаты</h2>
                <p className="section-subtitle">Одна карточка на экране, остальные можно перелистывать.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentResultIndex((index) => Math.max(0, index - 1))}
                  disabled={!results.length || activeResultIndex === 0}
                  aria-label="Предыдущая карточка"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-20 text-center text-sm text-slate-500">
                  {results.length ? activeResultIndex + 1 : 0} / {results.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentResultIndex((index) => Math.min(results.length - 1, index + 1))}
                  disabled={!results.length || activeResultIndex >= results.length - 1}
                  aria-label="Следующая карточка"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isRunning && !results.length ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/70 dark:border-slate-700/70 dark:bg-slate-800/70" />
                ))}
              </div>
            ) : null}

            {!isRunning && !results.length ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-10 text-center dark:border-slate-700/70 dark:bg-slate-900/60">
                <FileText className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-slate-700 dark:text-slate-200">Результатов пока нет.</p>
                <p className="mt-1 text-sm text-slate-500">Добавьте URL и запустите проверку.</p>
              </div>
            ) : null}

            {currentResult ? (
              <article className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-base font-semibold text-slate-900 dark:text-slate-100">{currentResult.url}</p>
                    <p className="mt-1 break-all text-sm text-slate-500">{currentResult.final_url ?? "-"}</p>
                  </div>
                  <span className={statusPill(currentResult)}>
                    {currentResult.status === "error" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    HTTP {currentResult.server_status_code ?? "-"}
                  </span>
                </div>

                {currentResult.error_message ? (
                  <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300">
                    {currentResult.error_message}
                  </p>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Metric label="Время ответа" value={<span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{currentResult.response_time_ms ?? "-"} мс</span>} />
                  <Metric label="Индексируемость" value={boolLabel(currentResult.is_indexable)} />
                  <Metric label="HTML вес" value={formatBytes(currentResult.html_weight_bytes)} />
                  <Metric label="Last-Modified" value={currentResult.last_modified || "-"} />
                  <Metric label="Meta robots" value={currentResult.meta_robots || "-"} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <WideField label="Title" value={currentResult.title} />
                  <WideField label="Description" value={currentResult.meta_description} />
                  <WideField label="H1" value={currentResult.h1} />
                  <WideField label="Canonical" value={currentResult.canonical} />
                </div>

                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      <Ruler className="h-4 w-4" />
                      H1-H6
                    </h3>
                    <div className="mt-3 space-y-2">
                      {currentResult.heading_structure.length ? currentResult.heading_structure.map((heading, index) => (
                        <div key={`${heading.level}-${index}`} className="grid grid-cols-[46px_1fr] gap-2 text-sm">
                          <span className="font-mono text-cyan-700 dark:text-cyan-300">{heading.level}</span>
                          <span className="text-slate-700 dark:text-slate-200">{heading.text || "-"}</span>
                        </div>
                      )) : <p className="text-sm text-slate-500">Заголовки не найдены.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      <Tags className="h-4 w-4" />
                      Разметка и modified
                    </h3>
                    <div className="mt-4 grid gap-4">
                      <TypeList label="Schema.org" values={currentResult.markup_checks.schema_org_types} />
                      <TypeList
                        label="Open Graph"
                        values={currentResult.markup_checks.opengraph_types}
                        fallback={currentResult.markup_checks.opengraph_found ? "найден без og:type" : "-"}
                      />
                      <TypeList label="Modified tags" values={currentResult.modified_tags.map((item) => item.value)} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      <ImageIcon className="h-4 w-4" />
                      Изображения
                    </h3>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <span>Всего: {currentResult.image_checks.total}</span>
                      <span>С alt: {currentResult.image_checks.with_alt}</span>
                      <span>Без alt: {currentResult.image_checks.missing_alt}</span>
                      <span>С width/height: {currentResult.image_checks.with_width_height}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      <Navigation className="h-4 w-4" />
                      Навигация и текст
                    </h3>
                    <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <p>Навигаций: {currentResult.navigation_checks.total}, с aria: {currentResult.navigation_checks.with_aria_label}</p>
                      <p>Текст: {currentResult.text_stats.characters} символов, {currentResult.text_stats.words} слов</p>
                      <p>Топ слов: {currentResult.text_stats.top_words.map((item) => `${item.word} (${item.count})`).join(", ") || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Топ тяжелых ресурсов</h3>
                  <ResourceList resources={currentResult.resource_summary.top_heavy_resources} />
                </div>
              </article>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  )
}
