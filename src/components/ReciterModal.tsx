import { X, Check, Volume2, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RECITERS } from '../data/reciters';
import { Reciter } from '../types';

interface ReciterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciter: Reciter;
  onSelectReciter: (reciter: Reciter) => void;
}

export function ReciterModal({ isOpen, onClose, selectedReciter, onSelectReciter }: ReciterModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal / Bottom Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-emerald-900/10"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-800 text-white">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-emerald-700/60 flex items-center justify-center border border-emerald-600/40">
                <Mic className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h3 className="font-bold text-base">اختيار القارئ</h3>
                <p className="text-xs text-emerald-200/90">اختر صوت التلاوة المفضل لديك</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-700/40 hover:bg-emerald-700 flex items-center justify-center text-emerald-100 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reciter List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-50">
            {RECITERS.map((reciter) => {
              const isSelected = selectedReciter.id === reciter.id;
              return (
                <button
                  key={reciter.id}
                  onClick={() => {
                    onSelectReciter(reciter);
                    onClose();
                  }}
                  className={`w-full pt-2 first:pt-0 pb-2 px-3 rounded-2xl flex items-center justify-between text-right transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border border-emerald-300 shadow-xs'
                      : 'hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-colors ${
                        isSelected
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-emerald-100/70 text-emerald-800'
                      }`}
                    >
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-snug">
                        {reciter.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">{reciter.style}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        المحدد
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 group-hover:text-gray-600">اختيار</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Notice */}
          <div className="p-3 bg-emerald-50/50 border-t border-emerald-100/60 text-center">
            <p className="text-[11px] text-emerald-800">
              جميع التلاوات عالية الجودة برواية حفص عن عاصم ويمكن الاستماع لها وتحميلها دون اتصال.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
