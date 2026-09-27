import React from 'react';
import { Loader2, DownloadCloud, CheckCircle2, HardDrive } from 'lucide-react';
import { formatBytes, DownloadProgress } from '../services/offlineService';

interface AyahDownloadProgressBarProps {
  key?: React.Key;
  progress?: DownloadProgress;
  variant?: 'card' | 'inline' | 'banner';
  reciterName?: string;
  className?: string;
}

export function AyahDownloadProgressBar({
  progress,
  variant = 'card',
  reciterName,
  className = '',
}: AyahDownloadProgressBarProps) {
  if (!progress) return null;

  const percent = Math.min(100, Math.max(0, progress.percent || 0));
  const isComplete = progress.status === 'completed' || percent >= 100;
  const isError = progress.status === 'error';

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-20 sm:w-28 bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              isError
                ? 'bg-red-500'
                : isComplete
                ? 'bg-emerald-600'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="font-mono text-[10px] font-bold text-emerald-800">
          {percent}%
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 ${
        isError
          ? 'bg-red-50 border border-red-200 p-2.5 text-red-800'
          : 'bg-emerald-50/90 border border-emerald-200 p-2.5 text-emerald-950 shadow-2xs'
      } ${className}`}
    >
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-1.5 font-bold">
          {isComplete ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] text-emerald-800">
                اكتمل التحميل والحفظ في مجلد القارئ
              </span>
            </>
          ) : isError ? (
            <span className="text-[11px] text-red-600">
              {progress.error || 'تعذر استكمال التحميل'}
            </span>
          ) : (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
              <span className="text-[11px] text-emerald-900">
                جارٍ تحميل التلاوة الصوتية
                {reciterName ? ` (${reciterName})` : ''}...
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
          <span className="text-emerald-700">{percent}%</span>
          {progress.totalBytes > 0 && (
            <span className="text-gray-500 font-normal text-[10px]">
              ({formatBytes(progress.loadedBytes)} / {formatBytes(progress.totalBytes)})
            </span>
          )}
        </div>
      </div>

      {/* Visual Progress Track */}
      <div className="w-full bg-emerald-200/70 rounded-full h-2 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            isError
              ? 'bg-red-500'
              : isComplete
              ? 'bg-emerald-600'
              : 'bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-500 animate-pulse'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
