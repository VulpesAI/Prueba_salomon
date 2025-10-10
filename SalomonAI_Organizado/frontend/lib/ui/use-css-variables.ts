import { useEffect, useMemo, useState } from "react"

type VariableMap<T extends string> = Record<T, string>

type VariableValues<T extends string> = Record<T, string>

function readVariable(root: HTMLElement, cssVar: string, fallback: string) {
  const value = getComputedStyle(root).getPropertyValue(cssVar).trim()
  return value || fallback
}

export function useCssVariables<T extends string>(
  mapping: VariableMap<T>,
  fallback?: Partial<VariableValues<T>>
): VariableValues<T> {
  const entries = useMemo(() => Object.entries(mapping) as Array<[T, string]>, [mapping])

  const [values, setValues] = useState<VariableValues<T>>(() => {
    const initial: Partial<VariableValues<T>> = {}
    for (const [key, cssVar] of entries) {
      const resolvedFallback = fallback?.[key] ?? `var(${cssVar})`
      initial[key] = resolvedFallback
    }
    return initial as VariableValues<T>
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const root = document.documentElement
    if (!root) {
      return
    }

    const update = () => {
      setValues((prev) => {
        const next: Partial<VariableValues<T>> = { ...prev }
        for (const [key, cssVar] of entries) {
          const resolvedFallback = fallback?.[key] ?? `var(${cssVar})`
          next[key] = readVariable(root, cssVar, resolvedFallback)
        }
        return next as VariableValues<T>
      })
    }

    update()

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === "class")) {
        update()
      }
    })

    observer.observe(root, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [entries, fallback])

  return values
}
