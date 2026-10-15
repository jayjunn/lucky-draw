'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socket';
import { soundFX } from '@/lib/sound';
import { AppState, ThemeType } from '@/types';
import { subscribeAppState, getFirebaseDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { 
  Trophy, 
  Users, 
  Maximize, 
  Volume2, 
  VolumeX, 
  QrCode as QrIcon, 
  Gift, 
  Check, 
  Clock, 
  Hand, 
  AlertTriangle,
  Sparkles,
  Zap,
  Crown
} from 'lucide-react';

interface FloatingReaction {
  id: string;
  emoji: string;
  name: string;
  x: number;
}

export default function DisplayPage() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [rollingNumber, setRollingNumber] = useState<number>(1);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [presenceAlert, setPresenceAlert] = useState<string | null>(null);
  const [cancelAlert, setCancelAlert] = useState<string | null>(null);

  const rollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const theme: ThemeType = appState?.theme || 'HALLOWEEN';

  useEffect(() => {
    const socket = getSocket();

    if (typeof window !== 'undefined') {
      const joinUrl = `${window.location.protocol}//${window.location.host}/`;
      QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then(setQrUrl);
    }

    // Firebase 실시간 동기화 (Vercel Serverless 완벽 호환)
    const unsubFirebase = subscribeAppState((state: AppState) => {
      setAppState(state);
      if (state.drawState?.phase === 'ROULETTE') {
        if (!rollingIntervalRef.current) {
          soundFX.playDrumRoll(4);
          rollingIntervalRef.current = setInterval(() => {
            setRollingNumber(Math.floor(Math.random() * 99) + 1);
            soundFX.playTick();
          }, 55);
        }
      } else if (state.drawState?.phase === 'ANNOUNCED') {
        if (rollingIntervalRef.current) {
          clearInterval(rollingIntervalRef.current);
          rollingIntervalRef.current = null;
        }
      }
    });

    socket.on('state_sync', (state: AppState) => {
      setAppState(state);
    });

    socket.on('draw_roulette_start', () => {
      soundFX.playDrumRoll(4);
      setTimerSeconds(null);
      setPresenceAlert(null);
      setCancelAlert(null);

      if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
      rollingIntervalRef.current = setInterval(() => {
        setRollingNumber(Math.floor(Math.random() * 99) + 1);
        soundFX.playTick();
      }, 55);
    });

    socket.on('draw_announced', () => {
      if (rollingIntervalRef.current) {
        clearInterval(rollingIntervalRef.current);
        rollingIntervalRef.current = null;
      }

      soundFX.playFanfare();

      const themeColors: Record<ThemeType, string[]> = {
        HALLOWEEN: ['#FF7A00', '#A855F7', '#E2F952', '#ffffff'],
        MONO: ['#09090b', '#71717a', '#d4d4d8', '#ff3b30'],
        CYBER: ['#00F0FF', '#7928CA', '#FF0080', '#ffffff'],
        GOLD: ['#F59E0B', '#D97706', '#FEF3C7', '#18181B'],
      };

      confetti({
        particleCount: 140,
        spread: 100,
        origin: { y: 0.6 },
        colors: themeColors[theme] || themeColors.HALLOWEEN,
      });
    });

    socket.on('presence_confirmed', (data: { number: number; name: string }) => {
      soundFX.playFanfare();
      setPresenceAlert(`🙋 #${String(data.number).padStart(3, '0')} ${data.name}님 출석 확인 완료!`);
      setTimeout(() => setPresenceAlert(null), 8000);
    });

    socket.on('draw_winner_cancelled', (data: { cancelledNumber: number; cancelledName: string }) => {
      soundFX.playTick();
      setCancelAlert(`🚨 #${String(data.cancelledNumber).padStart(3, '0')} ${data.cancelledName}님 부재로 인한 재추첨`);
      setTimeout(() => setCancelAlert(null), 6000);
    });

    socket.on('call_timer_tick', (data: { seconds: number }) => {
      setTimerSeconds(data.seconds);
      if (data.seconds <= 5 && data.seconds > 0) {
        soundFX.playTick();
      }
    });

    socket.on('call_timer_ended', () => {
      setTimerSeconds(null);
    });

    socket.on('cheer_burst', (data: { emoji: string; name: string }) => {
      const newReaction: FloatingReaction = {
        id: Math.random().toString(),
        emoji: data.emoji,
        name: data.name,
        x: Math.floor(Math.random() * 80) + 10,
      };
      setReactions((prev) => [...prev.slice(-15), newReaction]);
      soundFX.playTick();
    });

    return () => {
      unsubFirebase();
      socket.off('state_sync');
      socket.off('draw_roulette_start');
      socket.off('draw_announced');
      socket.off('presence_confirmed');
      socket.off('draw_winner_cancelled');
      socket.off('call_timer_tick');
      socket.off('call_timer_ended');
      socket.off('cheer_burst');
      if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
    };
  }, [theme]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleSound = () => {
    const nextMuted = soundFX.toggleMute();
    setIsMuted(nextMuted);
  };

  const currentDraw = appState?.drawState;
  const isRoulette = currentDraw?.phase === 'ROULETTE';
  const isAnnounced = currentDraw?.phase === 'ANNOUNCED' && currentDraw.currentWinner;
  const activePrize = appState?.prizes.find((p) => p.rank === currentDraw?.currentRank);

  const displayThemes = {
    HALLOWEEN: {
      bg: 'bg-[#0E051D] text-white',
      aurora1: 'bg-purple-600/35',
      aurora2: 'bg-[#FF7A00]/25',
      border: 'border-purple-800/50',
      tag: 'text-purple-300',
      title: 'text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] via-[#C084FC] to-[#FF7A00]',
      mainCard: 'bg-[#180A2E]/80 border-purple-500/50 shadow-purple-950/60',
      numberText: 'text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] via-[#E2F952] to-[#FF7A00]',
      badge: 'bg-[#FF7A00] text-black font-black',
    },
    MONO: {
      bg: 'bg-[#F4F4F5] text-zinc-900',
      aurora1: 'bg-zinc-300/40',
      aurora2: 'bg-zinc-400/20',
      border: 'border-zinc-200',
      tag: 'text-zinc-500',
      title: 'text-zinc-900',
      mainCard: 'bg-white border-zinc-300 shadow-xl',
      numberText: 'text-zinc-900',
      badge: 'bg-zinc-900 text-white font-bold',
    },
    CYBER: {
      bg: 'bg-[#060919] text-white',
      aurora1: 'bg-[#00F0FF]/25',
      aurora2: 'bg-[#7928CA]/35',
      border: 'border-cyan-800/50',
      tag: 'text-cyan-400',
      title: 'text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-white to-[#FF0080]',
      mainCard: 'bg-[#0C1330]/85 border-cyan-500/50 shadow-cyan-950/60',
      numberText: 'text-[#00F0FF]',
      badge: 'bg-[#00F0FF] text-black font-black',
    },
    GOLD: {
      bg: 'bg-[#0A0A0C] text-white',
      aurora1: 'bg-amber-600/25',
      aurora2: 'bg-yellow-500/20',
      border: 'border-amber-800/40',
      tag: 'text-amber-400',
      title: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500',
      mainCard: 'bg-[#141416]/90 border-amber-500/35 shadow-amber-950/40',
      numberText: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-500',
      badge: 'bg-amber-400 text-black font-black',
    },
  };

  const currentTheme = displayThemes[theme] || displayThemes.HALLOWEEN;

  return (
    <div className={`min-h-screen relative flex flex-col justify-between p-6 lg:p-10 select-none font-mono transition-colors duration-700 overflow-hidden ${currentTheme.bg}`}>
      {/* 부드러운 오로라 블러 광원 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full blur-[130px] animate-aurora-1 transition-colors duration-700 ${currentTheme.aurora1}`} />
        <div className={`absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[140px] animate-aurora-2 transition-colors duration-700 ${currentTheme.aurora2}`} />
      </div>

      {/* 상단 알림 토스트 */}
      <AnimatePresence>
        {presenceAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold ${currentTheme.badge}`}
          >
            <Hand className="w-4 h-4" />
            <span>{presenceAlert}</span>
          </motion.div>
        )}

        {cancelAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>{cancelAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 헤더 */}
      <header className={`relative z-10 flex items-center justify-between pb-5 border-b transition-colors duration-500 ${currentTheme.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-lg ${currentTheme.badge}`}>
            {theme === 'HALLOWEEN' ? '🎃' : theme === 'CYBER' ? <Zap className="w-5 h-5" /> : theme === 'GOLD' ? <Crown className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${currentTheme.tag}`}>
                {theme === 'HALLOWEEN' ? 'YUNTAKU SURVIVED 1YEAR !! 🦇' : 'MAIN STAGE'}
              </span>
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                ● LIVE
              </span>
            </div>
            <h1 className={`text-lg lg:text-xl font-black tracking-tight ${currentTheme.title}`}>
              {theme === 'HALLOWEEN' ? 'YUNTAKU 1ST & HALLOWEEN ANNIVERSARY PARTY' : (appState?.eventName || 'LUCKY DRAW FESTIVAL')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {timerSeconds !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm ${currentTheme.badge}`}
            >
              <Clock className="w-4 h-4 animate-pulse" />
              <div>
                <p className="text-[9px] uppercase font-bold">COUNTDOWN</p>
                <p className="text-base font-bold leading-none">{timerSeconds}s</p>
              </div>
            </motion.div>
          )}

          <div className="rounded-xl px-4 py-2 flex items-center gap-3 border backdrop-blur-xl shadow-sm bg-black/10 border-current/10">
            <Users className="w-4 h-4 opacity-70" />
            <div>
              <p className="text-[9px] uppercase font-bold opacity-60">PLAYERS</p>
              <p className="text-base font-bold leading-none">
                {appState?.participants.length || 0} <span className="text-xs font-normal opacity-60">명</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowQrModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm border bg-black/10 border-current/20 hover:bg-black/20"
          >
            <QrIcon className="w-4 h-4" />
            <span className="hidden sm:inline">참여 QR</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl border transition shadow-sm bg-black/10 border-current/20 hover:bg-black/20"
          >
            {isMuted ? <VolumeX className="w-4 h-4 opacity-50" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullScreen}
            className="p-2.5 rounded-xl border transition shadow-sm bg-black/10 border-current/20 hover:bg-black/20"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 중앙 메인 스테이지 */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center my-6">
        <AnimatePresence mode="wait">
          {isRoulette ? (
            <motion.div
              key="roulette"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="text-center space-y-6 max-w-xl w-full"
            >
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs shadow-md ${currentTheme.badge}`}>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>[{currentDraw?.currentRank}등] 럭키드로우 롤링 중</span>
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
                  {activePrize?.title}
                </h2>
                <p className="text-xs opacity-70 font-sans">과연 행운의 주인공은 누구일까요?</p>
              </div>

              <div className={`mx-auto w-72 h-44 lg:w-96 lg:h-52 rounded-2xl border backdrop-blur-2xl flex items-center justify-center shadow-2xl ${currentTheme.mainCard}`}>
                <div className={`text-7xl lg:text-8xl font-black font-mono tracking-wider ${currentTheme.numberText}`}>
                  #{String(rollingNumber).padStart(3, '0')}
                </div>
              </div>
            </motion.div>
          ) : isAnnounced ? (
            <motion.div
              key="announced"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="text-center space-y-6 max-w-2xl w-full"
            >
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-xs tracking-wider shadow-lg ${currentTheme.badge}`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentDraw?.currentWinner?.rank}등 당첨자 발표</span>
              </div>

              <h2 className="text-3xl lg:text-5xl font-black tracking-tight">
                {currentDraw?.currentWinner?.prize}
              </h2>

              <div className={`mx-auto max-w-lg rounded-2xl border backdrop-blur-2xl p-8 shadow-2xl ${currentTheme.mainCard}`}>
                <div className="text-[10px] font-bold uppercase opacity-60 tracking-widest mb-1">
                  WINNER TICKET NUMBER
                </div>
                <div className={`text-7xl lg:text-8xl font-black font-mono ${currentTheme.numberText}`}>
                  #{String(currentDraw?.currentWinner?.winnerNumber).padStart(3, '0')}
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {currentDraw?.currentWinner?.winnerName} <span className="text-base font-normal opacity-60">님</span>
                </div>

                {currentDraw?.currentWinner?.confirmed ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 py-2 px-4 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400 flex items-center justify-center gap-1.5"
                  >
                    <Hand className="w-4 h-4 text-emerald-400" /> 🙋 참가자 출석 확인 완료 (무대 이동 중)
                  </motion.div>
                ) : (
                  <p className="text-xs mt-3 opacity-70 font-sans">
                    모바일 화면에서 [출석 확인]을 누르거나 즉시 무대로 나와주세요!
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-5 max-w-md"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-sm bg-black/10 border border-current/20">
                {theme === 'HALLOWEEN' ? '🎃' : <Gift className="w-8 h-8 opacity-80" />}
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                  {theme === 'HALLOWEEN' ? 'YUNTAKU HALLOWEEN DRAW' : '추첨 준비 중입니다'}
                </h2>
                <p className="text-xs opacity-70 font-sans leading-relaxed">
                  스마트폰으로 입장 패스를 발급받고 대기해 주세요.<br />
                  곧 행운의 럭키드로우가 시작됩니다!
                </p>
              </div>

              <button
                onClick={() => setShowQrModal(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md ${currentTheme.badge}`}
              >
                참여 QR 코드 표시
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 하단 순위별 당첨 보드 */}
      <footer className={`relative z-10 pt-4 border-t transition-colors duration-500 ${currentTheme.border}`}>
        <div className="flex items-center justify-between mb-3 text-xs opacity-70">
          <span className="font-bold uppercase tracking-wider">순위별 당첨 현황</span>
          <span>5등부터 차례대로 발표</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {appState?.prizes
            ?.slice()
            .sort((a, b) => b.rank - a.rank)
            .map((prize) => {
              const isWon = Boolean(prize.winner);
              const isCurrent = currentDraw?.currentRank === prize.rank;
              const absentCount = prize.absentHistory?.length || 0;

              return (
                <div
                  key={prize.id}
                  className={`p-3.5 rounded-xl border backdrop-blur-xl transition-all ${
                    isWon
                      ? `${currentTheme.badge} shadow-lg`
                      : isCurrent
                      ? 'border-current ring-2 ring-current bg-black/20'
                      : 'bg-black/10 border-current/15 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isWon ? 'bg-black text-white' : 'bg-black/20 text-current'
                      }`}
                    >
                      {prize.rank}등
                    </span>
                    {isWon ? (
                      <span className="text-[10px] flex items-center gap-0.5 font-bold">
                        <Check className="w-3 h-3" /> 확정
                      </span>
                    ) : (
                      <span className="text-[10px] opacity-60">대기</span>
                    )}
                  </div>

                  <p className="text-xs font-bold truncate mt-1">
                    {prize.title}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-current/20 flex items-center justify-between text-xs">
                    {isWon && prize.winner ? (
                      <>
                        <span className="font-bold font-mono">
                          #{String(prize.winner.number).padStart(3, '0')}
                        </span>
                        <span className="truncate max-w-[80px]">
                          {prize.winner.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] opacity-60">--</span>
                    )}
                  </div>

                  {absentCount > 0 && (
                    <div className="mt-1 text-[9px] opacity-80 font-bold">
                      부재 {absentCount}명 재추첨
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </footer>

      {/* QR 모달 */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-zinc-200 rounded-2xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl text-zinc-900"
            >
              <h3 className="text-lg font-bold text-zinc-900">스마트폰으로 스캔하세요</h3>
              <p className="text-xs text-zinc-500 font-sans">
                카메라를 비추면 즉시 모바일 입장권이 발급됩니다.
              </p>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl inline-block">
                {qrUrl ? (
                  <img src={qrUrl} alt="참여 QR" className="w-52 h-52 mx-auto object-contain" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-zinc-400">생성 중</div>
                )}
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white transition-colors"
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 리액션 애니메이션 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -220 }}
            transition={{ duration: 2, ease: "easeOut" }}
            style={{ left: `${r.x}%` }}
            className="absolute bottom-10 text-3xl flex flex-col items-center"
          >
            <span>{r.emoji}</span>
            <span className="text-[9px] text-white bg-black/80 px-2 py-0.5 rounded shadow mt-0.5 font-bold">
              {r.name}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
