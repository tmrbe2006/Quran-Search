/**
 * Normalizes Arabic text for searching:
 * - Removes tashkeel (diacritics)
 * - Unifies Alef (أ، إ، آ -> ا)
 * - Unifies Teh Marbuta (ة -> ه)
 * - Unifies Alef Maksura (ى -> ي)
 * - Unifies Hamza on Waw/Ya (ؤ، ئ -> ء)
 */
export const normalizeArabic = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F\u0670\u06E5\u06E6]/g, "") // Remove all tashkeel and small letters (alef, waw, ya)
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء")
    .trim();
};

/**
 * Creates a regex pattern that matches a word even if it has diacritics in the source text.
 * For example, if search is "الله", it will match "اللَّهُ"
 */
export const createDiacriticRegex = (searchWord: string): RegExp => {
  const normalized = normalizeArabic(searchWord);
  if (!normalized) return new RegExp("");

  // Map each normalized character to a pattern that allows diacritics after it
  const diacritics = "[\u064B-\u065F\u0670\u06E5\u06E6]*";
  const pattern = normalized
    .split("")
    .map((char) => {
      // Handle unified characters in the regex
      let charPattern = char;
      if (char === "ا") charPattern = "[اأإآ]";
      else if (char === "ه") charPattern = "[هة]";
      else if (char === "ي") charPattern = "[يى]";
      else if (char === "ء") charPattern = "[ءؤئ]";
      
      return charPattern + diacritics;
    })
    .join("");

  return new RegExp(pattern, "g");
};

/**
 * Counts occurrences using the diacritic-aware regex
 */
export const countOccurrences = (text: string, searchWord: string): number => {
  const regex = createDiacriticRegex(searchWord);
  if (regex.source === "") return 0;
  
  const matches = text.match(regex);
  return matches ? matches.length : 0;
};

/**
 * Highlights matches in the original text (with diacritics)
 */
export const highlightMatches = (text: string, searchWord: string): string => {
  if (!text || !searchWord) return text;
  
  const isEnglish = /[a-zA-Z]/.test(searchWord);
  if (isEnglish) {
    const escaped = searchWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, (match) => `<mark class="bg-amber-200 text-amber-900 rounded-sm px-0.5">${match}</mark>`);
  }

  const regex = createDiacriticRegex(searchWord);
  if (regex.source === "") return text;

  return text.replace(regex, (match) => `<mark class="bg-amber-200 text-amber-900 rounded-sm px-0.5">${match}</mark>`);
};
