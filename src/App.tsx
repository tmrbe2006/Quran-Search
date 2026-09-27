import React, { useState, useEffect, useRef, ChangeEvent, MouseEvent } from 'react';
import {
  Search,
  BookOpen,
  Hash,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Download,
  CheckCircle2,
  Trash2,
  DownloadCloud,
  History,
  X,
  Menu,
  Mic,
  HardDrive,
  Info,
  Globe,
  WifiOff,
  Heart,
  Type,
  Clock,
  Bookmark,
  BookmarkCheck,
  StickyNote,
  Bell,
  Volume2,
  Sun,
  Moon,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadQuranData, searchQuran, SURA_NAMES } from './services/quranService';
import { Verse, SurahInfo, SearchResult, QuranStats, Reciter } from './types';
import {
  saveAudio,
  getAudio,
  deleteAudio,
  getAllDownloadedKeys,
  getAudioKey,
  autoCacheAudioOnPlay,
  onAudioDownloaded,
  downloadAudioWithProgress,
  onDownloadProgress,
  DownloadProgress
} from './services/offlineService';
import { normalizeArabic, highlightMatches } from './utils/arabic';
import { RECITERS, DEFAULT_RECITER_ID, getReciterById, getAyahAudioUrl } from './data/reciters';
import { ReciterModal } from './components/ReciterModal';
import { SurahDrawer } from './components/SurahDrawer';
import { SurahIndexView } from './components/SurahIndexView';
import { SurahReaderView } from './components/SurahReaderView';
import { DownloadsView } from './components/DownloadsView';
import { TafsirModal } from './components/TafsirModal';
import { AboutView } from './components/AboutView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AyahDownloadProgressBar } from './components/AyahDownloadProgressBar';
import {
  FontSettingsModal,
  DEFAULT_FONT_SIZE,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  getQuranLineHeight
} from './components/FontSettingsModal';
import { QuickFontSizeControl } from './components/QuickFontSizeControl';
import {
  getFavoriteVerseNumbers,
  getAllNotes,
  toggleFavorite,
  deleteNote,
  subscribeUserData
} from './services/userDataService';
import { FavoritesView } from './components/FavoritesView';
import { PrayerTimesView } from './components/PrayerTimesView';
import { NoteEditorModal } from './components/NoteEditorModal';
import { VerseNoteCard } from './components/VerseNoteCard';
import { StatsView } from './components/StatsView';
import './services/statsService'; // auto-registers window.Audio tracker proxy!

const MAX_HISTORY = 10;
const MAX_SUGGESTIONS = 6;

type TabType = 'search' | 'surahs' | 'prayer' | 'stats' | 'favorites' | 'downloads' | 'about';

export default function App() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [surahs, setSurahs] = useState<SurahInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view & navigation
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('quran_dark_mode') === 'true';
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('quran_dark_mode', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number | null>(null);
  const [isSurahDrawerOpen, setIsSurahDrawerOpen] = useState(false);
  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);

  // Quran Font Size state (persisted)
  const [quranFontSize, setQuranFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('quran_font_size');
    if (saved) {
      const parsed = Number(saved);
      if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
        return parsed;
      }
    }
    return DEFAULT_FONT_SIZE;
  });
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);

  const handleUpdateFontSize = (newSize: number) => {
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, newSize));
    setQuranFontSize(clamped);
    localStorage.setItem('quran_font_size', String(clamped));
  };

  const handleResetFontSize = () => {
    setQuranFontSize(DEFAULT_FONT_SIZE);
    localStorage.setItem('quran_font_size', String(DEFAULT_FONT_SIZE));
  };

  // Tafsir & English modal state
  const [selectedTafsirVerse, setSelectedTafsirVerse] = useState<Verse | null>(null);
  const [isTafsirModalOpen, setIsTafsirModalOpen] = useState(false);

  // Reciter state
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(() => {
    const saved = localStorage.getItem('quran_selected_reciter_id');
    return saved ? getReciterById(saved) : getReciterById(DEFAULT_RECITER_ID);
  });

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<QuranStats>({ totalMatches: 0, uniqueVerses: 0 });
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Audio & Offline state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [downloadedKeys, setDownloadedKeys] = useState<Set<string>>(new Set());
  const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(new Set());
  const [downloadProgressMap, setDownloadProgressMap] = useState<Map<string, DownloadProgress>>(new Map());

  // Personal Notes & Favorites reactive state
  const [favoriteSet, setFavoriteSet] = useState<Set<number>>(() => getFavoriteVerseNumbers());
  const [notesMap, setNotesMap] = useState(() => getAllNotes());
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNoteVerse, setSelectedNoteVerse] = useState<Verse | null>(null);

  // For jumping to a specific verse from Favorites or Search result
  const [targetVerseInSura, setTargetVerseInSura] = useState<number | undefined>(undefined);

  useEffect(() => {
    const unsub = subscribeUserData(() => {
      setFavoriteSet(getFavoriteVerseNumbers());
      setNotesMap(getAllNotes());
    });
    return unsub;
  }, []);

  const handleOpenNoteModal = (verse: Verse) => {
    setSelectedNoteVerse(verse);
    setIsNoteModalOpen(true);
  };

  const handleDeleteNote = (verseNumber: number) => {
    deleteNote(verseNumber);
  };

  const handleToggleFavorite = (verse: Verse) => {
    toggleFavorite(verse.number, verse.suraNumber, verse.verseInSura);
  };

  const handleNavigateToVerse = (suraNumber: number, verseInSura?: number) => {
    setTargetVerseInSura(verseInSura);
    setSelectedSurahNumber(suraNumber);
    setActiveTab('surahs');
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Initialize data
  useEffect(() => {
    const init = async () => {
      try {
        const [quranData, savedKeys] = await Promise.all([
          loadQuranData(),
          getAllDownloadedKeys(),
        ]);
        setVerses(quranData.verses);
        setSurahs(quranData.surahs);
        setDownloadedKeys(new Set(savedKeys));

        // Load search history
        const savedHistory = localStorage.getItem('quran_search_history');
        if (savedHistory) {
          try {
            setHistory(JSON.parse(savedHistory));
          } catch {}
        }

        setLoading(false);
      } catch (err) {
        setError('فشل تحميل بيانات المصحف الشريف. يرجى التأكد من الاتصال بالإنترنت في المرة الأولى.');
        setLoading(false);
      }
    };
    init();

    // Close suggestions on outside click
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Listen to auto-downloaded audio events
    const unsubscribeDownload = onAudioDownloaded((key) => {
      setDownloadedKeys((prev) => new Set(prev).add(key));
    });

    // Listen to live download progress events
    const unsubscribeProgress = onDownloadProgress((prog) => {
      setDownloadProgressMap((prev) => {
        const next = new Map(prev);
        if (prog.status === 'completed' || prog.status === 'error') {
          next.set(prog.key, prog);
          setTimeout(() => {
            setDownloadProgressMap((curr) => {
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

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      unsubscribeDownload();
      unsubscribeProgress();
    };
  }, []);

  const refreshDownloads = async () => {
    const keys = await getAllDownloadedKeys();
    setDownloadedKeys(new Set(keys));
  };

  const handleSelectReciter = (reciter: Reciter) => {
    setSelectedReciter(reciter);
    localStorage.setItem('quran_selected_reciter_id', reciter.id);
    // Pause current audio if reciter changes
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
  };

  const handleOpenTafsirModal = (verse: Verse) => {
    setSelectedTafsirVerse(verse);
    setIsTafsirModalOpen(true);
  };

  const performSearch = (searchTerm: string) => {
    if (searchTerm.trim().length >= 1) {
      const { results: searchResults, stats: searchStats } = searchQuran(searchTerm, verses);
      setResults(searchResults);
      setStats(searchStats);

      // Save history
      setHistory((prev) => {
        const filtered = prev.filter((h) => h !== searchTerm.trim());
        const newHistory = [searchTerm.trim(), ...filtered].slice(0, MAX_HISTORY);
        localStorage.setItem('quran_search_history', JSON.stringify(newHistory));
        return newHistory;
      });
    } else {
      setResults([]);
      setStats({ totalMatches: 0, uniqueVerses: 0 });
    }
    setShowSuggestions(false);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (val.trim().length >= 1) {
      const normalizedInput = normalizeArabic(val.trim());

      // 1. History matches
      const historyMatches = history.filter((h) => normalizeArabic(h).startsWith(normalizedInput));

      // 2. Extract matching words from Quran text
      const extractedWords: string[] = [];
      for (const verse of verses) {
        if (extractedWords.length >= MAX_SUGGESTIONS * 2) break;
        const words = verse.text.split(/\s+/);
        for (const word of words) {
          const cleanWord = word.replace(/[،.؛:!؟()]/g, '');
          const normWord = normalizeArabic(cleanWord);
          if (
            normWord.startsWith(normalizedInput) &&
            cleanWord.length > 2 &&
            !extractedWords.includes(cleanWord) &&
            !historyMatches.includes(cleanWord)
          ) {
            extractedWords.push(cleanWord);
            if (extractedWords.length >= MAX_SUGGESTIONS) break;
          }
        }
      }

      const combined = Array.from(new Set([...historyMatches, ...extractedWords])).slice(
        0,
        MAX_SUGGESTIONS
      );
      setSuggestions(combined);
      setShowSuggestions(combined.length > 0);

      // Instant live search from 1 character
      const { results: searchResults, stats: searchStats } = searchQuran(val, verses);
      setResults(searchResults);
      setStats(searchStats);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setResults([]);
      setStats({ totalMatches: 0, uniqueVerses: 0 });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  };

  const removeFromHistory = (e: MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = history.filter((h) => h !== item);
    setHistory(updated);
    localStorage.setItem('quran_search_history', JSON.stringify(updated));
    setSuggestions((prev) => prev.filter((s) => s !== item));
  };

  // Audio Playback
  const toggleSearchAudio = async (verse: Verse) => {
    if (playingId === verse.number) {
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
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

      let src = getAyahAudioUrl(selectedReciter.subfolder, verse.suraNumber, verse.verseInSura);
      if (audioBlob) {
        src = URL.createObjectURL(audioBlob);
      } else {
        // Auto-cache to reciter folder in background when playing online
        autoCacheAudioOnPlay({
          reciterId: selectedReciter.id,
          suraNumber: verse.suraNumber,
          verseInSura: verse.verseInSura,
          verseNumber: verse.number,
          audioUrl: src,
        }).then((cached) => {
          if (cached) {
            refreshDownloads();
          }
        });
      }

      const audio = new Audio(src);
      audioRef.current = audio;
      setPlayingId(verse.number);

      audio.onended = () => {
        setPlayingId(null);
      };

      audio.onerror = () => {
        setPlayingId(null);
        alert('حدث خطأ أثناء تشغيل الملف الصوتي. يرجى التأكد من اتصالك بالإنترنت.');
      };

      await audio.play();
    } catch (err) {
      console.error('Audio playback error:', err);
      setPlayingId(null);
    }
  };

  const downloadVerse = async (verse: Verse) => {
    const key = getAudioKey(selectedReciter.id, verse.number);
    setDownloadingKeys((prev) => new Set(prev).add(key));

    try {
      const url = getAyahAudioUrl(selectedReciter.subfolder, verse.suraNumber, verse.verseInSura);
      await downloadAudioWithProgress(key, url, {
        reciterId: selectedReciter.id,
        suraNumber: verse.suraNumber,
        verseInSura: verse.verseInSura,
        verseNumber: verse.number,
        source: 'manual_download',
      });
      await refreshDownloads();
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

  const removeDownload = async (verseNumber: number) => {
    const key = getAudioKey(selectedReciter.id, verseNumber);
    await deleteAudio(key);
    await deleteAudio(verseNumber);
    await refreshDownloads();
  };

  const handleOpenSurah = (surahNum: number) => {
    setSelectedSurahNumber(surahNum);
    setActiveTab('surahs');
  };

  const currentSelectedSurah = selectedSurahNumber
    ? surahs.find((s) => s.number === selectedSurahNumber)
    : null;

  return (
    <div className={`min-h-screen flex justify-center py-0 sm:py-4 transition-all duration-300 ${isDarkMode ? 'bg-slate-950/80' : 'bg-slate-900/10'}`}>
      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Mobile Shell Wrapper */}
      <div className={`w-full max-w-md min-h-screen sm:min-h-[92vh] sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden border-x sm:border transition-all duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-gray-800 border-emerald-900/15'}`}>
        {/* Top App Bar */}
        <header className="sticky top-0 z-40 bg-linear-to-r from-emerald-900 via-emerald-850 to-teal-900 text-white px-3.5 py-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSurahDrawerOpen(true)}
              className="w-9 h-9 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 active:bg-emerald-600 flex items-center justify-center text-emerald-100 transition-colors border border-emerald-600/30"
              title="فهرس السور السريع"
              aria-label="فهرس السور"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-amiri font-bold text-lg leading-tight tracking-wide">
                الباحث القرآني
              </h1>
              <span className="text-[10px] text-emerald-200/90 block leading-none">
                المصحف والتفسير والترجمة (Offline)
              </span>
            </div>
          </div>

          {/* Action Chips: Font Settings, About / Dedication, PWA Install & Reciter Trigger */}
          <div className="flex items-center gap-1.5">
            <QuickFontSizeControl
              fontSize={quranFontSize}
              onChangeFontSize={handleUpdateFontSize}
              onOpenModal={() => setIsFontModalOpen(true)}
              variant="header"
            />

            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 active:scale-95 flex items-center justify-center text-emerald-100 transition-all border border-emerald-600/30 shadow-2xs"
              title={isDarkMode ? 'تفعيل الوضع المضيء' : 'تفعيل الوضع الليلي'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-300 fill-amber-300/10" /> : <Moon className="w-4 h-4 text-slate-300 fill-slate-300/10" />}
            </button>

            <button
              onClick={() => {
                setActiveTab('about');
                setSelectedSurahNumber(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                activeTab === 'about'
                  ? 'bg-amber-400 text-emerald-950 border-amber-300'
                  : 'bg-emerald-800/80 hover:bg-emerald-700 text-amber-200 border-amber-400/30'
              }`}
              title="نبذة وإهداء (صدقة جارية)"
            >
              <Heart className="w-3.5 h-3.5 fill-current text-amber-300" />
              <span className="hidden xs:inline text-[11px]">نبذة</span>
            </button>

            <PWAInstallButton variant="compact" />

            <button
              onClick={() => setIsReciterModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-800/80 hover:bg-emerald-700/90 active:scale-95 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 text-xs transition-all shadow-2xs"
              title="تغيير القارئ"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-300" />
              <span className="truncate max-w-[70px] font-bold text-[11px] text-emerald-100">
                {selectedReciter.shortName}
              </span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 text-emerald-700 gap-3">
              <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
              <p className="text-sm font-bold text-gray-700">جارٍ تحميل بيانات المصحف والتفسير...</p>
              <p className="text-xs text-gray-400">سيتم حفظ البيانات محلياً للعمل دون اتصال</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-start gap-3 my-4">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-1">تنبيه اتصال</p>
                <p>{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-xs"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: SEARCH VIEW */}
              {activeTab === 'search' && (
                <div className="space-y-3 pb-24">
                  {/* Search Bar Container */}
                  <div className="relative z-30" ref={searchContainerRef}>
                    <div className="bg-white rounded-2xl shadow-xs p-2.5 border border-emerald-100">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="ابحث بالكلمة (مثلاً: الصلاة، الزكاة، الرحمة)..."
                          className="w-full pr-9 pl-9 py-2.5 bg-emerald-50/50 rounded-xl text-sm border-none focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                          value={query}
                          onChange={handleSearchChange}
                          onFocus={() => query.length >= 1 && setShowSuggestions(suggestions.length > 0)}
                          onKeyDown={(e) => e.key === 'Enter' && performSearch(query)}
                        />
                        {query && (
                          <button
                            onClick={() => {
                              setQuery('');
                              setResults([]);
                              setStats({ totalMatches: 0, uniqueVerses: 0 });
                            }}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                      {showSuggestions && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden mt-1.5 z-50 divide-y divide-gray-50"
                        >
                          {suggestions.map((suggestion, idx) => {
                            const isHistory = history.includes(suggestion);
                            return (
                              <div
                                key={idx}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="flex items-center justify-between px-3.5 py-2.5 hover:bg-emerald-50/70 active:bg-emerald-100/60 cursor-pointer transition-colors text-right"
                              >
                                <div className="flex items-center gap-2.5">
                                  {isHistory ? (
                                    <History className="w-3.5 h-3.5 text-gray-400" />
                                  ) : (
                                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                                  )}
                                  <span className="text-xs text-gray-800 font-medium">{suggestion}</span>
                                </div>
                                {isHistory && (
                                  <button
                                    onClick={(e) => removeFromHistory(e, suggestion)}
                                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                                    title="حذف من السجل"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Search Statistics */}
                  {query.trim().length >= 1 && (
                    <div className="space-y-2 mt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2.5 rounded-2xl border border-emerald-100 flex items-center gap-2.5 shadow-2xs">
                          <div className="bg-emerald-100/70 p-2 rounded-xl text-emerald-800">
                            <Hash className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">مرات التكرار</p>
                            <p className="text-base font-bold text-emerald-900 font-mono">
                              {stats.totalMatches}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-2xl border border-emerald-100 flex items-center gap-2.5 shadow-2xs">
                          <div className="bg-amber-100/70 p-2 rounded-xl text-amber-800">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">عدد الآيات</p>
                            <p className="text-base font-bold text-amber-900 font-mono">
                              {stats.uniqueVerses}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Results List */}
                  {results.length > 0 ? (
                    <>
                      {/* Search Results Quick Font Control Bar */}
                      <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-2xl border border-emerald-100 shadow-2xs text-xs">
                        <span className="text-gray-600 font-bold text-[11px] flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-emerald-700" />
                          <span>حجم خط نتائج البحث ({results.length} آية):</span>
                        </span>
                        <QuickFontSizeControl
                          fontSize={quranFontSize}
                          onChangeFontSize={handleUpdateFontSize}
                          onOpenModal={() => setIsFontModalOpen(true)}
                          variant="toolbar"
                        />
                      </div>

                      {results.map((res) => {
                        const isPlaying = playingId === res.verse.number;
                        const key = getAudioKey(selectedReciter.id, res.verse.number);
                        const isDownloaded =
                          downloadedKeys.has(key) || downloadedKeys.has(String(res.verse.number));
                        const isDownloading = downloadingKeys.has(key);
                        const currentProgress = downloadProgressMap.get(key);

                        return (
                          <motion.div
                            key={res.verse.number}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-emerald-100/80 shadow-2xs overflow-hidden"
                          >
                            {/* Card Header */}
                            <div className="bg-emerald-50/50 px-3.5 py-2 border-b border-emerald-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenSurah(res.verse.suraNumber)}
                                  className="font-bold text-emerald-900 hover:underline flex items-center gap-1"
                                >
                                  سورة {SURA_NAMES[res.verse.suraNumber] || res.verse.sura}
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    (آية {res.verse.verseInSura})
                                  </span>
                                </button>
                                {currentProgress && currentProgress.status === 'downloading' && (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full font-bold animate-pulse font-mono">
                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                                    <span>{currentProgress.percent}%</span>
                                  </span>
                                )}
                                {isDownloaded && !currentProgress && (
                                  <CheckCircle2
                                    className="w-3.5 h-3.5 text-emerald-600"
                                    title="محملة للاستماع دون اتصال"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  تكرار: {res.matches}
                                </span>
                                {/* Bookmark Toggle Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleFavorite(res.verse)}
                                  className={`p-1 rounded-lg transition-all ${
                                    favoriteSet.has(res.verse.number)
                                      ? 'text-amber-500 hover:text-amber-600 bg-amber-50 border border-amber-200'
                                      : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                  }`}
                                  title={favoriteSet.has(res.verse.number) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                                >
                                  {favoriteSet.has(res.verse.number) ? (
                                    <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-650" />
                                  ) : (
                                    <Bookmark className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4">
                              {/* Live Download Progress Bar */}
                              {currentProgress && (
                                <div className="mb-3">
                                  <AyahDownloadProgressBar
                                    progress={currentProgress}
                                    reciterName={selectedReciter.shortName}
                                  />
                                </div>
                              )}

                              <p
                                className="quran-text text-center mb-3 text-gray-900 select-text transition-all duration-150"
                                style={{
                                  fontSize: `${quranFontSize}px`,
                                  lineHeight: getQuranLineHeight(quranFontSize),
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: highlightMatches(res.verse.text, query),
                                }}
                              />

                            {/* English Translation Preview */}
                            {res.verse.englishText && (
                              <p 
                                className="text-xs text-gray-500 dark:text-slate-400 text-left font-sans italic mb-3 px-2 border-l-2 border-emerald-300"
                                dangerouslySetInnerHTML={{
                                  __html: `"${highlightMatches(res.verse.englishText, query)}"`
                                }}
                              />
                            )}

                            {/* Personal Note Card if exists */}
                            {notesMap[res.verse.number] && (
                              <VerseNoteCard
                                note={notesMap[res.verse.number]}
                                onEdit={() => handleOpenNoteModal(res.verse)}
                                onDelete={() => handleDeleteNote(res.verse.number)}
                              />
                            )}

                            {/* Audio and actions toolbar */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                              <button
                                onClick={() => toggleSearchAudio(res.verse)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                  isPlaying
                                    ? 'bg-emerald-700 text-white shadow-xs'
                                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
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
                                    <span>استماع ({selectedReciter.shortName})</span>
                                  </>
                                )}
                              </button>

                              {!isDownloaded ? (
                                <button
                                  onClick={() => downloadVerse(res.verse)}
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
                                  onClick={() => removeDownload(res.verse.number)}
                                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors"
                                  title="حذف من الذاكرة"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Personal Note button */}
                              <button
                                onClick={() => handleOpenNoteModal(res.verse)}
                                className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-bold ${
                                  notesMap[res.verse.number]
                                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                                    : 'bg-gray-50 hover:bg-amber-50 text-gray-500 hover:text-amber-800 border-gray-200'
                                }`}
                                title="كتابة ملاحظة وتدبر شخصي"
                              >
                                <StickyNote className="w-4 h-4" />
                                <span>{notesMap[res.verse.number] ? 'خاطرتي' : 'تدبر'}</span>
                              </button>

                              {/* Tafsir & English button -> opens rich modal with Translation, Commentary & English Audio */}
                              <button
                                onClick={() => handleOpenTafsirModal(res.verse)}
                                className="p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 bg-amber-50/90 text-amber-900 hover:bg-amber-100 border-amber-300 shadow-2xs active:scale-95"
                                title="التفسير والترجمة بالإنجليزية والقراءة الصوتية"
                              >
                                <Globe className="w-4 h-4 text-amber-700" />
                                <span>تفسير وترجمة</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    </>
                  ) : query.trim().length >= 1 ? (
                    <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 p-6">
                      <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-600" />
                      <p className="font-bold text-gray-700 text-sm">لم يتم العثور على نتائج لهذه الكلمة</p>
                      <p className="text-xs text-gray-400 mt-1">
                        تأكد من كتابة الكلمة بشكل صحيح أو جرب كلمات قرآنية شائعة
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100 p-6">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-25 text-emerald-700" />
                      <p className="text-sm font-bold text-gray-700">ابدأ البحث بكتابة أي كلمة</p>
                      <p className="text-xs text-gray-400 mt-1">
                        البحث فوري من أول حرف، مع الترجمة والشرح بالإنجليزية والقراءة الصوتية والاستماع أوفلاين.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SURAHS INDEX & READER */}
              {activeTab === 'surahs' && (
                <>
                  {currentSelectedSurah ? (
                    <SurahReaderView
                      surah={currentSelectedSurah}
                      verses={verses}
                      onBack={() => {
                        setSelectedSurahNumber(null);
                        setTargetVerseInSura(undefined);
                      }}
                      selectedReciter={selectedReciter}
                      downloadedKeys={downloadedKeys}
                      onRefreshDownloads={refreshDownloads}
                      onOpenReciterModal={() => setIsReciterModalOpen(true)}
                      onOpenTafsir={handleOpenTafsirModal}
                      fontSize={quranFontSize}
                      onChangeFontSize={handleUpdateFontSize}
                      onOpenFontSettings={() => setIsFontModalOpen(true)}
                      onOpenNoteModal={handleOpenNoteModal}
                      initialVerseInSura={targetVerseInSura}
                    />
                  ) : (
                    <SurahIndexView
                      surahs={surahs}
                      onOpenSurah={(num) => {
                        setTargetVerseInSura(undefined);
                        setSelectedSurahNumber(num);
                      }}
                    />
                  )}
                </>
              )}

              {/* TAB 3: PRAYER TIMES & ADHAN CUSTOMIZER VIEW */}
              {activeTab === 'prayer' && (
                <PrayerTimesView onRefreshDownloads={refreshDownloads} />
              )}

              {/* TAB STATS: LISTENING STATISTICS */}
              {activeTab === 'stats' && (
                <StatsView downloadedCount={downloadedKeys.size} isDarkMode={isDarkMode} />
              )}

              {/* TAB 4: FAVORITES & USER NOTES VIEW */}
              {activeTab === 'favorites' && (
                <FavoritesView
                  verses={verses}
                  surahs={surahs}
                  onNavigateToVerse={handleNavigateToVerse}
                  onOpenTafsir={handleOpenTafsirModal}
                  selectedReciter={selectedReciter}
                  downloadedKeys={downloadedKeys}
                  onRefreshDownloads={refreshDownloads}
                  fontSize={quranFontSize}
                  onOpenNoteModal={handleOpenNoteModal}
                  notesMap={notesMap}
                  onDeleteNote={handleDeleteNote}
                />
              )}

              {/* TAB 5: DOWNLOADS VIEW */}
              {activeTab === 'downloads' && (
                <DownloadsView
                  verses={verses}
                  selectedReciter={selectedReciter}
                  downloadedKeys={downloadedKeys}
                  onRefreshDownloads={refreshDownloads}
                  onOpenReciterModal={() => setIsReciterModalOpen(true)}
                  onOpenTafsir={handleOpenTafsirModal}
                />
              )}

              {/* TAB 6: ABOUT & DEDICATION VIEW */}
              {activeTab === 'about' && (
                <AboutView
                  selectedReciter={selectedReciter}
                  onNavigateToSearch={() => {
                    setActiveTab('search');
                    setSelectedSurahNumber(null);
                  }}
                  onNavigateToSurahs={() => {
                    setActiveTab('surahs');
                    setSelectedSurahNumber(null);
                  }}
                />
              )}
            </>
          )}
        </main>

        {/* Mobile Fixed Bottom Navigation Bar (6 Items) */}
        <nav className={`fixed sm:absolute bottom-0 left-0 right-0 z-40 border-t px-1 py-1.5 shadow-lg transition-all duration-300 ${
          isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-emerald-900/10'
        }`}>
          <div className="grid grid-cols-6 items-center gap-0.5">
            <button
              onClick={() => {
                setActiveTab('search');
                setSelectedSurahNumber(null);
                setTargetVerseInSura(undefined);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                activeTab === 'search'
                  ? isDarkMode ? 'text-emerald-400 font-bold bg-slate-800' : 'text-emerald-800 font-bold bg-emerald-50'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <Search className="w-4.5 h-4.5 mb-0.5" />
              <span className="text-[10px] leading-none">البحث</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('surahs');
                setSelectedSurahNumber(null);
                setTargetVerseInSura(undefined);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                activeTab === 'surahs'
                  ? isDarkMode ? 'text-emerald-400 font-bold bg-slate-800' : 'text-emerald-800 font-bold bg-emerald-50'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4.5 h-4.5 mb-0.5" />
              <span className="text-[10px] leading-none">السور</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('prayer');
                setSelectedSurahNumber(null);
                setTargetVerseInSura(undefined);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                activeTab === 'prayer'
                  ? isDarkMode ? 'text-emerald-400 font-bold bg-slate-800 border border-slate-700/50' : 'text-emerald-850 font-bold bg-emerald-50/70 border border-emerald-200/50'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className={`w-4.5 h-4.5 mb-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`} />
              <span className="text-[10px] leading-none">الصلاة</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('stats');
                setSelectedSurahNumber(null);
                setTargetVerseInSura(undefined);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                activeTab === 'stats'
                  ? isDarkMode ? 'text-emerald-400 font-bold bg-slate-800 border border-slate-700/50' : 'text-emerald-800 font-bold bg-emerald-50 border border-emerald-100'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className={`w-4.5 h-4.5 mb-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`} />
              <span className="text-[10px] leading-none">النشاط</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('favorites');
                setSelectedSurahNumber(null);
                setTargetVerseInSura(undefined);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
                activeTab === 'favorites'
                  ? isDarkMode ? 'text-amber-400 font-bold bg-slate-800 border border-slate-700/50' : 'text-amber-800 font-bold bg-amber-50 border border-amber-200/50'
                  : 'text-gray-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-500'
              }`}
            >
              {favoriteSet.size > 0 && (
                <span className="absolute top-1 right-2.5 bg-amber-500 text-white font-bold font-mono text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white animate-in scale-in duration-200 shadow-2xs">
                  {favoriteSet.size}
                </span>
              )}
              <Bookmark className={`w-4.5 h-4.5 mb-0.5 ${activeTab === 'favorites' ? isDarkMode ? 'text-amber-400 fill-amber-400/20' : 'text-amber-600 fill-amber-500/20' : 'text-gray-500 dark:text-slate-400'}`} />
              <span className="text-[10px] leading-none">المفضلة</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('downloads');
                setSelectedSurahNumber(null);
                setTargetVerseInSura(undefined);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                activeTab === 'downloads'
                  ? isDarkMode ? 'text-emerald-400 font-bold bg-slate-800' : 'text-emerald-800 font-bold bg-emerald-50'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-4.5 h-4.5 mb-0.5" />
              <span className="text-[10px] leading-none">المحفوظات</span>
            </button>
          </div>
        </nav>

        {/* Quick Surahs Side Drawer */}
        <SurahDrawer
          isOpen={isSurahDrawerOpen}
          onClose={() => setIsSurahDrawerOpen(false)}
          surahs={surahs}
          selectedSurahNumber={selectedSurahNumber || undefined}
          onSelectSurah={(num) => {
            setSelectedSurahNumber(num);
            setActiveTab('surahs');
          }}
          onOpenAbout={() => {
            setActiveTab('about');
            setSelectedSurahNumber(null);
          }}
          onOpenFontSettings={() => setIsFontModalOpen(true)}
        />

        {/* Reciters Selection Modal */}
        <ReciterModal
          isOpen={isReciterModalOpen}
          onClose={() => setIsReciterModalOpen(false)}
          selectedReciter={selectedReciter}
          onSelectReciter={handleSelectReciter}
        />

        {/* Rich Tafsir & Translation & English Audio Modal */}
        <TafsirModal
          verse={selectedTafsirVerse}
          isOpen={isTafsirModalOpen}
          onClose={() => setIsTafsirModalOpen(false)}
          onDownloadStatusChange={refreshDownloads}
          fontSize={quranFontSize}
        />

        {/* Quran Font Size Settings Modal */}
        <FontSettingsModal
          isOpen={isFontModalOpen}
          onClose={() => setIsFontModalOpen(false)}
          fontSize={quranFontSize}
          onChangeFontSize={handleUpdateFontSize}
          onResetFontSize={handleResetFontSize}
        />

        {/* Personal Note & Reflection Editor Modal */}
        <NoteEditorModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          verse={selectedNoteVerse}
        />
      </div>
    </div>
  );
}
