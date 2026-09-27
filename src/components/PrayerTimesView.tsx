import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Compass,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Bell,
  BellOff,
  MapPin,
  Calendar,
  Sparkles,
  ChevronDown,
  Navigation,
  Loader2,
  CheckCircle2,
  Info,
  ChevronUp,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CITIES,
  ADHAN_SOUNDS,
  calculatePrayerTimesOffline,
  getHijriDateString,
  PrayerTimes,
  CityConfig,
  AdhanSound
} from '../services/prayerService';

interface PrayerTimesViewProps {
  onRefreshDownloads?: () => void;
}

export function PrayerTimesView({ onRefreshDownloads }: PrayerTimesViewProps) {
  // Config state
  const [selectedCity, setSelectedCity] = useState<CityConfig>(() => {
    const saved = localStorage.getItem('quran_prayer_city');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) return parsed;
      } catch (e) {}
    }
    return CITIES[0]; // Mecca is default
  });

  const [useGPS, setUseGPS] = useState<boolean>(() => {
    return localStorage.getItem('quran_prayer_use_gps') === 'true';
  });

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = localStorage.getItem('quran_prayer_gps_coords');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);

  // Sound Config state
  const [selectedAdhan, setSelectedAdhan] = useState<AdhanSound>(() => {
    const saved = localStorage.getItem('quran_selected_adhan_id');
    const found = ADHAN_SOUNDS.find((a) => a.id === saved);
    return found || ADHAN_SOUNDS[0]; // Madinah by default
  });

  const [isAlertsEnabled, setIsAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('quran_prayer_alerts_enabled');
    return saved === null ? true : saved === 'true';
  });

  const [enabledPrayers, setEnabledPrayers] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('quran_prayer_enabled_map');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      Fajr: true,
      Dhuhr: true,
      Asr: true,
      Maghrib: true,
      Isha: true,
    };
  });

  // Current times & countdown
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayerName, setNextPrayerName] = useState<string>('');
  const [nextPrayerTimeStr, setNextPrayerTimeStr] = useState<string>('');
  const [countdownStr, setCountdownStr] = useState<string>('');

  // Audio preview play/pause state
  const [playingAdhanId, setPlayingAdhanId] = useState<string | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Active Adhan playing when prayer time arrives (to let user dismiss/stop it)
  const [activeAdhanPlaying, setActiveAdhanPlaying] = useState<string | null>(null);
  const adhanAudioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate coordinates to use
  const activeLat = useGPS && gpsCoords ? gpsCoords.lat : selectedCity.lat;
  const activeLng = useGPS && gpsCoords ? gpsCoords.lng : selectedCity.lng;
  const activeTimezone = useGPS ? -new Date().getTimezoneOffset() / 60 : selectedCity.timezone;

  // Calculate prayer times
  useEffect(() => {
    const times = calculatePrayerTimesOffline(
      currentTime,
      activeLat,
      activeLng,
      activeTimezone,
      useGPS ? 'Egypt' : selectedCity.method
    );
    setPrayerTimes(times);
  }, [currentTime, selectedCity, useGPS, gpsCoords]);

  // Handle GPS location request
  const requestGPS = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('متصفحك لا يدعم تحديد الموقع (GPS).');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setGpsCoords(coords);
        setUseGPS(true);
        localStorage.setItem('quran_prayer_use_gps', 'true');
        localStorage.setItem('quran_prayer_gps_coords', JSON.stringify(coords));
        setGpsLoading(false);
      },
      (err) => {
        console.error(err);
        setGpsError('عذراً، فشل الحصول على موقعك الجغرافي. تأكد من تفعيل الـ GPS وإعطاء الإذن.');
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSelectCity = (city: CityConfig) => {
    setUseGPS(false);
    setSelectedCity(city);
    localStorage.setItem('quran_prayer_use_gps', 'false');
    localStorage.setItem('quran_prayer_city', JSON.stringify(city));
  };

  // Track clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Compute next prayer and countdown
  useEffect(() => {
    if (!prayerTimes) return;

    const computeNextPrayer = () => {
      const now = new Date();
      const formatToDate = (timeStr: string, addDays = 0) => {
        const d = new Date(now);
        d.setDate(d.getDate() + addDays);
        const [hours, minutes] = timeStr.split(':').map(Number);
        d.setHours(hours, minutes, 0, 0);
        return d;
      };

      const prs = [
        { name: 'الفجر', key: 'Fajr', time: formatToDate(prayerTimes.Fajr) },
        { name: 'الشروق', key: 'Sunrise', time: formatToDate(prayerTimes.Sunrise) },
        { name: 'الظهر', key: 'Dhuhr', time: formatToDate(prayerTimes.Dhuhr) },
        { name: 'العصر', key: 'Asr', time: formatToDate(prayerTimes.Asr) },
        { name: 'المغرب', key: 'Maghrib', time: formatToDate(prayerTimes.Maghrib) },
        { name: 'العشاء', key: 'Isha', time: formatToDate(prayerTimes.Isha) },
      ];

      // Find next prayer today
      let next = prs.find((p) => p.time > now);

      // If all passed, next is Fajr tomorrow
      if (!next) {
        next = {
          name: 'الفجر',
          key: 'Fajr',
          time: formatToDate(prayerTimes.Fajr, 1),
        };
      }

      setNextPrayerName(next.name);
      setNextPrayerTimeStr(
        prs.find((p) => p.name === next?.name)?.key === 'Fajr' && next.time.getDate() !== now.getDate()
          ? prayerTimes.Fajr
          : prs.find((p) => p.name === next?.name)?.time.toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit',
            }) || ''
      );

      // Check difference
      const diffMs = next.time.getTime() - now.getTime();
      const diffSecs = Math.floor(diffMs / 1000);

      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;

      const formatNum = (n: number) => (n < 10 ? '0' + n : String(n));
      setCountdownStr(`${formatNum(hours)}:${formatNum(minutes)}:${formatNum(seconds)}`);

      // Trigger actual Adhan sound when a prayer arrives! (Exact match to minute and second === 0)
      const currentMinStr = `${formatNum(now.getHours())}:${formatNum(now.getMinutes())}`;
      const prKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

      prKeys.forEach((key) => {
        const timeVal = prayerTimes[key as keyof PrayerTimes];
        if (
          timeVal === currentMinStr &&
          now.getSeconds() === 0 &&
          isAlertsEnabled &&
          enabledPrayers[key] &&
          !activeAdhanPlaying
        ) {
          triggerAdhanAlert(key);
        }
      });
    };

    computeNextPrayer();
  }, [currentTime, prayerTimes, isAlertsEnabled, enabledPrayers]);

  // Triggers the beautiful Adhan audio
  const triggerAdhanAlert = (prayerKey: string) => {
    try {
      if (adhanAudioRef.current) {
        adhanAudioRef.current.pause();
      }

      const pNames: Record<string, string> = {
        Fajr: 'الفجر',
        Dhuhr: 'الظهر',
        Asr: 'العصر',
        Maghrib: 'المغرب',
        Isha: 'العشاء',
      };

      const audio = new Audio(selectedAdhan.url);
      adhanAudioRef.current = audio;
      setActiveAdhanPlaying(pNames[prayerKey] || prayerKey);
      audio.play().catch((err) => {
        console.error('Audio playback failed', err);
      });
    } catch (e) {
      console.error(e);
    }
  };

  const stopActiveAdhan = () => {
    if (adhanAudioRef.current) {
      adhanAudioRef.current.pause();
      adhanAudioRef.current.currentTime = 0;
    }
    setActiveAdhanPlaying(null);
  };

  // Listen / Test Adhan options
  const handleTestAdhan = (sound: AdhanSound) => {
    if (playingAdhanId === sound.id) {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
      }
      setPlayingAdhanId(null);
      return;
    }

    if (testAudioRef.current) {
      testAudioRef.current.pause();
    }

    const audio = new Audio(sound.url);
    testAudioRef.current = audio;
    audio.onended = () => setPlayingAdhanId(null);
    audio.onerror = () => setPlayingAdhanId(null);

    setPlayingAdhanId(sound.id);
    audio.play().catch(() => setPlayingAdhanId(null));
  };

  const handleSelectAdhan = (sound: AdhanSound) => {
    setSelectedAdhan(sound);
    localStorage.setItem('quran_selected_adhan_id', sound.id);
  };

  const togglePrayerAlert = (key: string) => {
    const updated = { ...enabledPrayers, [key]: !enabledPrayers[key] };
    setEnabledPrayers(updated);
    localStorage.setItem('quran_prayer_enabled_map', JSON.stringify(updated));
  };

  const toggleAllAlerts = () => {
    const updated = !isAlertsEnabled;
    setIsAlertsEnabled(updated);
    localStorage.setItem('quran_prayer_alerts_enabled', String(updated));
  };

  // Clean test audio on destroy
  useEffect(() => {
    return () => {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
      }
      if (adhanAudioRef.current) {
        adhanAudioRef.current.pause();
      }
    };
  }, []);

  const hijriStr = getHijriDateString(currentTime);
  const gregorianStr = currentTime.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300 text-right" dir="rtl">
      {/* Active Adhan Alert Dismiss Box */}
      <AnimatePresence>
        {activeAdhanPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-linear-to-r from-amber-500 via-emerald-600 to-teal-700 text-white rounded-3xl p-4.5 shadow-2xl border-2 border-amber-300 flex flex-col items-center justify-center text-center space-y-3 z-50 relative"
          >
            <div className="w-12 h-12 bg-white/20 border border-white/30 rounded-full flex items-center justify-center text-white animate-bounce">
              <Volume2 className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <p className="font-bold text-base">حان الآن موعد أذان {activeAdhanPlaying}</p>
              <p className="text-xs text-amber-100/90">بصوت: {selectedAdhan.name}</p>
            </div>
            <button
              onClick={stopActiveAdhan}
              className="px-6 py-2 bg-white text-emerald-950 rounded-xl text-xs font-bold shadow-md hover:bg-amber-100 transition active:scale-95 flex items-center gap-1.5"
            >
              <VolumeX className="w-4 h-4 text-emerald-800" />
              <span>إيقاف الأذان</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Countdown Header */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-950 to-emerald-950 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-600/10 rounded-full blur-2xl transform translate-x-8 translate-y-8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-400/15 rounded-full blur-2xl transform -translate-x-4 translate-y-4 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-200 font-bold">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{gregorianStr}</span>
            </div>
            <p className="text-sm font-bold font-amiri text-amber-300">
              {hijriStr}
            </p>
          </div>

          {/* Countdown timer */}
          <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-3.5 flex flex-col items-center justify-center text-center self-center sm:self-auto w-full sm:w-auto min-w-[150px] shadow-inner">
            <span className="text-[10px] text-emerald-200 font-bold block mb-0.5">
              المتبقي لأذان {nextPrayerName} ({nextPrayerTimeStr})
            </span>
            <span className="font-mono text-2xl font-bold text-amber-300 tracking-widest">
              {countdownStr}
            </span>
          </div>
        </div>
      </div>

      {/* Location / GPS Configuration bar */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>المدينة المختارة لمواقيت الصلاة:</span>
          </span>

          <button
            onClick={requestGPS}
            disabled={gpsLoading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-colors shadow-2xs ${
              useGPS
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border-gray-200'
            }`}
          >
            {gpsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{useGPS ? 'الموقع الجغرافي (GPS)' : 'تحديد بموقعي'}</span>
          </button>
        </div>

        {/* City Select Custom Dropdown */}
        {!useGPS ? (
          <div className="relative">
            <select
              value={selectedCity.name}
              onChange={(e) => {
                const found = CITIES.find((c) => c.name === e.target.value);
                if (found) handleSelectCity(found);
              }}
              className="w-full text-xs font-bold text-gray-800 bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 pr-2 pl-8 appearance-none cursor-pointer outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.method === 'UmmAlQura' ? 'تقويم أم القرى' : 'هيئة المساحة المصرية'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-950 flex items-center justify-between font-mono">
            <span>موقعك: {activeLat.toFixed(4)}، {activeLng.toFixed(4)}</span>
            <button
              onClick={() => {
                setUseGPS(false);
                localStorage.setItem('quran_prayer_use_gps', 'false');
              }}
              className="text-[10px] text-amber-850 hover:underline font-sans font-bold"
            >
              إلغاء والعودة للمدن
            </button>
          </div>
        )}

        {gpsError && (
          <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-xl">
            {gpsError}
          </p>
        )}
      </div>

      {/* Grid of Prayer Times */}
      {prayerTimes && (
        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2.5">
          {[
            { name: 'الفجر', key: 'Fajr', time: prayerTimes.Fajr, icon: '🌅', hasAlert: true },
            { name: 'الشروق', key: 'Sunrise', time: prayerTimes.Sunrise, icon: '☀️', hasAlert: false },
            { name: 'الظهر', key: 'Dhuhr', time: prayerTimes.Dhuhr, icon: '🌞', hasAlert: true },
            { name: 'العصر', key: 'Asr', time: prayerTimes.Asr, icon: '🌇', hasAlert: true },
            { name: 'المغرب', key: 'Maghrib', time: prayerTimes.Maghrib, icon: '🌙', hasAlert: true },
            { name: 'العشاء', key: 'Isha', time: prayerTimes.Isha, icon: '🌌', hasAlert: true },
          ].map((p) => {
            const isNext = p.name === nextPrayerName;
            const alertEnabled = p.hasAlert && enabledPrayers[p.key];

            return (
              <div
                key={p.name}
                className={`p-3 rounded-2xl border text-center relative overflow-hidden transition-all duration-300 ${
                  isNext
                    ? 'bg-linear-to-b from-amber-50 to-amber-100/60 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                    : 'bg-white border-emerald-100/60 shadow-2xs hover:border-emerald-100'
                }`}
              >
                {isNext && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}

                <div className="text-xl mb-1">{p.icon}</div>
                <h4 className="text-xs font-bold text-gray-700">{p.name}</h4>
                <p className="font-mono text-base font-bold text-gray-900 my-1">{p.time}</p>

                {/* Individual Adhan toggle switch for this prayer */}
                {p.hasAlert && (
                  <button
                    onClick={() => togglePrayerAlert(p.key)}
                    className={`mt-1 inline-flex items-center justify-center p-1.5 rounded-full border transition ${
                      alertEnabled
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}
                    title={alertEnabled ? 'تنبيه الأذان مفعل' : 'تنبيه الأذان معطل'}
                  >
                    {alertEnabled ? (
                      <Bell className="w-3 h-3 fill-emerald-600" />
                    ) : (
                      <BellOff className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Adhan Sounds Customization Section */}
      <div className="bg-white rounded-3xl p-4.5 border border-emerald-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4.5 h-4.5 text-emerald-700" />
            <h3 className="font-bold text-sm text-gray-800">تخصيص صوت الأذان للتذكير</h3>
          </div>

          {/* Master Toggle Alert Notifications */}
          <button
            onClick={toggleAllAlerts}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isAlertsEnabled
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            {isAlertsEnabled ? (
              <>
                <Bell className="w-3.5 h-3.5 fill-current" />
                <span>التنبيهات مفعلة</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5" />
                <span>التنبيهات معطلة</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          اختر صوت مؤذن الحرم أو الشيخ المفضل لديك. سيقوم التطبيق بتشغيل هذا الأذان الرائع تلقائياً عند دخول وقت كل صلاة.
        </p>

        {/* List of Adhan Voice Options */}
        <div className="space-y-2">
          {ADHAN_SOUNDS.map((sound) => {
            const isSelected = selectedAdhan.id === sound.id;
            const isPlaying = playingAdhanId === sound.id;

            return (
              <div
                key={sound.id}
                onClick={() => handleSelectAdhan(sound)}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                    : 'border-gray-200/85 hover:border-emerald-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{sound.name}</h4>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/60 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                      {sound.style}
                    </span>
                  </div>
                </div>

                {/* Test Listening Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestAdhan(sound);
                  }}
                  className={`p-2 rounded-xl transition ${
                    isPlaying
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                  }`}
                  title="استماع تجريبي"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 text-amber-700" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </button>
              </div>
            );
          })}
        </div>


      </div>
    </div>
  );
}
