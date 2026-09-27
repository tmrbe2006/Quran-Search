import { normalizeArabic, countOccurrences } from '../utils/arabic';
import { Verse, SurahInfo, SearchResult, QuranStats } from '../types';
import { getAyahAudioUrl, DEFAULT_RECITER_ID, getReciterById } from '../data/reciters';
import { getQuranDataOffline, saveQuranDataOffline } from './offlineService';
import { FALLBACK_SURAHS, FALLBACK_VERSES } from '../data/fallbackQuran';
import { getEnglishRecitationUrl } from './tafsirService';

// URLs for Quran text, Arabic Tafsir, and English Translation (Sahih International)
const QURAN_TEXT_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
const TAFSIR_URL = 'https://api.alquran.cloud/v1/quran/ar.muyassar';
const ENGLISH_TRANSLATION_URL = 'https://api.alquran.cloud/v1/quran/en.sahih';

let cachedVerses: Verse[] = [];
let cachedSurahs: SurahInfo[] = [];

export interface QuranDataResponse {
  verses: Verse[];
  surahs: SurahInfo[];
  fromOfflineCache?: boolean;
}

export const loadQuranData = async (): Promise<QuranDataResponse> => {
  // 1. In-memory cache
  if (cachedVerses.length > 0 && cachedSurahs.length > 0) {
    return { verses: cachedVerses, surahs: cachedSurahs };
  }

  // 2. Check IndexedDB offline storage first for immediate offline availability
  try {
    const offlineData = await getQuranDataOffline();
    if (offlineData && offlineData.verses.length > 0) {
      cachedVerses = offlineData.verses;
      cachedSurahs = offlineData.surahs;

      // If online, trigger background refresh so IndexedDB stays fresh
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        fetchFromNetworkAndCache().catch((e) =>
          console.warn('Background Quran refresh skipped:', e)
        );
      }

      return { verses: cachedVerses, surahs: cachedSurahs, fromOfflineCache: true };
    }
  } catch (err) {
    console.warn('Could not read IndexedDB cache:', err);
  }

  // 3. Online fetch & update IndexedDB
  try {
    return await fetchFromNetworkAndCache();
  } catch (error) {
    console.error('Error loading Quran data from network:', error);

    // 4. If offline and no full cache, return graceful fallback dataset
    if (FALLBACK_VERSES.length > 0) {
      cachedVerses = FALLBACK_VERSES;
      cachedSurahs = FALLBACK_SURAHS;
      return { verses: FALLBACK_VERSES, surahs: FALLBACK_SURAHS, fromOfflineCache: true };
    }

    throw error;
  }
};

const fetchFromNetworkAndCache = async (): Promise<QuranDataResponse> => {
  const [quranRes, tafsirRes, englishRes] = await Promise.all([
    fetch(QURAN_TEXT_URL),
    fetch(TAFSIR_URL),
    fetch(ENGLISH_TRANSLATION_URL),
  ]);

  if (!quranRes.ok || !tafsirRes.ok) {
    throw new Error('فشل الاتصال بخوادم البيانات');
  }

  const quranData = await quranRes.json();
  const tafsirData = await tafsirRes.json();
  let englishData: any = null;

  if (englishRes.ok) {
    try {
      englishData = await englishRes.json();
    } catch {
      // english translation optional if network failed on third
    }
  }

  if (quranData.code !== 200 || tafsirData.code !== 200) {
    throw new Error('خطأ في استجابة الخادم');
  }

  const verses: Verse[] = [];
  const surahs: SurahInfo[] = [];
  const defaultReciter = getReciterById(DEFAULT_RECITER_ID);

  quranData.data.surahs.forEach((surah: any, sIdx: number) => {
    const tafsirSurah = tafsirData.data.surahs[sIdx];
    const englishSurah = englishData?.data?.surahs?.[sIdx];
    const ayahCount = surah.ayahs.length;
    const startAyahNumber = surah.ayahs[0]?.number || 1;
    const cleanName = SURA_NAMES[surah.number] || surah.name.replace(/^سُورَةُ\s+/, '').trim();

    surahs.push({
      number: surah.number,
      name: cleanName,
      fullName: surah.name,
      englishName: surah.englishName || `Surah ${surah.number}`,
      revelationType: surah.revelationType === 'Medinan' ? 'Medinan' : 'Meccan',
      ayahCount,
      startAyahNumber,
    });

    surah.ayahs.forEach((ayah: any, aIdx: number) => {
      const engText = englishSurah?.ayahs?.[aIdx]?.text || 'Translation in English.';
      verses.push({
        number: ayah.number,
        text: ayah.text,
        sura: cleanName,
        suraNumber: surah.number,
        verseInSura: ayah.numberInSurah,
        tafsir: tafsirSurah?.ayahs?.[aIdx]?.text || 'تفسير هذه الآية الكريمة يوضح معانيها ودلالاتها الإيمانية.',
        englishText: engText,
        englishAudio: getEnglishRecitationUrl(ayah.number),
        audio: getAyahAudioUrl(defaultReciter.subfolder, surah.number, ayah.numberInSurah),
      });
    });
  });

  cachedVerses = verses;
  cachedSurahs = surahs;

  // Save to IndexedDB for seamless offline usage
  saveQuranDataOffline(verses, surahs).catch((err) =>
    console.warn('Failed to save Quran bundle offline:', err)
  );

  return { verses, surahs, fromOfflineCache: false };
};

export const searchQuran = (
  query: string,
  verses: Verse[]
): { results: SearchResult[]; stats: QuranStats } => {
  if (!query || query.trim().length < 1)
    return { results: [], stats: { totalMatches: 0, uniqueVerses: 0 } };

  const isEnglish = /[a-zA-Z]/.test(query);
  const lowercaseQuery = query.toLowerCase().trim();
  const englishWords = lowercaseQuery.split(/\s+/).filter((w) => w.length > 0);

  const normalizedQuery = normalizeArabic(query);
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 0);

  if ((isEnglish && englishWords.length === 0) || (!isEnglish && queryWords.length === 0))
    return { results: [], stats: { totalMatches: 0, uniqueVerses: 0 } };

  const results: SearchResult[] = [];
  let totalMatches = 0;

  for (const verse of verses) {
    let matched = false;
    let matchCount = 0;

    if (isEnglish) {
      const engText = (verse.englishText || '').toLowerCase();
      const matchEng = englishWords.every((word) => engText.includes(word));
      if (matchEng) {
        matched = true;
        try {
          const escaped = lowercaseQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escaped, 'gi');
          const occurrences = (engText.match(regex) || []).length;
          matchCount = occurrences > 0 ? occurrences : 1;
        } catch {
          matchCount = 1;
        }
      }
    } else {
      const normalizedVerse = normalizeArabic(verse.text);
      const normalizedTafsir = normalizeArabic(verse.tafsir || '');

      const matchArabicQuran = queryWords.every((word) => normalizedVerse.includes(word));
      if (matchArabicQuran) {
        matched = true;
        matchCount = countOccurrences(verse.text, normalizedQuery);
      } else {
        const matchArabicTafsir = queryWords.every((word) => normalizedTafsir.includes(word));
        if (matchArabicTafsir) {
          matched = true;
          matchCount = countOccurrences(normalizedTafsir, normalizedQuery);
        }
      }
    }

    if (matched) {
      const displayMatches = matchCount > 0 ? matchCount : 1;
      results.push({ verse, matches: displayMatches });
      totalMatches += displayMatches;
    }
  }

  results.sort((a, b) => {
    if (isEnglish) {
      const textA = (a.verse.englishText || '').toLowerCase();
      const textB = (b.verse.englishText || '').toLowerCase();

      const aExact = textA === lowercaseQuery;
      const bExact = textB === lowercaseQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = textA.startsWith(lowercaseQuery);
      const bStarts = textB.startsWith(lowercaseQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    } else {
      const normA = normalizeArabic(a.verse.text);
      const normB = normalizeArabic(b.verse.text);

      const aExact = normA === normalizedQuery;
      const bExact = normB === normalizedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = normA.startsWith(normalizedQuery);
      const bStarts = normB.startsWith(normalizedQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    }

    if (a.matches !== b.matches) return b.matches - a.matches;

    if (a.verse.suraNumber !== b.verse.suraNumber) return a.verse.suraNumber - b.verse.suraNumber;
    return a.verse.verseInSura - b.verse.verseInSura;
  });

  const finalResults = query.length < 2 ? results.slice(0, 100) : results;

  return {
    results: finalResults,
    stats: {
      totalMatches,
      uniqueVerses: results.length,
    },
  };
};

// Sura names mapping for clean UI
export const SURA_NAMES: Record<number, string> = {
  1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء', 5: 'المائدة', 6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبة', 10: 'يونس',
  11: 'هود', 12: 'يوسف', 13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر', 16: 'النحل', 17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه',
  21: 'الأنبياء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان', 26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنكبوت', 30: 'الروم',
  31: 'لقمان', 32: 'السجدة', 33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر', 36: 'يس', 37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر',
  41: 'فصلت', 42: 'الشورى', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثية', 46: 'الأحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'ق',
  51: 'الذاريات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمن', 56: 'الواقعة', 57: 'الحديد', 58: 'المجادلة', 59: 'الحشر', 60: 'الممتحنة',
  61: 'الصف', 62: 'الجمعة', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق', 66: 'التحريم', 67: 'الملك', 68: 'القلم', 69: 'الحاقة', 70: 'المعارج',
  71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القيامة', 76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس',
  81: 'التكوير', 82: 'الانفطار', 83: 'المطففين', 84: 'الانشقاق', 85: 'البروج', 86: 'الطارق', 87: 'الأعلى', 88: 'الغاشية', 89: 'الفجر', 90: 'البلد',
  91: 'الشمس', 92: 'الليل', 93: 'الضحى', 94: 'الشرح', 95: 'التين', 96: 'العلق', 97: 'القدر', 98: 'البينة', 99: 'الزلزلة', 100: 'العاديات',
  101: 'القارعة', 102: 'التكاثر', 103: 'العصر', 104: 'الهمزة', 105: 'الفيل', 106: 'قريش', 107: 'الماعون', 108: 'الكوثر', 109: 'الكافرون', 110: 'النصر',
  111: 'المسد', 112: 'الإخلاص', 113: 'الفلق', 114: 'الناس',
};
