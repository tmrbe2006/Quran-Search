import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, StickyNote, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Verse, VerseNote } from '../types';
import { saveNote, deleteNote, getNoteForVerse } from '../services/userDataService';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  verse: Verse | null;
  onNoteSaved?: (note: VerseNote) => void;
  onNoteDeleted?: (verseNumber: number) => void;
}

export function NoteEditorModal({
  isOpen,
  onClose,
  verse,
  onNoteSaved,
  onNoteDeleted,
}: NoteEditorModalProps) {
  const [noteText, setNoteText] = useState('');
  const [hasExistingNote, setHasExistingNote] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && verse) {
      const existing = getNoteForVerse(verse.number);
      if (existing) {
        setNoteText(existing.text);
        setHasExistingNote(true);
      } else {
        setNoteText('');
        setHasExistingNote(false);
      }
      setSavedSuccess(false);
    }
  }, [isOpen, verse]);

  if (!isOpen || !verse) return null;

  const handleSave = () => {
    const saved = saveNote(verse.number, verse.suraNumber, verse.verseInSura, noteText);
    setSavedSuccess(true);
    if (onNoteSaved) onNoteSaved(saved);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleDelete = () => {
    deleteNote(verse.number);
    if (onNoteDeleted) onNoteDeleted(verse.number);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-900/10 flex flex-col max-h-[90vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
                <StickyNote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-amber-100 flex items-center gap-1.5">
                  <span>ملاحظة وتدبر شخصي</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <p className="text-xs text-emerald-200">
                  سورة {verse.sura} - الآية {verse.verseInSura}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* Verse Snippet Card */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-center">
              <p className="quran-text text-gray-900 text-lg leading-relaxed mb-1">
                {verse.text}{' '}
                <span className="text-emerald-700 font-bold font-amiri">
                  ﴿{verse.verseInSura}﴾
                </span>
              </p>
              {verse.englishText && (
                <p className="text-xs text-gray-500 italic mt-1 font-sans border-t border-emerald-100 pt-1 text-left" dir="ltr">
                  "{verse.englishText}"
                </p>
              )}
            </div>

            {/* Note Input Area */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>اكتب تدبرك أو فائدتك المستفادة:</span>
                <span className="text-[11px] font-normal text-gray-400 font-mono">
                  {noteText.length} حرف
                </span>
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="سجّل هنا وقفاتك الإيمانية، ملاحظات الحفظ والتجويد، أو تدبرات المعاني..."
                rows={5}
                className="w-full p-3.5 rounded-2xl border border-gray-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-800 placeholder-gray-400 outline-hidden transition-all resize-y bg-slate-50/50 focus:bg-white leading-relaxed"
                autoFocus
              />
              <p className="text-[11px] text-gray-400 mt-1">
                تُحفظ ملاحظاتك محلياً على جهازك وتبقى خاصة بك حتى دون اتصال بالإنترنت.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <div>
              {hasExistingNote && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors"
                  title="حذف هذه الملاحظة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الملاحظة</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200/70 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 ${
                  savedSuccess
                    ? 'bg-emerald-600'
                    : 'bg-linear-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تم الحفظ</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ الملاحظة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
