'use client';

import React from 'react';
import { Prize, Participant, DrawState } from '@/types';
import { Dice5, Play, Sparkles, AlertTriangle, Clock, Users, Search } from 'lucide-react';

interface AdminDrawTabProps {
  prizes: Prize[];
  currentDraw?: DrawState | null;
  manualNumberInput: string;
  onSetManualNumberInput: (val: string) => void;
  onStartDraw: (rank: number) => void;
  onAnnounceWinner: (rank: number) => void;
  onRedrawAbsent: (rank: number) => void;
  onStartTimer: (seconds: number) => void;
  participants: Participant[];
  searchQuery: string;
  onSetSearchQuery: (val: string) => void;
}

export const AdminDrawTab: React.FC<AdminDrawTabProps> = ({
  prizes,
  currentDraw,
  manualNumberInput,
  onSetManualNumberInput,
  onStartDraw,
  onAnnounceWinner,
  onRedrawAbsent,
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
      <div className="lg:col-span-7 space-y-4">
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
              <Dice5 className="w-4 h-4" /> 단계별 추첨 & 현장 부재자 처리
            </h2>
            <span className="text-[11px] text-zinc-400 font-sans">
              5등부터 차례대로 발표
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedPrizes.map((prize) => {
              const isWon = Boolean(prize.winner);
              const isCurrent = currentDraw?.currentRank === prize.rank;
              const isRoulette = isCurrent && currentDraw?.phase === 'ROULETTE';
              const absentCount = prize.absentHistory?.length || 0;

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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-xs font-bold">
                        {prize.rank}등
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">{prize.title}</h4>
                        {isWon && prize.winner ? (
                          <div className="flex items-center gap-2 mt-0.5 text-xs">
                            <span className="font-bold text-zinc-800 font-mono">
                              당첨: #{String(prize.winner.number).padStart(3, '0')} ({prize.winner.name})
                            </span>
                            {prize.winner.confirmed ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                출석확인됨
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500 animate-pulse">
                                출석대기
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-zinc-400 font-sans">추첨 대기</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isWon ? (
                        <>
                          <button
                            onClick={() => onStartDraw(prize.rank)}
                            disabled={isRoulette}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              isRoulette
                                ? 'bg-zinc-900 text-white animate-pulse'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                            }`}
                          >
                            <Play className="w-3 h-3" />
                            {isRoulette ? '롤링 중' : '1. 롤링'}
                          </button>

                          <button
                            onClick={() => onAnnounceWinner(prize.rank)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <Sparkles className="w-3 h-3" /> 2. 발표
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onRedrawAbsent(prize.rank)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                            title="자리에 없으면 실격 처리하고 즉시 다음 사람을 뽑습니다"
                          >
                            <AlertTriangle className="w-3 h-3" /> 부재중 재추첨
                          </button>

                          <button
                            onClick={() => onStartTimer(30)}
                            className="px-2 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3 text-red-500" /> 30s
                          </button>
                        </>
                      )}
                    </div>
                  </div>

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
      <div className="lg:col-span-5 space-y-4">
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
                          ★ {p.isWinner.rank}등 당첨 ({p.isWinner.prize})
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
