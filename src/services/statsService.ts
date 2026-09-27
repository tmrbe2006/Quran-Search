export interface ListeningStats {
  totalSeconds: number;
  reciters: Record<string, number>; // reciterId -> seconds
}

export function getListeningStats(): ListeningStats {
  const saved = localStorage.getItem('quran_listening_stats');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return {
    totalSeconds: 0,
    reciters: {},
  };
}

export function saveListeningStats(stats: ListeningStats) {
  localStorage.setItem('quran_listening_stats', JSON.stringify(stats));
}

export function trackListeningSecond(reciterId: string) {
  const stats = getListeningStats();
  stats.totalSeconds += 1;
  stats.reciters[reciterId] = (stats.reciters[reciterId] || 0) + 1;
  saveListeningStats(stats);
  
  // Dispatch a custom event so UI components can update live!
  window.dispatchEvent(new Event('quran_stats_updated'));
}

export function resetListeningStats() {
  localStorage.removeItem('quran_listening_stats');
  window.dispatchEvent(new Event('quran_stats_updated'));
}

// Intercept window.Audio transparently to automatically collect statistics!
if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined' && !(window as any).__quran_audio_tracked) {
  (window as any).__quran_audio_tracked = true;
  
  const OriginalAudio = window.Audio;
  
  // Custom wrapper class
  class TrackedAudio extends OriginalAudio {
    private statsInterval: any = null;

    constructor(src?: string) {
      super(src);
      
      const startTracking = () => {
        if (!this.statsInterval) {
          this.statsInterval = setInterval(() => {
            if (!this.paused && !this.ended && this.currentTime > 0) {
              const reciterId = localStorage.getItem('quran_selected_reciter_id') || 'alafasy';
              trackListeningSecond(reciterId);
            }
          }, 1000);
        }
      };

      const stopTracking = () => {
        if (this.statsInterval) {
          clearInterval(this.statsInterval);
          this.statsInterval = null;
        }
      };

      this.addEventListener('play', startTracking);
      this.addEventListener('playing', startTracking);
      this.addEventListener('pause', stopTracking);
      this.addEventListener('ended', stopTracking);
      this.addEventListener('emptied', stopTracking);
      this.addEventListener('error', stopTracking);
    }
  }

  window.Audio = TrackedAudio as any;
}
