import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle2 } from 'lucide-react';
import { Participant, DrawState } from '@/types';
import { ThemeStyleConfig } from '@/hooks/useParticipant';

interface WinnerModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  currentDraw?: DrawState;
  themeCfg: ThemeStyleConfig;
  onConfirmPresence: () => void;
}

export const WinnerModalView: React.FC<WinnerModalViewProps> = ({
  isOpen,
  onClose,
  participant,
  currentDraw,
  themeCfg,
  onConfirmPresence,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="w-full max-w-sm bg-[#16161C] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 text-center space-y-4 shadow-2xl"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />

            <div
              className="w-16 h-16 mx-auto rounded-2xl text-black flex items-center justify-center shadow-lg"
              style={{ backgroundColor: themeCfg.accent }}
            >
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                WINNER CONFIRMATION
              </span>
              <h3 className="text-xl font-black text-white">
                {currentDraw?.currentWinner?.rank || participant?.isWinner?.rank}등 당첨을 축하합니다!
              </h3>
              <p className="text-sm font-bold text-zinc-300">
                {currentDraw?.currentWinner?.prize || participant?.isWinner?.prize}
              </p>
            </div>

            {!participant?.presenceConfirmed ? (
              <div className="space-y-2 pt-2">
                <button
                  onClick={onConfirmPresence}
                  className="w-full py-4 rounded-2xl text-black font-black text-sm tracking-wide shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: themeCfg.accent }}
                >
                  <CheckCircle2 className="w-5 h-5" /> 저 현장에 있습니다 (출석 확인)
                </button>
                <p className="text-[11px] text-zinc-400">
                  호명 제한 시간 내에 출석을 확인하지 않으면 재추첨됩니다.
                </p>
              </div>
            ) : (
              <div className="py-3 bg-emerald-500/15 text-emerald-400 text-xs font-bold rounded-2xl border border-emerald-500/30 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 출석 확인 완료! 무대로 나와주세요!
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                패스 화면으로 돌아가기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
