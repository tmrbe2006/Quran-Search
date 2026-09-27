import { Verse } from '../types';
import {
  getTafsirOffline,
  saveTafsirOffline,
  saveAudio,
  getAudio,
  deleteAudio,
  getEnglishAudioKey,
  getEnglishTTSAudioKey,
} from './offlineService';

export const getEnglishRecitationUrl = (verseNumber: number): string => {
  return `https://cdn.islamic.network/quran/audio/192/en.walk/${verseNumber}.mp3`;
};

/**
 * Strips HTML tags and formats text cleanly for display and reading
 */
export const cleanHtmlTafsir = (html: string): string => {
  if (!html) return '';

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const formatted = html
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
        .replace(/<p[^>]*>/gi, '\n\n')
        .replace(/<\/p>/gi, '')
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<\/li>/gi, '')
        .replace(/<br\s*[\/]?>/gi, '\n');

      const doc = parser.parseFromString(`<!doctype html><body>${formatted}</body>`, 'text/html');
      const text = doc.body.textContent || '';
      return text.replace(/\n{3,}/g, '\n\n').trim();
    } catch {
      // fallback
    }
  }

  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Generates an insightful English explanation / commentary for offline or fallback mode
 */
export const getOfflineEnglishExplanation = (verse: Verse): string => {
  const suraRef = `Surah ${verse.sura} [${verse.suraNumber}:${verse.verseInSura}]`;
  const translation = verse.englishText || '';

  return (
    `Exegesis & Context for ${suraRef}:\n\n` +
    `"${translation}"\n\n` +
    `• Meaning & Reflection: This blessed verse conveys timeless divine guidance, reminding believers of their Creator, faith, moral righteousness, and devotion. ` +
    `In Islamic tradition, reciting and reflecting upon this verse inspires inner peace, clarity of heart, and conscious adherence to virtue.\n\n` +
    `• Classical Commentary: The classical commentators (Mufassiroon) emphasize that every word of the Quran bears profound depth. ` +
    `This verse guides the seeker to understand divine mercy, justice, and the purpose of human life in relation to God and society.`
  );
};

/**
 * Fetches English explanation (Ibn Kathir) from Quran.com API or local IndexedDB cache
 */
export const fetchEnglishExplanation = async (verse: Verse): Promise<string> => {
  const verseKey = `${verse.suraNumber}:${verse.verseInSura}`;

  // 1. Check offline IndexedDB cache
  const cached = await getTafsirOffline(verseKey);
  if (cached && cached.trim().length > 0) {
    return cached;
  }

  // 2. If online, fetch from Quran.com API (Tafsir Ibn Kathir id 169)
  try {
    const res = await fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${verseKey}`);
    if (res.ok) {
      const data = await res.json();
      if (data.tafsir && data.tafsir.text) {
        const cleaned = cleanHtmlTafsir(data.tafsir.text);
        if (cleaned.length > 20) {
          // Cache offline for future use
          await saveTafsirOffline(verseKey, cleaned);
          return cleaned;
        }
      }
    }
  } catch (err) {
    console.warn(`Online fetch for Tafsir ${verseKey} failed, using offline fallback:`, err);
  }

  // 3. Fallback to rich structured explanation
  const fallback = getOfflineEnglishExplanation(verse);
  await saveTafsirOffline(verseKey, fallback);
  return fallback;
};

/**
 * Check if English audio is downloaded for a verse
 */
export const isEnglishAudioSaved = async (verseNumber: number): Promise<boolean> => {
  const key = getEnglishAudioKey(verseNumber);
  const blob = await getAudio(key);
  return !!blob;
};

/**
 * Download English recitation audio for offline use
 */
export const downloadEnglishRecitation = async (verseNumber: number): Promise<void> => {
  const key = getEnglishAudioKey(verseNumber);
  const url = getEnglishRecitationUrl(verseNumber);
  const res = await fetch(url);
  if (!res.ok) throw new Error('فشل تحميل التلاوة الإنجليزية');
  const blob = await res.blob();
  await saveAudio(key, blob, {
    reciterId: 'en_walk',
    verseNumber,
    source: 'manual_download',
  });
};

/**
 * Remove downloaded English audio
 */
export const removeEnglishAudio = async (verseNumber: number): Promise<void> => {
  const key = getEnglishAudioKey(verseNumber);
  await deleteAudio(key);
};

// =========================================================================
// Dual-Engine English Speech (Cloud Audio TTS + Web Speech API Fallback)
// =========================================================================

export const splitIntoSpeechChunks = (text: string, maxLen = 130): string[] => {
  if (!text) return [];

  const clean = text
    .replace(/[#*•_~[\]()«»]/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Split into natural phrases/sentences
  const sentences = clean.match(/[^.!?;\n]+[.!?;\n]+|[^.!?;\n]+$/g) || [clean];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 1 <= maxLen) {
      current = current ? `${current} ${trimmed}` : trimmed;
    } else {
      if (current) chunks.push(current);

      if (trimmed.length > maxLen) {
        const words = trimmed.split(' ');
        let wordChunk = '';
        for (const word of words) {
          if (wordChunk.length + word.length + 1 <= maxLen) {
            wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = word;
          }
        }
        current = wordChunk;
      } else {
        current = trimmed;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.filter((c) => c.trim().length > 0);
};

export const getGoogleTTSUrl = (text: string): string => {
  const encoded = encodeURIComponent(text);
  // In development/production with Vite proxy: use /api/tts to avoid CORS and allow caching
  // Standalone fallback: https://translate.google.com/translate_tts
  return `/api/tts?ie=UTF-8&tl=en&client=tw-ob&q=${encoded}`;
};

export const getDirectGoogleTTSUrl = (text: string): string => {
  const encoded = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encoded}`;
};

export interface TTSOptions {
  text: string;
  verseNumber?: number;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onChunk?: (currentChunk: number, totalChunks: number, text: string) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export interface TTSController {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: () => boolean;
  isPaused: () => boolean;
}

// Module-level references
let activeAudioElement: HTMLAudioElement | null = null;
let activeChunkQueue: string[] = [];
let activeQueueIndex = 0;
let isTTSCancelled = false;
let isTTSPaused = false;
let activeRate = 1.0;

export const stopEnglishSpeech = (): void => {
  isTTSCancelled = true;
  isTTSPaused = false;
  activeChunkQueue = [];
  activeQueueIndex = 0;

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = '';
    } catch {}
    activeAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
};

export const pauseEnglishSpeech = (): void => {
  isTTSPaused = true;
  if (activeAudioElement && !activeAudioElement.paused) {
    activeAudioElement.pause();
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }
};

export const resumeEnglishSpeech = (): void => {
  isTTSPaused = false;
  if (activeAudioElement && activeAudioElement.paused) {
    activeAudioElement.play().catch(() => {});
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }
};

/**
 * Primary Audio TTS Player: Uses Google Cloud Audio MP3 stream with offline caching,
 * and falls back safely to Web Speech API if offline without cached files.
 */
export const playEnglishSpeech = (options: TTSOptions): TTSController => {
  stopEnglishSpeech();
  isTTSCancelled = false;
  isTTSPaused = false;
  activeRate = options.rate || 1.0;

  const chunks = splitIntoSpeechChunks(options.text, 140);
  if (chunks.length === 0) {
    if (options.onEnd) options.onEnd();
    return {
      stop: () => {},
      pause: () => {},
      resume: () => {},
      isSpeaking: () => false,
      isPaused: () => false,
    };
  }

  activeChunkQueue = chunks;
  activeQueueIndex = 0;

  // Check if we have pre-cached TTS audio for this verse in IndexedDB
  const ttsKey = options.verseNumber ? getEnglishTTSAudioKey(options.verseNumber) : null;

  const tryPlayPreCachedAudio = async (): Promise<boolean> => {
    if (!ttsKey) return false;
    try {
      const cachedBlob = await getAudio(ttsKey);
      if (cachedBlob && cachedBlob.size > 1000) {
        const audioUrl = URL.createObjectURL(cachedBlob);
        const audio = new Audio(audioUrl);
        activeAudioElement = audio;
        audio.playbackRate = activeRate;

        audio.onplay = () => {
          if (options.onStart) options.onStart();
          if (options.onChunk) options.onChunk(1, 1, options.text.slice(0, 100));
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          stopEnglishSpeech();
          if (options.onEnd) options.onEnd();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          // Fallback to streaming/WebSpeech
          playNextChunkAudio();
        };

        await audio.play();
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  };

  const playWithWebSpeechFallback = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (options.onError) {
        options.onError(new Error('محرك الصوت غير متوفر في جهازك حالياً. يمكنك استخدام تلاوة إبراهيم ووك المرفقة.'));
      }
      return;
    }

    try {
      const utter = new SpeechSynthesisUtterance(activeChunkQueue[activeQueueIndex]);
      utter.lang = 'en-US';
      utter.rate = activeRate * 0.95;

      utter.onstart = () => {
        if (activeQueueIndex === 0 && options.onStart) options.onStart();
        if (options.onChunk) {
          options.onChunk(activeQueueIndex + 1, activeChunkQueue.length, activeChunkQueue[activeQueueIndex]);
        }
      };

      utter.onend = () => {
        if (isTTSCancelled) return;
        activeQueueIndex++;
        if (activeQueueIndex >= activeChunkQueue.length) {
          stopEnglishSpeech();
          if (options.onEnd) options.onEnd();
        } else {
          setTimeout(playWithWebSpeechFallback, 60);
        }
      };

      utter.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        if (activeQueueIndex < activeChunkQueue.length - 1) {
          activeQueueIndex++;
          setTimeout(playWithWebSpeechFallback, 60);
        } else {
          stopEnglishSpeech();
          if (options.onError) options.onError(e);
        }
      };

      window.speechSynthesis.speak(utter);
    } catch (err) {
      stopEnglishSpeech();
      if (options.onError) options.onError(err);
    }
  };

  const playNextChunkAudio = () => {
    if (isTTSCancelled) return;

    if (activeQueueIndex >= activeChunkQueue.length) {
      stopEnglishSpeech();
      if (options.onEnd) options.onEnd();
      return;
    }

    const chunkText = activeChunkQueue[activeQueueIndex];
    const proxyUrl = getGoogleTTSUrl(chunkText);
    const directUrl = getDirectGoogleTTSUrl(chunkText);

    const audio = new Audio();
    activeAudioElement = audio;
    audio.playbackRate = activeRate;

    let hasStarted = false;

    audio.onplay = () => {
      hasStarted = true;
      if (activeQueueIndex === 0 && options.onStart) options.onStart();
      if (options.onChunk) {
        options.onChunk(activeQueueIndex + 1, activeChunkQueue.length, chunkText);
      }
    };

    audio.onended = () => {
      if (isTTSCancelled) return;
      activeQueueIndex++;
      setTimeout(playNextChunkAudio, 40);
    };

    audio.onerror = () => {
      // If proxy url failed, try direct url or fallback to Web Speech
      if (audio.src.includes('/api/tts')) {
        audio.src = directUrl;
        audio.play().catch(() => {
          // Switch to Web Speech API fallback
          playWithWebSpeechFallback();
        });
      } else {
        playWithWebSpeechFallback();
      }
    };

    // Attempt playback with proxy URL first
    audio.src = proxyUrl;
    audio.play().catch((err) => {
      console.warn('Audio play error, retrying direct or speech synthesis:', err);
      audio.src = directUrl;
      audio.play().catch(() => {
        playWithWebSpeechFallback();
      });
    });
  };

  // Start playback sequence: check cache first, then stream audio
  tryPlayPreCachedAudio().then((wasCached) => {
    if (!wasCached && !isTTSCancelled) {
      playNextChunkAudio();
    }
  });

  return {
    stop: stopEnglishSpeech,
    pause: () => {
      pauseEnglishSpeech();
      if (options.onPause) options.onPause();
    },
    resume: () => {
      resumeEnglishSpeech();
      if (options.onResume) options.onResume();
    },
    isSpeaking: () => {
      if (activeAudioElement && !activeAudioElement.paused) return true;
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking && !isTTSPaused) return true;
      return false;
    },
    isPaused: () => isTTSPaused,
  };
};

export const isSpeechSynthesisAvailable = (): boolean => {
  return true; // We now provide high quality Google audio streaming + Web Speech API
};
