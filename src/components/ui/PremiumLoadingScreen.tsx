"use client"

import { useEffect, useState } from "react"

interface PremiumLoadingScreenProps {
  stage?: "sources" | "ai" | "optimization" | "complete"
  progress?: number
  customMessage?: string
}

export default function PremiumLoadingScreen({
  stage = "sources",
  progress = 0,
  customMessage,
}: PremiumLoadingScreenProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useEffect(() => {
    // Smooth progress animation
    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        const target = progress
        const diff = target - prev
        if (Math.abs(diff) < 0.5) return target
        return prev + diff * 0.1
      })
    }, 16)

    return () => clearInterval(interval)
  }, [progress])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md">
      <div className="w-full max-w-md mx-4">
        {/* Minimal card with glassmorphism */}
        <div className="relative rounded-2xl bg-white/95 dark:bg-zinc-900/95 p-10 shadow-xl backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50">

          {/* Content */}
          <div className="space-y-6">
            {/* Simple centered spinner */}
            <div className="flex justify-center">
              <div className="relative w-16 h-16">
                {/* Single clean spinner */}
                <svg className="animate-spin" viewBox="0 0 50 50">
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-zinc-300 dark:text-zinc-700"
                  />
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="31.4 31.4"
                    className="text-zinc-900 dark:text-white"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Analyse en cours
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {customMessage || "Recherche et validation des profils"}
              </p>
            </div>

            {/* Progress bar - minimal design */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500">
                <span>Progression</span>
                <span className="font-medium tabular-nums">{Math.round(animatedProgress)}%</span>
              </div>

              {/* Clean progress track */}
              <div className="relative h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-zinc-900 dark:bg-white rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${animatedProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
