'use client';

import React, { useState, useEffect } from 'react';
import { EventNoticeConfig } from '@/types';
import { DEFAULT_EVENT_NOTICE, updateEventNoticeDirect } from '@/lib/firebase';
import { Instagram, Image, Calendar, MapPin, Wine, Gift, Save, CheckCircle2, RotateCcw } from 'lucide-react';

interface AdminNoticeTabProps {
  currentNotice?: EventNoticeConfig;
}

export const AdminNoticeTab: React.FC<AdminNoticeTabProps> = ({ currentNotice }) => {
  const [form, setForm] = useState<EventNoticeConfig>({
    ...DEFAULT_EVENT_NOTICE,
    ...(currentNotice || {}),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentNotice) {
      setForm((prev) => ({
        ...prev,
        ...currentNotice,
      }));
    }
  }, [currentNotice]);

  const handleChange = (field: keyof EventNoticeConfig, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateEventNoticeDirect(form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('공지사항 저장 실패:', err);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('기본 윤타쿠 1주년 공지 내용으로 초기화하시겠습니까?')) {
      setForm(DEFAULT_EVENT_NOTICE);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <span className="text-base">📢</span> 파티 공지 및 인스타그램 실시간 커스텀
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-sans">
            여기서 수정한 내용과 링크는 참가자 모바일 티켓과 공지 모달에 즉시 동기화됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-bold transition flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> 기본값 복원
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* 1. 인스타그램 연동 */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
          <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 uppercase font-mono">
            <Instagram className="w-4 h-4 text-pink-500" /> 인스타그램 연동 설정
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">인스타그램 프로필 URL</label>
              <input
                type="url"
                value={form.instagramUrl}
                onChange={(e) => handleChange('instagramUrl', e.target.value)}
                placeholder="https://www.instagram.com/yuntaku.seoul"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">인스타그램 핸들명</label>
              <input
                type="text"
                value={form.instagramHandle}
                onChange={(e) => handleChange('instagramHandle', e.target.value)}
                placeholder="@yuntaku.seoul"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>
        </div>

        {/* 2. 포스터 이미지 & 메인 타이틀 */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
          <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 uppercase font-mono">
            <Image className="w-4 h-4 text-orange-500" /> 포스터 & 공지 타이틀
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">포스터 이미지 URL</label>
              <input
                type="text"
                value={form.posterImageUrl}
                onChange={(e) => handleChange('posterImageUrl', e.target.value)}
                placeholder="/images/poster.jpg 또는 외부 이미지 URL"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
              <span className="text-[9px] text-zinc-400 mt-0.5 block font-sans">
                기본 로컬 이미지(/images/poster.jpg) 또는 인스타그램 이미지 URL
              </span>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">공지 헤더 타이틀</label>
              <input
                type="text"
                value={form.noticeTitle}
                onChange={(e) => handleChange('noticeTitle', e.target.value)}
                placeholder="🎃 HALLOWEEN × 1st ANNIVERSARY 🎉"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>
        </div>

        {/* 3. 행사 주요 안내 항목 */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
          <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 uppercase font-mono">
            <Calendar className="w-4 h-4 text-purple-500" /> 파티 주요 스펙 정보
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">일시 (DATE)</label>
              <input
                type="text"
                value={form.eventDate}
                onChange={(e) => handleChange('eventDate', e.target.value)}
                placeholder="10.30 FRI — 10.31 SAT"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">입장료 및 혜택 (ENTRY FEE)</label>
              <input
                type="text"
                value={form.entryFee}
                onChange={(e) => handleChange('entryFee', e.target.value)}
                placeholder="25,000 KRW (데킬라/보드카 무제한)"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">럭키드로우 안내 (LUCKY DRAW)</label>
              <input
                type="text"
                value={form.luckyDrawInfo}
                onChange={(e) => handleChange('luckyDrawInfo', e.target.value)}
                placeholder="1인 1회, 20가지 넘는 선물"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1">장소 위치 (LOCATION)</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="서울 중구 을지로18길 25-2, 4F (을지로 윤타쿠)"
                required
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>
        </div>

        {/* 4. 전체 공지 상세 본문 */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
          <label className="block text-xs font-bold text-zinc-800 uppercase font-mono">
            전체 공지 상세 본문 텍스트 (줄바꿈 지원)
          </label>
          <textarea
            rows={8}
            value={form.noticeFullText}
            onChange={(e) => handleChange('noticeFullText', e.target.value)}
            placeholder="상세 공지 텍스트를 입력하세요..."
            className="w-full p-3 rounded-lg bg-white border border-zinc-300 text-xs font-sans leading-relaxed focus:outline-none focus:border-zinc-900"
          />
        </div>

        {/* 저장 버튼 */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 font-mono animate-bounce">
              <CheckCircle2 className="w-4 h-4" /> 실시간 저장 완료!
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? '저장 중...' : '공지 설정 전체 저장하기'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
