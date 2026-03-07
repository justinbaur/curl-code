/**
 * Progress bar shown during runner execution
 */

import { useState, useEffect } from 'react';

interface RunnerProgressProps {
  currentIndex: number;
  totalRequests: number;
  startTime: number;
  onCancel: () => void;
}

export function RunnerProgress({ currentIndex, totalRequests, startTime, onCancel }: RunnerProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  const completed = currentIndex >= 0 ? currentIndex : 0;
  const percent = totalRequests > 0 ? Math.round((completed / totalRequests) * 100) : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}.${Math.floor((ms % 1000) / 100)}s`;
  };

  return (
    <div className="runner-progress">
      <div className="runner-progress-header">
        <span className="runner-progress-text">
          Running: {completed} of {totalRequests} requests
        </span>
        <span className="runner-progress-elapsed">{formatTime(elapsed)}</span>
      </div>
      <div className="runner-progress-bar-track">
        <div
          className="runner-progress-bar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <button className="runner-cancel-btn" onClick={onCancel}>
        Cancel Run
      </button>
    </div>
  );
}
