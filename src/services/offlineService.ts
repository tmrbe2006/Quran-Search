import { openDB, IDBPDatabase } from 'idb';
import { Verse, SurahInfo } from '../types';

const DB_NAME = 'quran-audio-db';
const AUDIO_STORE = 'audio-store';
const AUDIO_META_STORE = 'audio-meta-store';
const QURAN_STORE = 'quran-data-store';
const TAFSIR_STORE = 'tafsir-store';
const VERSION = 3;

export interface AudioMetadata {
  key: string;
  reciterId: string;
  suraNumber: number;
  verseInSura: number;
  verseNumber: number;
  fileName: string;
  folderPath: string;
  sizeBytes: number;
  downloadedAt: number;
  source: 'auto_cached_on_play' | 'manual_download';
}

export interface ReciterFolderStats {
  reciterId: string;
  folderName: string;
  folderPath: string;
  fileCount: number;
  totalBytes: number;
  files: AudioMetadata[];
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE);
        }
        if (!db.objectStoreNames.contains(AUDIO_META_STORE)) {
          db.createObjectStore(AUDIO_META_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(QURAN_STORE)) {
          db.createObjectStore(QURAN_STORE);
        }
        if (!db.objectStoreNames.contains(TAFSIR_STORE)) {
          db.createObjectStore(TAFSIR_STORE);
        }
      },
    });
  }
  return dbPromise;
};

// --- Key & Path Builders for Mobile Filesystem Structure ---

export const getAudioKey = (reciterId: string, verseNumber: number): string => {
  return `${reciterId}_${verseNumber}`;
};

export const getEnglishAudioKey = (verseNumber: number): string => {
  return `en_walk_${verseNumber}`;
};

export const getEnglishTTSAudioKey = (verseNumber: number): string => {
  return `en_tts_${verseNumber}`;
};

export const getReciterFolderPath = (reciterId: string): string => {
  return `/quran_audio/${reciterId}/`;
};

export const formatAyahFileName = (suraNumber: number, verseInSura: number): string => {
  const sStr = String(suraNumber).padStart(3, '0');
  const aStr = String(verseInSura).padStart(3, '0');
  return `surah_${sStr}_ayah_${aStr}.mp3`;
};

// Listeners for auto-download notifications across views
type AutoDownloadCallback = (key: string, reciterId: string, verseNumber: number) => void;
const downloadListeners = new Set<AutoDownloadCallback>();

export interface DownloadProgress {
  key: string;
  reciterId?: string;
  suraNumber?: number;
  verseInSura?: number;
  verseNumber?: number;
  fileName?: string;
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
}

export const activeDownloads = new Map<string, DownloadProgress>();
type ProgressCallback = (progress: DownloadProgress) => void;
const progressListeners = new Set<ProgressCallback>();

export const onDownloadProgress = (callback: ProgressCallback): (() => void) => {
  progressListeners.add(callback);
  return () => {
    progressListeners.delete(callback);
  };
};

export const notifyDownloadProgress = (progress: DownloadProgress) => {
  if (progress.status === 'completed' || progress.status === 'error') {
    activeDownloads.delete(progress.key);
  } else {
    activeDownloads.set(progress.key, progress);
  }

  progressListeners.forEach((cb) => {
    try {
      cb(progress);
    } catch (err) {
      console.warn('Listener error in notifyDownloadProgress:', err);
    }
  });
};

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 ك.ب';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} ك.ب`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} م.ب`;
};

export const onAudioDownloaded = (callback: AutoDownloadCallback): (() => void) => {
  downloadListeners.add(callback);
  return () => {
    downloadListeners.delete(callback);
  };
};

const notifyAudioDownloaded = (key: string, reciterId: string, verseNumber: number) => {
  downloadListeners.forEach((cb) => {
    try {
      cb(key, reciterId, verseNumber);
    } catch (err) {
      console.warn('Listener error in notifyAudioDownloaded:', err);
    }
  });
};

/**
 * Downloads audio with precise progress tracking via ReadableStream
 */
export const downloadAudioWithProgress = async (
  key: string,
  url: string,
  meta?: Partial<AudioMetadata>,
  onLocalProgress?: (progress: DownloadProgress) => void
): Promise<Blob> => {
  const initialProg: DownloadProgress = {
    key,
    reciterId: meta?.reciterId,
    suraNumber: meta?.suraNumber,
    verseInSura: meta?.verseInSura,
    verseNumber: meta?.verseNumber,
    loadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    status: 'downloading',
  };

  notifyDownloadProgress(initialProg);
  if (onLocalProgress) onLocalProgress(initialProg);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`فشل تحميل الملف الصوتي (${response.status})`);
    }

    const contentLength = response.headers.get('content-length');
    // Approximate default size if server omits content-length
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 400000;
    const hasKnownTotal = Boolean(contentLength && parseInt(contentLength, 10) > 0);

    const reader = response.body?.getReader();
    if (!reader) {
      const blob = await response.blob();
      await saveAudio(key, blob, meta);
      const doneProg: DownloadProgress = {
        ...initialProg,
        loadedBytes: blob.size,
        totalBytes: blob.size,
        percent: 100,
        status: 'completed',
      };
      notifyDownloadProgress(doneProg);
      if (onLocalProgress) onLocalProgress(doneProg);
      return blob;
    }

    const chunks: Uint8Array[] = [];
    let loadedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loadedBytes += value.length;
        const percent = hasKnownTotal
          ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100))
          : Math.min(95, Math.round((loadedBytes / (totalBytes || 400000)) * 100));

        const updateProg: DownloadProgress = {
          ...initialProg,
          loadedBytes,
          totalBytes: hasKnownTotal ? totalBytes : Math.max(loadedBytes, totalBytes),
          percent,
          status: 'downloading',
        };
        notifyDownloadProgress(updateProg);
        if (onLocalProgress) onLocalProgress(updateProg);
      }
    }

    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    await saveAudio(key, blob, meta);

    const completeProg: DownloadProgress = {
      ...initialProg,
      loadedBytes: blob.size,
      totalBytes: blob.size,
      percent: 100,
      status: 'completed',
    };
    notifyDownloadProgress(completeProg);
    if (onLocalProgress) onLocalProgress(completeProg);

    return blob;
  } catch (err: any) {
    const errorProg: DownloadProgress = {
      ...initialProg,
      status: 'error',
      error: err?.message || 'خطأ في التحميل',
    };
    notifyDownloadProgress(errorProg);
    if (onLocalProgress) onLocalProgress(errorProg);
    throw err;
  }
};

// --- Save & Get Audio (With Structured Folder Metadata) ---

export const saveAudio = async (
  key: string | number,
  blob: Blob,
  metadata?: Partial<AudioMetadata>
): Promise<void> => {
  const db = await getDB();
  const keyStr = String(key);
  await db.put(AUDIO_STORE, blob, keyStr);

  // Extract reciterId and numbers if not provided
  let reciterId = metadata?.reciterId;
  let verseNumber = metadata?.verseNumber || 0;
  let suraNumber = metadata?.suraNumber || 0;
  let verseInSura = metadata?.verseInSura || 0;

  if (!reciterId) {
    if (keyStr.startsWith('en_walk_')) {
      reciterId = 'en_walk';
      verseNumber = parseInt(keyStr.replace('en_walk_', ''), 10) || 0;
    } else if (keyStr.startsWith('en_tts_')) {
      reciterId = 'en_tts';
      verseNumber = parseInt(keyStr.replace('en_tts_', ''), 10) || 0;
    } else if (keyStr.includes('_')) {
      const parts = keyStr.split('_');
      reciterId = parts[0];
      verseNumber = parseInt(parts[1], 10) || 0;
    } else {
      reciterId = 'default';
      verseNumber = parseInt(keyStr, 10) || 0;
    }
  }

  const fileName =
    suraNumber > 0 && verseInSura > 0
      ? formatAyahFileName(suraNumber, verseInSura)
      : `ayah_${verseNumber}.mp3`;

  const metaRecord: AudioMetadata = {
    key: keyStr,
    reciterId,
    suraNumber,
    verseInSura,
    verseNumber,
    fileName,
    folderPath: `/quran_audio/${reciterId}/${fileName}`,
    sizeBytes: blob.size,
    downloadedAt: Date.now(),
    source: metadata?.source || 'manual_download',
  };

  try {
    await db.put(AUDIO_META_STORE, metaRecord);
  } catch (e) {
    console.warn('Could not save audio metadata:', e);
  }

  // Also put into Cache API under the reciter's cache partition
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(`quran-audio-${reciterId}`);
      const virtualUrl = `https://quran.offline/audio/${reciterId}/${fileName}`;
      await cache.put(
        virtualUrl,
        new Response(blob, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(blob.size),
          },
        })
      );
    } catch {
      // Ignore cache API failures in private browsing
    }
  }

  notifyAudioDownloaded(keyStr, reciterId, verseNumber);
};

export const getAudio = async (key: string | number): Promise<Blob | undefined> => {
  const db = await getDB();
  return db.get(AUDIO_STORE, String(key));
};

export const deleteAudio = async (key: string | number): Promise<void> => {
  const db = await getDB();
  const keyStr = String(key);
  await db.delete(AUDIO_STORE, keyStr);
  try {
    await db.delete(AUDIO_META_STORE, keyStr);
  } catch {}
};

export const getAllDownloadedKeys = async (): Promise<string[]> => {
  const db = await getDB();
  const keys = await db.getAllKeys(AUDIO_STORE);
  return keys.map((k) => String(k));
};

export const clearAllDownloadedAudio = async (): Promise<void> => {
  const db = await getDB();
  await db.clear(AUDIO_STORE);
  try {
    await db.clear(AUDIO_META_STORE);
  } catch {}

  if (typeof caches !== 'undefined') {
    try {
      const cacheKeys = await caches.keys();
      for (const k of cacheKeys) {
        if (k.startsWith('quran-audio-')) {
          await caches.delete(k);
        }
      }
    } catch {}
  }
};

// --- Automatic Background Caching on Ayah Playback ---

// Track in-flight fetches to prevent duplicate downloads of the same verse
const inFlightFetches = new Map<string, Promise<Blob | null>>();

/**
 * Automatically saves verse audio to the reciter's mobile folder when listened to online.
 * Works seamlessly in the background without interrupting or delaying playback.
 */
export const autoCacheAudioOnPlay = async ({
  reciterId,
  suraNumber,
  verseInSura,
  verseNumber,
  audioUrl,
}: {
  reciterId: string;
  suraNumber: number;
  verseInSura: number;
  verseNumber: number;
  audioUrl: string;
}): Promise<Blob | null> => {
  const key = getAudioKey(reciterId, verseNumber);

  // 1. Check if already cached
  const existing = await getAudio(key);
  if (existing) {
    return existing;
  }

  // 2. Prevent duplicate concurrent downloads
  if (inFlightFetches.has(key)) {
    return inFlightFetches.get(key)!;
  }

  // 3. Download in background and store in reciter's folder
  const fetchPromise = (async () => {
    try {
      const blob = await downloadAudioWithProgress(key, audioUrl, {
        reciterId,
        suraNumber,
        verseInSura,
        verseNumber,
        source: 'auto_cached_on_play',
      });
      return blob;
    } catch (err) {
      console.warn(`Auto-cache on play failed for ${key}:`, err);
      return null;
    } finally {
      inFlightFetches.delete(key);
    }
  })();

  inFlightFetches.set(key, fetchPromise);
  return fetchPromise;
};

// --- Reciter Folder Organization & Statistics ---

export const getReciterFoldersStats = async (knownReciters?: { id: string; name: string }[]): Promise<ReciterFolderStats[]> => {
  const db = await getDB();
  const allKeys = await db.getAllKeys(AUDIO_STORE);
  const allMeta: AudioMetadata[] = [];

  try {
    const metas = await db.getAll(AUDIO_META_STORE);
    allMeta.push(...metas);
  } catch {}

  const metaMap = new Map<string, AudioMetadata>();
  allMeta.forEach((m) => metaMap.set(m.key, m));

  // Group by reciterId
  const groups = new Map<string, { files: AudioMetadata[]; totalBytes: number }>();

  for (const rawKey of allKeys) {
    const key = String(rawKey);
    let meta = metaMap.get(key);

    if (!meta) {
      // Derive metadata from key if missing
      let reciterId = 'default';
      let verseNumber = 0;
      if (key.startsWith('en_walk_')) {
        reciterId = 'en_walk';
        verseNumber = parseInt(key.replace('en_walk_', ''), 10) || 0;
      } else if (key.startsWith('en_tts_')) {
        reciterId = 'en_tts';
        verseNumber = parseInt(key.replace('en_tts_', ''), 10) || 0;
      } else if (key.includes('_')) {
        const parts = key.split('_');
        reciterId = parts[0];
        verseNumber = parseInt(parts[1], 10) || 0;
      } else {
        verseNumber = parseInt(key, 10) || 0;
      }

      meta = {
        key,
        reciterId,
        suraNumber: 0,
        verseInSura: 0,
        verseNumber,
        fileName: `ayah_${verseNumber}.mp3`,
        folderPath: `/quran_audio/${reciterId}/ayah_${verseNumber}.mp3`,
        sizeBytes: 45000, // estimated if missing
        downloadedAt: Date.now(),
        source: 'manual_download',
      };
    }

    const group = groups.get(meta.reciterId) || { files: [], totalBytes: 0 };
    group.files.push(meta);
    group.totalBytes += meta.sizeBytes || 0;
    groups.set(meta.reciterId, group);
  }

  const results: ReciterFolderStats[] = [];
  groups.forEach((group, reciterId) => {
    results.push({
      reciterId,
      folderName: reciterId,
      folderPath: `/quran_audio/${reciterId}/`,
      fileCount: group.files.length,
      totalBytes: group.totalBytes,
      files: group.files,
    });
  });

  return results.sort((a, b) => b.fileCount - a.fileCount);
};

export const deleteReciterFolder = async (reciterId: string): Promise<void> => {
  const db = await getDB();
  const allKeys = await db.getAllKeys(AUDIO_STORE);

  for (const rawKey of allKeys) {
    const key = String(rawKey);
    let shouldDelete = false;
    if (reciterId === 'en_walk' && key.startsWith('en_walk_')) {
      shouldDelete = true;
    } else if (reciterId === 'en_tts' && key.startsWith('en_tts_')) {
      shouldDelete = true;
    } else if (key.startsWith(`${reciterId}_`)) {
      shouldDelete = true;
    }

    if (shouldDelete) {
      await db.delete(AUDIO_STORE, key);
      try {
        await db.delete(AUDIO_META_STORE, key);
      } catch {}
    }
  }

  if (typeof caches !== 'undefined') {
    try {
      await caches.delete(`quran-audio-${reciterId}`);
    } catch {}
  }
};

// --- Quran Text & Surahs Offline Storage ---

export interface OfflineQuranBundle {
  verses: Verse[];
  surahs: SurahInfo[];
  timestamp: number;
}

export const saveQuranDataOffline = async (verses: Verse[], surahs: SurahInfo[]): Promise<void> => {
  try {
    const db = await getDB();
    const bundle: OfflineQuranBundle = {
      verses,
      surahs,
      timestamp: Date.now(),
    };
    await db.put(QURAN_STORE, bundle, 'full_quran_bundle');
  } catch (err) {
    console.warn('Failed to cache Quran data offline in IndexedDB:', err);
  }
};

export const getQuranDataOffline = async (): Promise<{ verses: Verse[]; surahs: SurahInfo[] } | null> => {
  try {
    const db = await getDB();
    const bundle = (await db.get(QURAN_STORE, 'full_quran_bundle')) as OfflineQuranBundle | undefined;
    if (bundle && bundle.verses && bundle.verses.length > 0) {
      return {
        verses: bundle.verses,
        surahs: bundle.surahs,
      };
    }
  } catch (err) {
    console.warn('Error reading offline Quran data from IndexedDB:', err);
  }
  return null;
};

// --- English Tafsir & Explanations Offline Storage ---

export const saveTafsirOffline = async (verseKey: string, explanation: string): Promise<void> => {
  try {
    const db = await getDB();
    await db.put(TAFSIR_STORE, explanation, verseKey);
  } catch (err) {
    console.warn('Failed to cache tafsir offline:', err);
  }
};

export const getTafsirOffline = async (verseKey: string): Promise<string | undefined> => {
  try {
    const db = await getDB();
    return db.get(TAFSIR_STORE, verseKey);
  } catch (err) {
    console.warn('Error reading cached tafsir:', err);
    return undefined;
  }
};
