import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  HardDrive,
  Volume2,
  BookOpen,
  Globe,
  Info,
  Folder,
  FolderOpen,
  FolderCheck,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Zap,
  Mic,
  RefreshCw,
  FileAudio,
  Loader2
} from 'lucide-react';
import { Verse, Reciter } from '../types';
import {
  getAudio,
  deleteAudio,
  getAudioKey,
  clearAllDownloadedAudio,
  getReciterFoldersStats,
  deleteReciterFolder,
  ReciterFolderStats,
  getReciterFolderPath,
  onDownloadProgress,
  DownloadProgress,
  activeDownloads
} from '../services/offlineService';
import { RECITERS } from '../data/reciters';
import { SURA_NAMES } from '../services/quranService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { AyahDownloadProgressBar } from './AyahDownloadProgressBar';

interface DownloadsViewProps {
  verses: Verse[];
  selectedReciter: Reciter;
  downloadedKeys: Set<string>;
  onRefreshDownloads: () => void;
  onOpenReciterModal: () => void;
  onOpenTafsir?: (verse: Verse) => void;
}

export function DownloadsView({
  verses,
  selectedReciter,
  downloadedKeys,
  onRefreshDownloads,
  onOpenReciterModal,
  onOpenTafsir,
}: DownloadsViewProps) {
  const isOnline = useOnlineStatus();
  const [folderStats, setFolderStats] = useState<ReciterFolderStats[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'folders' | 'all'>('folders');
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeDownloadsList, setActiveDownloadsList] = useState<DownloadProgress[]>(() =>
    Array.from(activeDownloads.values())
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Subscribe to live download progress updates
  useEffect(() => {
    const unsubscribe = onDownloadProgress(() => {
      setActiveDownloadsList(Array.from(activeDownloads.values()));
    });
    return () => unsubscribe();
  }, []);

  // Load folder stats whenever downloadedKeys change
  const refreshStats = async () => {
    setLoadingStats(true);
    try {
      const stats = await getReciterFoldersStats(RECITERS);
      setFolderStats(stats);
      // Auto select current reciter folder if it has files and none selected
      if (!selectedFolderId && stats.length > 0) {
        const found = stats.find((s) => s.reciterId === selectedReciter.id);
        if (found) setSelectedFolderId(found.reciterId);
        else setSelectedFolderId(stats[0].reciterId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    refreshStats();
  }, [downloadedKeys, selectedReciter]);

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 ك.ب';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} ك.ب`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} م.ب`;
  };

  const getReciterDisplayName = (reciterId: string): string => {
    if (reciterId === 'en_walk') return 'تلاوة إبراهيم ووك بالإنجليزية (English Walk)';
    if (reciterId === 'en_tts') return 'الشرح الصوتي بالإنجليزية (English Audio TTS)';
    const found = RECITERS.find((r) => r.id === reciterId);
    return found ? found.name : `القارئ (${reciterId})`;
  };

  const togglePlayVerse = async (verse: Verse, reciterId: string) => {
    const key = reciterId === 'en_walk' ? `en_walk_${verse.number}` : getAudioKey(reciterId, verse.number);
    if (playingKey === key) {
      audioRef.current?.pause();
      setPlayingKey(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    let blob = await getAudio(key);
    if (!blob) blob = await getAudio(verse.number);
    if (!blob) blob = await getAudio(`en_walk_${verse.number}`);

    if (!blob) {
      alert('لم يتم العثور على الملف الصوتي محلياً.');
      return;
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => setPlayingKey(key);
    audio.onended = () => {
      setPlayingKey(null);
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = () => {
      setPlayingKey(null);
      URL.revokeObjectURL(audioUrl);
      alert('حدث خطأ أثناء تشغيل الملف الصوتي المحفوظ.');
    };

    audio.play().catch(() => setPlayingKey(null));
  };

  const handleDeleteVerse = async (verse: Verse, reciterId: string) => {
    const key = reciterId === 'en_walk' ? `en_walk_${verse.number}` : getAudioKey(reciterId, verse.number);
    await deleteAudio(key);
    await deleteAudio(verse.number);
    onRefreshDownloads();
    refreshStats();
  };

  const handleDeleteFolder = async (reciterId: string) => {
    const name = getReciterDisplayName(reciterId);
    if (window.confirm(`هل أنت متأكد من حذف مجلد "${name}" بالكامل وتوفير المساحة؟`)) {
      await deleteReciterFolder(reciterId);
      onRefreshDownloads();
      refreshStats();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('هل أنت متأكد من حذف جميع الملفات الصوتية والمجلدات المحملة؟')) {
      await clearAllDownloadedAudio();
      onRefreshDownloads();
      refreshStats();
    }
  };

  // Selected folder stats
  const activeFolder = folderStats.find((f) => f.reciterId === selectedFolderId);

  // Verses inside selected folder
  const folderVerses: { verse: Verse; meta: any }[] = [];
  if (activeFolder) {
    activeFolder.files.forEach((file) => {
      const verse = verses.find((v) => v.number === file.verseNumber);
      if (verse) {
        folderVerses.push({ verse, meta: file });
      }
    });
  }

  const totalSavedFiles = folderStats.reduce((sum, f) => sum + f.fileCount, 0);
  const totalSavedBytes = folderStats.reduce((sum, f) => sum + f.totalBytes, 0);

  return (
    <div className="space-y-4 pb-28 text-right">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white p-5 rounded-3xl shadow-lg border border-amber-400/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                مكتبة الأوفلاين
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-700/80 text-emerald-200' : 'bg-amber-500/80 text-white'}`}>
                {isOnline ? 'متصل بالإنترنت' : 'وضع عدم الاتصال'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-amiri leading-tight text-amber-100">
              المكتبة الصوتية ومجلدات القراء
            </h2>
            <p className="text-xs text-emerald-200 mt-1 max-w-sm leading-relaxed">
              تصفح التلاوات المحفوظة على جهازك مصنفة في مجلد خاص بكل قارئ
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shadow-inner">
            <HardDrive className="w-6 h-6 text-amber-300" />
          </div>
        </div>

        {/* Live Auto-Download Status Indicator */}
        <div className="mt-4 pt-3 border-t border-emerald-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-amber-200 font-bold">
            <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>التنزيل التلقائي أثناء الاستماع:</span>
            <span className="text-emerald-300 font-normal">مُفعّل (يتم حفظ كل آية تسمعها في مجلد القارئ)</span>
          </div>
          <div className="text-[11px] text-emerald-200/90 font-mono">
            {totalSavedFiles} ملف ({formatBytes(totalSavedBytes)})
          </div>
        </div>
      </div>

      {/* Active In-Flight Downloads Progress Card */}
      {activeDownloadsList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border-2 border-emerald-300 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>التحميلات الجارية الآن ({activeDownloadsList.length} ملف صوتي)</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono font-bold">
              جارٍ الحفظ في الذاكرة المحلية ومجلدات القراء...
            </span>
          </div>

          <div className="space-y-2">
            {activeDownloadsList.map((prog) => (
              <AyahDownloadProgressBar
                key={prog.key}
                progress={prog}
                reciterName={prog.reciterId ? getReciterDisplayName(prog.reciterId) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. View Mode Switcher & Quick Actions */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
          <button
            onClick={() => setActiveViewMode('folders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeViewMode === 'folders'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-emerald-700" />
            <span>مجلدات القراء ({folderStats.length})</span>
          </button>

          <button
            onClick={() => setActiveViewMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeViewMode === 'all'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-emerald-700" />
            <span>كافة الآيات ({totalSavedFiles})</span>
          </button>
        </div>

        {totalSavedFiles > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl border border-red-200 transition"
            title="حذف كل التحميلات"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>تفريغ الكل</span>
          </button>
        )}
      </div>

      {/* 3. Empty State if no files downloaded yet */}
      {totalSavedFiles === 0 && !loadingStats && (
        <div className="bg-white rounded-3xl p-8 border border-dashed border-gray-300 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="font-amiri font-bold text-lg text-gray-800">
            لا توجد تلاوات محفوظة حتى الآن
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            عند تشغيل أي آية عبر الإنترنت أو الضغط على زر التحميل، سيتم حفظها تلقائياً داخل مجلد القارئ الخاص بها في جهازك لتعمل دون إنترنت دائماً.
          </p>
        </div>
      )}

      {/* 4. Folders Grid View */}
      {activeViewMode === 'folders' && folderStats.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {folderStats.map((folder) => {
              const isSelected = selectedFolderId === folder.reciterId;
              const reciterName = getReciterDisplayName(folder.reciterId);

              return (
                <div
                  key={folder.reciterId}
                  onClick={() => setSelectedFolderId(folder.reciterId)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-2 ring-emerald-400/30'
                      : 'bg-white hover:bg-gray-50/80 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isSelected ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-amiri font-bold text-base text-gray-900 leading-tight">
                          {reciterName}
                        </h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 dir-ltr text-right">
                          {folder.folderPath}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.reciterId);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="حذف هذا المجلد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 bg-white px-2 py-0.5 rounded-lg border border-gray-200">
                      {folder.fileCount} آية محفوظة
                    </span>
                    <span className="text-gray-500 font-mono text-[11px]">
                      {formatBytes(folder.totalBytes)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details of Selected Folder */}
          {activeFolder && (
            <div className="bg-white rounded-3xl p-5 border border-emerald-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <FolderCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-amiri font-bold text-base text-emerald-950">
                      محتويات مجلد: {getReciterDisplayName(activeFolder.reciterId)}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-mono dir-ltr text-right">
                      {activeFolder.folderPath} ({activeFolder.fileCount} ملفات)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteFolder(activeFolder.reciterId)}
                  className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 font-bold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المجلد</span>
                </button>
              </div>

              {/* Verses inside this folder */}
              <div className="space-y-2.5">
                {folderVerses.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    لا توجد ملفات داخل هذا المجلد.
                  </p>
                ) : (
                  folderVerses.map(({ verse, meta }) => {
                    const key = activeFolder.reciterId === 'en_walk' ? `en_walk_${verse.number}` : getAudioKey(activeFolder.reciterId, verse.number);
                    const isPlaying = playingKey === key;

                    return (
                      <div
                        key={key}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isPlaying
                            ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-300/40'
                            : 'bg-gray-50/70 hover:bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                              سورة {verse.sura} [{verse.suraNumber}:{verse.verseInSura}]
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono dir-ltr">
                              {meta.fileName}
                            </span>
                          </div>
                          <p className="quran-text text-sm sm:text-base text-gray-800 line-clamp-2 leading-relaxed">
                            {verse.text}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* Play / Pause button */}
                          <button
                            onClick={() => togglePlayVerse(verse, activeFolder.reciterId)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                              isPlaying
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
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
                                <span>استماع أوفلاين</span>
                              </>
                            )}
                          </button>

                          {/* Open Tafsir & Translation */}
                          {onOpenTafsir && (
                            <button
                              onClick={() => onOpenTafsir(verse)}
                              className="p-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl transition"
                              title="تفسير وترجمة وشرح إنجليزي"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete File */}
                          <button
                            onClick={() => handleDeleteVerse(verse, activeFolder.reciterId)}
                            className="p-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl transition"
                            title="حذف هذا الملف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Flat All Verses View */}
      {activeViewMode === 'all' && totalSavedFiles > 0 && (
        <div className="space-y-2.5">
          {folderStats.map((folder) => (
            <div key={folder.reciterId} className="bg-white rounded-3xl p-4 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-700" />
                  <span className="font-amiri font-bold text-sm text-emerald-950">
                    {getReciterDisplayName(folder.reciterId)}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">
                  {folder.fileCount} ملفات ({formatBytes(folder.totalBytes)})
                </span>
              </div>

              <div className="space-y-2">
                {folder.files.map((file) => {
                  const verse = verses.find((v) => v.number === file.verseNumber);
                  if (!verse) return null;
                  const key = folder.reciterId === 'en_walk' ? `en_walk_${verse.number}` : getAudioKey(folder.reciterId, verse.number);
                  const isPlaying = playingKey === key;

                  return (
                    <div
                      key={key}
                      className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-emerald-900 truncate">
                          سورة {verse.sura} [{verse.suraNumber}:{verse.verseInSura}]
                        </div>
                        <p className="quran-text text-xs text-gray-600 truncate mt-0.5">
                          {verse.text}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => togglePlayVerse(verse, folder.reciterId)}
                          className={`p-2 rounded-xl transition ${
                            isPlaying ? 'bg-amber-500 text-white' : 'bg-emerald-700 text-white'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        </button>
                        <button
                          onClick={() => handleDeleteVerse(verse, folder.reciterId)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-xl transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
