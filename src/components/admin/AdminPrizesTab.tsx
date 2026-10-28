'use client';

import React, { useState } from 'react';
import { Prize, getRankLabel } from '@/types';
import { Trophy, Plus, Edit2, Trash2, EyeOff } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getSocket } from '@/lib/socket';

interface AdminPrizesTabProps {
  prizes: Prize[];
  newPrizeTitle: string;
  setNewPrizeTitle: (title: string) => void;
  newPrizeRank: number;
  setNewPrizeRank: (rank: number) => void;
  newPrizeRankLabel?: string;
  setNewPrizeRankLabel?: (label: string) => void;
  newPrizeHideRank?: boolean;
  setNewPrizeHideRank?: (hide: boolean) => void;
  onAddPrize: (e: React.FormEvent) => void;
  onDeletePrize: (id: string) => void;
  onUpdatePrizeRankConfig?: (prizeId: string, rankLabel?: string, hideRank?: boolean) => void;
}

const RANK_LABEL_PRESETS = ['1등', '2등', '3등', '대상', '최우수상', '우수상', '특별상', '행운상', '참가상'];

export const AdminPrizesTab: React.FC<AdminPrizesTabProps> = ({
  prizes,
  newPrizeTitle,
  setNewPrizeTitle,
  newPrizeRank,
  setNewPrizeRank,
  newPrizeRankLabel = '',
  setNewPrizeRankLabel,
  newPrizeHideRank = false,
  setNewPrizeHideRank,
  onAddPrize,
  onDeletePrize,
  onUpdatePrizeRankConfig,
}) => {
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editRank, setEditRank] = useState<number>(1);
  const [editRankLabel, setEditRankLabel] = useState<string>('');
  const [editHideRank, setEditHideRank] = useState<boolean>(false);

  const handleSaveEditPrize = async (id: string) => {
    const updatedPrizes = prizes.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          title: editTitle.trim(),
          rank: Number(editRank),
          rankLabel: editRankLabel.trim() || undefined,
          hideRank: Boolean(editHideRank),
        };
      }
      return p;
    });

    try {
      const firestore = getFirebaseDb();
      await updateDoc(doc(firestore, 'lucky_draw_events', 'current_event'), {
        prizes: updatedPrizes,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn(e);
    }

    const socket = getSocket();
    socket.emit('admin_update_prizes', updatedPrizes);
    setEditingPrizeId(null);
  };

  const handleToggleHideRank = async (prize: Prize) => {
    const newHide = !prize.hideRank;
    if (onUpdatePrizeRankConfig) {
      await onUpdatePrizeRankConfig(prize.id, prize.rankLabel, newHide);
    } else {
      const updatedPrizes = prizes.map((p) =>
        p.id === prize.id ? { ...p, hideRank: newHide } : p
      );
      try {
        const firestore = getFirebaseDb();
        await updateDoc(doc(firestore, 'lucky_draw_events', 'current_event'), {
          prizes: updatedPrizes,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn(e);
      }
      getSocket().emit('admin_update_prizes', updatedPrizes);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-zinc-700" /> 상품 목록 커스텀 설정
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-sans">
            등수(또는 대상/특별상 등 맞춤 명칭)와 상품명을 자유롭게 추가, 수정하고 등수 숨김을 설정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 상품 추가 폼 */}
      <form onSubmit={onAddPrize} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-24">
            <label className="block text-[10px] font-bold text-zinc-500 mb-1">추첨 순서</label>
            <input
              type="number"
              value={newPrizeRank}
              onChange={(e) => setNewPrizeRank(parseInt(e.target.value, 10) || 1)}
              min={1}
              required
              className="w-full px-2 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-center focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div className="w-36">
            <label className="block text-[10px] font-bold text-zinc-500 mb-1">
              표시 명칭 <span className="text-zinc-400 font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={newPrizeRankLabel}
              onChange={(e) => setNewPrizeRankLabel && setNewPrizeRankLabel(e.target.value)}
              placeholder="예: 대상, 특별상"
              disabled={newPrizeHideRank}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-400"
            />
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-500 mb-1">상품명</label>
            <input
              type="text"
              value={newPrizeTitle}
              onChange={(e) => setNewPrizeTitle(e.target.value)}
              placeholder="예: 다이슨 에어랩, 배달의민족 5만원권"
              required
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> 추가하기
            </button>
          </div>
        </div>

        {/* 옵션 & 빠른 프리셋 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-200/60 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">명칭 추천:</span>
            {RANK_LABEL_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (setNewPrizeRankLabel) setNewPrizeRankLabel(preset);
                  if (setNewPrizeHideRank) setNewPrizeHideRank(false);
                }}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 transition"
              >
                {preset}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newPrizeHideRank}
              onChange={(e) => setNewPrizeHideRank && setNewPrizeHideRank(e.target.checked)}
              className="rounded text-zinc-900 focus:ring-zinc-900"
            />
            <span>등수/라벨 숨기기 (상품명만 표시)</span>
          </label>
        </div>
      </form>

      {/* 등록된 상품 목록 */}
      <div className="space-y-2">
        {prizes.map((p) => {
          const isEditing = editingPrizeId === p.id;
          const displayBadge = getRankLabel(p);

          return (
            <div
              key={p.id}
              className="p-3 rounded-xl bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
            >
              {isEditing ? (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-zinc-500 font-bold">순서</span>
                      <input
                        type="number"
                        value={editRank}
                        onChange={(e) => setEditRank(parseInt(e.target.value, 10) || 1)}
                        className="w-14 px-2 py-1 rounded bg-white border border-zinc-300 text-xs font-bold text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-zinc-500 font-bold">명칭</span>
                      <input
                        type="text"
                        value={editRankLabel}
                        onChange={(e) => setEditRankLabel(e.target.value)}
                        placeholder="예: 대상, 특별상"
                        disabled={editHideRank}
                        className="w-28 px-2.5 py-1 rounded bg-white border border-zinc-300 text-xs font-medium disabled:bg-zinc-100 disabled:text-zinc-400"
                      />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="상품명"
                        className="w-full px-3 py-1 rounded bg-white border border-zinc-300 text-xs font-medium"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveEditPrize(p.id)}
                      className="px-3 py-1 rounded bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingPrizeId(null)}
                      className="px-2 py-1 rounded bg-zinc-100 text-xs text-zinc-600 hover:bg-zinc-200"
                    >
                      취소
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-zinc-400 font-bold">추천:</span>
                      {RANK_LABEL_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setEditRankLabel(preset);
                            setEditHideRank(false);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editHideRank}
                        onChange={(e) => setEditHideRank(e.target.checked)}
                        className="rounded text-zinc-900 focus:ring-zinc-900"
                      />
                      <span>등수/라벨 숨기기</span>
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {p.hideRank ? (
                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-400 border border-dashed border-zinc-300 text-[11px] font-bold flex items-center gap-1">
                        <EyeOff className="w-3 h-3 text-zinc-400" /> 등수 숨김
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-zinc-900 text-white text-xs font-bold">
                        {displayBadge || `${p.rank}등`}
                      </span>
                    )}

                    <span className="text-xs font-bold text-zinc-900">{p.title}</span>

                    <span className="text-[10px] text-zinc-400">
                      (추첨순서: #{p.rank})
                    </span>

                    {p.winner && (
                      <span className="text-[11px] text-emerald-700 font-bold">
                        (당첨: #{p.winner.number} {p.winner.name})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleHideRank(p)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 border ${
                        p.hideRank
                          ? 'bg-zinc-800 text-white border-zinc-800 hover:bg-zinc-700'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}
                      title={p.hideRank ? '등수 표시로 변경' : '등수 숨김으로 변경'}
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>{p.hideRank ? '등수 표시' : '등수 숨기기'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingPrizeId(p.id);
                        setEditTitle(p.title);
                        setEditRank(p.rank);
                        setEditRankLabel(p.rankLabel || '');
                        setEditHideRank(Boolean(p.hideRank));
                      }}
                      className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-[11px] font-bold text-zinc-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> 수정
                    </button>
                    <button
                      onClick={() => onDeletePrize(p.id)}
                      className="p-1 rounded text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
