import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  BookOpen,
  Share2,
  Play,
  Pause,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Volume2,
  Globe,
  Wifi,
  Smartphone,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reciter } from '../types';
import { getAyahAudioUrl } from '../data/reciters';

interface AboutViewProps {
  selectedReciter: Reciter;
  onNavigateToSearch?: () => void;
  onNavigateToSurahs?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  selectedReciter,
  onNavigateToSearch,
  onNavigateToSurahs,
}) => {
  const [isPlayingFatiha, setIsPlayingFatiha] = useState(false);
  const [currentFatihaAyah, setCurrentFatihaAyah] = useState(1);
  const [hasRecitedFatiha, setHasRecitedFatiha] = useState(() => {
    return localStorage.getItem('quran_fatiha_recited') === 'true';
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fatihaVerses = [
    { num: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
    { num: 2, text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
    { num: 3, text: 'الرَّحْمَٰنِ الرَّحِيمِ' },
    { num: 4, text: 'مَالِكِ يَوْمِ الدِّينِ' },
    { num: 5, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
    { num: 6, text: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ' },
    { num: 7, text: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ' },
  ];

  const playFatihaAyah = (ayahIndex: number) => {
    if (ayahIndex > 7) {
      setIsPlayingFatiha(false);
      setCurrentFatihaAyah(1);
      return;
    }

    setCurrentFatihaAyah(ayahIndex);
    const url = getAyahAudioUrl(selectedReciter.subfolder, 1, ayahIndex);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      playFatihaAyah(ayahIndex + 1);
    };

    audio.onerror = () => {
      setIsPlayingFatiha(false);
    };

    audio.play().catch(() => setIsPlayingFatiha(false));
  };

  const toggleFatihaAudio = () => {
    if (isPlayingFatiha) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingFatiha(false);
    } else {
      setIsPlayingFatiha(true);
      playFatihaAyah(1);
    }
  };

  const handleReciteConfirm = () => {
    setHasRecitedFatiha(true);
    localStorage.setItem('quran_fatiha_recited', 'true');
  };

  const handleShareApp = () => {
    const shareText =
      'تطبيق الباحث القرآني — بحث دقيق في القرآن الكريم، تلاوات بأصوات كبار القراء، وتفسير وترجمة وشرح بالإنجليزية، يعمل دون إنترنت (صدقة جارية):';
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: 'الباحث القرآني - صدقة جارية',
          text: shareText,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="space-y-4 pb-24 text-right">
      {/* 1. Spiritual Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-emerald-950 via-emerald-900 to-teal-950 p-6 text-white shadow-xl border border-amber-400/30">
        {/* Subtle Islamic pattern background overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FDE68A_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mb-3 shadow-inner">
            <Heart className="w-7 h-7 text-amber-300 fill-amber-300/40 animate-pulse" />
          </div>

          <h2 className="font-amiri font-bold text-2xl text-amber-200 leading-tight">
            صدقة جارية وإهداء
          </h2>
          <p className="text-xs text-emerald-200 mt-1 max-w-xs font-serif leading-relaxed">
            ﴿ وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا ﴾
          </p>
        </div>
      </div>

      {/* 2. The Core Dedication Card (User's Exact Requested Words) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-amber-50 via-white to-emerald-50/50 p-5 rounded-3xl border-2 border-amber-300/80 shadow-md text-right overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full blur-xl pointer-events-none" />

        {/* Decorative Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-200/70 mb-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>إهداء ثواب هذا العمل المبارك</span>
          </span>
          <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-bold">
            خالص لوجه الله
          </span>
        </div>

        {/* User's Exact Dedication Phrases */}
        <div className="space-y-4 font-amiri text-lg sm:text-xl leading-loose text-gray-900">
          <div className="bg-white/90 p-4 rounded-2xl border border-amber-200/90 shadow-2xs">
            <p className="font-bold text-emerald-950 text-center text-lg sm:text-2xl leading-relaxed">
              « هذا صدقة جارية علي روح ابي وامي واموات المسلمين اجمعين »
            </p>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80">
            <p className="font-bold text-emerald-900 text-center leading-relaxed">
              « ادعوا الله بالمغفرة لنا ولهم والحاقنا بهم علي العمل الصالح »
            </p>
          </div>

          <div className="bg-amber-100/60 p-3.5 rounded-2xl border border-amber-300/80 text-center">
            <p className="font-bold text-amber-950 text-base sm:text-lg leading-relaxed">
              « ارجوا قراءة سورة الفاتحة علي ارواح المسلمين اجمعين »
            </p>
          </div>
        </div>
      </motion.div>

      {/* 3. Surah Al-Fatihah Section (Read & Recite with Audio) */}
      <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-amiri font-bold text-base text-emerald-950">
                سورة الفاتحة (أم الكتاب)
              </h3>
              <p className="text-[11px] text-gray-500">
                اهدِ ثواب قراءتها لأرواح موتى المسلمين
              </p>
            </div>
          </div>

          {/* Listen to Al-Fatihah Audio button */}
          <button
            onClick={toggleFatihaAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
              isPlayingFatiha
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
            title="الاستماع لسورة الفاتحة"
          >
            {isPlayingFatiha ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>إيقاف</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>استماع ({selectedReciter.shortName})</span>
              </>
            )}
          </button>
        </div>

        {/* Full Text of Surah Al-Fatihah with Tashkeel */}
        <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 text-center space-y-2">
          {fatihaVerses.map((v) => {
            const isCurrentPlaying = isPlayingFatiha && currentFatihaAyah === v.num;
            return (
              <p
                key={v.num}
                className={`quran-text text-lg sm:text-xl leading-loose transition-colors rounded-lg py-0.5 px-2 ${
                  isCurrentPlaying
                    ? 'bg-amber-200/70 text-emerald-950 font-bold'
                    : 'text-gray-900'
                }`}
              >
                {v.text}{' '}
                <span className="text-emerald-700 font-bold font-amiri inline-block text-base mr-1">
                  ﴿{v.num}﴾
                </span>
              </p>
            );
          })}
        </div>

        {/* Read confirmation & Du'a */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
          {!hasRecitedFatiha ? (
            <button
              onClick={handleReciteConfirm}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Check className="w-4 h-4" />
              <span>قرأتُ سورة الفاتحة بنية الأجر للموتى</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-100/80 px-3 py-2 rounded-xl font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>جزاك الله خيراً، تقبّل الله قراءتك ودعاءك وجعلها في موازين حسناتك</span>
            </div>
          )}

          {/* Share Button for Rewards */}
          <button
            onClick={handleShareApp}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition active:scale-98"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-amber-700" />}
            <span>{copiedLink ? 'تم نسخ الرابط لنشره' : 'مشاركة التطبيق كصدقة جارية'}</span>
          </button>
        </div>
      </div>

      {/* 4. Du'a Section for Parents & All Deceased Muslims */}
      <div className="bg-linear-to-br from-white to-emerald-50/40 rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm border-b border-gray-100 pb-2">
          <Heart className="w-4 h-4 text-red-500 fill-red-500/20" />
          <span>أدعية مأثورة للوالدين ولأموات المسلمين</span>
        </div>

        <div className="space-y-2.5 text-xs sm:text-sm text-gray-700 leading-relaxed font-serif">
          <div className="p-3 bg-white rounded-xl border border-emerald-100">
            <span className="font-bold text-emerald-900 block mb-1">دعاء للوالدين:</span>
            «اللهم اغفر لوالديّ وارحمهما وعافهما واعفُ عنهما، وأكرم نزلهما، ووسّع مدخلهما، واغسلهما بالماء والثلج والبرد، ونقّهما من الخطايا كما ينقّى الثوب الأبيض من الدنس، وجازهما بالإحسان إحساناً وبالسيئات عفواً وغفراناً».
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-100">
            <span className="font-bold text-emerald-900 block mb-1">دعاء لأموات المسلمين:</span>
            «اللهم اغفر لجميع موتى المسلمين الذين شهدوا لك بالوحدانية ولنبيك بالرسالة وماتوا على ذلك، اللهم أنزل على قبورهم الضياء والنور والفسحة والسرور، واجمعنا بهم في جنات النعيم على العمل الصالح».
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950 font-sans text-xs">
            قال رسول الله ﷺ: <span className="font-bold">«إذا مات الإنسانُ انقطع عنه عملُه إلا من ثلاثةٍ: إلا من صدقةٍ جاريةٍ، أو علمٍ يُنتفَع به، أو ولدٍ صالحٍ يدعو له»</span> [رواه مسلم].
          </div>
        </div>
      </div>

      {/* 5. Features & Information about "الباحث القرآني" */}
      <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>نبذة عن تطبيق «الباحث القرآني»</span>
          </h3>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
            مجاني 100% لوجه الله
          </span>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          تطبيق إسلامي شامل صُمم لخدمة كتاب الله تعالى، وتيسير تلاوته، والبحث في آياته، وتدبر معانيه بمختلف اللغات، مجاناً لوجه الله دون أي إعلانات:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/80">
            <Search className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 block">بحث دقيق وفوري</span>
              <span className="text-gray-500 text-[11px]">البحث من أول حرف مع تجاهل التشكيل وإحصاء مرات التكرار.</span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/80">
            <Volume2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 block">كبار القراء</span>
              <span className="text-gray-500 text-[11px]">استماع برواية حفص وتلاوات خاشعة لأشهر قراء العالم الإسلامي.</span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/80">
            <Globe className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 block">ترجمة وتفسير بالإنجليزي</span>
              <span className="text-gray-500 text-[11px]">ترجمة صحيحة، وشرح معتمد، وقراءة صوتية إنجليزية وتلاوة مسموعة.</span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/80">
            <Smartphone className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 block">يعمل بدون إنترنت (PWA)</span>
              <span className="text-gray-500 text-[11px]">حفظ تلقائي للآيات والتفاسير وإمكانية التثبيت كتطبيق مستقل.</span>
            </div>
          </div>
        </div>

        {/* Quick navigation actions */}
        <div className="pt-2 flex items-center justify-center gap-2">
          {onNavigateToSearch && (
            <button
              onClick={onNavigateToSearch}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span>البدء بالبحث القرآني</span>
            </button>
          )}

          {onNavigateToSurahs && (
            <button
              onClick={onNavigateToSurahs}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>تصفح فهرس السور</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
