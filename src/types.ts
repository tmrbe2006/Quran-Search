export interface Verse {
  number: number;
  text: string;
  sura: string;
  suraNumber: number;
  verseInSura: number;
  tafsir: string;
  audio: string;
  englishText?: string;
  englishExplanation?: string;
  englishAudio?: string;
}

export interface SurahInfo {
  number: number;
  name: string;
  fullName: string;
  englishName: string;
  revelationType: 'Meccan' | 'Medinan';
  ayahCount: number;
  startAyahNumber: number;
}

export interface Reciter {
  id: string;
  name: string;
  shortName: string;
  subfolder: string;
  style: string;
}

export interface SearchResult {
  verse: Verse;
  matches: number;
}

export interface QuranStats {
  totalMatches: number;
  uniqueVerses: number;
}

export interface TafsirDetail {
  arabicTafsir: string;
  englishTranslation: string;
  englishExplanation: string;
  englishAudioUrl: string;
}

export interface VerseNote {
  verseNumber: number;
  suraNumber: number;
  verseInSura: number;
  text: string;
  updatedAt: number;
}

export interface FavoriteItem {
  verseNumber: number;
  suraNumber: number;
  verseInSura: number;
  savedAt: number;
}
