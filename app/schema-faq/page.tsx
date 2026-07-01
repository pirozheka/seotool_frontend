"use client"

import { useMemo, useState } from "react"
import { Braces, Copy, Plus, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type FaqPair = {
  id: number
  question: string
  answer: string
}

const samplePairs: FaqPair[] = [
  {
    id: 1,
    question: "Что такое FAQPage Schema?",
    answer: "FAQPage Schema — это микроразметка Schema.org для страницы с официальным списком вопросов и ответов.",
  },
  {
    id: 2,
    question: "Куда вставлять JSON-LD?",
    answer: "Скрипт JSON-LD обычно вставляют на ту же страницу, где опубликован видимый FAQ-блок.",
  },
]

function createEmptyPair(id: number): FaqPair {
  return {
    id,
    question: "",
    answer: "",
  }
}

function buildFaqSchema(pairs: FaqPair[]) {
  const entities = pairs
    .map((pair) => ({
      question: pair.question.trim(),
      answer: pair.answer.trim(),
    }))
    .filter((pair) => pair.question && pair.answer)
    .map((pair) => ({
      "@type": "Question",
      name: pair.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: pair.answer,
      },
    }))

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entities,
  }
}

function buildScript(schema: ReturnType<typeof buildFaqSchema>, minified: boolean) {
  const json = JSON.stringify(schema, null, minified ? 0 : 2)
  return `<script type="application/ld+json">\n${json}\n</script>`
}

export default function SchemaFaqPage() {
  const [pairs, setPairs] = useState<FaqPair[]>(samplePairs)
  const [nextId, setNextId] = useState(3)
  const [minified, setMinified] = useState(false)
  const [copied, setCopied] = useState(false)

  const validPairCount = pairs.filter((pair) => pair.question.trim() && pair.answer.trim()).length
  const schema = useMemo(() => buildFaqSchema(pairs), [pairs])
  const result = useMemo(() => buildScript(schema, minified), [schema, minified])

  const updatePair = (id: number, field: "question" | "answer", value: string) => {
    setPairs((current) =>
      current.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair))
    )
  }

  const addPair = () => {
    setPairs((current) => [...current, createEmptyPair(nextId)])
    setNextId((id) => id + 1)
  }

  const removePair = (id: number) => {
    setPairs((current) => {
      if (current.length === 1) return [createEmptyPair(nextId)]
      return current.filter((pair) => pair.id !== id)
    })
    if (pairs.length === 1) {
      setNextId((current) => current + 1)
    }
  }

  const resetPairs = () => {
    setPairs([createEmptyPair(1)])
    setNextId(2)
    setCopied(false)
  }

  const copyResult = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="page-shell space-y-6">
      <section className="surface-card motion-fade-up relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/25" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/20" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Schema.org</p>
            <h1 className="section-title text-3xl sm:text-4xl">Генератор FAQ JSON-LD</h1>
            <p className="section-subtitle max-w-3xl">
              Добавляйте пары вопрос-ответ и получайте готовый скрипт FAQPage для вставки на страницу.
            </p>
          </div>

          <div className="relative flex flex-wrap items-center gap-2">
            <span className="status-pill status-pill-neutral">{validPairCount} пар</span>
            <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white/75 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
              <input
                type="checkbox"
                checked={minified}
                onChange={(event) => setMinified(event.target.checked)}
                className="h-4 w-4 accent-cyan-600"
              />
              Минифицировать
            </label>
          </div>
        </div>
      </section>

      <main className="grid grid-cols-1 gap-6">
        <section className="surface-card motion-fade-up motion-delay-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Вопросы и ответы</h2>
              <p className="section-subtitle">Один вопрос и один ответ в каждой паре.</p>
            </div>
            <Button type="button" variant="outline" size="icon-sm" onClick={resetPairs} aria-label="Очистить">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {pairs.map((pair, index) => (
              <div key={pair.id} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0 dark:border-slate-700/70">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Пара {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removePair(pair.id)}
                    aria-label="Удалить пару"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Вопрос
                  <input
                    value={pair.question}
                    onChange={(event) => updatePair(pair.id, "question", event.target.value)}
                    placeholder="Например: Что такое FAQPage Schema?"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white/90 px-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
                  />
                </label>

                <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Ответ
                  <textarea
                    value={pair.answer}
                    onChange={(event) => updatePair(pair.id, "answer", event.target.value)}
                    placeholder="Ответ, который опубликован на странице."
                    className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
                  />
                </label>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={addPair}
            className="mt-5 h-11 w-full rounded-xl bg-cyan-600 text-white shadow-sm shadow-cyan-700/20 hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/70 dark:hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Добавить пару
          </Button>
        </section>

        <section className="surface-card motion-fade-up motion-delay-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Braces className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
              <h2 className="section-title">JSON-LD</h2>
            </div>
            <Button type="button" onClick={copyResult} disabled={!validPairCount} variant="outline" className="h-10 rounded-xl">
              <Copy className="h-4 w-4" />
              {copied ? "Скопировано" : "Копировать"}
            </Button>
          </div>

          <textarea
            value={result}
            readOnly
            className="min-h-[560px] w-full resize-y rounded-2xl border border-slate-300 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100 outline-none dark:border-slate-700"
          />

          {!validPairCount ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
              Заполните хотя бы один вопрос и ответ, чтобы получить полезную FAQPage-разметку.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  )
}
