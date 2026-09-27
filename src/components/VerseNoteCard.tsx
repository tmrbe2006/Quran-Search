import React from 'react';
import { StickyNote, Edit3, Trash2 } from 'lucide-react';
import { VerseNote } from '../types';

interface VerseNoteCardProps {
  note: VerseNote;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function VerseNoteCard({ note, onEdit, onDelete, className = '' }: VerseNoteCardProps) {
  if (!note || !note.text.trim()) return null;

  const formattedDate = new Date(note.updatedAt).toLocaleDateString('ar-EG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`bg-linear-to-r from-amber-50/90 via-amber-50/60 to-amber-100/70 border border-amber-200/90 rounded-2xl p-3 shadow-2xs text-right mt-2.5 transition-all hover:border-amber-300 ${className}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-200/60 text-xs">
        <div className="flex items-center gap-1.5 text-amber-900 font-bold">
          <StickyNote className="w-3.5 h-3.5 text-amber-600 fill-amber-300/50" />
          <span>خاطرة / تدبر شخصي</span>
          <span className="text-[10px] text-amber-700/80 font-normal mr-1">({formattedDate})</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded-lg hover:bg-amber-200/60 text-amber-800 transition-colors"
            title="تعديل الملاحظة"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
            title="حذف الملاحظة"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-amber-950 whitespace-pre-wrap leading-relaxed select-text font-sans">
        {note.text}
      </p>
    </div>
  );
}
