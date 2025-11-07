import { useState, useCallback, useRef, useEffect } from 'react';

export type LoadingStage = 'sources' | 'ai' | 'optimization' | 'complete';

export interface LoadingProgressConfig {
  stages: Array<{
    message: string;
    progress: number;
    duration?: number; // milliseconds to stay on this stage
  }>;
  autoProgress?: boolean; // automatically progress through stages
}

export interface UseLoadingProgressReturn {
  loading: boolean;
  loadingStage: string;
  loadingProgress: number;
  stage: LoadingStage;
  startLoading: (config?: LoadingProgressConfig) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  setStageMessage: (message: string) => void;
}

const DEFAULT_STAGES = [
  { message: "Connexion aux sources de données", progress: 15, duration: 2000 },
  { message: "Activation de l'intelligence artificielle", progress: 30, duration: 3000 },
  { message: "Analyse approfondie des données", progress: 50, duration: 4000 },
  { message: "Validation et enrichissement", progress: 70, duration: 3000 },
  { message: "Optimisation des résultats", progress: 85, duration: 2000 },
  { message: "Finalisation", progress: 95, duration: 1000 }
];

export function useLoadingProgress(): UseLoadingProgressReturn {
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopLoading = useCallback(() => {
    setLoading(false);
    setLoadingStage("");
    setLoadingProgress(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startLoading = useCallback((config?: LoadingProgressConfig) => {
    setLoading(true);
    setLoadingProgress(0);

    const stages = config?.stages || DEFAULT_STAGES;
    const autoProgress = config?.autoProgress !== false; // default true

    if (autoProgress) {
      let stageIndex = 0;

      const progressThroughStages = () => {
        if (stageIndex < stages.length) {
          setLoadingStage(stages[stageIndex].message);
          setLoadingProgress(stages[stageIndex].progress);
          stageIndex++;
        }
      };

      // Start immediately
      progressThroughStages();

      // Then progress through remaining stages
      intervalRef.current = setInterval(() => {
        if (stageIndex < stages.length) {
          progressThroughStages();
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 3500);
    } else {
      // Manual mode - just set first stage
      if (stages.length > 0) {
        setLoadingStage(stages[0].message);
        setLoadingProgress(stages[0].progress);
      }
    }
  }, []);

  const setProgress = useCallback((progress: number) => {
    setLoadingProgress(Math.min(100, Math.max(0, progress)));
  }, []);

  const setStageMessage = useCallback((message: string) => {
    setLoadingStage(message);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calculate stage based on progress
  const stage: LoadingStage =
    loadingProgress < 33 ? 'sources' :
    loadingProgress < 75 ? 'ai' :
    loadingProgress < 100 ? 'optimization' : 'complete';

  return {
    loading,
    loadingStage,
    loadingProgress,
    stage,
    startLoading,
    stopLoading,
    setProgress,
    setStageMessage
  };
}
