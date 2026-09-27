import React, { useState, useRef, useEffect, FormEvent } from 'react';
import {
  ArrowRight,
  Play,
  Pause,
  Download,
  CheckCircle2,
  Trash2,
  Info,
  Mic,
  SkipForward,
  SkipBack,
  ChevronDown,
  Loader2,
  Volume2,
  Globe,
  Sparkles,
  DownloadCloud,
  Repeat,
  Square,
  X,
  Bookmark,
  BookmarkCheck,
  StickyNote,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Verse, SurahInfo, Reciter } from '../types';
import { getAyahAudioUrl } from '../data/reciters';
import {
  saveAudio,
  getAudio,
  deleteAudio,
  getAudioKey,
  autoCacheAudioOnPlay,
  downloadAudioWithProgress,
  onDownloadProgress,
  DownloadProgress,
  formatBytes
} from '../services/offlineService';
import { QuickFontSizeControl } from './QuickFontSizeControl';
import { DEFAULT_FONT_SIZE, getQuranLineHeight } from './FontSettingsModal';
import { AyahDownloadProgressBar } from './AyahDownloadProgressBar';
import {
  getFavoriteVerseNumbers,
  getAllNotes,
  toggleFavorite,
  deleteNote,
  subscribeUserData
} from '../services/userDataService';
import { VerseNoteCard } from './VerseNoteCard';

interface SurahReaderViewProps {
  surah: SurahInfo;
  verses: Verse[];
  onBack: () => void;
  selectedReciter: Reciter;
  onOpenReciterModal: () => void;
  downloadedKeys: Set<string>;
  onRefreshDownloads: () => void;
  onOpenTafsir: (verse: Verse) => void;
  fontSize?: number;
  onChangeFontSize?: (size: number) => void;
  onOpenFontSettings?: () => void;
  onOpenNoteModal?: (verse: Verse) => void;
  initialVerseInSura?: number;
}

export function SurahReaderView({
  surah,
  verses,
  onBack,
  selectedReciter,
  onOpenReciterModal,
  downloadedKeys,
  onRefreshDownloads,
  onOpenTafsir,
  fontSize = DEFAULT_FONT_SIZE,
  onChangeFontSize,
  onOpenFontSettings,
  onOpenNoteModal,
  initialVerseInSura,
}: SurahReaderViewProps) {
  const [playingAyahNumber, setPlayingAyahNumber] = useState<number | null>(null);

  // Feature 2: Continuous Auto-Play & Stop at End of Surah
  const [isContinuousPlay, setIsContinuousPlay] = useState<boolean>(() => {
    const saved = localStorage.getItem('quran_auto_continuous_play');
    return saved !== null ? saved === 'true' : true;
  });
  const [stopAtEndOfSurah, setStopAtEndOfSurah] = useState<boolean>(() => {
    const saved = localStorage.getItem('quran_stop_at_end_of_surah');
    return saved !== null ? saved === 'true' : true;
  });
  const [completedSurahToast, setCompletedSurahToast] = useState<boolean>(false);

  // Feature 1: Progress tracking per-verse and whole-surah
  const [activeProgressMap, setActiveProgressMap] = useState<Map<string, DownloadProgress>>(new Map());
  const [surahDownloadProgress, setSurahDownloadProgress] = useState<{
    completedCount: number;
    totalCount: number;
    currentVerseInSura: number;
    overallPercent: number;
  } | null>(null);

  const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [jumpToAyahInput, setJumpToAyahInput] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Filter verses of this surah
  const surahVerses = verses.filter((v) => v.suraNumber === surah.number);

  // User Data State (Favorites and Notes)
  const [favoriteSet, setFavoriteSet] = useState<Set<number>>(() => getFavoriteVerseNumbers());
  const [notesMap, setNotesMap] = useState(() => getAllNotes());

  useEffect(() => {
    const unsub = subscribeUserData(() => {
      setFavoriteSet(getFavoriteVerseNumbers());
      setNotesMap(getAllNotes());
    });
    return unsub;
  }, []);

  // Auto scroll to initialVerseInSura if provided
  useEffect(() => {
    if (initialVerseInSura) {
      const match = surahVerses.find((v) => v.verseInSura === initialVerseInSura);
      if (match) {
        const timer = setTimeout(() => {
          const el = verseRefs.current.get(match.number);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-amber-400/40');
            setTimeout(() => {
              el.classList.remove('ring-4', 'ring-amber-400/40');
            }, 3000);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [initialVerseInSura, surah.number, verses]);

  // Listen to live audio download progress events
  useEffect(() => {
    const unsubscribe = onDownloadProgress((prog) => {
      setActiveProgressMap((prev) => {
        const next = new Map(prev);
        if (prog.status === 'completed' || prog.status === 'error') {
          next.set(prog.key, prog);
          setTimeout(() => {
            setActiveProgressMap((curr) => {
              const copy = new Map(curr);
              copy.delete(prog.key);
              return copy;
            });
          }, 1500);
        } else {
          next.set(prog.key, prog);
        }
        return next;
      });
    });
    return () => unsubscribe();
  }, []);

  // Stop audio on unmount or surah change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [surah.number]);

  // Check how many verses of this surah are downloaded for the active reciter
  const downloadedCount = surahVerses.filter((v) => {
    const key = getAudioKey(selectedReciter.id, v.number);
    return downloadedKeys.has(key) || downloadedKeys.has(String(v.number));
  }).length;

  const isAllDownloaded = surahVerses.length > 0 && downloadedCount === surahVerses.length;

  const playVerse = async (verse: Verse) => {
    if (playingAyahNumber === verse.number) {
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAyahNumber(null);
      }
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const key = getAudioKey(selectedReciter.id, verse.number);
      let audioBlob = await getAudio(key);
      if (!audioBlob) {
        audioBlob = await getAudio(verse.number);
      }

      let src = getAyahAudioUrl(selectedReciter.subfolder, surah.number, verse.verseInSura);
      if (audioBlob) {
        src = URL.createObjectURL(audioBlob);
      } else {
        // Auto-cache to the reciter's folder in the background when playing online
        autoCacheAudioOnPlay({
          reciterId: selectedReciter.id,
          suraNumber: surah.number,
          verseInSura: verse.verseInSura,
          verseNumber: verse.number,
          audioUrl: src,
        }).then((cached) => {
          if (cached) {
            onRefreshDownloads();
          }
        });
      }

      const audio = new Audio(src);
      audioRef.current = audio;
      setPlayingAyahNumber(verse.number);

      // Auto scroll to verse
      const el = verseRefs.current.get(verse.number);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Continuous Auto-Play Handler
      audio.onended = () => {
        if (isContinuousPlay) {
          const currentIndex = surahVerses.findIndex((v) => v.number === verse.number);
          if (currentIndex >= 0 && currentIndex < surahVerses.length - 1) {
            // Move to next verse automatically
            playVerse(surahVerses[currentIndex + 1]);
            return;
          } else {
            // Reached the end of the surah!
            setPlayingAyahNumber(null);
            if (stopAtEndOfSurah) {
              setCompletedSurahToast(true);
              setTimeout(() => setCompletedSurahToast(false), 8000);
            }
            return;
          }
        }
        setPlayingAyahNumber(null);
      };

      audio.onerror = () => {
        setPlayingAyahNumber(null);
      };

      await audio.play();
    } catch (err) {
      console.error('Audio playback error:', err);
      setPlayingAyahNumber(null);
    }
  };

  const playNextAyah = () => {
    if (!playingAyahNumber) {
      if (surahVerses.length > 0) playVerse(surahVerses[0]);
      return;
    }
    const currentIndex = surahVerses.findIndex((v) => v.number === playingAyahNumber);
    if (currentIndex >= 0 && currentIndex < surahVerses.length - 1) {
      playVerse(surahVerses[currentIndex + 1]);
    }
  };

  const playPrevAyah = () => {
    if (!playingAyahNumber) return;
    const currentIndex = surahVerses.findIndex((v) => v.number === playingAyahNumber);
    if (currentIndex > 0) {
      playVerse(surahVerses[currentIndex - 1]);
    }
  };

  const handleDownload = async (verse: Verse) => {
    const key = getAudioKey(selectedReciter.id, verse.number);
    setDownloadingKeys((prev) => new Set(prev).add(key));

    try {
      const url = getAyahAudioUrl(selectedReciter.subfolder, surah.number, verse.verseInSura);
      await downloadAudioWithProgress(key, url, {
        reciterId: selectedReciter.id,
        suraNumber: surah.number,
        verseInSura: verse.verseInSura,
        verseNumber: verse.number,
        source: 'manual_download',
      });
      onRefreshDownloads();
    } catch (err) {
      alert('حدث خطأ أثناء تحميل الآية. يرجى التحقق من الاتصال بالإنترنت.');
    } finally {
      setDownloadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDeleteAudio = async (verse: Verse) => {
    const key = getAudioKey(selectedReciter.id, verse.number);
    await deleteAudio(key);
    onRefreshDownloads();
  };

  // Download all verses of current Surah for offline playback with progress tracking
  const handleDownloadEntireSurah = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);

    try {
      const neededVerses = surahVerses.filter((v) => {
        const key = getAudioKey(selectedReciter.id, v.number);
        return !downloadedKeys.has(key) && !downloadedKeys.has(String(v.number));
      });

      let completedSoFar = surahVerses.length - neededVerses.length;
      setSurahDownloadProgress({
        completedCount: completedSoFar,
        totalCount: surahVerses.length,
        currentVerseInSura: neededVerses[0]?.verseInSura || 1,
        overallPercent: Math.round((completedSoFar / surahVerses.length) * 100),
      });

      for (const verse of neededVerses) {
        const key = getAudioKey(selectedReciter.id, verse.number);
        setSurahDownloadProgress({
          completedCount: completedSoFar,
          totalCount: surahVerses.length,
          currentVerseInSura: verse.verseInSura,
          overallPercent: Math.round((completedSoFar / surahVerses.length) * 100),
        });

        try {
          const url = getAyahAudioUrl(selectedReciter.subfolder, surah.number, verse.verseInSura);
          await downloadAudioWithProgress(key, url, {
            reciterId: selectedReciter.id,
            suraNumber: surah.number,
            verseInSura: verse.verseInSura,
            verseNumber: verse.number,
            source: 'manual_download',
          });
          completedSoFar++;
          setSurahDownloadProgress({
            completedCount: completedSoFar,
            totalCount: surahVerses.length,
            currentVerseInSura: verse.verseInSura,
            overallPercent: Math.round((completedSoFar / surahVerses.length) * 100),
          });
        } catch (e) {
          console.warn(`Failed downloading ayah ${verse.verseInSura}:`, e);
        }
      }
      onRefreshDownloads();
    } finally {
      setIsDownloadingAll(false);
      setTimeout(() => setSurahDownloadProgress(null), 4000);
    }
  };

  const handleJumpToAyah = (e: FormEvent) => {
    e.preventDefault();
    const ayahNum = parseInt(jumpToAyahInput.trim(), 10);
    if (isNaN(ayahNum) || ayahNum < 1 || ayahNum > surah.ayahCount) {
      alert(`يرجى إدخال رقم آية بين 1 و ${surah.ayahCount}`);
      return;
    }
    const targetVerse = surahVerses.find((v) => v.verseInSura === ayahNum);
    if (targetVerse) {
      const el = verseRefs.current.get(targetVerse.number);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    setJumpToAyahInput('');
  };

  return (
    <div className="pb-28">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-emerald-900 text-white p-3.5 shadow-md flex items-center justify-between rounded-b-2xl border-b border-emerald-700/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold bg-emerald-800/80 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition-colors border border-emerald-600/40"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الفهرس</span>
        </button>

        <div className="text-center">
          <h2 className="font-amiri font-bold text-lg leading-none">سورة {surah.name}</h2>
          <span className="text-[10px] text-emerald-200">
            {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {surah.ayahCount} آيات
          </span>
        </div>

        <button
          onClick={onOpenReciterModal}
          className="flex items-center gap-1 bg-emerald-800/80 hover:bg-emerald-700 px-2.5 py-1.5 rounded-xl text-xs text-emerald-100 border border-emerald-600/40 transition-colors"
          title="تغيير القارئ"
        >
          <Mic className="w-3.5 h-3.5 text-emerald-300" />
          <span className="truncate max-w-[70px]">{selectedReciter.shortName}</span>
        </button>
      </div>

      {/* Reciter & Quick Controls Bar */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-emerald-100/70 mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (playingAyahNumber && audioRef.current) {
                audioRef.current.pause();
                setPlayingAyahNumber(null);
              } else if (surahVerses.length > 0) {
                playVerse(surahVerses[0]);
              }
            }}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors active:scale-95"
          >
            {playingAyahNumber ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>إيقاف التلاوة</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>تشغيل السورة</span>
              </>
            )}
          </button>

          {/* Continuous Auto-Play with Stop at End of Surah Option */}
          <div className="flex items-center gap-1.5 bg-emerald-50/90 border border-emerald-200/80 px-2 py-1 rounded-xl">
            <button
              onClick={() => {
                const next = !isContinuousPlay;
                setIsContinuousPlay(next);
                localStorage.setItem('quran_auto_continuous_play', String(next));
              }}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all px-2 py-0.5 rounded-lg ${
                isContinuousPlay
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
              title="عند انتهاء الآية ينتقل التطبيق تلقائياً للآية التالية"
            >
              <Repeat className={`w-3.5 h-3.5 ${isContinuousPlay ? 'text-amber-300' : 'text-gray-400'}`} />
              <span className="text-[11px]">التشغيل التلقائي المتتابع</span>
              {isContinuousPlay && <span className="text-[9px] bg-emerald-800 text-amber-200 px-1 py-0.2 rounded font-mono">مفعل</span>}
            </button>

            {isContinuousPlay && (
              <label
                className="flex items-center gap-1 text-[11px] text-emerald-950 cursor-pointer select-none border-r border-emerald-200/80 pr-1.5 mr-0.5"
                title="يتوقف التشغيل تلقائياً بمجرد إتمام آخر آية في السورة"
              >
                <input
                  type="checkbox"
                  checked={stopAtEndOfSurah}
                  onChange={(e) => {
                    setStopAtEndOfSurah(e.target.checked);
                    localStorage.setItem('quran_stop_at_end_of_surah', String(e.target.checked));
                  }}
                  className="accent-emerald-700 rounded w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[10px] font-medium hidden sm:inline">توقف بنهاية السورة</span>
                <span className="text-[10px] font-medium sm:hidden">توقف بالنهاية</span>
              </label>
            )}
          </div>
        </div>

        {/* Quick Font Size Control */}
        {onChangeFontSize && onOpenFontSettings && (
          <div className="flex items-center gap-1.5">
            <QuickFontSizeControl
              fontSize={fontSize}
              onChangeFontSize={onChangeFontSize}
              onOpenModal={onOpenFontSettings}
              variant="toolbar"
            />
          </div>
        )}

        {/* Download Whole Surah offline button */}
        <div className="flex items-center gap-2">
          {!isAllDownloaded ? (
            <button
              onClick={handleDownloadEntireSurah}
              disabled={isDownloadingAll}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200 transition disabled:opacity-50"
              title="تحميل جميع آيات السورة للاستماع أوفلاين مع شريط تقدم حي"
            >
              {isDownloadingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>جارٍ التحميل...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تحميل السورة ({downloadedCount}/{surahVerses.length})</span>
                </>
              )}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100/70 px-2 py-1 rounded-lg font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>السورة محملة بالكامل أوفلاين</span>
            </span>
          )}

          {/* Jump to ayah form */}
          <form onSubmit={handleJumpToAyah} className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max={surah.ayahCount}
              placeholder="الآية"
              value={jumpToAyahInput}
              onChange={(e) => setJumpToAyahInput(e.target.value)}
              className="w-12 px-2 py-1 text-center bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200"
            >
              انتقال
            </button>
          </form>
        </div>
      </div>

      {/* Whole Surah Download Progress Banner */}
      {surahDownloadProgress && (
        <div className="w-full bg-linear-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-2xl p-3 shadow-md mt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-emerald-700 animate-bounce" />
              <span className="font-bold text-emerald-950">
                جارٍ تحميل سورة {surah.name} كاملة ({surahDownloadProgress.completedCount} من {surahDownloadProgress.totalCount} آية)
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-800 text-xs bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
              {surahDownloadProgress.overallPercent}%
            </span>
          </div>

          <div className="w-full bg-emerald-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-linear-to-r from-emerald-600 to-teal-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${surahDownloadProgress.overallPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>الآية الحالية: {surahDownloadProgress.currentVerseInSura}</span>
            <span>متبقي: {surahDownloadProgress.totalCount - surahDownloadProgress.completedCount} آية</span>
          </div>
        </div>
      )}

      {/* Completed Surah Celebration Toast */}
      {completedSurahToast && (
        <div className="my-3 bg-linear-to-r from-amber-500 to-emerald-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in duration-300 border border-amber-300">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <p className="font-bold text-sm">تمت بحمد الله تلاوة سورة {surah.name} كاملة</p>
              <p className="text-xs text-emerald-100">
                تم التوقف تلقائياً عند نهاية السورة ({surah.ayahCount} آية) بصوت القارئ {selectedReciter.name}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCompletedSurahToast(false)}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Decorative Bismillah (except Surah 9 At-Tawbah) */}
      {surah.number !== 9 && (
        <div className="my-4 text-center">
          <div className="inline-block bg-linear-to-r from-emerald-50 via-amber-50 to-emerald-50 border border-emerald-200/60 rounded-2xl px-6 py-2 shadow-2xs">
            <p
              className="font-amiri text-emerald-950 font-bold tracking-wide transition-all duration-150"
              style={{
                fontSize: `${Math.max(20, Math.round(fontSize * 0.9))}px`,
                lineHeight: getQuranLineHeight(Math.max(20, Math.round(fontSize * 0.9))),
              }}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        </div>
      )}

      {/* Verses List */}
      <div className="space-y-3 mt-3">
        {surahVerses.map((verse) => {
          const isPlaying = playingAyahNumber === verse.number;
          const key = getAudioKey(selectedReciter.id, verse.number);
          const isDownloaded = downloadedKeys.has(key) || downloadedKeys.has(String(verse.number));
          const isDownloading = downloadingKeys.has(key);
          const currentProgress = activeProgressMap.get(key);

          return (
            <motion.div
              key={verse.number}
              ref={(el) => {
                if (el) verseRefs.current.set(verse.number, el);
                else verseRefs.current.delete(verse.number);
              }}
              className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                isPlaying
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-emerald-100/70 hover:border-emerald-200 shadow-2xs'
              }`}
            >
              {/* Verse Header bar */}
              <div className="bg-emerald-50/50 px-3.5 py-1.5 border-b border-emerald-100/60 flex items-center justify-between text-xs text-gray-500">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-200/80 text-emerald-900 flex items-center justify-center font-mono text-[10px] font-bold">
                    {verse.verseInSura}
                  </span>
                  الآية {verse.verseInSura}
                </span>

                <div className="flex items-center gap-2">
                  {currentProgress && currentProgress.status === 'downloading' && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full font-bold animate-pulse font-mono">
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                      <span>{currentProgress.percent}%</span>
                    </span>
                  )}

                  {isDownloaded && !currentProgress && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      محملة أوفلاين
                    </span>
                  )}

                  {/* Bookmark Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(verse.number, verse.suraNumber, verse.verseInSura)}
                    className={`p-1 rounded-lg transition-all ${
                      favoriteSet.has(verse.number)
                        ? 'text-amber-500 hover:text-amber-600 bg-amber-50 border border-amber-200'
                        : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                    title={favoriteSet.has(verse.number) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  >
                    {favoriteSet.has(verse.number) ? (
                      <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-650" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Live Download Progress Bar over verse */}
              {currentProgress && (
                <div className="px-3.5 pt-3">
                  <AyahDownloadProgressBar
                    progress={currentProgress}
                    reciterName={selectedReciter.shortName}
                  />
                </div>
              )}

              {/* Verse Body */}
              <div className="p-4">
                <p
                  className="quran-text text-center text-gray-900 mb-4 select-text transition-all duration-150"
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

                {/* English Translation Preview */}
                {verse.englishText && (
                  <p className="text-xs text-gray-500 text-left font-sans italic mb-3 px-2 border-l-2 border-emerald-300">
                    "{verse.englishText}"
                  </p>
                )}

                {/* Personal Note Card if exists */}
                {notesMap[verse.number] && (
                  <VerseNoteCard
                    note={notesMap[verse.number]}
                    onEdit={() => onOpenNoteModal?.(verse)}
                    onDelete={() => deleteNote(verse.number)}
                  />
                )}

                {/* Verse Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                  {/* Play audio button */}
                  <button
                    onClick={() => playVerse(verse)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      isPlaying
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:bg-emerald-200'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>إيقاف</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>تلاوة {selectedReciter.shortName}</span>
                      </>
                    )}
                  </button>

                  {/* Offline Download button */}
                  {!isDownloaded ? (
                    <button
                      onClick={() => handleDownload(verse)}
                      disabled={isDownloading}
                      className="p-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 border border-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs"
                      title="تحميل للاستماع دون اتصال"
                    >
                      {isDownloading || currentProgress ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          {currentProgress && (
                            <span className="font-mono text-[10px] text-emerald-800 font-bold">
                              {currentProgress.percent}%
                            </span>
                          )}
                        </>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteAudio(verse)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors"
                      title="حذف الملف المحمل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Personal Note button */}
                  <button
                    onClick={() => onOpenNoteModal?.(verse)}
                    className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-bold ${
                      notesMap[verse.number]
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : 'bg-gray-50 hover:bg-amber-50 text-gray-500 hover:text-amber-800 border-gray-200'
                    }`}
                    title="كتابة ملاحظة وتدبر شخصي"
                  >
                    <StickyNote className="w-4 h-4" />
                    <span>{notesMap[verse.number] ? 'خاطرتي' : 'تدبر'}</span>
                  </button>

                  {/* Tafsir & English button -> opens rich modal with Translation + Explanation + English Audio */}
                  <button
                    onClick={() => onOpenTafsir(verse)}
                    className="p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold bg-amber-50/90 text-amber-900 hover:bg-amber-100 border-amber-300 shadow-2xs active:scale-95"
                    title="التفسير والترجمة بالإنجليزية والقراءة الصوتية"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-700" />
                    <span>تفسير وترجمة</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Audio Player when an Ayah is Playing */}
      {playingAyahNumber && (
        <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-emerald-950/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-emerald-700/60 transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="font-bold text-emerald-100 truncate">
                سورة {surah.name} · الآية {surahVerses.find((v) => v.number === playingAyahNumber)?.verseInSura} من {surah.ayahCount}
              </span>
            </div>
            <span className="text-[10px] text-amber-300 font-bold shrink-0">
              {selectedReciter.shortName}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-emerald-800/80">
            {/* Auto-Continuous Play status pill button */}
            <button
              onClick={() => {
                const next = !isContinuousPlay;
                setIsContinuousPlay(next);
                localStorage.setItem('quran_auto_continuous_play', String(next));
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                isContinuousPlay
                  ? 'bg-emerald-700 text-amber-200 border border-emerald-500/40'
                  : 'bg-emerald-900/60 text-gray-300'
              }`}
              title="التشغيل التلقائي المتتابع للآية التالية"
            >
              <Repeat className="w-3 h-3" />
              <span>متتابع: {isContinuousPlay ? 'مفعل' : 'معطل'}</span>
            </button>

            {/* Audio Step controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={playPrevAyah}
                className="p-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white transition active:scale-95"
                title="الآية السابقة"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    setPlayingAyahNumber(null);
                  }
                }}
                className="p-2 rounded-xl bg-amber-400 text-emerald-950 hover:bg-amber-300 font-bold transition active:scale-95 shadow-xs"
                title="إيقاف مؤقت"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={playNextAyah}
                className="p-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white transition active:scale-95"
                title="الآية التالية"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stop button */}
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current = null;
                }
                setPlayingAyahNumber(null);
              }}
              className="p-1.5 rounded-lg bg-red-900/40 hover:bg-red-800 text-red-200 transition"
              title="إيقاف التلاوة"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
