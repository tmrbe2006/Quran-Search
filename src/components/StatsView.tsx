import React, { useState, useEffect } from 'react';
import {
  Clock,
  Mic,
  HardDrive,
  BarChart3,
  Trash2,
  Sparkles,
  Award,
  Headphones
} from 'lucide-react';
import { getListeningStats, resetListeningStats, ListeningStats } from '../services/statsService';
import { RECITERS } from '../data/reciters';

interface StatsViewProps {
  downloadedCount: number;
  isDarkMode?: boolean;
}

export function StatsView({ downloadedCount, isDarkMode = false }: StatsViewProps) {
  const [stats, setStats] = useState<ListeningStats>(() => getListeningStats());

  useEffect(() => {
    const handleUpdate = () => {
      setStats(getListeningStats());
    };
    window.addEventListener('quran_stats_updated', handleUpdate);
    return () => window.removeEventListener('quran_stats_updated', handleUpdate);
  }, []);

  const formatDurationBrief = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) return `${hours} س و ${minutes} د`;
    if (minutes > 0) return `${minutes} د و ${seconds} ث`;
    return `${seconds} ثانية`;
  };

  // Process reciter data
  const recitersList = Object.entries(stats.reciters)
    .map(([id, seconds]) => {
      const reciter = RECITERS.find((r) => r.id === id);
      return {
        id,
        name: reciter ? reciter.name : 'قارئ غير معروف',
        shortName: reciter ? reciter.shortName : 'قارئ',
        style: reciter ? reciter.style : '',
        seconds,
      };
    })
    .sort((a, b) => b.seconds - a.seconds);

  const maxReciterSeconds = recitersList.length > 0 ? recitersList[0].seconds : 1;

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إعادة ضبط إحصائيات الاستماع الخاصة بك؟')) {
      resetListeningStats();
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300 text-right" dir="rtl">
      {/* Hero Header Card */}
      <div className={`rounded-3xl p-5 shadow-lg relative overflow-hidden transition-all duration-300 ${
        isDarkMode 
          ? 'bg-linear-to-r from-emerald-950 via-slate-900 to-teal-950 border border-slate-800' 
          : 'bg-linear-to-r from-emerald-800 via-teal-900 to-emerald-900 text-white'
      }`}>
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-600/10 rounded-full blur-2xl transform translate-x-8 translate-y-8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-400/15 rounded-full blur-2xl transform -translate-x-4 translate-y-4 pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-white/10 text-amber-300'}`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-amiri font-bold text-lg leading-tight ${isDarkMode ? 'text-slate-100' : 'text-white'}`}>
                إحصائيات تلاوتك واستماعك
              </h3>
              <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-emerald-100/90'}`}>
                متابعة حية لمعدل تدبرك واستماعك لكلام الله عز وجل
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-emerald-200'}`}>المرتبة الإيمانية التقريبية</span>
              <span className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-300 font-amiri'}`}>
                <Award className="w-4 h-4 shrink-0" />
                <span>
                  {stats.totalSeconds > 3600
                    ? 'المتدبّر الحافظ'
                    : stats.totalSeconds > 600
                    ? 'المستمع الخاشع'
                    : stats.totalSeconds > 60
                    ? 'القارئ المبتدئ'
                    : 'محبي كلام الله'}
                </span>
              </span>
            </div>
            {stats.totalSeconds > 0 && (
              <span className={`text-[10px] px-2.5 py-1 rounded-full border ${
                isDarkMode 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                  : 'bg-white/10 text-emerald-100 border-white/20'
              } flex items-center gap-1 font-bold`}>
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>مستمر بالتدبر</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Listening Time */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between shadow-2xs ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-emerald-100'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">إجمالي وقت الاستماع</span>
            <div className="p-1.5 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 leading-tight">
              {formatDurationBrief(stats.totalSeconds)}
            </p>
            <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1 leading-none">
              {stats.totalSeconds} ثانية متراكمة
            </p>
          </div>
        </div>

        {/* Total Downloaded Verses */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between shadow-2xs ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-emerald-100'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">الآيات المحفوظة أوفلاين</span>
            <div className="p-1.5 rounded-lg bg-amber-100/50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 leading-tight">
              {downloadedCount} آية
            </p>
            <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1 leading-none">
              مخزنة وتعمل دون إنترنت
            </p>
          </div>
        </div>
      </div>

      {/* Reciters list statistics */}
      <div className={`rounded-3xl p-4.5 border transition-all duration-300 space-y-4 shadow-2xs ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-emerald-100'
      }`}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Mic className="w-4.5 h-4.5 text-emerald-700 dark:text-emerald-400" />
            <h4 className="font-bold text-xs text-gray-800 dark:text-slate-200">أكثر القراء استماعاً وتدبراً</h4>
          </div>
          <span className="text-[9px] text-gray-400 dark:text-slate-400 font-bold">مرتبة تنازلياً</span>
        </div>

        {recitersList.length > 0 ? (
          <div className="space-y-3">
            {recitersList.map((rec) => {
              const percentage = Math.max(5, Math.round((rec.seconds / maxReciterSeconds) * 100));
              return (
                <div key={rec.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      <span className="font-bold text-gray-800 dark:text-slate-200 text-[11px]">{rec.name}</span>
                      {rec.style && (
                        <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold">
                          {rec.style}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[10px]">
                      {formatDurationBrief(rec.seconds)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 dark:text-slate-500 space-y-2">
            <Headphones className="w-9 h-9 mx-auto opacity-30 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-bold text-gray-700 dark:text-slate-350">لم تستمع لأي قارئ بعد</p>
            <p className="text-[10px] opacity-75 leading-relaxed max-w-[280px] mx-auto">
              ابدأ بالاستماع لآيات القرآن الكريم من شاشة البحث أو السور لتسجيل إحصائياتك هنا تلقائياً!
            </p>
          </div>
        )}
      </div>

      {/* Info Card & Reset Button */}
      <div className="flex flex-col gap-3">
        <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-950/30 rounded-2xl p-3 flex items-start gap-2 text-[10px] text-amber-900 dark:text-amber-300 leading-relaxed">
          <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          <p>
            <strong>ملاحظة تقنية:</strong> يتم احتساب أوقات الاستماع بدقة بالثانية وتخزينها محلياً على جهازك لخصوصية كاملة 100% دون إرسال أي بيانات لخوادم خارجية.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="w-full py-2.5 px-4 rounded-xl border border-red-200/80 hover:border-red-300 bg-red-50/40 hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-950/20 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>إعادة ضبط وتصفير جميع الإحصائيات</span>
        </button>
      </div>
    </div>
  );
}
