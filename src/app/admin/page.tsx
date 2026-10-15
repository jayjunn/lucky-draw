'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socket';
import { AppState, Prize, ThemeType } from '@/types';
import { 
  subscribeAppState, 
  startRouletteDirect, 
  announceWinnerDirect, 
  redrawAbsentDirect, 
  setThemeDirect, 
  resetAllDirect,
  getFirebaseDb 
} from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, 
  Trophy, 
  Play, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Dice5,
  Search,
  Database,
  Clock,
  Download,
  Hand,
  Settings,
  Edit2,
  Save,
  Palette
} from 'lucide-react';

export default function AdminPage() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'prizes' | 'themes' | 'logs' | 'settings'>('draw');
  const [manualNumberInput, setManualNumberInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eventNameInput, setEventNameInput] = useState<string>('');
  
  const [newPrizeTitle, setNewPrizeTitle] = useState<string>('');
  const [newPrizeRank, setNewPrizeRank] = useState<number>(1);
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editRank, setEditRank] = useState<number>(1);

  useEffect(() => {
    const socket = getSocket();

    // Firebase 실시간 리스너 구독 (Vercel Serverless 완벽 호환)
    const unsubFirebase = subscribeAppState((state: AppState) => {
      setAppState(state);
      if (!eventNameInput) setEventNameInput(state.eventName);
    });

    socket.on('state_sync', (state: AppState) => {
      setAppState(state);
      if (!eventNameInput) setEventNameInput(state.eventName);
    });

    socket.on('admin_alert', (data: { message: string }) => {
      alert(data.message);
    });

    return () => {
      unsubFirebase();
      socket.off('state_sync');
      socket.off('admin_alert');
    };
  }, [eventNameInput]);

  const handleStartDraw = async (rank: number) => {
    try {
      await startRouletteDirect(rank);
    } catch (e) {
      console.warn(e);
    }
    const socket = getSocket();
    socket.emit('admin_start_draw', { rank });
  };

  const handleAnnounceWinner = async (rank: number) => {
    const targetNumber = manualNumberInput ? parseInt(manualNumberInput, 10) : undefined;
    try {
      await announceWinnerDirect(rank, targetNumber);
    } catch (e: any) {
      alert(e.message || '추첨 에러가 발생했습니다.');
    }
    const socket = getSocket();
    socket.emit('admin_announce_winner', { rank, targetNumber });
    setManualNumberInput('');
  };

  const handleRedrawAbsent = async (rank: number) => {
    if (!confirm('현재 당첨자가 자리에 없습니까? 부재(No-Show)로 실격 처리하고 즉시 다음 참가자를 뽑습니다.')) return;
    try {
      await redrawAbsentDirect(rank);
    } catch (e) {
      console.warn(e);
    }
    const socket = getSocket();
    socket.emit('admin_redraw_absent', { rank });
  };

  const handleStartTimer = (seconds: number = 30) => {
    const socket = getSocket();
    socket.emit('admin_start_call_timer', { seconds });
  };

  const handleGenerateDummies = (count: number) => {
    const socket = getSocket();
    socket.emit('admin_generate_dummies', { count });
  };

  const handleResetDraws = async () => {
    if (!confirm('현재까지의 당첨 내역을 모두 초기화하고 다시 추첨하시겠습니까? (참가자 목록은 유지됩니다)')) return;
    try {
      const firestore = getFirebaseDb();
      const eventRef = doc(firestore, 'lucky_draw_events', 'current_event');
      if (appState) {
        const resetPrizes = appState.prizes.map((p) => ({ ...p, winner: null, announced: false, absentHistory: [] }));
        const resetParticipants = appState.participants.map((p) => ({ ...p, isWinner: undefined, presenceConfirmed: false }));
        await updateDoc(eventRef, {
          prizes: resetPrizes,
          participants: resetParticipants,
          drawState: { currentRank: null, phase: 'IDLE', currentWinner: null, callTimer: null },
          updatedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn(e);
    }
    const socket = getSocket();
    socket.emit('admin_reset_draws');
  };

  const handleResetAll = async () => {
    if (!confirm('⚠️ 모든 참가자 및 당첨 내역이 완전히 삭제됩니다. 초기화하시겠습니까?')) return;
    try {
      await resetAllDirect();
    } catch (e) {
      console.warn(e);
    }
    const socket = getSocket();
    socket.emit('admin_reset_all');
  };

  const handleAddPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrizeTitle.trim() || !appState) return;

    const updatedPrizes: Prize[] = [
      ...appState.prizes,
      {
        id: 'prize-' + Date.now(),
        rank: Number(newPrizeRank),
        title: newPrizeTitle.trim(),
        count: 1,
        announced: false,
        winner: null,
        absentHistory: [],
      },
    ];

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
    setNewPrizeTitle('');
    setNewPrizeRank(updatedPrizes.length + 1);
  };

  const handleDeletePrize = async (id: string) => {
    if (!appState || !confirm('이 상품을 삭제하시겠습니까?')) return;
    const updatedPrizes = appState.prizes.filter((p) => p.id !== id);

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
  };

  const handleSaveEditPrize = async (id: string) => {
    if (!appState) return;
    const updatedPrizes = appState.prizes.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          rank: Number(editRank),
          title: editTitle.trim() || p.title,
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

  const handleSaveEventName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventNameInput.trim()) return;

    try {
      const firestore = getFirebaseDb();
      await updateDoc(doc(firestore, 'lucky_draw_events', 'current_event'), {
        eventName: eventNameInput.trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn(e);
    }

    const socket = getSocket();
    socket.emit('admin_update_event_name', { eventName: eventNameInput.trim() });
    alert('행사명이 저장되었습니다.');
  };

  const handleSelectTheme = async (selectedTheme: ThemeType) => {
    try {
      await setThemeDirect(selectedTheme);
    } catch (e) {
      console.warn(e);
    }
    const socket = getSocket();
    socket.emit('admin_set_theme', { theme: selectedTheme });
    if (selectedTheme === 'HALLOWEEN') {
      const halloweenName = 'YUNTAKU 1ST & HALLOWEEN PARTY';
      setEventNameInput(halloweenName);
      socket.emit('admin_update_event_name', { eventName: halloweenName });
    }
  };

  const handleDownloadLogs = () => {
    if (!appState) return;
    const records = appState.prizes
      .filter((p) => p.winner)
      .map((p) => ({
        등수: `${p.rank}등`,
        상품명: p.title,
        당첨번호: p.winner?.number,
        당첨자이름: p.winner?.name,
        출석확인여부: p.winner?.confirmed ? '확인됨' : '미확인',
        부재처리횟수: p.absentHistory?.length || 0,
        부재자목록: p.absentHistory?.map((a) => `#${a.number} ${a.name}`).join(', ') || '없음',
      }));

    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luckydraw_winners_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const participants = appState?.participants || [];
  const prizes = appState?.prizes || [];
  const currentDraw = appState?.drawState;
  const sortedPrizes = [...prizes].sort((a, b) => b.rank - a.rank);

  const filteredParticipants = participants.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.number.toString().includes(query)
    );
  });

  const winnersCount = prizes.filter((p) => p.winner).length;

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-zinc-900 p-5 lg:p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* 헤더 */}
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
                  <Database className="w-3 h-3" /> Firestore & 로컬 실시간 저장 중
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
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> 당첨/부재자 로그
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white text-zinc-900 border-t border-x border-zinc-200 -mb-px'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> 행사 설정
          </button>
        </div>

        {/* 요약 지표 */}
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

        {/* 탭 1: 추첨 제어 */}
        {activeTab === 'draw' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
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
                                  onClick={() => handleStartDraw(prize.rank)}
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
                                  onClick={() => handleAnnounceWinner(prize.rank)}
                                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                >
                                  <Sparkles className="w-3 h-3" /> 2. 발표
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRedrawAbsent(prize.rank)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                  title="자리에 없으면 실격 처리하고 즉시 다음 사람을 뽑습니다"
                                >
                                  <AlertTriangle className="w-3 h-3" /> 부재중 재추첨
                                </button>

                                <button
                                  onClick={() => handleStartTimer(30)}
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
                      onChange={(e) => setManualNumberInput(e.target.value)}
                      placeholder="비워두면 무작위 추첨됩니다"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                    />
                    {manualNumberInput && (
                      <button
                        onClick={() => setManualNumberInput('')}
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
                    onChange={(e) => setSearchQuery(e.target.value)}
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

                        <div>
                          {isAbsent ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-300 text-zinc-700">
                              부재
                            </span>
                          ) : isWinner ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-zinc-900">
                              당첨
                            </span>
                          ) : (
                            <span className="text-[9px] text-zinc-400 font-bold">
                              PASS
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
        )}

        {/* 탭 2: 상품 커스텀 설정 */}
        {activeTab === 'prizes' && (
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

            <form onSubmit={handleAddPrize} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row gap-3">
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
                  className="px-4 py-2 rounded-lg mono-btn-primary text-xs flex items-center gap-1"
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
                            onClick={() => handleDeletePrize(p.id)}
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
        )}

        {/* 탭: 테마 관리 (4종 비주얼 테마 선택) */}
        {activeTab === 'themes' && (
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
              {/* 테마 1: YUNTAKU HALLOWEEN */}
              <div className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                appState?.theme === 'HALLOWEEN'
                  ? 'border-purple-600 bg-purple-50/30 ring-2 ring-purple-600/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                      <span>🎃</span> YUNTAKU 1ST PARTY
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900">할로윈 애니버서리</h4>
                    <p className="text-xs text-zinc-500 font-sans">
                      딥 바이올렛 배경 + 잭오랜턴 오렌지 & 형광 라임 네온 글로우
                    </p>
                  </div>
                  {appState?.theme === 'HALLOWEEN' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200">
                      적용 중
                    </span>
                  )}
                </div>

                {/* 테마 컬러 팔레트 미리보기 */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-[#1A0B2E] border border-zinc-400 shadow-inner" title="딥 퍼플" />
                  <div className="w-6 h-6 rounded-full bg-[#FF7A00]" title="네온 오렌지" />
                  <div className="w-6 h-6 rounded-full bg-[#E2F952]" title="라임 옐로우" />
                  <div className="w-6 h-6 rounded-full bg-[#C084FC]" title="바이올렛" />

                  <button
                    onClick={() => handleSelectTheme('HALLOWEEN')}
                    disabled={appState?.theme === 'HALLOWEEN'}
                    className={`ml-auto px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      appState?.theme === 'HALLOWEEN'
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {appState?.theme === 'HALLOWEEN' ? '사용 중' : '적용하기'}
                  </button>
                </div>
              </div>

              {/* 테마 2: SLEEK MONOCHROME */}
              <div className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                appState?.theme === 'MONO'
                  ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                      <span>🖤</span> ULTRA CLEAN
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900">슬릭 모노크롬</h4>
                    <p className="text-xs text-zinc-500 font-sans">
                      퓨어 화이트 & 딥 블랙 & 쿨 징크 미니멀 명품 디지털 패스
                    </p>
                  </div>
                  {appState?.theme === 'MONO' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-white">
                      적용 중
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-[#FFFFFF] border border-zinc-300 shadow-sm" title="퓨어 화이트" />
                  <div className="w-6 h-6 rounded-full bg-[#71717A]" title="쿨 징크" />
                  <div className="w-6 h-6 rounded-full bg-[#09090B]" title="딥 블랙" />
                  <div className="w-6 h-6 rounded-full bg-[#FF3B30]" title="레드 포인트" />

                  <button
                    onClick={() => handleSelectTheme('MONO')}
                    disabled={appState?.theme === 'MONO'}
                    className={`ml-auto px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      appState?.theme === 'MONO'
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {appState?.theme === 'MONO' ? '사용 중' : '적용하기'}
                  </button>
                </div>
              </div>

              {/* 테마 3: CYBER MIDNIGHT */}
              <div className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                appState?.theme === 'CYBER'
                  ? 'border-cyan-500 bg-cyan-50/20 ring-2 ring-cyan-500/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-1">
                      <span>🌌</span> FUTURE VIBE
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900">사이버 미드나잇</h4>
                    <p className="text-xs text-zinc-500 font-sans">
                      미드나잇 인디고 & 일렉트릭 시안 & 바이올렛 네온 오로라
                    </p>
                  </div>
                  {appState?.theme === 'CYBER' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-900 text-cyan-200">
                      적용 중
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-[#0A0E27]" title="미드나잇" />
                  <div className="w-6 h-6 rounded-full bg-[#00F0FF]" title="일렉트릭 시안" />
                  <div className="w-6 h-6 rounded-full bg-[#7928CA]" title="네온 바이올렛" />
                  <div className="w-6 h-6 rounded-full bg-[#FF0080]" title="마젠타" />

                  <button
                    onClick={() => handleSelectTheme('CYBER')}
                    disabled={appState?.theme === 'CYBER'}
                    className={`ml-auto px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      appState?.theme === 'CYBER'
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {appState?.theme === 'CYBER' ? '사용 중' : '적용하기'}
                  </button>
                </div>
              </div>

              {/* 테마 4: VIP OBSIDIAN GOLD */}
              <div className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                appState?.theme === 'GOLD'
                  ? 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                      <span>👑</span> LUXURY GALA
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900">옵시디언 골드</h4>
                    <p className="text-xs text-zinc-500 font-sans">
                      딥 나이트 블랙 & 샴페인 골드 글래스모피즘 갈라 파티
                    </p>
                  </div>
                  {appState?.theme === 'GOLD' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900 text-amber-200">
                      적용 중
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-[#121214]" title="옵시디언 블랙" />
                  <div className="w-6 h-6 rounded-full bg-[#F59E0B]" title="샴페인 골드" />
                  <div className="w-6 h-6 rounded-full bg-[#D97706]" title="딥 앰버" />
                  <div className="w-6 h-6 rounded-full bg-[#FEF3C7]" title="크림 골드" />

                  <button
                    onClick={() => handleSelectTheme('GOLD')}
                    disabled={appState?.theme === 'GOLD'}
                    className={`ml-auto px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      appState?.theme === 'GOLD'
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {appState?.theme === 'GOLD' ? '사용 중' : '적용하기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 탭 3: 로그 뷰어 */}
        {activeTab === 'logs' && (
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" /> 당첨 및 부재자 로그 기록
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                  Firestore 및 로컬 파일에 날짜와 함께 안전하게 저장된 내역입니다.
                </p>
              </div>

              <button
                onClick={handleDownloadLogs}
                className="px-3.5 py-1.5 rounded-lg mono-btn-primary text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> JSON 다운로드
              </button>
            </div>

            <div className="space-y-2">
              {prizes
                .filter((p) => p.winner || (p.absentHistory && p.absentHistory.length > 0))
                .map((p) => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[10px] font-bold">
                          {p.rank}등
                        </span>
                        <span className="text-xs font-bold text-zinc-900">{p.title}</span>
                      </div>
                      {p.winner && (
                        <span className="text-xs font-bold text-zinc-800">
                          최종 당첨: #{String(p.winner.number).padStart(3, '0')} {p.winner.name}님
                        </span>
                      )}
                    </div>

                    {p.absentHistory && p.absentHistory.length > 0 && (
                      <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-800">
                        <span className="font-bold">⚠️ 부재(No-Show)로 취소된 참가자:</span>
                        <div className="mt-0.5 space-y-0.5">
                          {p.absentHistory.map((a, idx) => (
                            <div key={idx}>
                              • #{a.number} {a.name} ({new Date(a.at).toLocaleTimeString('ko-KR')})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 탭 4: 기본 설정 */}
        {activeTab === 'settings' && (
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm max-w-lg space-y-4">
            <h3 className="text-sm font-bold text-zinc-900">행사 기본 정보</h3>

            <form onSubmit={handleSaveEventName} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">행사명 / 이벤트 타이틀</label>
                <input
                  type="text"
                  value={eventNameInput}
                  onChange={(e) => setEventNameInput(e.target.value)}
                  placeholder="예: 2026 LUCKY DRAW FESTIVAL"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-xs font-medium focus:outline-none focus:border-zinc-900"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg mono-btn-primary text-xs flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" /> 행사명 저장
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
