'use client';

import React from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminPinLock } from '@/components/admin/AdminPinLock';
import { AdminDrawTab } from '@/components/admin/AdminDrawTab';
import { AdminPrizesTab } from '@/components/admin/AdminPrizesTab';
import { AdminThemesTab } from '@/components/admin/AdminThemesTab';
import { AdminNoticeTab } from '@/components/admin/AdminNoticeTab';
import { 
  Settings, 
  Database, 
  Palette, 
  ExternalLink, 
  Download, 
  RotateCcw, 
  AlertTriangle, 
  Dice5, 
  Trophy, 
  Lock 
} from 'lucide-react';

export default function AdminPage() {
  const {
    appState,
    activeTab,
    setActiveTab,
    isUnlocked,
    handleUnlock,
    handleLock,
    manualNumberInput,
    setManualNumberInput,
    searchQuery,
    setSearchQuery,
    eventNameInput,
    setEventNameInput,
    newPrizeTitle,
    setNewPrizeTitle,
    newPrizeRank,
    setNewPrizeRank,
    handleStartDraw,
    handleAnnounceWinner,
    handleRedrawAbsent,
    handleStartTimer,
    handleGenerateDummies,
    handleResetDraws,
    handleResetAll,
    handleAddPrize,
    handleDeletePrize,
    handleThemeChange,
    handleSaveEventName,
  } = useAdmin();

  // PIN 번호 잠금 화면
  if (!isUnlocked) {
    return <AdminPinLock onUnlock={handleUnlock} correctPin="7777" />;
  }

  const prizes = appState?.prizes || [];
  const participants = appState?.participants || [];
  const currentDraw = appState?.drawState;
  const winnersCount = prizes.filter((p) => p.winner).length;

  const handleDownloadLogs = () => {
    if (!appState) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `lucky_draw_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F4F5] text-zinc-900 p-5 lg:p-8 font-mono pb-28">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* 상단 관리자 헤더 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  ADMIN CONSOLE
                </span>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Database className="w-3 h-3" /> Firestore 실시간 동기화
                </span>
              </div>
              <h1 className="text-lg font-bold text-zinc-900 mt-0.5">
                {appState?.eventName || 'LUCKY DRAW'} MANAGEMENT
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('themes')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm border bg-zinc-900 text-white hover:bg-zinc-800"
            >
              <Palette className="w-3 h-3 text-purple-300" />
              <span>테마: {appState?.theme || 'HALLOWEEN'}</span>
            </button>

            <a
              href="/"
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-zinc-900 text-xs font-bold text-zinc-700 transition flex items-center gap-1 shadow-sm"
            >
              모바일 패스 <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/display"
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm hover:bg-zinc-800"
            >
              전광판 뷰 <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={handleDownloadLogs}
              className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-zinc-900 text-xs font-bold text-zinc-700 transition flex items-center gap-1 shadow-sm"
            >
              <Download className="w-3 h-3" /> 결과 JSON
            </button>
            <button
              onClick={handleResetDraws}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> 당첨 재추첨
            </button>
            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition flex items-center gap-1 border border-red-200"
            >
              <AlertTriangle className="w-3 h-3" /> 전체 초기화
            </button>
            <button
              onClick={handleLock}
              className="p-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-600 transition"
              title="관리자 화면 잠금"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-zinc-200 gap-1">
          <button
            onClick={() => setActiveTab('draw')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'draw'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Dice5 className="w-3.5 h-3.5" /> 실시간 추첨
          </button>
          <button
            onClick={() => setActiveTab('prizes')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'prizes'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> 상품 설정 ({prizes.length})
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'themes'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> 🎨 테마 설정
          </button>
          <button
            onClick={() => setActiveTab('notice')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'notice'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <span>📢</span> 공지 & 인스타 설정
          </button>
        </div>

        {/* 요약 지표 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-zinc-400">PLAYERS</span>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{participants.length} <span className="text-xs font-normal text-zinc-400">명</span></p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-zinc-400">TOTAL PRIZES</span>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{prizes.length} <span className="text-xs font-normal text-zinc-400">개</span></p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-zinc-400">STATUS</span>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{winnersCount} / {prizes.length}</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-zinc-400">TEST DATA</span>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => handleGenerateDummies(10)}
                className="flex-1 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition"
              >
                +10명
              </button>
              <button
                onClick={() => handleGenerateDummies(30)}
                className="flex-1 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition"
              >
                +30명
              </button>
            </div>
          </div>
        </div>

        {/* 활성 탭 뷰 */}
        {activeTab === 'draw' && (
          <AdminDrawTab
            prizes={prizes}
            currentDraw={currentDraw}
            manualNumberInput={manualNumberInput}
            onSetManualNumberInput={setManualNumberInput}
            onStartDraw={handleStartDraw}
            onAnnounceWinner={handleAnnounceWinner}
            onRedrawAbsent={handleRedrawAbsent}
            onStartTimer={handleStartTimer}
            participants={participants}
            searchQuery={searchQuery}
            onSetSearchQuery={setSearchQuery}
          />
        )}

        {activeTab === 'prizes' && (
          <AdminPrizesTab
            prizes={prizes}
            newPrizeTitle={newPrizeTitle}
            setNewPrizeTitle={setNewPrizeTitle}
            newPrizeRank={newPrizeRank}
            setNewPrizeRank={setNewPrizeRank}
            onAddPrize={handleAddPrize}
            onDeletePrize={handleDeletePrize}
          />
        )}

        {activeTab === 'themes' && (
          <AdminThemesTab
            currentTheme={appState?.theme}
            onThemeChange={handleThemeChange}
            eventNameInput={eventNameInput}
            setEventNameInput={setEventNameInput}
            onSaveEventName={handleSaveEventName}
          />
        )}

        {activeTab === 'notice' && (
          <AdminNoticeTab currentNotice={appState?.notice} />
        )}
      </div>
    </div>
  );
}
