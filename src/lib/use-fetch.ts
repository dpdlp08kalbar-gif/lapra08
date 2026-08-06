'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Custom hook untuk fetch data dari API dengan pattern yang aman dari lint warning
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
  options: { immediate?: boolean } = {}
) {
  const { immediate = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState('')
  const mountedRef = useRef(true)

  const execute = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetcher()
      if (mountedRef.current) {
        setData(result)
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e.message || 'Terjadi kesalahan')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    if (immediate) {
      execute()
    }
    return () => {
      mountedRef.current = false
    }
  }, [execute, immediate])

  return { data, loading, error, refetch: execute, setData }
}

// Hook untuk fetch multiple endpoints sekaligus
export function useFetchMultiple<T extends Record<string, any>>(
  fetchers: { [K in keyof T]: () => Promise<T[K]> },
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const mountedRef = useRef(true)

  const execute = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const keys = Object.keys(fetchers) as (keyof T)[]
      const promises = keys.map((k) => fetchers[k]())
      const results = await Promise.all(promises)
      const newData = {} as T
      keys.forEach((k, i) => {
        newData[k] = results[i]
      })
      if (mountedRef.current) {
        setData(newData)
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e.message || 'Terjadi kesalahan')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    execute()
    return () => {
      mountedRef.current = false
    }
  }, [execute])

  return { data, loading, error, refetch: execute }
}
