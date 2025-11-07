/**
 * EXAMPLE: How to use PremiumLoadingScreen in any module
 *
 * This is a template showing how to integrate the loading screen
 * into any component that performs async operations.
 */

"use client"

import { useState } from "react"
import PremiumLoadingScreen from "./PremiumLoadingScreen"
import { useLoadingProgress } from "@/hooks/useLoadingProgress"
import { Button } from "./button"

export default function LoadingScreenExample() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string>("")

  // Use the centralized loading hook
  const {
    loading,
    loadingStage,
    loadingProgress,
    stage,
    startLoading,
    stopLoading
  } = useLoadingProgress()

  const handleAsyncOperation = async () => {
    setError("")
    setData(null)

    // Start loading with custom stages for your operation
    startLoading({
      stages: [
        { message: "Initializing operation...", progress: 20 },
        { message: "Processing data...", progress: 50 },
        { message: "Finalizing results...", progress: 80 },
        { message: "Complete!", progress: 100 }
      ],
      autoProgress: true // Automatically cycle through stages
    })

    try {
      // Your async operation here
      const response = await fetch("/api/your-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ /* your data */ })
      })

      if (!response.ok) {
        throw new Error("Operation failed")
      }

      const result = await response.json()
      setData(result)

    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      stopLoading() // Always stop loading when done
    }
  }

  return (
    <div className="p-4">
      <Button onClick={handleAsyncOperation} disabled={loading}>
        Start Operation
      </Button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-4 p-4 bg-green-50 text-green-700 rounded">
          Operation completed successfully!
        </div>
      )}

      {/* The loading screen - automatically manages modal overlay */}
      {loading && (
        <PremiumLoadingScreen
          stage={stage}
          progress={loadingProgress}
          customMessage={loadingStage}
        />
      )}
    </div>
  )
}

/**
 * QUICK IMPLEMENTATION GUIDE:
 *
 * 1. Import the hook:
 *    import { useLoadingProgress } from "@/hooks/useLoadingProgress"
 *
 * 2. Use the hook in your component:
 *    const { loading, loadingStage, loadingProgress, stage, startLoading, stopLoading } = useLoadingProgress()
 *
 * 3. Start loading before your async operation:
 *    startLoading({
 *      stages: [{ message: "Loading...", progress: 50 }],
 *      autoProgress: true
 *    })
 *
 * 4. Stop loading when done:
 *    stopLoading()
 *
 * 5. Render the loading screen:
 *    {loading && <PremiumLoadingScreen stage={stage} progress={loadingProgress} customMessage={loadingStage} />}
 *
 * That's it! The loading screen will appear as a modal overlay with blur background.
 */
