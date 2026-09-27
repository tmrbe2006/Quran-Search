import { Reciter } from '../types';

export const RECITERS: Reciter[] = [
  {
    id: 'dussary',
    name: 'الشيخ ياسر الدوسري',
    shortName: 'الدوسري',
    subfolder: 'Yasser_Ad-Dussary_128kbps',
    style: 'مرتل خاشع'
  },
  {
    id: 'alafasy',
    name: 'الشيخ مشاري راشد العفاسي',
    shortName: 'العفاسي',
    subfolder: 'Alafasy_128kbps',
    style: 'حفص عن عاصم'
  },
  {
    id: 'abdul-basit',
    name: 'الشيخ عبد الباسط عبد الصمد',
    shortName: 'عبد الباسط',
    subfolder: 'Abdul_Basit_Murattal_192kbps',
    style: 'مرتل مجود'
  },
  {
    id: 'husary',
    name: 'الشيخ محمود خليل الحصري',
    shortName: 'الحصري',
    subfolder: 'Husary_128kbps',
    style: 'المصحف المرتل'
  },
  {
    id: 'minshawy',
    name: 'الشيخ محمد صديق المنشاوي',
    shortName: 'المنشاوي',
    subfolder: 'Minshawy_Murattal_128kbps',
    style: 'المصحف المرتل'
  },
  {
    id: 'muaiqly',
    name: 'الشيخ ماهر المعيقلي',
    shortName: 'المعيقلي',
    subfolder: 'Maher_AlMuaiqly_64kbps',
    style: 'أئمة الحرم المكي'
  },
  {
    id: 'ghamadi',
    name: 'الشيخ سعد الغامدي',
    shortName: 'الغامدي',
    subfolder: 'Ghamadi_40kbps',
    style: 'مرتل'
  },
  {
    id: 'shatry',
    name: 'الشيخ أبو بكر الشاطري',
    shortName: 'الشاطري',
    subfolder: 'Abu_Bakr_Ash-Shaatree_128kbps',
    style: 'مرتل عذب'
  },
  {
    id: 'shuraym',
    name: 'الشيخ سعود الشريم',
    shortName: 'الشريم',
    subfolder: 'Saood_ash-Shuraym_128kbps',
    style: 'أئمة الحرم المكي'
  },
  {
    id: 'jaber',
    name: 'الشيخ علي جابر',
    shortName: 'علي جابر',
    subfolder: 'Ali_Jaber_64kbps',
    style: 'إمام الحرم المكي'
  }
];

export const DEFAULT_RECITER_ID = 'dussary';

export const getReciterById = (id: string): Reciter => {
  return RECITERS.find(r => r.id === id) || RECITERS[0];
};

export const getAyahAudioUrl = (reciterSubfolder: string, suraNumber: number, verseInSura: number): string => {
  const suraPadded = String(suraNumber).padStart(3, '0');
  const ayahPadded = String(verseInSura).padStart(3, '0');
  return `https://www.everyayah.com/data/${reciterSubfolder}/${suraPadded}${ayahPadded}.mp3`;
};
