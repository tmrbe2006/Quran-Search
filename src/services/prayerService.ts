export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface AdhanSound {
  id: string;
  name: string;
  url: string;
  style: string;
}

export interface CityConfig {
  name: string;
  lat: number;
  lng: number;
  timezone: number;
  method: string;
}

export const CITIES: CityConfig[] = [
  { name: 'مكة المكرمة', lat: 21.4272, lng: 39.8262, timezone: 3, method: 'UmmAlQura' },
  { name: 'المدينة المنورة', lat: 24.4672, lng: 39.6111, timezone: 3, method: 'UmmAlQura' },
  { name: 'القاهرة', lat: 30.0444, lng: 31.2357, timezone: 3, method: 'Egypt' },
  { name: 'القدس الشريف', lat: 31.7683, lng: 35.2137, timezone: 3, method: 'Egypt' },
  { name: 'الرياض', lat: 24.7136, lng: 46.6753, timezone: 3, method: 'UmmAlQura' },
  { name: 'دبي', lat: 25.2048, lng: 55.2708, timezone: 4, method: 'Gulf' },
  { name: 'إسطنبول', lat: 41.0082, lng: 28.9784, timezone: 3, method: 'MWL' },
  { name: 'عمان', lat: 31.9539, lng: 35.9106, timezone: 3, method: 'Egypt' },
  { name: 'الرباط', lat: 34.0209, lng: -6.8416, timezone: 1, method: 'MWL' },
  { name: 'الجزائر', lat: 36.7538, lng: 3.0588, timezone: 1, method: 'MWL' },
  { name: 'تونس', lat: 36.8065, lng: 10.1815, timezone: 1, method: 'MWL' },
];

export const ADHAN_SOUNDS: AdhanSound[] = [
  {
    id: 'madinah',
    name: 'أذان المدينة المنورة (الحرم المدني)',
    url: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
    style: 'خشوع هادئ',
  },
  {
    id: 'makkah',
    name: 'أذان مكة المكرمة (الحرم المكي)',
    url: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    style: 'مهيب وجميل',
  },
  {
    id: 'aqsa',
    name: 'أذان المسجد الأقصى المبارك',
    url: 'https://www.islamcan.com/audio/adhan/azan9.mp3',
    style: 'جميل ومؤثر',
  },
  {
    id: 'abdulbasit',
    name: 'أذان بصوت الشيخ عبد الباسط عبد الصمد',
    url: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
    style: 'كلاسيكي مجود',
  },
  {
    id: 'shisheen',
    name: 'أذان بصوت الشيخ علي ملا',
    url: 'https://www.islamcan.com/audio/adhan/azan16.mp3',
    style: 'حجازي أصيل',
  },
];

// Helper functions for offline astronomical calculations of prayer times.
// Using standard formulas to calculate exact prayer times given date, lat, lng, timezone, and method angles.

function dtr(val: number): number {
  return (val * Math.PI) / 180;
}

function rtd(val: number): number {
  return (val * 180) / Math.PI;
}

function ccot(val: number): number {
  return 1 / Math.tan(val);
}

function fixangle(angle: number): number {
  let a = angle - 360 * Math.floor(angle / 360);
  return a < 0 ? a + 360 : a;
}

function fixhour(hour: number): number {
  let h = hour - 24 * Math.floor(hour / 24);
  return h < 0 ? h + 24 : h;
}

export function calculatePrayerTimesOffline(
  date: Date,
  lat: number,
  lng: number,
  timezone: number,
  method: string = 'Egypt'
): PrayerTimes {
  // Method Angles: [FajrAngle, IshaAngle]
  let fajrAngle = 19.5;
  let ishaAngle = 17.5;

  if (method === 'UmmAlQura') {
    fajrAngle = 18.5;
    // Isha is exactly 90 min after Maghrib (120 in Ramadan, but standard 90 here for simplicity)
    ishaAngle = 90; // custom rule flag
  } else if (method === 'MWL') {
    fajrAngle = 18;
    ishaAngle = 17;
  } else if (method === 'Gulf') {
    fajrAngle = 19.5;
    ishaAngle = 90; // custom rule flag
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Step 1: Julian Date
  let A = Math.floor(year / 100);
  let B = 2 - A + Math.floor(A / 4);
  let JD = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;

  // Step 2: Solar Declination & Equation of Time
  let D = JD - 2451545.0;
  let g = fixangle(357.529 + 0.98560028 * D);
  let q = fixangle(280.459 + 0.98564736 * D);
  let L = fixangle(q + 1.915 * Math.sin(dtr(g)) + 0.02 * Math.sin(dtr(2 * g)));

  let R = 1.00014 - 0.01671 * Math.cos(dtr(g)) - 0.00014 * Math.cos(dtr(2 * g));
  let e = 23.439 - 0.00000036 * D;

  let RA = rtd(Math.atan2(Math.cos(dtr(e)) * Math.sin(dtr(L)), Math.cos(dtr(L)))) / 15;
  RA = fixhour(RA);

  let EqT = q / 15 - RA;
  let Dec = rtd(Math.asin(Math.sin(dtr(e)) * Math.sin(dtr(L))));

  // Step 3: Mid Day (Dhuhr)
  let midDay = 12 + timezone - lng / 15 - EqT;
  midDay = fixhour(midDay);

  // Step 4: Sunrise / Sunset
  let sunriseSunsetAngle = 0.833 + 0.0347 * Math.sqrt(0); // height is 0
  let H_sunrise = rtd(Math.acos((-Math.sin(dtr(sunriseSunsetAngle)) - Math.sin(dtr(lat)) * Math.sin(dtr(Dec))) / (Math.cos(dtr(lat)) * Math.cos(dtr(Dec))))) / 15;

  let sunriseTime = midDay - H_sunrise;
  let maghribTime = midDay + H_sunrise;

  // Step 5: Fajr
  let H_fajr = rtd(Math.acos((-Math.sin(dtr(fajrAngle)) - Math.sin(dtr(lat)) * Math.sin(dtr(Dec))) / (Math.cos(dtr(lat)) * Math.cos(dtr(Dec))))) / 15;
  let fajrTime = midDay - H_fajr;

  // Step 6: Isha
  let ishaTime = 0;
  if (method === 'UmmAlQura' || method === 'Gulf') {
    // Isha is 90 minutes after Maghrib
    ishaTime = maghribTime + 1.5;
  } else {
    let H_isha = rtd(Math.acos((-Math.sin(dtr(ishaAngle)) - Math.sin(dtr(lat)) * Math.sin(dtr(Dec))) / (Math.cos(dtr(lat)) * Math.cos(dtr(Dec))))) / 15;
    ishaTime = midDay + H_isha;
  }

  // Step 7: Asr (Standard shadow ratio = 1)
  let g_asr = Math.abs(lat - Dec);
  let shadowRatio = 1; // Shafi'i, Maliki, Hanbali
  let asrAngle = rtd(Math.atan(shadowRatio + Math.tan(dtr(g_asr))));
  let H_asr = rtd(Math.acos((Math.sin(dtr(90 - asrAngle)) - Math.sin(dtr(lat)) * Math.sin(dtr(Dec))) / (Math.cos(dtr(lat)) * Math.cos(dtr(Dec))))) / 15;
  let asrTime = midDay + H_asr;

  // Formatting helper
  const formatTime = (t: number): string => {
    t = fixhour(t);
    const hours = Math.floor(t);
    const minutes = Math.floor((t - hours) * 60);
    const minStr = minutes < 10 ? '0' + minutes : String(minutes);
    const hrStr = hours < 10 ? '0' + hours : String(hours);
    return `${hrStr}:${minStr}`;
  };

  return {
    Fajr: formatTime(fajrTime),
    Sunrise: formatTime(sunriseTime),
    Dhuhr: formatTime(midDay),
    Asr: formatTime(asrTime),
    Maghrib: formatTime(maghribTime),
    Isha: formatTime(ishaTime),
  };
}

export function getHijriDateString(date: Date): string {
  // Approximate Hijri Calculation formula
  let jd = 0;
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();

  if (month < 3) {
    year -= 1;
    month += 12;
  }

  let A = Math.floor(year / 100);
  let B = Math.floor(A / 4);
  let C = 2 - A + B;
  let E = Math.floor(365.25 * (year + 4716));
  let F = Math.floor(30.6001 * (month + 1));
  jd = C + E + F + day - 1524.5;

  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  let j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;

  let m = Math.floor((24 * l) / 709);
  let d = l - Math.floor((709 * m) / 24);
  let y = 30 * n + j - 30;

  const hijriMonths = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
    'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ];

  return `${d} ${hijriMonths[m - 1]} ${y} هـ`;
}
