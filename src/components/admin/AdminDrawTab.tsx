'use client';

import React from 'react';
import { Prize, Participant, DrawState, getRankLabel } from '@/types';
import { Dice5, Play, Sparkles, AlertTriangle, Clock, Users, Search, EyeOff } from 'lucide-react';

interface AdminDrawTabProps {
  prizes: Prize[];
  currentDraw?: DrawState | null;
  manualNumberInput: string;
  onSetManualNumberInput: (val: string) => void;
  onStartDraw: (rank: number, count?: number) => void;
  onAnnounceWinner: (rank: number, count?: number) => void;
  onRedrawAbsent: (rank: number) => void;
  onRedrawSpecificAbsent?: (rank: number, absentNumber: number) => void;
  batchCounts?: Record<number, number>;
  onSetBatchCount?: (rank: number, count: number) => void;
  onStartTimer: (seconds: number) => void;
  participants: Participant[];
  searchQuery: string;
  onSetSearchQuery: (val: string) => void;
  onUpdatePrizeRankConfig?: (prizeId: string, rankLabel?: string, hideRank?: boolean) => void;
}

export const AdminDrawTab: React.FC<AdminDrawTabProps> = ({
  prizes,
  currentDraw,
  manualNumberInput,
  onSetManualNumberInput,
  onStartDraw,
  onAnnounceWinner,
  onRedrawAbsent,
  onRedrawSpecificAbsent,
  batchCounts,
  onSetBatchCount,
  onStartTimer,
  participants,
  searchQuery,
  onSetSearchQuery,
}) => {
  const sortedPrizes = [...prizes].sort((a, b) => b.rank - a.rank);

  const filteredParticipants = participants.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || String(p.number).includes(q);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* 좌측: 단계별 추첨 제어 */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Dice5 className="w-4 h-4" /> 단계별 추첨 & 일괄 추첨 제어
              </h2>
              <span className="text-[11px] text-zinc-400 font-sans">
                인원수를 설정하여 1번에 여러 명을 동시 롤링 및 발표할 수 있습니다.
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-sans hidden sm:inline">
              순서대로 발표
            </span>
          </div>

          <div className="space-y-3">
            {sortedPrizes.map((prize) => {
              const hasMultipleWinners = Boolean(prize.winners && prize.winners.length > 1);
              const isWon = Boolean(prize.winner || (prize.winners && prize.winners.length > 0));
              const isCurrent = currentDraw?.currentRank === prize.rank;
              const isRoulette = isCurrent && currentDraw?.phase === 'ROULETTE';
              const absentCount = prize.absentHistory?.length || 0;
              const currentBatchCount = batchCounts?.[prize.rank] || prize.count || 1;
              const rankBadge = getRankLabel(prize);

              return (
                <div
                  key={prize.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isWon
                      ? 'bg-zinc-50 border-zinc-200'
                      : isCurrent
                      ? 'bg-white border-zinc-900 shadow-md ring-1 ring-zinc-900'
                      : 'bg-white border-zinc-200'
                  }`}
                >
                  {/* 1. 상단: 상품 기본 정보 및 상태 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {prize.hideRank ? (
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-400 border border-dashed border-zinc-300 text-[11px] font-bold shrink-0 flex items-center gap-1">
                          <EyeOff className="w-3 h-3 text-zinc-400" /> 등수 숨김
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-900 text-xs font-black shrink-0">
                          {rankBadge || `${prize.rank}등`}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-zinc-900 truncate">
                        {prize.title}
                      </h4>
                    </div>

                    {/* 단일 당첨자일 때 당첨자 요약 뱃지 */}
                    {isWon && !hasMultipleWinners && prize.winner ? (
                      <div className="flex items-center gap-1.5 shrink-0 text-xs">
                        <span className="font-bold text-zinc-800 font-mono">
                          #{String(prize.winner.number).padStart(3, '0')} {prize.winner.name}
                        </span>
                        {prize.winner.confirmed ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            출석확인됨
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            출석대기
                          </span>
                        )}
                      </div>
                    ) : !isWon ? (
                      <span className="text-[11px] text-zinc-400 font-sans shrink-0">추첨 대기</span>
                    ) : null}
                  </div>

                  {/* 2. 하단: 추첨 조작 바 (추첨 전) */}
                  {!isWon && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
                      {/* 좌측: 인원 설정 */}
                      {onSetBatchCount && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-zinc-500 shrink-0">인원</span>
                          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                            <button
                              onClick={() => onSetBatchCount(prize.rank, Math.max(1, currentBatchCount - 1))}
                              className="w-5 h-5 rounded bg-white text-zinc-700 text-xs font-bold flex items-center justify-center hover:bg-zinc-200 shadow-xs cursor-pointer"
                              title="1명 감소"
                            >
                              -
                            </button>
                            <span className="w-9 text-center text-xs font-bold text-zinc-800 font-mono">
                              {currentBatchCount}명
                            </span>
                            <button
                              onClick={() => onSetBatchCount(prize.rank, currentBatchCount + 1)}
                              className="w-5 h-5 rounded bg-white text-zinc-700 text-xs font-bold flex items-center justify-center hover:bg-zinc-200 shadow-xs cursor-pointer"
                              title="1명 증가"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex gap-1 ml-1 border-l border-zinc-200 pl-1.5">
                            {[1, 2, 3, 5].map((cnt) => (
                              <button
                                key={cnt}
                                data-testid={`batch-preset-${cnt}`}
                                aria-label={`${cnt}명 설정`}
                                onClick={() => onSetBatchCount(prize.rank, cnt)}
                                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition cursor-pointer ${
                                  currentBatchCount === cnt
                                    ? 'bg-zinc-900 text-white shadow-xs'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                              >
                                {cnt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 우측: 롤링 & 발표 버튼 (나란히 정렬, 절대 줄바꿈 없음) */}
                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <button
                          onClick={() => onStartDraw(prize.rank, currentBatchCount)}
                          disabled={isRoulette}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                            isRoulette
                              ? 'bg-zinc-900 text-white animate-pulse'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          {isRoulette
                            ? currentBatchCount > 1
                              ? `${currentBatchCount}명 롤링 중`
                              : '롤링 중'
                            : currentBatchCount > 1
                            ? `${currentBatchCount}명 롤링`
                            : '1. 롤링'}
                        </button>

                        <button
                          onClick={() => onAnnounceWinner(prize.rank, currentBatchCount)}
                          className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          {currentBatchCount > 1 ? `${currentBatchCount}명 발표` : '2. 발표'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. 단일 당첨자 관리 바 (추첨 후) */}
                  {isWon && !hasMultipleWinners && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-200/60 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onRedrawAbsent(prize.rank)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                        title="자리에 없으면 실격 처리하고 즉시 다음 사람을 뽑습니다"
                      >
                        <AlertTriangle className="w-3 h-3" /> 부재중 재추첨
                      </button>

                      <button
                        onClick={() => onStartTimer(30)}
                        className="px-2 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Clock className="w-3 h-3 text-red-500" /> 30s
                      </button>
                    </div>
                  )}

                  {/* 다중 당첨자 목록 및 개별 출석 확인 / 재추첨 컨트롤 */}
                  {isWon && hasMultipleWinners && prize.winners && (
                    <div className="mt-3 pt-3 border-t border-zinc-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-700">
                        <span>🎉 총 {prize.winners.length}명 일괄 당첨 완료</span>
                        <button
                          onClick={() => onStartTimer(30)}
                          className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-[11px] font-bold text-zinc-700 transition flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-red-500" /> 30s 호명 타이머
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {prize.winners.map((w) => (
                          <div
                            key={w.number}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200 shadow-xs text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-black font-mono text-zinc-900">
                                #{String(w.number).padStart(3, '0')}
                              </span>
                              <span className="font-semibold text-zinc-800 truncate">{w.name}</span>
                              {w.confirmed ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  출석확인됨
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                                  출석대기
                                </span>
                              )}
                            </div>

                            {onRedrawSpecificAbsent && (
                              <button
                                onClick={() => onRedrawSpecificAbsent(prize.rank, w.number)}
                                className="ml-2 px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold border border-red-200 transition shrink-0"
                                title="해당 당첨자 부재 시 실격 처리하고 1명 재추첨"
                              >
                                부재 재추첨
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {absentCount > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-zinc-200/60 text-[10px] text-red-600">
                      부재 실격 ({absentCount}명):{' '}
                      {prize.absentHistory?.map((a) => `#${a.number} ${a.name}`).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
            <span className="font-bold text-zinc-700 text-[11px]">(선택사항) 특정 번호 지정 추첨</span>
            <div className="flex gap-2">
              <input
                type="number"
                value={manualNumberInput}
                onChange={(e) => onSetManualNumberInput(e.target.value)}
                placeholder="비워두면 무작위 추첨됩니다"
                className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
              />
              {manualNumberInput && (
                <button
                  onClick={() => onSetManualNumberInput('')}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-200 text-zinc-700 text-xs"
                >
                  지우기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 우측: 참가자 리스트 */}
      <div className="lg:col-span-5 xl:col-span-4 space-y-4">
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-zinc-700" /> 입장 플레이어
            </h3>
            <span className="text-xs font-bold text-zinc-600">
              총 {filteredParticipants.length}명
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSetSearchQuery(e.target.value)}
              placeholder="이름 또는 번호 검색"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-medium focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
            {filteredParticipants.map((p) => {
              const isWinner = Boolean(p.isWinner);
              const isAbsent = p.status === 'ABSENT';

              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition ${
                    isAbsent
                      ? 'bg-zinc-100 border-zinc-200 opacity-60'
                      : isWinner
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white border-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold w-10 font-mono ${isWinner ? 'text-white' : 'text-zinc-900'}`}>
                      #{String(p.number).padStart(3, '0')}
                    </span>
                    <div>
                      <span className="font-bold">{p.name}</span>
                      {isWinner && p.isWinner && (
                        <p className="text-[10px] text-zinc-300">
                          ★ {getRankLabel(p.isWinner) ? `${getRankLabel(p.isWinner)} 당첨` : '당첨'} ({p.isWinner.prize})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAbsent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">
                        부재
                      </span>
                    )}
                    {p.presenceConfirmed && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        출석확인
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
