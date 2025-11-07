import { useState, useEffect } from 'react';

type LoadingStage = 'sources' | 'ai' | 'optimization' | 'complete';

interface UseSearchLoadingReturn {
  isLoading: boolean;
  stage: LoadingStage;
  progress: number;
  message: string;
  startLoading: () => void;
  stopLoading: () => void;
}

export function useSearchLoading(): UseSearchLoadingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<LoadingStage>('sources');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initialisation de la recherche...');

  useEffect(() => {
    if (!isLoading) return;

    // Stage 1: Sources (0-33%)
    const timer1 = setTimeout(() => {
      setStage('sources');
      setMessage('Connexion aux sources de données');

      // Simulate progress increase
      const progressInterval1 = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 33) {
            clearInterval(progressInterval1);
            return 33;
          }
          return prev + 1;
        });
      }, 60);

      return () => clearInterval(progressInterval1);
    }, 100);

    // Stage 2: AI Analysis (33-75%)
    const timer2 = setTimeout(() => {
      setStage('ai');
      setMessage('Analyse IA des profils LinkedIn');

      const progressInterval2 = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 75) {
            clearInterval(progressInterval2);
            return 75;
          }
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(progressInterval2);
    }, 2000);

    // Stage 3: Optimization (75-95%)
    const timer3 = setTimeout(() => {
      setStage('optimization');
      setMessage('Optimisation et validation des résultats');

      const progressInterval3 = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval3);
            return 95;
          }
          return prev + 0.5;
        });
      }, 80);

      return () => clearInterval(progressInterval3);
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isLoading]);

  const startLoading = () => {
    setIsLoading(true);
    setStage('sources');
    setProgress(0);
    setMessage('Initialisation de la recherche...');
  };

  const stopLoading = () => {
    setStage('complete');
    setProgress(100);
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
      setStage('sources');
    }, 500);
  };

  return {
    isLoading,
    stage,
    progress,
    message,
    startLoading,
    stopLoading,
  };
}
