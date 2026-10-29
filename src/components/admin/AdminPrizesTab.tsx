'use client';

import React, { useState } from 'react';
import { Prize, getRankLabel, getAdminPrizeLabel, getTagColorClass } from '@/types';
import { Trophy, Plus, Edit2, Trash2, EyeOff, Tag, ShieldCheck } from 'lucide-react';
import { getFirebaseDb, EVENT_DOC_PATH, sanitizeForFirestore, editPrizeDirect } from '@/lib/firebase';
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
  newPrizeAdminTag?: string;
  setNewPrizeAdminTag?: (tag: string) => void;
  newPrizeTagColor?: string;
  setNewPrizeTagColor?: (color: string) => void;
  onAddPrize: (e: React.FormEvent) => void;
  onDeletePrize: (id: string) => void;
  onUpdatePrizeRankConfig?: (prizeId: string, rankLabel?: string, hideRank?: boolean, adminTag?: string, tagColor?: string) => void;
}

const RANK_LABEL_PRESETS = ['1등', '2등', '3등', '대상', '최우수상', '우수상', '특별상', '행운상', '참가상'];
const TAG_PRESETS = [
  { label: '30일', color: 'blue' },
  { label: '31일', color: 'purple' },
  { label: '10/30', color: 'blue' },
  { label: '10/31', color: 'purple' },
  { label: '1부', color: 'emerald' },
  { label: '2부', color: 'amber' },
];

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
  newPrizeAdminTag = '',
  setNewPrizeAdminTag,
  newPrizeTagColor = '',
  setNewPrizeTagColor,
  onAddPrize,
  onDeletePrize,
  onUpdatePrizeRankConfig,
}) => {
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editRank, setEditRank] = useState<number>(1);
  const [editRankLabel, setEditRankLabel] = useState<string>('');
  const [editHideRank, setEditHideRank] = useState<boolean>(false);
  const [editAdminTag, setEditAdminTag] = useState<string>('');
  const [editTagColor, setEditTagColor] = useState<string>('');

  const handleSaveEditPrize = async (id: string) => {
    try {
      const updatedPrizes = await editPrizeDirect(id, {
        title: editTitle.trim(),
        rank: Number(editRank),
        rankLabel: editRankLabel.trim() || undefined,
        hideRank: Boolean(editHideRank),
        adminTag: editAdminTag.trim() || undefined,
        tagColor: editTagColor.trim() || undefined,
      });
      const socket = getSocket();
      socket.emit('admin_update_prizes', updatedPrizes);
    } catch (e) {
      console.warn('상품 수정 실패:', e);
    }
    setEditingPrizeId(null);
  };

  const handleToggleHideRank = async (prize: Prize) => {
    const newHide = !prize.hideRank;
    if (onUpdatePrizeRankConfig) {
      await onUpdatePrizeRankConfig(prize.id, prize.rankLabel, newHide, prize.adminTag, prize.tagColor);
    } else {
      const updatedPrizes = prizes.map((p) =>
        p.id === prize.id ? { ...p, hideRank: newHide } : p
      );
      try {
        const firestore = getFirebaseDb();
        await updateDoc(doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]), sanitizeForFirestore({
          prizes: updatedPrizes,
          updatedAt: serverTimestamp(),
        }));
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
          <p className="text-xs text-zinc-500 mt-0.5 font-sans">
            등수와 상품명을 자유롭게 추가/수정하고, <span className="font-bold text-zinc-800">30일/31일 구분 태그(관리자 전용)</span> 및 등수 숨김을 설정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 상품 추가 폼 */}
      <form onSubmit={onAddPrize} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-2">
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

          <div className="sm:col-span-3">
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

          {/* 새로 추가된 칸: 구분 태그 (관리자 전용) */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-purple-700 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> 구분 태그 <span className="text-[9px] text-zinc-400 font-normal">(관리자만 보임)</span>
            </label>
            <input
              type="text"
              value={newPrizeAdminTag}
              onChange={(e) => {
                setNewPrizeAdminTag && setNewPrizeAdminTag(e.target.value);
                if (e.target.value.includes('30') && setNewPrizeTagColor) setNewPrizeTagColor('blue');
                else if (e.target.value.includes('31') && setNewPrizeTagColor) setNewPrizeTagColor('purple');
              }}
              placeholder="예: 30일, 31일"
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-600 placeholder:text-zinc-300"
            />
          </div>

          <div className="sm:col-span-4 flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">상품명</label>
              <input
                type="text"
                value={newPrizeTitle}
                onChange={(e) => setNewPrizeTitle(e.target.value)}
                placeholder="예: 다이슨 에어랩, 와인"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> 추가하기
              </button>
            </div>
          </div>
        </div>

        {/* 옵션 & 빠른 프리셋 */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-200/80 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-0.5">
                <Tag className="w-2.5 h-2.5 text-purple-600" /> 태그:
              </span>
              {TAG_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    if (setNewPrizeAdminTag) setNewPrizeAdminTag(p.label);
                    if (setNewPrizeTagColor) setNewPrizeTagColor(p.color);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-white border border-zinc-200 hover:border-purple-300 text-zinc-700 hover:text-purple-700 transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 pl-3 border-l border-zinc-200">
              <span className="text-[10px] font-bold text-zinc-400">라벨:</span>
              {RANK_LABEL_PRESETS.slice(0, 5).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (setNewPrizeRankLabel) setNewPrizeRankLabel(preset);
                    if (setNewPrizeHideRank) setNewPrizeHideRank(false);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 transition cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newPrizeHideRank}
              onChange={(e) => setNewPrizeHideRank && setNewPrizeHideRank(e.target.checked)}
              className="rounded text-zinc-900 focus:ring-zinc-900"
            />
            <span>등수/라벨 숨기기 (전광판/참가자에겐 상품명만 노출)</span>
          </label>
        </div>
      </form>

      {/* 안내 문구 (깔끔한 미니멀 스타일) */}
      <div className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200/80 text-[11px] text-zinc-600 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span><b>관리자 안내:</b> 등수 숨김을 켜더라도 관리자 콘솔에서는 원래 순서와 구분 태그가 항상 표시됩니다. (전광판 및 모바일 화면에만 비공개)</span>
        </span>
      </div>

      {/* 등록된 상품 목록 */}
      <div className="space-y-2">
        {prizes.map((p) => {
          const isEditing = editingPrizeId === p.id;
          const adminDisplayBadge = getAdminPrizeLabel(p);

          return (
            <div
              key={p.id}
              className="p-3 rounded-xl bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
            >
              {isEditing ? (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <span className="text-[11px] text-zinc-500 font-bold shrink-0">순서</span>
                      <input
                        type="number"
                        value={editRank}
                        onChange={(e) => setEditRank(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1 rounded bg-white border border-zinc-300 text-xs font-bold text-center"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <span className="text-[11px] text-zinc-500 font-bold shrink-0">명칭</span>
                      <input
                        type="text"
                        value={editRankLabel}
                        onChange={(e) => setEditRankLabel(e.target.value)}
                        placeholder="예: 대상"
                        disabled={editHideRank}
                        className="w-full px-2 py-1 rounded bg-white border border-zinc-300 text-xs font-medium disabled:bg-zinc-100 disabled:text-zinc-400"
                      />
                    </div>
                    {/* 수정 시 구분 태그 칸 */}
                    <div className="sm:col-span-3 flex items-center gap-1">
                      <span className="text-[11px] text-purple-700 font-bold shrink-0">태그</span>
                      <input
                        type="text"
                        value={editAdminTag}
                        onChange={(e) => {
                          setEditAdminTag(e.target.value);
                          if (e.target.value.includes('30')) setEditTagColor('blue');
                          else if (e.target.value.includes('31')) setEditTagColor('purple');
                        }}
                        placeholder="예: 30일, 31일"
                        className="w-full px-2 py-1 rounded bg-white border border-purple-300 text-xs font-bold text-purple-900"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="상품명"
                        className="w-full px-2.5 py-1 rounded bg-white border border-zinc-300 text-xs font-medium"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleSaveEditPrize(p.id)}
                        className="px-2.5 py-1 rounded bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
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
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-purple-600 font-bold">태그 선택:</span>
                      {TAG_PRESETS.map((tp) => (
                        <button
                          key={tp.label}
                          type="button"
                          onClick={() => {
                            setEditAdminTag(tp.label);
                            setEditTagColor(tp.color);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 hover:bg-purple-100 text-zinc-700"
                        >
                          {tp.label}
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
                      <span>등수 숨기기 (전광판/참가자 비공개)</span>
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 1. 관리자 전용 구분 태그 배지 */}
                    {p.adminTag && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs border font-bold ${getTagColorClass(
                          p.adminTag,
                          p.tagColor
                        )}`}
                        title="관리자 전용 태그 (전광판/참가자에겐 노출되지 않습니다)"
                      >
                        {p.adminTag}
                      </span>
                    )}

                    {/* 2. 관리자용 등수 배지 (언제나 식별 가능) */}
                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-white text-xs font-bold">
                      {adminDisplayBadge || `${p.rank}등`}
                    </span>

                    {/* 3. 등수 숨김 상태 표시 배지 */}
                    {p.hideRank && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1" title="전광판과 참가자 화면에는 등수가 숨겨져 상품명만 표시됩니다">
                        <EyeOff className="w-3 h-3 text-amber-600" /> 등수 숨김 (화면 비공개)
                      </span>
                    )}

                    <span className="text-xs font-bold text-zinc-900">{p.title}</span>

                    <span className="text-[10px] text-zinc-400">
                      (순서: #{p.rank})
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
                      title={p.hideRank ? '등수 표시로 변경' : '전광판/참가자에게 등수 숨기기'}
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>{p.hideRank ? '화면 표시로 변경' : '화면 숨김으로 변경'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingPrizeId(p.id);
                        setEditTitle(p.title);
                        setEditRank(p.rank);
                        setEditRankLabel(p.rankLabel || '');
                        setEditHideRank(Boolean(p.hideRank));
                        setEditAdminTag(p.adminTag || '');
                        setEditTagColor(p.tagColor || '');
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
