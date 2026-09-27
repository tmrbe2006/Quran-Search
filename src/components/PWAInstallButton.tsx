import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone app, hide button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'full') {
      return (
        <button
          onClick={install}
          className={`w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-98 ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>تثبيت التطبيق على هاتفك (أوفلاين)</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs transition active:scale-95 ${className}`}
        title="تثبيت التطبيق على جهازك للعمل دون إنترنت"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">تثبيت التطبيق</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'full' ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className={`w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-800/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-800 transition ${className}`}
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>تثبيت التطبيق على آيفون / آيباد</span>
          </button>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className={`flex items-center gap-1 rounded-xl bg-emerald-800/80 border border-emerald-600/40 px-2.5 py-1.5 text-[11px] font-medium text-emerald-100 hover:bg-emerald-700 transition ${className}`}
            title="تثبيت التطبيق على iOS"
          >
            <Download className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden xs:inline">تثبيت PWA</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-right text-gray-800 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-base font-bold text-emerald-900">تثبيت التطبيق على iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-gray-700">
                <div className="flex items-start gap-2.5 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <Share2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 block mb-0.5">1. اضغط على زر المشاركة (Share)</span>
                    <span className="text-gray-600">في الشريط السفلي لمتصفح Safari.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <PlusSquare className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 block mb-0.5">2. مرّر واختر "إضافة إلى الصفحة الرئيسية"</span>
                    <span className="text-gray-600">(Add to Home Screen) لتثبيت التطبيق كتطبيق هاتف مستقل وسريع دون اتصال.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 py-2.5 text-xs font-bold text-white transition shadow-sm"
              >
                فهمت، إغلاق
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
