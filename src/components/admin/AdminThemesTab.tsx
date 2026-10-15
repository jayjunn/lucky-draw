'use client';

import React from 'react';
import { ThemeType } from '@/types';
import { Palette, Check, Save } from 'lucide-react';

interface AdminThemesTabProps {
  currentTheme?: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  eventNameInput: string;
  setEventNameInput: (name: string) => void;
  onSaveEventName: () => void;
}

export const AdminThemesTab: React.FC<AdminThemesTabProps> = ({
  currentTheme = 'HALLOWEEN',
  onThemeChange,
  eventNameInput,
  setEventNameInput,
  onSaveEventName,
}) => {
  const themes: { id: ThemeType; title: string; subtitle: string; desc: string; colors: string[] }[] = [
    {
      id: 'HALLOWEEN',
      title: '🎃 할로윈 애니버서리',
      subtitle: 'YUNTAKU 1ST PARTY',
      desc: '딥 바이올렛 배경 + 잭오랜턴 오렌지 & 형광 라임 네온 글로우',
      colors: ['#1A0B2E', '#FF7A00', '#E2F952', '#C084FC'],
    },
    {
      id: 'MONO',
      title: '🖤 미니멀 모노크롬',
      subtitle: 'MINIMAL OBSIDIAN',
      desc: '순수 무채색 옵시디언 블랙 & 화이트 (애플/토스 미니멀 감성)',
      colors: ['#0A0A0C', '#27272A', '#A1A1AA', '#FFFFFF'],
    },
    {
      id: 'CYBER',
      title: '⚡ 사이버펑크 네온',
      subtitle: 'CYBERPUNK SEOUL',
      desc: '심야 네온 시안 & 핫 핑크 일렉트릭 바이브',
      colors: ['#050814', '#00F0FF', '#FF0055', '#7928CA'],
    },
    {
      id: 'GOLD',
      title: '👑 VIP 골드 애니버서리',
      subtitle: 'LUXURY CHAMPAGNE',
      desc: '고급스러운 샴페인 골드 & 블랙 실크 텍스처',
      colors: ['#0D0B07', '#E5A93C', '#F3D382', '#A67C1E'],
    },
  ];

  return (
    <div className="space-y-5">
      {/* 테마 선택 패널 */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-purple-600" /> 엔드유저 비주얼 테마 선택
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              선택한 테마는 참가자 모바일 패스와 전광판 화면에 즉시 실시간으로 동기화 적용됩니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((t) => {
            const isSelected = currentTheme === t.id;

            return (
              <div
                key={t.id}
                className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/20 ring-2 ring-purple-600/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                      {t.subtitle}
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900">{t.title}</h4>
                    <p className="text-xs text-zinc-500 font-sans">{t.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 적용 중
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    {t.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => onThemeChange(t.id)}
                    disabled={isSelected}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-400 cursor-default'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm'
                    }`}
                  >
                    {isSelected ? '현재 테마' : '이 테마 적용'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 이벤트 설정 패널 */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900">이벤트 타이틀 및 정보 설정</h3>
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={eventNameInput}
            onChange={(e) => setEventNameInput(e.target.value)}
            placeholder="이벤트명 입력"
            className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-medium focus:outline-none focus:border-zinc-900"
          />
          <button
            onClick={onSaveEventName}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" /> 저장
          </button>
        </div>
      </div>
    </div>
  );
};
