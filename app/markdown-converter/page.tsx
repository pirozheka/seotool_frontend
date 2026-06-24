'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"

function splitTableRow(row: string) {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

function getTableAlignment(separatorCell: string) {
  const cell = separatorCell.trim()
  if (!/^:?-{3,}:?$/.test(cell)) return null
  if (cell.startsWith(":") && cell.endsWith(":")) return "center"
  if (cell.endsWith(":")) return "right"
  return ""
}

function tableCellTag(tag: "th" | "td", value: string, alignment: string | null) {
  const alignAttr = alignment ? ` style="text-align: ${alignment}"` : ""
  return `<${tag}${alignAttr}>${value}</${tag}>`
}

function convertTables(markdown: string) {
  const lines = markdown.split("\n")
  const output: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index]
    const separatorLine = lines[index + 1]

    if (!headerLine?.includes("|") || !separatorLine?.includes("|")) {
      output.push(headerLine)
      continue
    }

    const headers = splitTableRow(headerLine)
    const alignments = splitTableRow(separatorLine).map(getTableAlignment)
    const isTable =
      headers.length > 1 &&
      alignments.length === headers.length &&
      alignments.every((alignment) => alignment !== null)

    if (!isTable) {
      output.push(headerLine)
      continue
    }

    const bodyRows: string[][] = []
    index += 2

    while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
      bodyRows.push(splitTableRow(lines[index]))
      index += 1
    }

    index -= 1

    const thead = `<thead><tr>${headers
      .map((header, columnIndex) => tableCellTag("th", header, alignments[columnIndex]))
      .join("")}</tr></thead>`

    const tbody = bodyRows.length
      ? `<tbody>${bodyRows
          .map((row) => {
            const cells = headers.map((_, columnIndex) =>
              tableCellTag("td", row[columnIndex] ?? "", alignments[columnIndex])
            )
            return `<tr>${cells.join("")}</tr>`
          })
          .join("")}</tbody>`
      : ""

    output.push(`<table>${thead}${tbody}</table>`)
  }

  return output.join("\n")
}

export default function MarkdownConverterPage() {
  const [markdown, setMarkdown] = useState("")
  const [html, setHtml] = useState("")
  const [copied, setCopied] = useState(false)

  const convertToHtml = () => {
    let converted = markdown
    
    // Code blocks
    converted = converted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      const lang = language ? ` class="language-${language}"` : ''
      return `<pre><code${lang}>${escapeHtml(code.trim())}</code></pre>`
    })
    
    // Inline code
    converted = converted.replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Headers
    converted = converted.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    converted = converted.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    converted = converted.replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Bold and italic
    converted = converted.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    converted = converted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    converted = converted.replace(/\*(.*?)\*/g, '<em>$1</em>')
    converted = converted.replace(/__(.*?)__/g, '<strong>$1</strong>')
    converted = converted.replace(/_(.*?)_/g, '<em>$1</em>')
    
    // Strikethrough
    converted = converted.replace(/~~(.*?)~~/g, '<del>$1</del>')
    
    // Links
    converted = converted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    
    // Images
    converted = converted.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

    // Tables
    converted = convertTables(converted)
    
    // Blockquotes
    converted = converted.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    
    // Unordered lists
    converted = converted.replace(/^\* (.*$)/gim, '<li>$1</li>')
    converted = converted.replace(/^- (.*$)/gim, '<li>$1</li>')
    converted = converted.replace(/^\+ (.*$)/gim, '<li>$1</li>')
    
    // Ordered lists
    converted = converted.replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    
    // Wrap lists
    converted = converted.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
    converted = converted.replace(/(<li>.*<\/li>)/g, '<ol>$1</ol>')
    
    // Horizontal rule
    converted = converted.replace(/^---$/gm, '<hr>')
    converted = converted.replace(/^\*\*\*$/gm, '<hr>')
    converted = converted.replace(/^___$/gm, '<hr>')
    
    // Line breaks
    converted = converted.replace(/\n\n/g, '</p><p>')
    converted = converted.replace(/\n/g, '<br>')
    
    // Wrap paragraphs
    if (converted && !converted.startsWith('<')) {
      converted = `<p>${converted}</p>`
    }
    
    setHtml(converted)
  }
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }
  
  const escapeHtml = (text: string) => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
    
  return (
    <div className="page-shell space-y-6">
      <section className="surface-card motion-fade-up relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/25" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-amber-200/50 blur-3xl dark:bg-cyan-500/20" />

        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Конвертер</p>
          <h1 className="section-title text-3xl sm:text-4xl">Markdown в HTML</h1>
          <p className="section-subtitle max-w-3xl">
            Вводите текст в формате слева и получайте HTML-код справа. Копируйте результат одним кликом.
          </p>
        </div>
      </section>

      <main className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="surface-card motion-fade-up motion-delay-1">
          <div className="space-y-2">
            <h2 className="section-title">Markdown</h2>
            <p className="section-subtitle">Введите текст в формате markdown</p>
          </div>
          
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="# Заголовок
## Подзаголовок
**жирный текст** *курсив*

* Пункт 1
* Пункт 2
* Пункт 3

Обычный текст с [ссылкой](https://example.com)"
            className="min-h-[400px] w-full resize-y rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
          />
          
          <Button
            onClick={convertToHtml}
            className="mt-4 h-11 w-full rounded-xl bg-cyan-600 text-white shadow-sm shadow-cyan-700/20 hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/70 dark:hover:bg-cyan-400"
          >
            Конвертировать в HTML
          </Button>
        </section>

        <section className="surface-card motion-fade-up motion-delay-2">
          <div className="space-y-2">
            <h2 className="section-title">HTML</h2>
            <p className="section-subtitle">Результат конвертации</p>
          </div>
          
          <textarea
            value={html}
            readOnly
            placeholder="HTML-код появится здесь после конвертации"
            className="min-h-[400px] w-full resize-y rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
          />
          
          <Button
            onClick={copyToClipboard}
            disabled={!html}
            className="mt-4 h-11 w-full rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950 dark:shadow-emerald-950/70 dark:hover:bg-emerald-400"
          >
            {copied ? '✓ Скопировано!' : 'Копировать HTML'}
          </Button>
        </section>
      </main>
    </div>
  )
}
