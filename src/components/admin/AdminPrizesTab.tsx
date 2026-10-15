'use client';

import React, { useState } from 'react';
import { Prize } from '@/types';
import { Trophy, Plus, Edit2, Trash2 } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getSocket } from '@/lib/socket';

interface AdminPrizesTabProps {
  prizes: Prize[];
  newPrizeTitle: string;
  setNewPrizeTitle: (title: string) => void;
  newPrizeRank: number;
  setNewPrizeRank: (rank: number) => void;
  onAddPrize: (e: React.FormEvent) => void;
  onDeletePrize: (id: string) => void;
}

export const AdminPrizesTab: React.FC<AdminPrizesTabProps> = ({
  prizes,
  newPrizeTitle,
  setNewPrizeTitle,
  newPrizeRank,
  setNewPrizeRank,
  onAddPrize,
  onDeletePrize,
}) => {
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editRank, setEditRank] = useState<number>(1);

  const handleSaveEditPrize = async (id: string) => {
    const updatedPrizes = prizes.map((p) => {
      if (p.id === id) {
        return { ...p, title: editTitle.trim(), rank: Number(editRank) };
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

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-zinc-700" /> 상품 목록 커스텀 설정
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-sans">
            등수와 상품명을 자유롭게 추가, 수정, 삭제하세요.
          </p>
        </div>
      </div>

      <form onSubmit={onAddPrize} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row gap-3">
        <div className="w-24">
          <label className="block text-[10px] font-bold text-zinc-500 mb-1">등수</label>
          <input
            type="number"
            value={newPrizeRank}
            onChange={(e) => setNewPrizeRank(parseInt(e.target.value, 10))}
            min={1}
            required
            className="w-full px-2 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-bold text-center focus:outline-none focus:border-zinc-900"
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
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 추가하기
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {prizes.map((p) => {
          const isEditing = editingPrizeId === p.id;

          return (
            <div
              key={p.id}
              className="p-3 rounded-xl bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
            >
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    value={editRank}
                    onChange={(e) => setEditRank(parseInt(e.target.value, 10))}
                    className="w-16 px-2 py-1 rounded bg-white border border-zinc-300 text-xs font-bold text-center"
                  />
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 px-3 py-1 rounded bg-white border border-zinc-300 text-xs"
                  />
                  <button
                    onClick={() => handleSaveEditPrize(p.id)}
                    className="px-3 py-1 rounded bg-zinc-900 text-white text-xs font-bold"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingPrizeId(null)}
                    className="px-2 py-1 rounded bg-zinc-100 text-xs text-zinc-600"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-xs font-bold">
                      {p.rank}등
                    </span>
                    <span className="text-xs font-bold text-zinc-900">{p.title}</span>
                    {p.winner && (
                      <span className="text-[11px] text-emerald-700 font-bold">
                        (당첨: #{p.winner.number} {p.winner.name})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingPrizeId(p.id);
                        setEditTitle(p.title);
                        setEditRank(p.rank);
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
