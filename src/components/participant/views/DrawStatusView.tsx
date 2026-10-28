import React from 'react';
import { DrawState, Participant, getRankLabel } from '@/types';
import { ThemeStyleConfig } from '@/hooks/useParticipant';
import { Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DrawStatusViewProps {
  currentDraw?: DrawState;
  isRouletteActive: boolean;
  isAnnounced: boolean;
  amIThisRoundWinner: boolean;
  rollingNumber: number;
  participant: Participant;
  themeCfg: ThemeStyleConfig;
  onConfirmPresence: () => void;
  onSendReaction: (emoji: string) => void;
}

export const DrawStatusView: React.FC<DrawStatusViewProps> = ({
  currentDraw,
  isRouletteActive,
  isAnnounced,
  amIThisRoundWinner,
  rollingNumber,
  participant,
  themeCfg,
  onConfirmPresence,
  onSendReaction,
}) => {
  return (
    <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 text-center">
      {isRouletteActive ? (
        /* 1. 롤링 진행 중 */
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300">
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: themeCfg.accent }}
            />
            <span>
              {getRankLabel({ rank: currentDraw?.currentRank ?? undefined, rankLabel: currentDraw?.currentRankLabel, hideRank: currentDraw?.currentHideRank }) ? `[${getRankLabel({ rank: currentDraw?.currentRank ?? undefined, rankLabel: currentDraw?.currentRankLabel, hideRank: currentDraw?.currentHideRank })}] ` : ''}
              {currentDraw?.batchCount && currentDraw.batchCount > 1 ? `${currentDraw.batchCount}명 일괄 추첨 롤링 중` : '추첨 롤링 중'}
            </span>
          </div>
          <div className="text-3xl font-black font-mono tracking-widest text-white">
            #{String(rollingNumber).padStart(3, '0')}
          </div>
          <p className="text-[11px] text-zinc-400">
            당첨 번호를 전광판과 함께 확인하세요
          </p>
        </div>
      ) : isAnnounced ? (
        amIThisRoundWinner ? (
          /* 2. 내가 당첨되었을 때 */
          <div className="space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-4 h-4" /> 당첨을 축하합니다!
            </div>
            <div className="text-base font-extrabold text-white">
              {getRankLabel(currentDraw?.currentWinner || participant.isWinner) ? `[${getRankLabel(currentDraw?.currentWinner || participant.isWinner)}] ` : ''}
              {currentDraw?.currentWinner?.prize || participant.isWinner?.prize}
            </div>

            {!participant.presenceConfirmed ? (
              <button
                onClick={onConfirmPresence}
                className="w-full py-3.5 rounded-xl text-black font-black text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                style={{ backgroundColor: themeCfg.accent }}
              >
                <ShieldCheck className="w-4 h-4" /> 저 현장에 있습니다 (출석 확인)
              </button>
            ) : (
              <div className="py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 출석 확인 완료! 무대로 나와주세요!
              </div>
            )}
          </div>
        ) : (
          /* 3. 다른 사람 당첨 시 */
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-zinc-400">
              {getRankLabel(currentDraw?.currentWinners?.[0] || currentDraw?.currentWinner || { rank: currentDraw?.currentRank ?? undefined, rankLabel: currentDraw?.currentRankLabel, hideRank: currentDraw?.currentHideRank }) ? `[${getRankLabel(currentDraw?.currentWinners?.[0] || currentDraw?.currentWinner || { rank: currentDraw?.currentRank ?? undefined, rankLabel: currentDraw?.currentRankLabel, hideRank: currentDraw?.currentHideRank })}] ` : ''}
              {currentDraw?.currentWinners && currentDraw.currentWinners.length > 1 ? `총 ${currentDraw.currentWinners.length}명 발표 완료` : '발표 완료'}
            </div>

            {currentDraw?.currentWinners && currentDraw.currentWinners.length > 1 ? (
              <div className="flex flex-wrap justify-center gap-1.5 my-2 max-h-28 overflow-y-auto p-1">
                {currentDraw.currentWinners.map((w) => (
                  <span
                    key={w.winnerNumber}
                    className="px-2 py-1 rounded-lg bg-white/10 text-white font-mono text-xs font-bold"
                  >
                    #{String(w.winnerNumber).padStart(3, '0')} {w.winnerName}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm font-extrabold text-white">
                당첨: #{String(currentDraw?.currentWinner?.winnerNumber).padStart(3, '0')} ({currentDraw?.currentWinner?.winnerName})
              </div>
            )}

            <p className="text-[11px] text-zinc-400">
              상품: {currentDraw?.currentWinner?.prize}
            </p>

            {/* 리액션 버튼 */}
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => onSendReaction('👏')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 transition active:scale-95 cursor-pointer"
              >
                👏 축하박수
              </button>
              <button
                onClick={() => onSendReaction('🔥')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 transition active:scale-95 cursor-pointer"
              >
                🔥 대박
              </button>
              <button
                onClick={() => onSendReaction('🎉')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 transition active:scale-95 cursor-pointer"
              >
                🎉 파티
              </button>
            </div>
          </div>
        )
      ) : (
        /* 4. 추첨 대기 모드 */
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>추첨 대기 중</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            호스트가 추첨을 시작하면 화면이 자동으로 전환됩니다.
          </p>
        </div>
      )}
    </div>
  );
};
