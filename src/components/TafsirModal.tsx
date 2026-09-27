import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  Play,
  Pause,
  Square,
  Download,
  CheckCircle2,
  Trash2,
  Loader2,
  BookOpen,
  Globe,
  Sparkles,
  Copy,
  Check,
  Headphones,
  RotateCcw,
  AlertCircle,
  FastForward,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Verse } from '../types';
import {
  fetchEnglishExplanation,
  getEnglishRecitationUrl,
  downloadEnglishRecitation,
  removeEnglishAudio,
  playEnglishSpeech,
  stopEnglishSpeech,
  pauseEnglishSpeech,
  resumeEnglishSpeech,
  getOfflineEnglishExplanation,
  isSpeechSynthesisAvailable,
  TTSController
} from '../services/tafsirService';
import { getEnglishAudioKey, getAudio, autoCacheAudioOnPlay } from '../services/offlineService';
import { DEFAULT_FONT_SIZE, getQuranLineHeight } from './FontSettingsModal';

interface TafsirModalProps {
  verse: Verse | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadStatusChange?: () => void;
  fontSize?: number;
}

export const TafsirModal: React.FC<TafsirModalProps> = ({
  verse,
  isOpen,
  onClose,
  onDownloadStatusChange,
  fontSize = DEFAULT_FONT_SIZE,
}) => {
  const [activeTab, setActiveTab] = useState<'english' | 'arabic'>('english');
  const [englishExplanation, setEnglishExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(true);

  // English Audio Recitation state
  const [isPlayingRecitation, setIsPlayingRecitation] = useState<boolean>(false);
  const [isAudioDownloaded, setIsAudioDownloaded] = useState<boolean>(false);
  const [isDownloadingAudio, setIsDownloadingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // English Speech Synthesis (TTS) state
  const [isSpeakingTTS, setIsSpeakingTTS] = useState<boolean>(false);
  const [isTTSPaused, setIsTTSPaused] = useState<boolean>(false);
  const [ttsCurrentChunk, setTtsCurrentChunk] = useState<{ current: number; total: number; text: string } | null>(null);
  const [ttsSpeed, setTtsSpeed] = useState<number>(0.95);
  const [ttsMode, setTtsMode] = useState<'both' | 'translation' | 'explanation'>('both');
  const [ttsError, setTtsError] = useState<string | null>(null);
  const ttsControllerRef = useRef<TTSController | null>(null);

  const [copied, setCopied] = useState<boolean>(false);

  // Load explanation and check offline audio cache whenever verse changes
  useEffect(() => {
    if (!verse || !isOpen) {
      handleStopAllAudio();
      return;
    }

    let isMounted = true;
    setLoadingExplanation(true);
    setTtsError(null);
    setTtsCurrentChunk(null);

    // Check if English audio is in IndexedDB
    const checkAudioCache = async () => {
      try {
        const key = getEnglishAudioKey(verse.number);
        const blob = await getAudio(key);
        if (isMounted) setIsAudioDownloaded(!!blob);
      } catch {
        if (isMounted) setIsAudioDownloaded(false);
      }
    };
    checkAudioCache();

    // Fetch English explanation
    fetchEnglishExplanation(verse)
      .then((explanation) => {
        if (isMounted) {
          setEnglishExplanation(explanation);
          setLoadingExplanation(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEnglishExplanation(getOfflineEnglishExplanation(verse));
          setLoadingExplanation(false);
        }
      });

    return () => {
      isMounted = false;
      handleStopAllAudio();
    };
  }, [verse, isOpen]);

  const handleStopAllAudio = () => {
    stopEnglishSpeech();
    if (ttsControllerRef.current) {
      ttsControllerRef.current.stop();
      ttsControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsSpeakingTTS(false);
    setIsTTSPaused(false);
    setIsPlayingRecitation(false);
    setTtsCurrentChunk(null);
  };

  if (!isOpen || !verse) return null;

  // Toggle English audio recitation (Ibrahim Walk)
  const toggleEnglishRecitation = async () => {
    // If TTS is playing, stop it
    if (isSpeakingTTS) {
      handleStopTTS();
    }

    if (isPlayingRecitation && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingRecitation(false);
      return;
    }

    try {
      // Check offline audio blob in IndexedDB first
      const key = getEnglishAudioKey(verse.number);
      const blob = await getAudio(key);
      let audioSrc = getEnglishRecitationUrl(verse.number);

      if (blob) {
        audioSrc = URL.createObjectURL(blob);
      } else {
        // Auto-cache in background to the reciter folder when playing online
        autoCacheAudioOnPlay({
          reciterId: 'en_walk',
          suraNumber: verse.suraNumber,
          verseInSura: verse.verseInSura,
          verseNumber: verse.number,
          audioUrl: audioSrc,
        }).then((cachedBlob) => {
          if (cachedBlob) {
            setIsAudioDownloaded(true);
            if (onDownloadStatusChange) onDownloadStatusChange();
          }
        });
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioSrc;
      audioRef.current.onended = () => {
        setIsPlayingRecitation(false);
      };
      audioRef.current.onerror = () => {
        setIsPlayingRecitation(false);
      };

      await audioRef.current.play();
      setIsPlayingRecitation(true);
    } catch (err) {
      console.warn('Audio play failed:', err);
      setIsPlayingRecitation(false);
    }
  };

  // Download English audio for offline
  const handleDownloadEnglishAudio = async () => {
    try {
      setIsDownloadingAudio(true);
      await downloadEnglishRecitation(verse.number);
      setIsAudioDownloaded(true);
      if (onDownloadStatusChange) onDownloadStatusChange();
    } catch (err) {
      alert('تعذر تحميل الملف الصوتي الإنجليزي حالياً. تأكد من اتصال الإنترنت.');
    } finally {
      setIsDownloadingAudio(false);
    }
  };

  const handleDeleteEnglishAudio = async () => {
    try {
      await removeEnglishAudio(verse.number);
      setIsAudioDownloaded(false);
      if (onDownloadStatusChange) onDownloadStatusChange();
    } catch (err) {
      console.error(err);
    }
  };

  // Build text for TTS based on selected mode
  const getTTSTextToSpeak = (): string => {
    const translation = verse.englishText || '';
    const explanation = englishExplanation || getOfflineEnglishExplanation(verse);

    if (ttsMode === 'translation') {
      return `Surah ${verse.sura}, verse ${verse.verseInSura}. Translation: ${translation}.`;
    }
    if (ttsMode === 'explanation') {
      return `Explanation for Surah ${verse.sura}, verse ${verse.verseInSura}: ${explanation}`;
    }
    return `Surah ${verse.sura}, verse ${verse.verseInSura}. Translation: ${translation}. Explanation: ${explanation}`;
  };

  // Play narration using advanced dual-engine TTS (Cloud audio + Web Speech fallback)
  const handleStartTTS = () => {
    // If recitation is playing, pause it
    if (audioRef.current && isPlayingRecitation) {
      audioRef.current.pause();
      setIsPlayingRecitation(false);
    }

    setTtsError(null);
    const textToSpeak = getTTSTextToSpeak();

    const controller = playEnglishSpeech({
      text: textToSpeak,
      verseNumber: verse.number,
      rate: ttsSpeed,
      onStart: () => {
        setIsSpeakingTTS(true);
        setIsTTSPaused(false);
      },
      onChunk: (current, total, text) => {
        setTtsCurrentChunk({ current, total, text });
      },
      onEnd: () => {
        setIsSpeakingTTS(false);
        setIsTTSPaused(false);
        setTtsCurrentChunk(null);
      },
      onError: (err) => {
        console.warn('TTS playback error callback:', err);
        setIsSpeakingTTS(false);
        setIsTTSPaused(false);
        setTtsError('تعذر تشغيل الصوت من محرك المتصفح. يمكنك تشغيل التلاوة الإنجليزية الرسمية كبديل فوري.');
      },
      onPause: () => {
        setIsTTSPaused(true);
      },
      onResume: () => {
        setIsTTSPaused(false);
      },
    });

    ttsControllerRef.current = controller;
    setIsSpeakingTTS(true);
    setIsTTSPaused(false);
  };

  const handlePauseResumeTTS = () => {
    if (isTTSPaused) {
      resumeEnglishSpeech();
      setIsTTSPaused(false);
    } else {
      pauseEnglishSpeech();
      setIsTTSPaused(true);
    }
  };

  const handleStopTTS = () => {
    stopEnglishSpeech();
    if (ttsControllerRef.current) {
      ttsControllerRef.current.stop();
      ttsControllerRef.current = null;
    }
    setIsSpeakingTTS(false);
    setIsTTSPaused(false);
    setTtsCurrentChunk(null);
  };

  const handleChangeSpeed = (speed: number) => {
    setTtsSpeed(speed);
    // If currently playing, restart with new speed
    if (isSpeakingTTS) {
      handleStopTTS();
      setTimeout(() => {
        setTtsSpeed(speed);
        handleStartTTS();
      }, 100);
    }
  };

  const handleCopyTranslation = () => {
    const text = `${verse.text}\n"${verse.englishText}"\n— [Surah ${verse.sura} ${verse.suraNumber}:${verse.verseInSura}]`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-emerald-100 text-right"
      >
        {/* Header Bar */}
        <div className="bg-emerald-900 text-white p-4 flex items-center justify-between shrink-0 border-b border-emerald-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleStopAllAudio();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-right">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                <span>سورة {verse.sura}</span>
                <span className="text-emerald-300 text-xs font-mono font-normal">
                  [الآية {verse.verseInSura}]
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200">
                Surah {verse.sura} · Verse {verse.verseInSura}
              </p>
            </div>
          </div>

          {/* Language Switcher Tabs */}
          <div className="flex items-center gap-1 bg-emerald-950/60 p-1 rounded-xl border border-emerald-700/50">
            <button
              onClick={() => setActiveTab('english')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'english'
                  ? 'bg-amber-400 text-emerald-950 shadow-xs'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>English</span>
            </button>
            <button
              onClick={() => setActiveTab('arabic')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'arabic'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              العربية
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Holy Verse Arabic Text */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-center">
            <p
              className="quran-text leading-loose text-gray-900 mb-2 transition-all duration-150"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: getQuranLineHeight(fontSize),
              }}
            >
              {verse.text}{' '}
              <span
                className="text-emerald-700 font-bold inline-block font-amiri mr-1"
                style={{ fontSize: `${Math.round(fontSize * 0.8)}px` }}
              >
                ﴿{verse.verseInSura}﴾
              </span>
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-emerald-100/80">
              <button
                onClick={handleCopyTranslation}
                className="flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-950 font-medium px-2 py-1 rounded-md hover:bg-emerald-100/70 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ الآية والترجمة'}</span>
              </button>
            </div>
          </div>

          {activeTab === 'english' ? (
            /* ENGLISH TAB CONTENT */
            <div className="space-y-4">
              {/* 1. Recitation & TTS Audio Hub */}
              <div className="bg-gradient-to-r from-emerald-850 via-emerald-800 to-teal-900 rounded-2xl p-3.5 text-white shadow-sm border border-emerald-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Volume2 className="w-4 h-4" />
                    <span>الصوتيات الإنجليزية (English Audio & TTS)</span>
                  </div>
                  {isAudioDownloaded && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-200 bg-emerald-700/60 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                      محفوظة دون اتصال
                    </span>
                  )}
                </div>

                {/* Primary Audio Actions */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {/* Ibrahim Walk Recitation Button */}
                  <div className="flex items-center gap-1 bg-emerald-950/40 p-1.5 rounded-xl border border-emerald-700/50">
                    <button
                      onClick={toggleEnglishRecitation}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition shadow-xs ${
                        isPlayingRecitation
                          ? 'bg-amber-400 text-emerald-950'
                          : 'bg-white/95 text-emerald-900 hover:bg-white active:scale-98'
                      }`}
                    >
                      {isPlayingRecitation ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>إيقاف التلاوة</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>تلاوة (Ibrahim Walk)</span>
                        </>
                      )}
                    </button>

                    {/* Offline Download */}
                    {!isAudioDownloaded ? (
                      <button
                        onClick={handleDownloadEnglishAudio}
                        disabled={isDownloadingAudio}
                        className="p-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                        title="تحميل التلاوة أوفلاين"
                      >
                        {isDownloadingAudio ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleDeleteEnglishAudio}
                        className="p-2 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 transition"
                        title="حذف الملف الصوتي المحمل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Speech Narration (TTS) Button */}
                  <div className="flex items-center gap-1 bg-emerald-950/40 p-1.5 rounded-xl border border-emerald-700/50">
                    {!isSpeakingTTS ? (
                      <button
                        onClick={handleStartTTS}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-emerald-950 transition shadow-xs active:scale-98"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>تشغيل الشرح الصوتي (TTS)</span>
                      </button>
                    ) : (
                      <div className="w-full flex items-center gap-1">
                        <button
                          onClick={handlePauseResumeTTS}
                          className="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-bold bg-amber-400 text-emerald-950"
                        >
                          {isTTSPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                          <span>{isTTSPaused ? 'متابعة' : 'إيقاف مؤقت'}</span>
                        </button>
                        <button
                          onClick={handleStopTTS}
                          className="p-2 rounded-lg bg-red-800/80 hover:bg-red-700 text-white transition"
                          title="إيقاف نهائي"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* TTS Options & Live Progress Panel (visible when active or configured) */}
                <div className="bg-emerald-950/50 rounded-xl p-2.5 border border-emerald-700/40 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-emerald-200">
                    <span className="font-semibold text-amber-200">خيارات الشرح الصوتي:</span>
                    {/* Speed options */}
                    <div className="flex items-center gap-1 bg-emerald-900/60 p-0.5 rounded-lg">
                      {[0.85, 0.95, 1.15].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleChangeSpeed(speed)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                            ttsSpeed === speed
                              ? 'bg-amber-400 text-emerald-950 font-bold'
                              : 'text-emerald-200 hover:text-white'
                          }`}
                        >
                          {speed === 0.85 ? '0.8x' : speed === 0.95 ? '1.0x' : '1.2x'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode options */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-emerald-300 ml-1">النطاق:</span>
                    <button
                      onClick={() => setTtsMode('both')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        ttsMode === 'both'
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'bg-emerald-900/50 text-emerald-300 hover:text-white'
                      }`}
                    >
                      الترجمة والشرح
                    </button>
                    <button
                      onClick={() => setTtsMode('translation')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        ttsMode === 'translation'
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'bg-emerald-900/50 text-emerald-300 hover:text-white'
                      }`}
                    >
                      الترجمة فقط
                    </button>
                    <button
                      onClick={() => setTtsMode('explanation')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        ttsMode === 'explanation'
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'bg-emerald-900/50 text-emerald-300 hover:text-white'
                      }`}
                    >
                      الشرح فقط
                    </button>
                  </div>

                  {/* Live chunk progress banner */}
                  {isSpeakingTTS && ttsCurrentChunk && (
                    <div className="mt-2 bg-emerald-900/80 p-2 rounded-lg border border-emerald-600/50 text-left text-emerald-100 text-[11px] animate-fade-in font-sans">
                      <div className="flex items-center justify-between text-[10px] text-amber-300 mb-1">
                        <span className="flex items-center gap-1 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          Reading Sentence {ttsCurrentChunk.current} of {ttsCurrentChunk.total}:
                        </span>
                        <span>{isTTSPaused ? '(Paused)' : '(Playing)'}</span>
                      </div>
                      <p className="line-clamp-2 italic text-white/95">
                        "{ttsCurrentChunk.text}"
                      </p>
                    </div>
                  )}

                  {/* TTS Error Notice with instant fallback */}
                  {ttsError && (
                    <div className="mt-2 bg-amber-900/60 p-2.5 rounded-lg border border-amber-500/50 text-xs text-amber-100 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-200">{ttsError}</p>
                          <p className="text-[10px] text-amber-100/90 mt-0.5">
                            يمكنك استخدام تلاوة إبراهيم ووك المرفقة التي تعمل على جميع الأجهزة دون الحاجة لمحرك نطق.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={toggleEnglishRecitation}
                        className="px-2 py-1 bg-amber-400 text-emerald-950 font-bold rounded-md text-[10px] shrink-0"
                      >
                        تشغيل التلاوة
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. English Translation (Sahih International) */}
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>English Translation</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-mono bg-amber-200/60 px-2 py-0.5 rounded-full">
                    Sahih International
                  </span>
                </div>
                <p className="text-gray-900 text-sm sm:text-base leading-relaxed font-serif">
                  "{verse.englishText}"
                </p>
              </div>

              {/* 3. English Explanation / Commentary */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs text-left">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950 mb-3 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span>English Explanation & Commentary (الشرح بالإنجليزية)</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Tafsir Exegesis
                  </span>
                </div>

                {loadingExplanation ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span>جارٍ تحميل الشرح بالإنجليزية...</span>
                  </div>
                ) : (
                  <div className="text-gray-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-2 font-sans">
                    {englishExplanation}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ARABIC TAB CONTENT */
            <div className="space-y-4">
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-right">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-700" />
                    <span>التفسير الميسر</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded-full">
                    مجمع الملك فهد لطباعة المصحف الشريف
                  </span>
                </div>
                <p className="text-gray-800 text-sm sm:text-base leading-relaxed">
                  {verse.tafsir}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>يعمل بدون إنترنت (Offline Ready)</span>
          </span>
          <button
            onClick={() => {
              handleStopAllAudio();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
};
