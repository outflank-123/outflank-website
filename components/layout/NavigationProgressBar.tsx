'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

let globalStartProgress: (() => void) | null = null
let globalFinishProgress: (() => void) | null = null

export function startNavigationProgress() {
  if (globalStartProgress) globalStartProgress()
}

export function finishNavigationProgress() {
  if (globalFinishProgress) globalFinishProgress()
}

export default function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  const start = useCallback(() => {
    setVisible(true)
    setProgress(15)
  }, [])

  const finish = useCallback(() => {
    setProgress(100)
    const timeout = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    globalStartProgress = start
    globalFinishProgress = finish
    return () => {
      globalStartProgress = null
      globalFinishProgress = null
    }
  }, [start, finish])

  // Finish progress whenever route or query params change
  useEffect(() => {
    finish()
  }, [pathname, searchParams, finish])

  // Progress animation ticker while visible & < 90%
  useEffect(() => {
    if (!visible || progress >= 90) return

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        // Slower increment as it gets closer to 90%
        const diff = (90 - prev) * 0.15
        return prev + Math.max(diff, 1)
      })
    }, 150)

    return () => clearInterval(timer)
  }, [visible, progress])

  // Global click listener to intercept internal link clicks
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      // Skip external links, target="_blank", or hash-only links
      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        anchor.target === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return
      }

      const currentUrl = window.location.pathname + window.location.search
      const targetUrl = href

      // Only trigger if navigating to a different URL
      if (currentUrl !== targetUrl) {
        start()
      }
    }

    document.addEventListener('click', handleAnchorClick, { capture: true })
    return () => document.removeEventListener('click', handleAnchorClick, { capture: true })
  }, [start])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[3px] bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-[#e3231c] via-[#ff5252] to-[#e3231c] shadow-[0_0_10px_rgba(227,35,28,0.8)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  )
}
