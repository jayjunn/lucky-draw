'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

interface EventSplashScreenProps {
  posterSrc?: string;
  title?: string;
  dateText?: string;
  durationMs?: number;
  onFinish?: () => void;
}

export const EventSplashScreen: React.FC<EventSplashScreenProps> = ({
  posterSrc = '/images/poster.jpg',
  title = 'HALLOWEEN PARTY 🎃',
  dateText = '10.30 FRI — 10.31 SAT @ EULJIRO',
  durationMs = 1400,
  onFinish,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onFinish]);

  const handleSkip = () => {
    setIsVisible(false);
    if (onFinish) onFinish();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 overflow-hidden"
        >
          {/* 배경 블러 포스터 */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-125"
            style={{ backgroundImage: `url(${posterSrc})` }}
          />

          {/* 스킵 버튼 */}
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 z-20 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-xs font-mono backdrop-blur-md border border-white/10 flex items-center gap-1 active:scale-95 transition"
          >
            <span>SKIP</span>
            <X className="w-3.5 h-3.5" />
          </button>

          {/* 중앙 포스터 카드 */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-[340px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-zinc-900"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              <img
                src={posterSrc}
                alt="YUNTAKU 1ST & HALLOWEEN PARTY"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/90 text-black text-[10px] font-black uppercase tracking-wider shadow-lg">
                  <Sparkles className="w-3 h-3" /> 1ST ANNIVERSARY
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-left">
                <p className="text-[11px] font-mono tracking-widest text-orange-400 font-bold uppercase">
                  YUNTAKU SOCIAL CLUB
                </p>
                <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                  {title}
                </h2>
                <p className="text-[11px] text-zinc-300 font-mono mt-0.5">
                  {dateText}
                </p>
              </div>
            </div>

            {/* 하단 로딩 바 */}
            <div className="h-1 bg-white/10 w-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: durationMs / 1000, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-orange-500 to-purple-500"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
