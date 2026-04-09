import { useState, useEffect } from "react";

const STORAGE_KEY = "geo_professor_progress";

interface Progress {
  xp: number;
  completedModules: string[];
}

export function useUserProgress() {
  const [progress, setProgress] = useState<Progress>({
    xp: 0,
    completedModules: [],
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProgress(JSON.parse(stored));
    } catch {
      // localStorage not available
    }
  }, []);

  function addXP(amount: number) {
    setProgress((prev) => {
      const next = { ...prev, xp: prev.xp + amount };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage not available
      }
      return next;
    });
  }

  function completeModule(moduleId: string) {
    setProgress((prev) => {
      if (prev.completedModules.includes(moduleId)) return prev;
      const next = {
        ...prev,
        completedModules: [...prev.completedModules, moduleId],
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage not available
      }
      return next;
    });
  }

  return {
    xp: progress.xp,
    completedModules: progress.completedModules,
    addXP,
    completeModule,
  };
}
