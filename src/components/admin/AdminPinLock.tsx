'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Delete, KeyRound } from 'lucide-react';
import { Haptic } from '@/lib/haptic';

interface AdminPinLockProps {
  onUnlock: () => void;
  correctPin?: string;
  magicPin?: string;
}

export const AdminPinLock: React.FC<AdminPinLockProps> = ({
  onUnlock,
  correctPin = '1128',
  magicPin = '7777',
}) => {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      Haptic.lightTap();
      const nextPin = pin + num;
      setPin(nextPin);

      if (nextPin.length === 4) {
        if (nextPin === correctPin || nextPin === magicPin) {
          Haptic.success();
          setTimeout(() => {
            onUnlock();
          }, 150);
        } else {
          Haptic.warning();
          setIsError(true);
          setTimeout(() => {
            setPin('');
            setIsError(false);
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    Haptic.lightTap();
    setPin((prev) => prev.slice(0, -1));
  };

  // 키보드 숫자 입력 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-3xl bg-[#141418] border border-white/10 p-8 text-center shadow-2xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-black text-white tracking-tight">관리자 인증</h2>
        <p className="text-xs text-zinc-400 mt-1 mb-8">
          시스템 설정을 위해 4자리 PIN을 입력하세요.
        </p>

        {/* PIN 도트 표시 */}
        <motion.div
          animate={isError ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-4 mb-8"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  isError
                    ? 'bg-rose-500 scale-110 ring-4 ring-rose-500/20'
                    : isFilled
                    ? 'bg-orange-500 scale-110 ring-4 ring-orange-500/20'
                    : 'bg-zinc-800'
                }`}
              />
            );
          })}
        </motion.div>

        {/* 숫자 키패드 */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 text-xl font-bold text-white transition-all border border-white/5 shadow-sm"
            >
              {digit}
            </button>
          ))}
          <div className="h-14 flex items-center justify-center text-zinc-600">
            <KeyRound className="w-5 h-5 opacity-40" />
          </div>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 text-xl font-bold text-white transition-all border border-white/5 shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/80 active:scale-95 flex items-center justify-center text-zinc-400 hover:text-white transition-all border border-white/5"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
