import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import { ThemeStyleConfig } from '@/hooks/useParticipant';

interface CheckInViewProps {
  nameInput: string;
  onChangeName: (value: string) => void;
  onSubmit: (e?: React.FormEvent | React.MouseEvent) => void;
  isSubmitting: boolean;
  participantCount: number;
  themeCfg: ThemeStyleConfig;
}

export const CheckInView: React.FC<CheckInViewProps> = ({
  nameInput,
  onChangeName,
  onSubmit,
  isSubmitting,
  participantCount,
  themeCfg,
}) => {
  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="bg-[#141418] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-6"
    >
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
          Check-in & Pass
        </p>
        <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
          럭키드로우 행운 번호를<br />발급받으세요.
        </h2>
        <p className="text-xs text-zinc-400 font-normal leading-relaxed pt-1">
          이름 또는 닉네임을 입력하시면 1인 1매의 디지털 패스와 고유 추첨 번호가 부여됩니다.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
            Participant Name
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="이름 또는 닉네임 입력"
            maxLength={12}
            required
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
            disabled={isSubmitting}
            className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.06] border border-white/15 text-white font-semibold text-base placeholder-zinc-500 focus:outline-none focus:border-white/40 focus:bg-white/[0.1] transition-all disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          onClick={(e) => onSubmit(e)}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-black font-extrabold text-sm tracking-wide shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          style={{ backgroundColor: themeCfg.accent }}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-black" /> 패스 발급 중...
            </span>
          ) : (
            <>입장 패스 받기 <ArrowRight className="w-4 h-4" /></>
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
