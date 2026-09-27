import { useState, useMemo } from 'react';
import { Search, BookOpen, Sparkles, Filter, X } from 'lucide-react';
import { SurahInfo } from '../types';
import { normalizeArabic } from '../utils/arabic';

interface SurahIndexViewProps {
  surahs: SurahInfo[];
  onOpenSurah: (surahNumber: number) => void;
}

export function SurahIndexView({ surahs, onOpenSurah }: SurahIndexViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Meccan' | 'Medinan'>('all');

  const filteredSurahs = useMemo(() => {
    return surahs.filter((s) => {
      // Type filter
      if (filterType !== 'all' && s.revelationType !== filterType) return false;

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = normalizeArabic(searchQuery);
      const isNum = !isNaN(Number(searchQuery.trim()));
      const numVal = Number(searchQuery.trim());

      if (isNum && s.number === numVal) return true;
      return (
        normalizeArabic(s.name).includes(q) ||
        normalizeArabic(s.fullName).includes(q) ||
        String(s.number).includes(searchQuery.trim())
      );
    });
  }, [surahs, searchQuery, filterType]);

  const meccanCount = useMemo(() => surahs.filter(s => s.revelationType === 'Meccan').length, [surahs]);
  const medinanCount = useMemo(() => surahs.filter(s => s.revelationType === 'Medinan').length, [surahs]);

  return (
    <div className="space-y-3 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 rounded-3xl shadow-sm border border-emerald-600/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-amiri leading-tight">فهرس سور القرآن الكريم</h2>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              تصفح سور المصحف الشريف الـ ١١٤ مع التفسير والتلاوة
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/50 flex items-center justify-center border border-emerald-400/30">
            <BookOpen className="w-5 h-5 text-emerald-200" />
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-emerald-600/40 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterType === 'all'
                ? 'bg-white text-emerald-900 font-bold shadow-xs'
                : 'text-emerald-100 hover:bg-emerald-600/50'
            }`}
          >
            الكل ({surahs.length})
          </button>
          <button
            onClick={() => setFilterType('Meccan')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterType === 'Meccan'
                ? 'bg-white text-emerald-900 font-bold shadow-xs'
                : 'text-emerald-100 hover:bg-emerald-600/50'
            }`}
          >
            مكية ({meccanCount})
          </button>
          <button
            onClick={() => setFilterType('Medinan')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterType === 'Medinan'
                ? 'bg-white text-emerald-900 font-bold shadow-xs'
                : 'text-emerald-100 hover:bg-emerald-600/50'
            }`}
          >
            مدنية ({medinanCount})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-emerald-100/70">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
          <input
            type="text"
            placeholder="ابحث عن سورة (مثلاً: الكهف، البقرة، 18)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-9 py-2.5 bg-emerald-50/50 rounded-xl text-sm border-none focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Surahs List */}
      <div className="grid grid-cols-1 gap-2">
        {filteredSurahs.length > 0 ? (
          filteredSurahs.map((surah) => (
            <button
              key={surah.number}
              onClick={() => onOpenSurah(surah.number)}
              className="w-full bg-white hover:bg-emerald-50/50 active:bg-emerald-100/40 p-3.5 rounded-2xl border border-emerald-50 shadow-2xs flex items-center justify-between text-right transition-all group"
            >
              <div className="flex items-center gap-3.5">
                {/* Ornamental Number Badge */}
                <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 border border-emerald-200/60 flex items-center justify-center font-bold text-emerald-900 text-sm font-mono shrink-0 shadow-2xs group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                  {surah.number}
                </div>

                <div>
                  <h3 className="font-amiri font-bold text-lg text-gray-900 group-hover:text-emerald-800 transition-colors leading-tight">
                    سورة {surah.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        surah.revelationType === 'Meccan'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/50'
                          : 'bg-teal-50 text-teal-800 border border-teal-200/50'
                      }`}
                    >
                      {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                    </span>
                    <span>·</span>
                    <span>{surah.ayahCount} آيات</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 group-hover:bg-emerald-700 group-hover:text-white px-3 py-1.5 rounded-xl font-bold transition-all">
                <span>تصفح</span>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-600" />
            <p className="text-sm font-bold text-gray-600">لا توجد سورة تطابق بحثك</p>
            <p className="text-xs text-gray-400 mt-1">تأكد من كتابة الاسم بدون تشكيل أو ابحث برقم السورة</p>
          </div>
        )}
      </div>
    </div>
  );
}
