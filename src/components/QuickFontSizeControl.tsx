import React from 'react';
import { ZoomIn, ZoomOut, SlidersHorizontal, Type } from 'lucide-react';
import {
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SIZE_STEP,
  DEFAULT_FONT_SIZE,
  FONT_SIZE_PRESETS
} from './FontSettingsModal';

interface QuickFontSizeControlProps {
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  onOpenModal: () => void;
  variant?: 'toolbar' | 'compact' | 'header';
  className?: string;
}

export function QuickFontSizeControl({
  fontSize,
  onChangeFontSize,
  onOpenModal,
  variant = 'toolbar',
  className = '',
}: QuickFontSizeControlProps) {
  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeFontSize(Math.max(MIN_FONT_SIZE, fontSize - FONT_SIZE_STEP));
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeFontSize(Math.min(MAX_FONT_SIZE, fontSize + FONT_SIZE_STEP));
  };

  const currentPreset = FONT_SIZE_PRESETS.find((p) => p.size === fontSize);

  if (variant === 'header') {
    return (
      <button
        onClick={onOpenModal}
        className={`flex items-center gap-1.5 bg-emerald-800/80 hover:bg-emerald-700/90 active:scale-95 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 text-xs transition-all shadow-2xs text-emerald-100 ${className}`}
        title={`حجم الخط القرآني الحالي: ${fontSize}px (${currentPreset?.label || 'مخصص'}) - اضغط لتغيير الحجم`}
      >
        <Type className="w-3.5 h-3.5 text-amber-300" />
        <span className="font-bold text-[11px] font-mono">{fontSize}</span>
        <span className="hidden sm:inline text-[10px] text-emerald-300">خط</span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-0.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-0.5 text-xs ${className}`}
      >
        <button
          onClick={handleDecrease}
          disabled={fontSize <= MIN_FONT_SIZE}
          className="p-1 text-emerald-800 hover:bg-emerald-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition"
          title="تصغير الخط (A-)"
        >
          <span className="text-[11px] font-bold px-0.5">A-</span>
        </button>

        <button
          onClick={onOpenModal}
          className="px-1.5 py-0.5 text-emerald-950 font-mono font-bold text-[11px] hover:bg-emerald-100/70 rounded-md transition"
          title="فتح إعدادات الخط المتقدمة"
        >
          {fontSize}px
        </button>

        <button
          onClick={handleIncrease}
          disabled={fontSize >= MAX_FONT_SIZE}
          className="p-1 text-emerald-800 hover:bg-emerald-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition"
          title="تكبير الخط (A+)"
        >
          <span className="text-[11px] font-bold px-0.5">A+</span>
        </button>
      </div>
    );
  }

  // Default 'toolbar' variant:
  return (
    <div
      className={`inline-flex items-center gap-1 bg-emerald-50/90 border border-emerald-200/90 rounded-xl px-1.5 py-1 text-xs shadow-2xs ${className}`}
    >
      <span className="text-[10px] text-emerald-900 font-bold hidden sm:inline ml-1 flex items-center gap-1">
        <Type className="w-3 h-3 text-emerald-700" />
        الخط:
      </span>

      <button
        onClick={handleDecrease}
        disabled={fontSize <= MIN_FONT_SIZE}
        className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white hover:bg-emerald-100 active:scale-95 disabled:opacity-35 disabled:pointer-events-none rounded-lg border border-emerald-200/60 text-emerald-900 font-bold text-[11px] transition shadow-2xs"
        title="تصغير حجم الخط (A-)"
      >
        <ZoomOut className="w-3 h-3 text-emerald-700" />
        <span>A-</span>
      </button>

      <button
        onClick={onOpenModal}
        className="px-2 py-0.5 bg-white/70 hover:bg-emerald-100/80 rounded-lg text-emerald-950 font-bold font-mono text-[11px] border border-emerald-200/50 transition flex items-center gap-1"
        title="انقر لتخصيص الحجم والمعاينة"
      >
        <span>{fontSize}px</span>
        {currentPreset && (
          <span className="text-[9px] text-emerald-700 font-normal hidden md:inline">
            ({currentPreset.label})
          </span>
        )}
      </button>

      <button
        onClick={handleIncrease}
        disabled={fontSize >= MAX_FONT_SIZE}
        className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white hover:bg-emerald-100 active:scale-95 disabled:opacity-35 disabled:pointer-events-none rounded-lg border border-emerald-200/60 text-emerald-900 font-bold text-[11px] transition shadow-2xs"
        title="تكبير حجم الخط (A+)"
      >
        <span>A+</span>
        <ZoomIn className="w-3 h-3 text-emerald-700" />
      </button>

      <button
        onClick={onOpenModal}
        className="p-1 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
        title="خيارات إضافية للخط والمعاينة"
      >
        <SlidersHorizontal className="w-3 h-3" />
      </button>
    </div>
  );
}
