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
  Lock,
  UserX
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
    newPrizeRankLabel,
    setNewPrizeRankLabel,
    newPrizeHideRank,
    setNewPrizeHideRank,
    newPrizeAdminTag,
    setNewPrizeAdminTag,
    newPrizeTagColor,
    setNewPrizeTagColor,
    handleStartDraw,
    handleAnnounceWinner,
    handleRedrawAbsent,
    handleRedrawSpecificAbsent,
    handleUpdatePrizeRankConfig,
    batchCounts,
    setBatchCountForRank,
    handleStartTimer,
    handleGenerateDummies,
    handleResetDraws,
    handleResetAll,
    handleResetParticipants,
    handleDeleteParticipant,
    handleAddPrize,
    handleDeletePrize,
    handleThemeChange,
    handleSaveEventName,
  } = useAdmin();

  // PIN 번호 잠금 화면 (기본: 1128, 마스터 매직넘버: 7777)
  if (!isUnlocked) {
    return <AdminPinLock onUnlock={handleUnlock} correctPin="1128" magicPin="7777" />;
  }

  const prizes = appState?.prizes || [];
  const participants = appState?.participants || [];
  const currentDraw = appState?.drawState;
  const winnersCount = prizes.filter((p) => p.winner).length;

  const confirmedCount = participants.filter((p) => p.presenceConfirmed).length;

  const handleDownloadLogs = () => {
    if (!appState) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `lucky_draw_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F4F5] text-zinc-900 p-4 sm:p-6 lg:p-8 font-mono pb-28">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* 상단 관리자 헤더 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  ADMIN CONSOLE
                </span>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Database className="w-3 h-3" /> Firestore 실시간 동기화
                </span>
              </div>
              <h1 className="text-lg font-bold text-zinc-900 mt-0.5">
                {appState?.eventName || 'LUCKY DRAW'} MANAGEMENT
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. 바로가기 뷰 링크 */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-zinc-200 shadow-xs gap-1">
              <a
                href="/"
                target="_blank"
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition flex items-center gap-1"
                title="참가자 모바일 패스 화면 열기"
              >
                모바일 패스 <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
              <div className="w-px h-3 bg-zinc-200" />
              <a
                href="/display"
                target="_blank"
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-900 hover:bg-zinc-100 transition flex items-center gap-1"
                title="무대 전광판 화면 열기"
              >
                전광판 뷰 <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>

            {/* 2. 관리자 조작 버튼들 */}
            <button
              onClick={handleDownloadLogs}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-zinc-400 text-xs font-bold text-zinc-700 transition flex items-center gap-1 shadow-xs cursor-pointer"
              title="추첨 결과 JSON 다운로드"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" /> 결과 JSON
            </button>
            <button
              onClick={handleResetDraws}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 text-xs font-bold text-zinc-700 transition flex items-center gap-1 shadow-xs cursor-pointer"
              title="참가자 목록과 상품 목록은 안전하게 유지하고 당첨 내역만 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" /> 당첨 재추첨
            </button>
            <button
              onClick={handleResetParticipants}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition flex items-center gap-1 shadow-xs cursor-pointer"
              title="설정된 상품 목록은 보존하고 모든 참가자 명단 및 추첨만 초기화"
            >
              <UserX className="w-3.5 h-3.5 text-zinc-500" /> 사람 리셋
            </button>
            <button
              onClick={handleResetAll}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1 border border-rose-200 cursor-pointer"
              title="설정된 상품 목록은 보존하고 모든 참가자 및 당첨 내역 완전 초기화"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> 전체 초기화
            </button>
            <button
              onClick={handleLock}
              className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition cursor-pointer"
              title="관리자 화면 잠금"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-zinc-200 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('draw')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'draw'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Dice5 className="w-3.5 h-3.5" /> 실시간 추첨
          </button>
          <button
            onClick={() => setActiveTab('prizes')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'prizes'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> 상품 설정 ({prizes.length})
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'themes'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-purple-600" /> 🎨 테마 설정
          </button>
          <button
            onClick={() => setActiveTab('notice')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'notice'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <span>📢</span> 공지 & 인스타 설정
          </button>
        </div>

        {/* 요약 지표 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">PLAYERS</span>
            <div className="mt-1">
              <p className="text-2xl font-bold text-zinc-900">
                {participants.length} <span className="text-xs font-normal text-zinc-400">명</span>
              </p>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                출석 확인: {confirmedCount}명
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">TOTAL PRIZES</span>
            <div className="mt-1">
              <p className="text-2xl font-bold text-zinc-900">
                {prizes.length} <span className="text-xs font-normal text-zinc-400">개</span>
              </p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                잔여: {Math.max(0, prizes.length - winnersCount)}개
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">STATUS</span>
            <div className="mt-1">
              <p className="text-2xl font-bold text-zinc-900">
                {winnersCount} / {prizes.length}
              </p>
              <p className="text-[10px] text-purple-600 font-bold mt-0.5">
                진행률: {prizes.length > 0 ? Math.round((winnersCount / prizes.length) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">TEST DATA</span>
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => handleGenerateDummies(10)}
                className="flex-1 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition cursor-pointer"
                title="테스트용 더미 10명 추가"
              >
                +10명
              </button>
              <button
                onClick={() => handleGenerateDummies(30)}
                className="flex-1 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition cursor-pointer"
                title="테스트용 더미 30명 추가"
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
            onRedrawSpecificAbsent={handleRedrawSpecificAbsent}
            batchCounts={batchCounts}
            onSetBatchCount={setBatchCountForRank}
            onStartTimer={handleStartTimer}
            participants={participants}
            searchQuery={searchQuery}
            onSetSearchQuery={setSearchQuery}
            onUpdatePrizeRankConfig={handleUpdatePrizeRankConfig}
            onDeleteParticipant={handleDeleteParticipant}
          />
        )}

        {activeTab === 'prizes' && (
          <AdminPrizesTab
            prizes={prizes}
            newPrizeTitle={newPrizeTitle}
            setNewPrizeTitle={setNewPrizeTitle}
            newPrizeRank={newPrizeRank}
            setNewPrizeRank={setNewPrizeRank}
            newPrizeRankLabel={newPrizeRankLabel}
            setNewPrizeRankLabel={setNewPrizeRankLabel}
            newPrizeHideRank={newPrizeHideRank}
            setNewPrizeHideRank={setNewPrizeHideRank}
            newPrizeAdminTag={newPrizeAdminTag}
            setNewPrizeAdminTag={setNewPrizeAdminTag}
            newPrizeTagColor={newPrizeTagColor}
            setNewPrizeTagColor={setNewPrizeTagColor}
            onAddPrize={handleAddPrize}
            onDeletePrize={handleDeletePrize}
            onUpdatePrizeRankConfig={handleUpdatePrizeRankConfig}
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
