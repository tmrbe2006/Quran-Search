import { VerseNote, FavoriteItem } from '../types';

const NOTES_STORAGE_KEY = 'quran_verse_personal_notes';
const FAVORITES_STORAGE_KEY = 'quran_favorite_verses_list';

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying user data listener:', e);
    }
  });
}

export function subscribeUserData(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// ---------------- NOTES ----------------

export function getAllNotes(): Record<number, VerseNote> {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load notes from localStorage', err);
    return {};
  }
}

export function getNoteForVerse(verseNumber: number): VerseNote | null {
  const allNotes = getAllNotes();
  return allNotes[verseNumber] || null;
}

export function saveNote(
  verseNumber: number,
  suraNumber: number,
  verseInSura: number,
  text: string
): VerseNote {
  const allNotes = getAllNotes();
  const trimmed = text.trim();

  if (!trimmed) {
    deleteNote(verseNumber);
    return {
      verseNumber,
      suraNumber,
      verseInSura,
      text: '',
      updatedAt: Date.now(),
    };
  }

  const updatedNote: VerseNote = {
    verseNumber,
    suraNumber,
    verseInSura,
    text: trimmed,
    updatedAt: Date.now(),
  };

  allNotes[verseNumber] = updatedNote;
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));
  } catch (err) {
    console.error('Failed to save note to localStorage', err);
  }

  notifyListeners();
  return updatedNote;
}

export function deleteNote(verseNumber: number): void {
  const allNotes = getAllNotes();
  if (allNotes[verseNumber]) {
    delete allNotes[verseNumber];
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));
    } catch (err) {
      console.error('Failed to delete note from localStorage', err);
    }
    notifyListeners();
  }
}

// ---------------- FAVORITES (BOOKMARKS) ----------------

export function getAllFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load favorites from localStorage', err);
    return [];
  }
}

export function getFavoriteVerseNumbers(): Set<number> {
  const favorites = getAllFavorites();
  return new Set(favorites.map((f) => f.verseNumber));
}

export function isFavorite(verseNumber: number): boolean {
  const favorites = getAllFavorites();
  return favorites.some((f) => f.verseNumber === verseNumber);
}

export function toggleFavorite(
  verseNumber: number,
  suraNumber: number,
  verseInSura: number
): boolean {
  const favorites = getAllFavorites();
  const index = favorites.findIndex((f) => f.verseNumber === verseNumber);

  let isNowFav = false;
  if (index >= 0) {
    // Remove
    favorites.splice(index, 1);
    isNowFav = false;
  } else {
    // Add to beginning
    favorites.unshift({
      verseNumber,
      suraNumber,
      verseInSura,
      savedAt: Date.now(),
    });
    isNowFav = true;
  }

  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error('Failed to save favorites to localStorage', err);
  }

  notifyListeners();
  return isNowFav;
}

export function removeFavorite(verseNumber: number): void {
  const favorites = getAllFavorites();
  const filtered = favorites.filter((f) => f.verseNumber !== verseNumber);
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to remove favorite from localStorage', err);
  }
  notifyListeners();
}
