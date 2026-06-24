'use client'

import { Moon, Sun } from "lucide-react"
import { useEffect, useSyncExternalStore } from "react"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const THEME_STORAGE_KEY = "one-more-seo-theme"
type Theme = "light" | "dark"

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme
    }
  } catch {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function subscribeToThemeChanges(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  const media = window.matchMedia("(prefers-color-scheme: dark)")
  const handleChange = () => callback()

  window.addEventListener("storage", handleChange)
  window.addEventListener("one-more-seo-theme-change", handleChange)
  media.addEventListener("change", handleChange)

  return () => {
    window.removeEventListener("storage", handleChange)
    window.removeEventListener("one-more-seo-theme-change", handleChange)
    media.removeEventListener("change", handleChange)
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(
    subscribeToThemeChanges,
    getInitialTheme,
    () => null
  )

  useEffect(() => {
    if (!theme) return
    applyTheme(theme)
  }, [theme])

  const handleThemeChange = (checked: boolean) => {
    const nextTheme: Theme = checked ? "dark" : "light"
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {}
    applyTheme(nextTheme)
    window.dispatchEvent(new Event("one-more-seo-theme-change"))
  }

  const isDark = theme === "dark"
  const isMounted = theme !== null

  return (
    <div className="theme-toggle fixed bottom-4 right-4 z-[100]">
      <Sun
        className={cn(
          "h-4 w-4 transition-colors",
          isMounted && !isDark ? "text-amber-500" : "text-slate-500"
        )}
      />
      <Switch
        checked={isMounted ? isDark : false}
        onCheckedChange={handleThemeChange}
        aria-label="Toggle theme"
      />
      <Moon
        className={cn(
          "h-4 w-4 transition-colors",
          isMounted && isDark ? "text-cyan-300" : "text-slate-500"
        )}
      />
    </div>
  )
}
