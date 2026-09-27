import React from 'react';
import {
  X,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DEFAULT_FONT_SIZE = 26;
export const MIN_FONT_SIZE = 16;
export const MAX_FONT_SIZE = 46;
export const FONT_SIZE_STEP = 2;

export interface FontSizePreset {
  label: string;
  size: number;
  description: string;
}

export const FONT_SIZE_PRESETS: FontSizePreset[] = [
  { label: 'صغير', size: 18, description: 'مضغوط لشاشات الهواتف الصغيرة' },
  { label: 'عادي', size: 22, description: 'حجم ملائم ومتوازن' },
  { label: 'متوسط', size: 26, description: 'الحجم الافتراضي الموصى به' },
  { label: 'كبير', size: 30, description: 'مريح جداً للقراءة والتركيز' },
  { label: 'كبير جداً', size: 36, description: 'واضح مع تشكيل الآيات' },
  { label: 'ضخم', size: 42, description: 'أعلى وضوح ومناسب لكبار السن' },
];

export function getQuranLineHeight(fontSize: number): string {
  return `${Math.max(38, Math.round(fontSize * 2.2))}px`;
}

interface FontSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  onResetFontSize?: () => void;
}

export function FontSettingsModal({
  isOpen,
  onClose,
  fontSize,
  onChangeFontSize,
  onResetFontSize,
}: FontSettingsModalProps) {
  if (!isOpen) return null;

  const handleDecrease = () => {
    onChangeFontSize(Math.max(MIN_FONT_SIZE, fontSize - FONT_SIZE_STEP));
  };

  const handleIncrease = () => {
    onChangeFontSize(Math.min(MAX_FONT_SIZE, fontSize + FONT_SIZE_STEP));
  };

  const currentPreset = FONT_SIZE_PRESETS.find((p) => p.size === fontSize);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 flex flex-col max-h-[92vh] text-right"
      >
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-900 to-emerald-800 text-white p-4 flex items-center justify-between border-b border-emerald-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-amber-300">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <span>إعدادات حجم الخط القرآني</span>
              </h3>
              <p className="text-[11px] text-emerald-200">
                تحكم بحجم خط الآيات في شاشة السور ونتائج البحث
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-emerald-800/60 hover:bg-emerald-700 text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* Live Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500 font-bold">
              <span className="flex items-center gap-1 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                معاينة مباشرة للخط القرآني:
              </span>
              <span className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {fontSize} بكسل {currentPreset ? `(${currentPreset.label})` : ''}
              </span>
            </div>

            <div className="bg-linear-to-b from-amber-50/40 via-emerald-50/30 to-amber-50/40 border border-emerald-200/80 rounded-2xl p-4 text-center shadow-2xs min-h-[110px] flex flex-col justify-center transition-all">
              <p
                className="quran-text text-gray-900 select-text transition-all duration-150"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: getQuranLineHeight(fontSize),
                }}
              >
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ{' '}
                <span className="text-emerald-700 font-bold inline-block font-amiri mr-1 text-[0.85em]">
                  ﴿١﴾
                </span>{' '}
                الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ{' '}
                <span className="text-emerald-700 font-bold inline-block font-amiri mr-1 text-[0.85em]">
                  ﴿٢﴾
                </span>
              </p>
            </div>
          </div>

          {/* Quick Stepper Controls & Slider */}
          <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleDecrease}
                disabled={fontSize <= MIN_FONT_SIZE}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-xl border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs transition"
                title="تصغير الخط"
              >
                <ZoomOut className="w-4 h-4 text-emerald-700" />
                <span>تصغير (A-)</span>
              </button>

              <div className="text-center">
                <span className="text-xl font-bold font-mono text-emerald-950 block">
                  {fontSize}
                  <span className="text-xs font-normal text-gray-400 mr-1">px</span>
                </span>
                <span className="text-[11px] text-gray-500 font-medium">
                  {currentPreset ? currentPreset.label : 'مخصص'}
                </span>
              </div>

              <button
                onClick={handleIncrease}
                disabled={fontSize >= MAX_FONT_SIZE}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-xl border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs transition"
                title="تكبير الخط"
              >
                <span>تكبير (A+)</span>
                <ZoomIn className="w-4 h-4 text-emerald-700" />
              </button>
            </div>

            {/* Slider */}
            <div className="pt-2">
              <input
                type="range"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={FONT_SIZE_STEP}
                value={fontSize}
                onChange={(e) => onChangeFontSize(Number(e.target.value))}
                className="w-full accent-emerald-700 h-2 bg-gray-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                <span>{MIN_FONT_SIZE}px (أصغر)</span>
                <span className="text-emerald-700 font-bold">26px (افتراضي)</span>
                <span>{MAX_FONT_SIZE}px (أكبر)</span>
              </div>
            </div>
          </div>

          {/* Preset Buttons Grid */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              أحجام سريعة مجهزة مسبقاً:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_SIZE_PRESETS.map((preset) => {
                const isSelected = preset.size === fontSize;
                return (
                  <button
                    key={preset.size}
                    onClick={() => onChangeFontSize(preset.size)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white hover:bg-emerald-50/70 text-gray-700 border-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{preset.label}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-emerald-100' : 'text-gray-400'
                      }`}
                    >
                      {preset.size}px
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset to Default Button & Help Text */}
          <div className="pt-2 flex items-center justify-between border-t border-gray-100">
            <button
              onClick={() => {
                if (onResetFontSize) onResetFontSize();
                else onChangeFontSize(DEFAULT_FONT_SIZE);
              }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 font-medium py-1 px-2 rounded-lg hover:bg-gray-100 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الحجم الافتراضي ({DEFAULT_FONT_SIZE}px)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-2xs"
            >
              تم الحفظ والتطبيق
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            💡 يتم حفظ حجم الخط المختار في ذاكرة هاتفك تلقائياً ويُطبّق على جميع السور ونتائج البحث والتفسير دون الحاجة لإعادة ضبطه.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
