// LAPRA 08 - Custom Hooks untuk performa & UX
// ============================================================
// Dipakai di berbagai komponen untuk mengurangi re-render &
// DB hammering.
// ============================================================

'use client'

import { useState, useEffect } from 'react'

/**
 * useDebounce — debounce value (biasanya search input)
 * Berguna untuk menghindari API call di setiap keystroke.
 *
 * @param value Value yang ingin di-debounce
 * @param delay Delay dalam ms (default 300ms)
 * @returns Value yang sudah di-debounce
 *
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 300)
 * useEffect(() => {
 *   if (debouncedSearch) fetchData(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
