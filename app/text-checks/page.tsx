'use client'

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Eraser,
  FileText,
  Gauge,
  ListChecks,
  Loader2,
  Sigma,
  Sparkles,
  TextSearch,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getTextAiSummary, type TextAiSummary } from "@/lib/api"

const STOP_WORDS = new Set([
  "а",
  "без",
  "более",
  "бы",
  "был",
  "была",
  "были",
  "было",
  "в",
  "вам",
  "вас",
  "весь",
  "во",
  "вот",
  "все",
  "всего",
  "всех",
  "вы",
  "где",
  "да",
  "для",
  "до",
  "его",
  "ее",
  "если",
  "есть",
  "еще",
  "же",
  "за",
  "и",
  "из",
  "или",
  "им",
  "их",
  "к",
  "как",
  "ко",
  "когда",
  "ли",
  "либо",
  "мы",
  "на",
  "над",
  "не",
  "него",
  "нее",
  "нет",
  "ни",
  "но",
  "о",
  "об",
  "один",
  "он",
  "она",
  "они",
  "оно",
  "от",
  "по",
  "под",
  "при",
  "про",
  "с",
  "со",
  "так",
  "также",
  "там",
  "то",
  "того",
  "тоже",
  "только",
  "у",
  "уже",
  "чем",
  "что",
  "чтобы",
  "это",
  "этой",
  "этом",
  "этот",
])

type Keyword = {
  word: string
  count: number
  density: number
}

function asMetricPayload(analysis: ReturnType<typeof analyzeText>) {
  return {
    characters: analysis.characters,
    words: analysis.words,
    unique_words: analysis.uniqueWords,
    water: Number(analysis.water.toFixed(1)),
    spam: Number(analysis.spam.toFixed(1)),
    average_sentence_length: Number(analysis.averageSentenceLength.toFixed(1)),
    top_keywords: analysis.keywords.slice(0, 15),
    local_signals: analysis.signals,
  }
}

function getWords(text: string) {
  return text.toLowerCase().match(/[а-яёa-z0-9]+(?:-[а-яёa-z0-9]+)?/gi) ?? []
}

function getSentences(text: string) {
  return text
    .split(/[.!?…]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[а-яёa-z0-9]/i.test(sentence))
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function scoreTone(value: number, warning: number, danger: number) {
  if (value >= danger) return "danger"
  if (value >= warning) return "warning"
  return "success"
}

function scoreClass(tone: "success" | "warning" | "danger") {
  if (tone === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300"
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300"
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300"
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full opacity-75 outline-none transition hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        aria-label={text}
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-7 z-20 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-normal normal-case leading-5 text-slate-700 opacity-0 shadow-xl shadow-slate-900/15 transition group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        {text}
      </span>
    </span>
  )
}

function analyzeText(text: string) {
  const words = getWords(text)
  const sentences = getSentences(text)
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
  const stopWords = words.filter((word) => STOP_WORDS.has(word))
  const contentWords = words.filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  const uniqueContentWords = new Set(contentWords)
  const water = words.length ? (stopWords.length / words.length) * 100 : 0
  const spam = contentWords.length
    ? ((contentWords.length - uniqueContentWords.size) / contentWords.length) * 100
    : 0

  const wordCounts = new Map<string, number>()
  for (const word of contentWords) {
    wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
  }

  const keywords: Keyword[] = Array.from(wordCounts.entries())
    .map(([word, count]) => ({
      word,
      count,
      density: words.length ? (count / words.length) * 100 : 0,
    }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))

  const mixedAlphabetWords = Array.from(
    new Set(words.filter((word) => /[а-яё]/i.test(word) && /[a-z]/i.test(word)))
  )
  const longSentences = sentences.filter((sentence) => getWords(sentence).length >= 25)
  const averageSentenceLength = sentences.length ? words.length / sentences.length : 0
  const averageWordLength = words.length
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length
    : 0

  const signals: string[] = []
  if (water >= 30) signals.push("Много воды: доля стоп-слов выше 30%.")
  else if (water >= 15) signals.push("Вода выше естественного диапазона: стоит проверить вводные обороты.")
  if (spam >= 60) signals.push("Высокая заспамленность: ключевые слова повторяются слишком часто.")
  else if (spam >= 30) signals.push("Текст заметно оптимизирован: проверьте частые повторы.")
  if (keywords.some((keyword) => keyword.density >= 5 && keyword.count >= 3)) {
    signals.push("Есть слова с высокой плотностью: возможен переспам отдельных ключей.")
  }
  if (averageSentenceLength >= 22) signals.push("Средняя длина предложения высокая: текст может читаться тяжело.")
  if (mixedAlphabetWords.length) signals.push("Найдены слова со смешанными русскими и латинскими буквами.")

  return {
    characters: text.length,
    charactersWithoutSpaces: text.replace(/\s/g, "").length,
    words: words.length,
    uniqueWords: new Set(words).size,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    water,
    spam,
    averageSentenceLength,
    averageWordLength,
    keywords: keywords.slice(0, 30),
    longSentences,
    mixedAlphabetWords,
    signals,
  }
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tooltip,
  tone = "success",
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  hint?: string
  tooltip?: string
  tone?: "success" | "warning" | "danger"
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${scoreClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
          {tooltip ? <InfoTooltip text={tooltip} /> : null}
        </div>
        <span className="shrink-0">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-80">{hint}</p> : null}
    </div>
  )
}

function ScorePill({ value }: { value: number }) {
  const tone = scoreTone(100 - value, 30, 55)

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreClass(tone)}`}>
      {value}/100
    </span>
  )
}

function TextList({ items, fallback = "Нет данных" }: { items: string[]; fallback?: string }) {
  if (!items.length) return <p className="text-sm text-slate-500">{fallback}</p>

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function TextChecksPage() {
  const [text, setText] = useState("")
  const [aiSummary, setAiSummary] = useState<TextAiSummary | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const analysis = useMemo(() => analyzeText(text), [text])
  const waterTone = scoreTone(analysis.water, 15, 30)
  const spamTone = scoreTone(analysis.spam, 30, 60)
  const readabilityTone = scoreTone(analysis.averageSentenceLength, 18, 25)
  const hasText = text.trim().length > 0

  const handleAiSummary = async () => {
    if (!hasText || aiLoading) return

    try {
      setAiLoading(true)
      setAiError(null)
      const result = await getTextAiSummary(text, asMetricPayload(analysis))
      setAiSummary(result)
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : "Не удалось получить ИИ-резюме")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="page-shell space-y-6">
      <section className="surface-card motion-fade-up relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/25" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/20" />

        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Text checks</p>
          <h1 className="section-title text-3xl sm:text-4xl">SEO-анализ текста</h1>
          <p className="section-subtitle max-w-3xl">
            Проверка текста на водность, заспамленность, повторы, частотность ключей и смешанные раскладки.
          </p>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3">
          <MetricCard icon={<FileText className="h-5 w-5" />} label="Символы" value={analysis.characters} hint={`${analysis.charactersWithoutSpaces} без пробелов`} />
          <MetricCard icon={<Sigma className="h-5 w-5" />} label="Слова" value={analysis.words} hint={`${analysis.uniqueWords} уникальных`} />
          <MetricCard
            icon={<Gauge className="h-5 w-5" />}
            label="Вода"
            value={formatPercent(analysis.water)}
            hint="15% / 30%"
            tooltip="Доля стоп-слов от общего количества слов. До 15% — естественно, 15–30% — повышено, выше 30% — много воды."
            tone={waterTone}
          />
          <MetricCard
            icon={<TextSearch className="h-5 w-5" />}
            label="Спам"
            value={formatPercent(analysis.spam)}
            hint="30% / 60%"
            tooltip="Доля повторов среди значимых слов без стоп-слов. До 30% — естественно, 30–60% — заметная оптимизация, выше 60% — сильный переспам."
            tone={spamTone}
          />
        </div>
      </section>

      <main className="grid grid-cols-1 gap-6">
        <section className="surface-card motion-fade-up motion-delay-1">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="section-title">Текст</h2>
              <p className="section-subtitle">Вставьте статью, описание товара или фрагмент страницы.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setText("")}
              disabled={!text}
              aria-label="Очистить текст"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Вставьте текст для проверки"
            className="mt-5 min-h-[460px] w-full resize-y rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm leading-6 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
          />
        </section>

        <div className="space-y-6">
          <section className="surface-card motion-fade-up motion-delay-2">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                <h2 className="section-title">Сводка</h2>
              </div>
              <Button
                type="button"
                onClick={handleAiSummary}
                disabled={!hasText || analysis.characters < 200 || aiLoading}
                className="h-10 rounded-xl bg-cyan-600 px-4 text-white shadow-sm shadow-cyan-700/20 hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/70 dark:hover:bg-cyan-400"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? "ИИ анализирует..." : "Получить ИИ-резюме"}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-500">Предложения</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{analysis.sentences}</p>
                <p className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs ${scoreClass(readabilityTone)}`}>
                  {analysis.averageSentenceLength.toFixed(1)} слов в среднем
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-500">Абзацы</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{analysis.paragraphs}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Средняя длина слова: {analysis.averageWordLength.toFixed(1)} символа
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {!hasText ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
                  <TextSearch className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm text-slate-500">Результаты появятся после ввода текста.</p>
                </div>
              ) : analysis.signals.length ? (
                analysis.signals.map((signal) => (
                  <div key={signal} className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{signal}</span>
                  </div>
                ))
              ) : (
                <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Критичных сигналов не найдено.</span>
                </div>
              )}
            </div>

            {aiError ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300">
                {aiError}
              </p>
            ) : null}
          </section>

          {aiSummary ? (
            <section className="surface-card motion-fade-up motion-delay-3">
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                <h2 className="section-title">ИИ-резюме</h2>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Интент</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{aiSummary.intent.primary}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{aiSummary.intent.commerciality}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aiSummary.intent.secondary.map((item) => (
                      <span key={item} className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800 dark:border-cyan-700/50 dark:bg-cyan-950/40 dark:text-cyan-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Соответствие интенту</p>
                      <ScorePill value={aiSummary.intent_match.score} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{aiSummary.intent_match.summary}</p>
                    <div className="mt-4">
                      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Пробелы</p>
                      <TextList items={aiSummary.intent_match.gaps} fallback="Существенных пробелов не найдено" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Полнота раскрытия</p>
                      <ScorePill value={aiSummary.coverage.score} />
                    </div>
                    <div className="mt-4 grid gap-4">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Раскрыто</p>
                        <TextList items={aiSummary.coverage.covered_topics} />
                      </div>
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Не хватает</p>
                        <TextList items={aiSummary.coverage.missing_topics} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Расширенные блоки</p>
                  <div className="mt-3 space-y-3">
                    {aiSummary.recommended_blocks.map((block) => (
                      <div key={block.title} className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-950/40">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{block.title}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{block.why}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                          {block.outline.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Title / H1 / Description</p>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Title</p>
                      <TextList items={aiSummary.meta_recommendations.title} />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">H1</p>
                      <TextList items={aiSummary.meta_recommendations.h1} />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Meta description</p>
                      <TextList items={aiSummary.meta_recommendations.description} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Редакторские рекомендации</p>
                  <TextList items={aiSummary.editorial_recommendations} />
                </div>
              </div>
            </section>
          ) : null}

          <section className="surface-card motion-fade-up motion-delay-3">
            <h2 className="section-title">Ключи и повторы</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-[1fr_90px_90px] bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
                <span>Слово</span>
                <span className="text-right">Кол-во</span>
                <span className="text-right">Доля</span>
              </div>
              {analysis.keywords.length ? (
                analysis.keywords.map((keyword) => (
                  <div key={keyword.word} className="grid grid-cols-[1fr_90px_90px] border-t border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                    <span className="truncate text-slate-800 dark:text-slate-100">{keyword.word}</span>
                    <span className="text-right text-slate-600 dark:text-slate-300">{keyword.count}</span>
                    <span className="text-right text-slate-600 dark:text-slate-300">{formatPercent(keyword.density)}</span>
                  </div>
                ))
              ) : (
                <p className="border-t border-slate-200 px-3 py-5 text-sm text-slate-500 dark:border-slate-700">
                  Значимых слов пока нет.
                </p>
              )}
            </div>
          </section>

          <section className="surface-card motion-fade-up motion-delay-3">
            <h2 className="section-title">Технические сигналы</h2>
            <div className="mt-5 grid gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Смешанные алфавиты</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                  {analysis.mixedAlphabetWords.length ? analysis.mixedAlphabetWords.join(", ") : "Не найдены"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Длинные предложения</p>
                <div className="mt-2 space-y-2">
                  {analysis.longSentences.length ? (
                    analysis.longSentences.slice(0, 5).map((sentence) => (
                      <p key={sentence} className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {sentence}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Не найдены</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
