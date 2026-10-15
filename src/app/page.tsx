'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { soundFX } from '@/lib/sound';
import { AppState, Participant, ThemeType } from '@/types';
import { 
  subscribeAppState, 
  registerParticipantDirect, 
  confirmPresenceDirect, 
  sendCheerDirect 
} from '@/lib/firebase';
import { 
  Trophy, 
  Volume2, 
  VolumeX, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin
} from 'lucide-react';

// 테마별 모던 & 미니멀 컬러 팔레트
const THEME_STYLES: Record<ThemeType, {
  accent: string;
  accentBg: string;
  accentBorder: string;
  glow: string;
  badge: string;
  tag: string;
}> = {
  HALLOWEEN: {
    accent: '#FF5500',
    accentBg: 'bg-[#FF5500]',
    accentBorder: 'border-[#FF5500]/30',
    glow: 'rgba(255, 85, 0, 0.15)',
    badge: 'bg-[#FF5500]/10 text-[#FF5500] border-[#FF5500]/25',
    tag: 'YUNTAKU 1ST & HALLOWEEN',
  },
  MONO: {
    accent: '#FFFFFF',
    accentBg: 'bg-white',
    accentBorder: 'border-white/30',
    glow: 'rgba(255, 255, 255, 0.1)',
    badge: 'bg-white/10 text-white border-white/20',
    tag: 'MINIMAL MONOCHROME',
  },
  CYBER: {
    accent: '#00F0FF',
    accentBg: 'bg-[#00F0FF]',
    accentBorder: 'border-[#00F0FF]/30',
    glow: 'rgba(0, 240, 255, 0.15)',
    badge: 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/25',
    tag: 'CYBERPUNK NIGHT',
  },
  GOLD: {
    accent: '#E5A93C',
    accentBg: 'bg-[#E5A93C]',
    accentBorder: 'border-[#E5A93C]/30',
    glow: 'rgba(229, 169, 60, 0.15)',
    badge: 'bg-[#E5A93C]/10 text-[#E5A93C] border-[#E5A93C]/25',
    tag: 'VIP GOLD ANNIVERSARY',
  },
};

export default function ParticipantPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [rollingNumber, setRollingNumber] = useState<number>(1);
  const [showWinnerSheet, setShowWinnerSheet] = useState(false);
  const [recentReaction, setRecentReaction] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevPhaseRef = useRef<string>('IDLE');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTheme = appState?.theme || 'HALLOWEEN';
  const themeCfg = THEME_STYLES[activeTheme] || THEME_STYLES.HALLOWEEN;

  // 1. Firebase 실시간 리스너 구독 (Vercel Serverless 100% 호환)
  useEffect(() => {
    const savedId = localStorage.getItem('lucky_draw_participant_id');
    const savedName = localStorage.getItem('lucky_draw_participant_name');

    if (savedId && savedName) {
      registerParticipantDirect(savedName, savedId).then((p) => {
        setParticipant(p);
      }).catch(console.error);
    }

    const unsubscribe = subscribeAppState((state: AppState) => {
      setAppState(state);

      // 내 정보 업데이트
      if (participant) {
        const me = state.participants.find((p) => p.id === participant.id);
        if (me) setParticipant(me);
      }

      // 룰렛 상태 변화 감지
      const currentPhase = state.drawState?.phase;
      if (currentPhase !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhase || 'IDLE';

        if (currentPhase === 'ROULETTE') {
          soundFX.playDrumRoll(3.5);
          if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 100]);

          if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
          rollingIntervalRef.current = setInterval(() => {
            setRollingNumber(Math.floor(Math.random() * 99) + 1);
            soundFX.playTick();
          }, 55);
        } else if (currentPhase === 'ANNOUNCED') {
          if (rollingIntervalRef.current) {
            clearInterval(rollingIntervalRef.current);
            rollingIntervalRef.current = null;
          }

          const mySavedNumber = localStorage.getItem('lucky_draw_participant_number');
          const currentNumber = participant?.number || (mySavedNumber ? parseInt(mySavedNumber, 10) : null);
          const winnerNum = state.drawState?.currentWinner?.winnerNumber;

          if (currentNumber !== null && currentNumber === winnerNum) {
            triggerWinnerCelebration();
          } else {
            soundFX.playCheer();
          }

          // 호명 카운트다운 타이머 시작
          setTimerSeconds(30);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = setInterval(() => {
            setTimerSeconds((prev) => {
              if (prev === null || prev <= 1) {
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                return null;
              }
              if (prev <= 6) soundFX.playTick();
              return prev - 1;
            });
          }, 1000);
        } else if (currentPhase === 'IDLE') {
          if (rollingIntervalRef.current) {
            clearInterval(rollingIntervalRef.current);
            rollingIntervalRef.current = null;
          }
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setTimerSeconds(null);
          setShowWinnerSheet(false);
        }
      }
    });

    return () => {
      unsubscribe();
      if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [participant?.id, participant?.number]);

  // QR 코드 생성
  useEffect(() => {
    if (participant) {
      const qrPayload = JSON.stringify({
        id: participant.id,
        number: participant.number,
        name: participant.name,
      });
      QRCode.toDataURL(qrPayload, {
        width: 140,
        margin: 0,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then(setQrDataUrl);
    }
  }, [participant]);

  const triggerWinnerCelebration = () => {
    setShowWinnerSheet(true);
    soundFX.playFanfare();

    if (navigator.vibrate) {
      navigator.vibrate([150, 80, 150, 80, 400]);
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [themeCfg.accent, '#FFFFFF', '#A1A1AA'],
    });
  };

  // 참가자 등록 핸들러 (Firebase 실시간 직통)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const newPart = await registerParticipantDirect(nameInput.trim());
      setParticipant(newPart);
      localStorage.setItem('lucky_draw_participant_id', newPart.id);
      localStorage.setItem('lucky_draw_participant_name', newPart.name);
      localStorage.setItem('lucky_draw_participant_number', newPart.number.toString());
      soundFX.playFanfare();
    } catch (err: any) {
      console.error('등록 실패:', err);
      alert('입장권 발급 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 당첨자 출석 확인 핸들러
  const handleConfirmPresence = async () => {
    if (!participant) return;
    try {
      await confirmPresenceDirect(participant.id);
      soundFX.playFanfare();
    } catch (err) {
      console.error('출석 확인 실패:', err);
    }
  };

  // 실시간 리액션 전송
  const sendReaction = async (icon: string) => {
    try {
      await sendCheerDirect(icon, participant?.name || '참가자');
      setRecentReaction(icon);
      soundFX.playTick();
      setTimeout(() => setRecentReaction(null), 1400);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSound = () => {
    const nextMuted = soundFX.toggleMute();
    setIsMuted(nextMuted);
  };

  const isMeWinner = participant?.isWinner;
  const currentDraw = appState?.drawState;
  const isRouletteActive = currentDraw?.phase === 'ROULETTE';
  const isAnnounced = currentDraw?.phase === 'ANNOUNCED' && currentDraw.currentWinner;
  const amIThisRoundWinner = isAnnounced && participant && currentDraw.currentWinner?.winnerNumber === participant.number;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#0A0A0C] text-white flex flex-col justify-center items-center overflow-hidden p-0 sm:p-4 select-none">
      {/* 백그라운드 앰비언트 글로우 */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-40 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 18%, ${themeCfg.glow} 0%, transparent 60%)`,
        }}
      />

      {/* 모바일 뷰포트 컨테이너 (정밀한 390~420px 모바일 네이티브 핏) */}
      <div className="relative z-10 w-full h-full max-w-[420px] flex flex-col justify-between p-5 pb-6 sm:h-[880px] sm:max-h-[94vh] sm:rounded-[36px] sm:border sm:border-white/10 sm:bg-[#101014]/80 sm:backdrop-blur-3xl sm:shadow-2xl overflow-hidden">
        
        {/* 1. 상단 미니멀 헤더 */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${themeCfg.badge}`}>
              {themeCfg.tag}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {timerSeconds !== null && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black flex items-center gap-1 shadow-md"
              >
                <Clock className="w-3 h-3 animate-spin text-zinc-900" />
                <span>{timerSeconds}s</span>
              </motion.div>
            )}

            <button
              onClick={toggleSound}
              className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </header>

        {/* 2. 중앙 컨텐츠 영역 */}
        <main className="flex-1 flex flex-col justify-center my-auto py-2">
          <AnimatePresence mode="wait">
            {!participant ? (
              /* 체크인 등록 화면 (Toss / Apple 스타일의 극도로 미니멀한 폼) */
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-[#141418] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-6"
              >
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
                    Check-in & Pass
                  </p>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                    럭키드로우 행운 번호를<br />발급받으세요.
                  </h2>
                  <p className="text-xs text-zinc-400 font-normal leading-relaxed pt-1">
                    이름 또는 닉네임을 입력하시면 1인 1매의 디지털 패스와 고유 추첨 번호가 부여됩니다.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                      Participant Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="이름 또는 닉네임"
                      maxLength={12}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white font-medium text-sm placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl text-black font-extrabold text-sm tracking-wide shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ backgroundColor: themeCfg.accent }}
                  >
                    {isSubmitting ? '발급 중...' : '입장 패스 받기'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
                  <span>현재 등록된 참가자</span>
                  <span className="text-white font-bold font-mono">
                    {appState?.participants?.length || 0} PLAYERS
                  </span>
                </div>
              </motion.div>
            ) : (
              /* 모던 디지털 패스 카드 (현대카드 / Apple Wallet 스타일) */
              <motion.div
                key="pass-card"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="space-y-4"
              >
                {/* 메인 디지털 패스 */}
                <div className="relative rounded-3xl bg-gradient-to-b from-[#181820] to-[#111116] border border-white/[0.12] p-6 shadow-2xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                  
                  {/* 상단 메타 바 */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeCfg.accent }} />
                      <span className="text-[11px] font-bold tracking-wider text-zinc-300">
                        OFFICIAL PASS
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-zinc-400">
                      ID: {participant.id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  {/* 중앙 행운 번호 */}
                  <div className="py-6 text-center">
                    <p className="text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase mb-1">
                      LUCKY DRAW NUMBER
                    </p>
                    
                    <div className="text-6xl font-black font-mono tracking-tight text-white py-1">
                      #{String(participant.number).padStart(3, '0')}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <span className="text-sm font-bold text-zinc-200">
                        {participant.name}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 px-1.5 py-0.5 rounded bg-white/5">
                        PLAYER
                      </span>
                    </div>

                    {isMeWinner && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-black shadow-md" style={{ backgroundColor: themeCfg.accent }}>
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{isMeWinner.rank}등 당첨 확정</span>
                      </div>
                    )}

                    {participant.status === 'ABSENT' && (
                      <div className="mt-3 inline-block px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700">
                        현장 부재 (실격 처리됨)
                      </div>
                    )}
                  </div>

                  {/* 하단 패스 스펙 (QR코드 + 장소/혜택 안내) */}
                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
                    <div className="p-1.5 bg-white rounded-xl shrink-0 shadow-sm">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="PASS QR" className="w-16 h-16 object-contain" />
                      ) : (
                        <div className="w-16 h-16 flex items-center justify-center text-[10px] text-zinc-500 font-mono">QR</div>
                      )}
                    </div>

                    <div className="flex-1 text-left space-y-1">
                      <p className="text-[11px] font-bold text-white flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        을지로 YUNTAKU 4F
                      </p>
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        Unlimited Party Drink + 1 Lucky Ticket
                      </p>
                      <p className="text-[9px] font-mono text-zinc-400 pt-0.5">
                        2026.10.30 - 10.31
                      </p>
                    </div>
                  </div>
                </div>

                {/* 하단 실시간 추첨 상태 알림 바 */}
                <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 text-center">
                  {isRouletteActive ? (
                    /* 롤링 진행 중 */
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                        <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: themeCfg.accent }} />
                        <span>[{currentDraw?.currentRank}등] 추첨 롤링 중</span>
                      </div>
                      <div className="text-3xl font-black font-mono tracking-widest text-white">
                        #{String(rollingNumber).padStart(3, '0')}
                      </div>
                      <p className="text-[11px] text-zinc-400">당첨 번호를 전광판과 함께 확인하세요</p>
                    </div>
                  ) : isAnnounced ? (
                    amIThisRoundWinner ? (
                      /* 내가 당첨되었을 때 */
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
                          <Sparkles className="w-4 h-4" /> 당첨을 축하합니다!
                        </div>
                        <div className="text-base font-extrabold text-white">
                          [{currentDraw?.currentWinner?.rank}등] {currentDraw?.currentWinner?.prize}
                        </div>

                        {!participant.presenceConfirmed ? (
                          <button
                            onClick={handleConfirmPresence}
                            className="w-full py-3.5 rounded-xl text-black font-black text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                            style={{ backgroundColor: themeCfg.accent }}
                          >
                            <ShieldCheck className="w-4 h-4" /> 저 현장에 있습니다 (출석 확인)
                          </button>
                        ) : (
                          <div className="py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> 출석 확인 완료! 무대로 나와주세요!
                          </div>
                        )}
                      </div>
                    ) : (
                      /* 다른 사람 당첨 시 */
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-zinc-400">
                          [{currentDraw?.currentWinner?.rank}등] 발표 완료
                        </div>
                        <div className="text-sm font-extrabold text-white">
                          당첨: #{String(currentDraw?.currentWinner?.winnerNumber).padStart(3, '0')} ({currentDraw?.currentWinner?.winnerName})
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          상품: {currentDraw?.currentWinner?.prize}
                        </p>

                        {/* 리액션 버튼 */}
                        <div className="pt-2 flex justify-center gap-2">
                          <button
                            onClick={() => sendReaction('👏')}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 transition active:scale-95"
                          >
                            👏 축하박수
                          </button>
                          <button
                            onClick={() => sendReaction('🔥')}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 transition active:scale-95"
                          >
                            🔥 대박
                          </button>
                          <button
                            onClick={() => sendReaction('🎉')}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 transition active:scale-95"
                          >
                            🎉 파티
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    /* 대기 모드 */
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        <span>추첨 대기 중</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        호스트가 추첨을 시작하면 화면이 자동으로 전환됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 3. 하단 미니멀 브랜드 라벨 */}
        <footer className="text-center pt-2">
          <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
            YUNTAKU SOCIAL CLUB • SEOUL
          </p>
        </footer>

        {/* 리액션 토스트 */}
        <AnimatePresence>
          {recentReaction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1.5 shadow-2xl z-40"
            >
              <span>{recentReaction}</span>
              <span>전광판에 응원을 보냈습니다!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 당첨자 전용 세련된 바텀 시트 */}
        <AnimatePresence>
          {showWinnerSheet && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="w-full max-w-sm bg-[#16161C] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 text-center space-y-4 shadow-2xl"
              >
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />

                <div 
                  className="w-16 h-16 mx-auto rounded-2xl text-black flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: themeCfg.accent }}
                >
                  <Trophy className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                    WINNER CONFIRMATION
                  </span>
                  <h3 className="text-xl font-black text-white">
                    {currentDraw?.currentWinner?.rank || participant?.isWinner?.rank}등 당첨을 축하합니다!
                  </h3>
                  <p className="text-sm font-bold text-zinc-300">
                    {currentDraw?.currentWinner?.prize || participant?.isWinner?.prize}
                  </p>
                </div>

                {!participant?.presenceConfirmed ? (
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleConfirmPresence}
                      className="w-full py-4 rounded-2xl text-black font-black text-sm tracking-wide shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      style={{ backgroundColor: themeCfg.accent }}
                    >
                      <CheckCircle2 className="w-5 h-5" /> 저 현장에 있습니다 (출석 확인)
                    </button>
                    <p className="text-[11px] text-zinc-400">
                      호명 제한 시간 내에 출석을 확인하지 않으면 재추첨됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="py-3 bg-emerald-500/15 text-emerald-400 text-xs font-bold rounded-2xl border border-emerald-500/30 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 출석 확인 완료! 무대로 나와주세요!
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => setShowWinnerSheet(false)}
                    className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold transition"
                  >
                    패스 화면으로 돌아가기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
