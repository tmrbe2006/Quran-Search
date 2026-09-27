import { useState, useMemo } from 'react';
import { X, Search, BookOpen, Compass, Heart, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SurahInfo } from '../types';
import { normalizeArabic } from '../utils/arabic';

interface SurahDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  surahs: SurahInfo[];
  selectedSurahNumber?: number;
  onSelectSurah: (surahNumber: number) => void;
  onOpenAbout?: () => void;
  onOpenFontSettings?: () => void;
}

export function SurahDrawer({
  isOpen,
  onClose,
  surahs,
  selectedSurahNumber,
  onSelectSurah,
  onOpenAbout,
  onOpenFontSettings
}: SurahDrawerProps) {
  const [filterText, setFilterText] = useState('');

  const filteredSurahs = useMemo(() => {
    if (!filterText.trim()) return surahs;
    const query = normalizeArabic(filterText);
    const isNum = !isNaN(Number(filterText.trim()));
    const numVal = Number(filterText.trim());

    return surahs.filter((s) => {
      if (isNum && s.number === numVal) return true;
      return (
        normalizeArabic(s.name).includes(query) ||
        normalizeArabic(s.fullName).includes(query) ||
        String(s.number).includes(filterText.trim())
      );
    });
  }, [surahs, filterText]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer content (slides in from right in RTL) */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full max-w-xs sm:max-w-sm h-full bg-white shadow-2xl flex flex-col border-l border-emerald-900/10 text-right"
          >
            {/* Drawer Header */}
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between border-b border-emerald-700/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700/70 flex items-center justify-center border border-emerald-600/50">
                  <Compass className="w-4 h-4 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">فهرس سور القرآن</h3>
                  <p className="text-[11px] text-emerald-200/80">١١٤ سورة كريمة للتنقل السريع</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-emerald-700/40 hover:bg-emerald-700 flex items-center justify-center text-emerald-100 transition-colors"
                aria-label="إغلاق الفهرس"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick search input */}
            <div className="p-3 border-b border-gray-100 bg-emerald-50/40">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                <input
                  type="text"
                  placeholder="ابحث باسم السورة أو رقمها..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pr-9 pl-8 py-2 bg-white rounded-xl text-xs border border-emerald-200/80 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-2xs"
                />
                {filterText && (
                  <button
                    onClick={() => setFilterText('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Surahs Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSurahs.length > 0 ? (
                filteredSurahs.map((surah) => {
                  const isCurrent = selectedSurahNumber === surah.number;
                  return (
                    <button
                      key={surah.number}
                      onClick={() => {
                        onSelectSurah(surah.number);
                        onClose();
                      }}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'hover:bg-emerald-50/70 text-gray-800 active:bg-emerald-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                            isCurrent
                              ? 'bg-emerald-800 text-emerald-100'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {surah.number}
                        </span>
                        <div className="text-right">
                          <h4
                            className={`font-amiri font-bold text-base leading-none ${
                              isCurrent ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            سورة {surah.name}
                          </h4>
                          <span
                            className={`text-[10px] mt-0.5 inline-block ${
                              isCurrent ? 'text-emerald-200' : 'text-gray-400'
                            }`}
                          >
                            {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} ·{' '}
                            {surah.ayahCount} آيات
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs ${
                          isCurrent ? 'text-emerald-200 font-bold' : 'text-emerald-700'
                        }`}
                      >
                        تصفح
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">لم يتم العثور على سورة بهذا الاسم</p>
                </div>
              )}
            </div>

            {/* Quick jump to Top / Bottom */}
            <div className="p-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500">
              <span>إجمالي السور: {surahs.length}</span>
              <button
                onClick={() => {
                  onSelectSurah(1);
                  onClose();
                }}
                className="text-emerald-700 hover:underline font-bold"
              >
                الفاتحة (١)
              </button>
              <button
                onClick={() => {
                  onSelectSurah(114);
                  onClose();
                }}
                className="text-emerald-700 hover:underline font-bold"
              >
                الناس (١١٤)
              </button>
            </div>

            {/* Action buttons in drawer footer */}
            <div className="p-2.5 bg-gradient-to-r from-amber-50 to-emerald-50 border-t border-amber-200/80 space-y-1.5">
              {onOpenFontSettings && (
                <button
                  onClick={() => {
                    onOpenFontSettings();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300/80 rounded-xl text-xs font-bold shadow-2xs transition"
                >
                  <Type className="w-3.5 h-3.5 text-emerald-700" />
                  <span>إعدادات حجم الخط القرآني</span>
                </button>
              )}

              {onOpenAbout && (
                <button
                  onClick={() => {
                    onOpenAbout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold shadow-2xs transition"
                >
                  <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-600/30" />
                  <span>نبذة وإهداء (صدقة جارية)</span>
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
