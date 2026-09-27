import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Heart,
  Search,
  BookOpen,
  ArrowRight,
  Play,
  Pause,
  Download,
  CheckCircle2,
  Trash2,
  Globe,
  Loader2,
  Sparkles,
  StickyNote,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Verse, SurahInfo, Reciter, VerseNote } from '../types';
import {
  getAllFavorites,
  removeFavorite,
  getFavoriteVerseNumbers
} from '../services/userDataService';
import { getAyahAudioUrl } from '../data/reciters';
import {
  saveAudio,
  getAudio,
  deleteAudio,
  getAudioKey,
  autoCacheAudioOnPlay
} from '../services/offlineService';
import { getQuranLineHeight } from './FontSettingsModal';
import { VerseNoteCard } from './VerseNoteCard';
import { normalizeArabic } from '../utils/arabic';

interface FavoritesViewProps {
  verses: Verse[];
  surahs: SurahInfo[];
  onNavigateToVerse: (suraNumber: number, verseNumber?: number) => void;
  onOpenTafsir: (verse: Verse) => void;
  selectedReciter: Reciter;
  downloadedKeys: Set<string>;
  onRefreshDownloads: () => void;
  fontSize: number;
  onOpenNoteModal: (verse: Verse) => void;
  notesMap: Record<number, VerseNote>;
  onDeleteNote: (verseNumber: number) => void;
}

export function FavoritesView({
  verses,
  surahs,
  onNavigateToVerse,
  onOpenTafsir,
  selectedReciter,
  downloadedKeys,
  onRefreshDownloads,
  fontSize,
  onOpenNoteModal,
  notesMap,
  onDeleteNote,
}: FavoritesViewProps) {
  const [favorites, setFavorites] = useState(() => getAllFavorites());
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'quran'>('recent');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const refreshFavorites = () => {
    setFavorites(getAllFavorites());
  };

  const handleRemoveFavorite = (verseNumber: number) => {
    removeFavorite(verseNumber);
    refreshFavorites();
  };

  // Map favorite items to full Verse objects
  const favoriteVerses = useMemo(() => {
    const verseMap = new Map<number, Verse>();
    verses.forEach((v) => verseMap.set(v.number, v));

    let items = favorites
      .map((fav) => {
        const verse = verseMap.get(fav.verseNumber);
        return verse ? { verse, savedAt: fav.savedAt } : null;
      })
      .filter((item): item is { verse: Verse; savedAt: number } => item !== null);

    if (sortBy === 'quran') {
      items.sort((a, b) => a.verse.number - b.verse.number);
    } else {
      items.sort((a, b) => b.savedAt - a.savedAt);
    }

    if (filterQuery.trim()) {
      const normQuery = normalizeArabic(filterQuery.toLowerCase());
      items = items.filter(({ verse }) => {
        const normVerse = normalizeArabic(verse.text);
        const normSura = normalizeArabic(verse.sura);
        const note = notesMap[verse.number]?.text || '';
        const normNote = normalizeArabic(note);
        return (
          normVerse.includes(normQuery) ||
          normSura.includes(normQuery) ||
          normNote.includes(normQuery) ||
          String(verse.verseInSura).includes(normQuery)
        );
      });
    }

    return items;
  }, [favorites, verses, sortBy, filterQuery, notesMap]);

  // Audio Playback
  const handlePlayAudio = async (verse: Verse) => {
    if (playingId === verse.number) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const key = getAudioKey(selectedReciter.id, verse.number);
    let blob = await getAudio(key);
    if (!blob) {
      blob = await getAudio(String(verse.number));
    }

    let url: string;
    if (blob) {
      url = URL.createObjectURL(blob);
    } else {
      url = getAyahAudioUrl(selectedReciter.subfolder, verse.suraNumber, verse.verseInSura);
      autoCacheAudioOnPlay({
        reciterId: selectedReciter.id,
        suraNumber: verse.suraNumber,
        verseInSura: verse.verseInSura,
        verseNumber: verse.number,
        audioUrl: url,
      })
        .then(() => onRefreshDownloads())
        .catch(() => {});
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);

    setPlayingId(verse.number);
    audio.play().catch(() => setPlayingId(null));
  };

  // Download Audio
  const handleDownload = async (verse: Verse) => {
    const key = getAudioKey(selectedReciter.id, verse.number);
    setDownloadingKeys((prev) => new Set(prev).add(key));
    try {
      const url = getAyahAudioUrl(selectedReciter.subfolder, verse.suraNumber, verse.verseInSura);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      await saveAudio(key, blob);
      onRefreshDownloads();
    } catch (e) {
      console.error(e);
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
    await deleteAudio(String(verse.number));
    onRefreshDownloads();
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300" dir="rtl">
      {/* Banner Header */}
      <div className="bg-linear-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform -translate-x-8 -translate-y-8 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <BookmarkCheck className="w-7 h-7 text-amber-100" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-amiri tracking-wide text-white flex items-center gap-2">
                <span>المفضلة والإشارات المرجعية</span>
                <Sparkles className="w-4 h-4 text-amber-200" />
              </h2>
              <p className="text-xs text-amber-100/90 mt-0.5">
                الآيات التي اخترت حفظها وملاحظاتك الشخصية وتدبرك القرآني
              </p>
            </div>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-amber-100">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-white/20 px-2.5 py-0.5 rounded-full text-white font-mono">
              {favorites.length}
            </span>
            <span>آيات محفوظة في المفضلة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold bg-white/20 px-2.5 py-0.5 rounded-full text-white font-mono">
              {Object.keys(notesMap).length}
            </span>
            <span>ملاحظات وتدبرات مسجلة</span>
          </div>
        </div>
      </div>

      {/* Search and Sort Toolbar */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="ابحث في الآيات المفضلة أو الملاحظات..."
              className="w-full pl-4 pr-10 py-2.5 bg-white rounded-2xl border border-emerald-900/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs outline-hidden text-gray-800 placeholder-gray-400"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 transform -translate-y-1/2" />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="text-xs text-gray-400 hover:text-gray-600 absolute left-3 top-1/2 transform -translate-y-1/2"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-gray-500">
            <span className="text-[11px]">
              عرض {favoriteVerses.length} من أصل {favorites.length} آية
            </span>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs">
              <button
                onClick={() => setSortBy('recent')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  sortBy === 'recent'
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                الأحدث حفظاً
              </button>
              <button
                onClick={() => setSortBy('quran')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  sortBy === 'quran'
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ترتيب المصحف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verses List or Empty State */}
      {favorites.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-emerald-100 shadow-2xs space-y-4 my-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
            <Bookmark className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-gray-800">لا توجد آيات في المفضلة بعد</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              أثناء قراءة أي سورة أو البحث، اضغط على زر الإشارة المرجعية (🔖) لحفظ الآيات التي تحب تكرار قراءتها وتدبرها هنا.
            </p>
          </div>
          <button
            onClick={() => onNavigateToVerse(1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-800 to-teal-700 text-white rounded-2xl text-xs font-bold shadow-md hover:from-emerald-700 hover:to-teal-600 transition-all active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            <span>تصفح سور المصحف الآن</span>
          </button>
        </div>
      ) : favoriteVerses.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-2xs space-y-2">
          <Search className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="font-bold text-sm text-gray-700">لا توجد نتائج تطابق بحثك في المفضلة</p>
          <p className="text-xs text-gray-400">جرّب البحث بكلمة أخرى أو مسح نص البحث.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favoriteVerses.map(({ verse, savedAt }) => {
            const isPlaying = playingId === verse.number;
            const key = getAudioKey(selectedReciter.id, verse.number);
            const isDownloaded = downloadedKeys.has(key) || downloadedKeys.has(String(verse.number));
            const isDownloading = downloadingKeys.has(key);
            const note = notesMap[verse.number];

            return (
              <motion.div
                key={verse.number}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-amber-200/80 shadow-2xs overflow-hidden transition-all hover:shadow-md"
              >
                {/* Header */}
                <div className="bg-linear-to-r from-amber-50/80 via-emerald-50/40 to-amber-50/60 px-4 py-2 border-b border-amber-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-950 font-amiri text-sm">
                      سورة {verse.sura}
                    </span>
                    <span className="text-[11px] bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">
                      آية {verse.verseInSura}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Jump to verse in reader */}
                    <button
                      onClick={() => onNavigateToVerse(verse.suraNumber, verse.verseInSura)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-colors shadow-2xs"
                      title="الانتقال إلى هذه الآية في السورة"
                    >
                      <span>عرض بالسورة</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    {/* Remove from favorites */}
                    <button
                      onClick={() => handleRemoveFavorite(verse.number)}
                      className="p-1.5 rounded-xl bg-white hover:bg-red-50 text-amber-600 hover:text-red-600 border border-amber-200 hover:border-red-200 transition-colors shadow-2xs"
                      title="إزالة من المفضلة"
                    >
                      <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-600" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-5">
                  <p
                    className="quran-text text-center text-gray-900 mb-3 select-text leading-loose"
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

                  {/* English Translation */}
                  {verse.englishText && (
                    <p className="text-xs text-gray-500 text-left font-sans italic mb-3 px-2 border-l-2 border-emerald-300">
                      "{verse.englishText}"
                    </p>
                  )}

                  {/* Personal Note Card (if exists) */}
                  {note && (
                    <VerseNoteCard
                      note={note}
                      onEdit={() => onOpenNoteModal(verse)}
                      onDelete={() => onDeleteNote(verse.number)}
                    />
                  )}

                  {/* If no note, subtle add note button */}
                  {!note && (
                    <button
                      onClick={() => onOpenNoteModal(verse)}
                      className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 hover:bg-amber-50 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                      <span>أضف ملاحظة أو تدبراً لهذه الآية</span>
                    </button>
                  )}

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 gap-2">
                    {/* Audio play */}
                    <button
                      onClick={() => handlePlayAudio(verse)}
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

                    {/* Offline download */}
                    {!isDownloaded ? (
                      <button
                        onClick={() => handleDownload(verse)}
                        disabled={isDownloading}
                        className="p-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 border border-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs"
                        title="تحميل للاستماع دون اتصال"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteAudio(verse)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors"
                        title="حذف الملف الصوتي"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Tafsir */}
                    <button
                      onClick={() => onOpenTafsir(verse)}
                      className="p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-bold bg-amber-50/90 text-amber-900 hover:bg-amber-100 border-amber-300 shadow-2xs active:scale-95"
                      title="تفسير وترجمة"
                    >
                      <Globe className="w-3.5 h-3.5 text-amber-700" />
                      <span>تفسير</span>
                    </button>

                    {/* Edit Note if exists */}
                    {note && (
                      <button
                        onClick={() => onOpenNoteModal(verse)}
                        className="p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-bold bg-amber-100/70 text-amber-950 hover:bg-amber-200/80 border-amber-300 shadow-2xs active:scale-95"
                        title="تعديل الملاحظة"
                      >
                        <StickyNote className="w-3.5 h-3.5 text-amber-700" />
                        <span>ملاحظتي</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
