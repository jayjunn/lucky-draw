'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, AlertCircle, CheckCircle2, Ticket } from 'lucide-react';
import { ThemeStyleConfig } from '@/hooks/useParticipant';

interface CheckInViewProps {
  nameInput: string;
  onChangeName: (value: string) => void;
  onSubmit: (e?: React.FormEvent | React.MouseEvent) => void;
  onRecoverParticipant?: (name: string) => void;
  isSubmitting: boolean;
  participantCount: number;
  themeCfg: ThemeStyleConfig;
  existingNames?: string[];
}

export const CheckInView: React.FC<CheckInViewProps> = ({
  nameInput,
  onChangeName,
  onSubmit,
  onRecoverParticipant,
  isSubmitting,
  participantCount,
  themeCfg,
  existingNames = [],
}) => {
  const cleanName = nameInput.trim();

  const validationState = useMemo(() => {
    if (!cleanName) return null;
    if (cleanName.length < 2) {
      return {
        type: 'warning' as const,
        message: '최소 2글자 이상 입력해주세요.',
      };
    }
    const isDup = existingNames.some(
      (n) => n.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isDup) {
      return {
        type: 'duplicate' as const,
        message: `'${cleanName}' 님으로 발급된 입장 패스가 있습니다.`,
      };
    }
    return {
      type: 'success' as const,
      message: '사용 가능한 이름입니다 ✨',
    };
  }, [cleanName, existingNames]);

  const isDuplicate = validationState?.type === 'duplicate';
  const isButtonDisabled = isSubmitting || cleanName.length < 2;

  const handleSubmitOrRecover = (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isDuplicate && onRecoverParticipant) {
      onRecoverParticipant(cleanName);
    } else {
      onSubmit(e);
    }
  };

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="bg-[#141418] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-6"
    >
      <div className="space-y-1.5 text-left">
        <p className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
          Check-in & Pass
        </p>
        <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
          럭키드로우 행운 번호를<br />발급받으세요.
        </h2>
        <p className="text-xs text-zinc-400 font-normal leading-relaxed pt-1">
          이름 또는 닉네임(2글자 이상)을 입력하시면 1인 1매의 디지털 패스와 고유 추첨 번호가 부여됩니다.
        </p>
      </div>

      <form onSubmit={handleSubmitOrRecover} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
            Participant Name (2글자 이상)
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="이름 또는 닉네임 입력 (2글자 이상)"
            maxLength={12}
            required
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
            disabled={isSubmitting}
            className={`w-full px-4 py-3.5 rounded-2xl bg-white/[0.06] border text-white font-semibold text-base placeholder-zinc-500 focus:outline-none transition-all disabled:opacity-50 ${
              isDuplicate
                ? 'border-emerald-500/70 focus:border-emerald-400 bg-emerald-500/5'
                : validationState?.type === 'success'
                ? 'border-emerald-500/70 focus:border-emerald-500'
                : 'border-white/15 focus:border-white/40 focus:bg-white/[0.1]'
            }`}
          />

          {/* 실시간 유효성 피드백 안내 메시지 */}
          {validationState && (
            <div className="pt-1 text-xs">
              {validationState.type === 'duplicate' && (
                <div className="space-y-1.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-emerald-300 flex items-center gap-1.5 font-medium">
                    <Ticket className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                    <span>{validationState.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRecoverParticipant ? onRecoverParticipant(cleanName) : onSubmit()}
                      className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-black font-extrabold text-[11px] flex items-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <span>내 입장 패스 바로 열기</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-zinc-400">
                      (동명이인인 경우 닉네임 뒤에 숫자 입력)
                    </span>
                  </div>
                </div>
              )}
              {validationState.type === 'warning' && (
                <span className="text-amber-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {validationState.message}
                </span>
              )}
              {validationState.type === 'success' && (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validationState.message}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isButtonDisabled}
          className={`w-full py-4 rounded-2xl font-extrabold text-sm tracking-wide shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
            isDuplicate 
              ? 'bg-emerald-400 hover:bg-emerald-300 text-black' 
              : 'text-black'
          }`}
          style={!isDuplicate ? { backgroundColor: themeCfg.accent } : undefined}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-black" /> 패스 확인 중...
            </span>
          ) : isDuplicate ? (
            <>
              <Ticket className="w-4 h-4" /> &apos;{cleanName}&apos; 님 입장 패스 확인하기 <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              입장 패스 받기 <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
        <span>현재 등록된 참가자</span>
        <span className="text-white font-bold font-mono">
          {participantCount} PLAYERS
        </span>
      </div>
    </motion.div>
  );
};
