'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Braces, Code, Files, SearchX, TextSearch } from "lucide-react"

import { cn } from "@/lib/utils"

const items = [
  {
    href: "/",
    label: "SEO аудит",
    description: "Технический отчет",
    icon: BarChart3,
  },
  {
    href: "/notfounder",
    label: "Notfounder",
    description: "Поиск 404-ссылок",
    icon: SearchX,
  },
  {
    href: "/page-checks",
    label: "Страницы",
    description: "Массовая проверка",
    icon: Files,
  },
  {
    href: "/text-checks",
    label: "Тексты",
    description: "SEO-анализ",
    icon: TextSearch,
  },
  {
    href: "/markdown-converter",
    label: "Конвертер",
    description: "Markdown в HTML",
    icon: Code,
  },
  {
    href: "/schema-faq",
    label: "FAQ Schema",
    description: "JSON-LD",
    icon: Braces,
  },
]

export function AppNavigation() {
  const pathname = usePathname()

  return (
    <header className="mx-auto w-full max-w-none px-4 pt-5 sm:px-6 lg:px-10">
      <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-[0_14px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/65 dark:bg-slate-950/70">
        {items.map((item) => {
          const Icon = item.icon
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex min-h-12 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition sm:flex-none sm:px-4",
                active
                  ? "bg-cyan-600 text-white shadow-sm shadow-cyan-700/25 dark:bg-cyan-500 dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5">{item.label}</span>
                <span
                  className={cn(
                    "block truncate text-xs",
                    active ? "text-cyan-50 dark:text-slate-900/75" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
