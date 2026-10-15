import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { soundFX } from '@/lib/sound';
import { AppState, Participant, ThemeType } from '@/types';
import { 
  subscribeAppState, 
  registerParticipantDirect, 
  confirmPresenceDirect, 
  sendCheerDirect 
} from '@/lib/firebase';

export interface ThemeStyleConfig {
  accent: string;
  accentBg: string;
  accentBorder: string;
  glow: string;
  badge: string;
  tag: string;
}

export const THEME_STYLES: Record<ThemeType, ThemeStyleConfig> = {
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

export function useParticipant() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [appState, setAppState] = useState<AppState | null>(null);
  const [rollingNumber, setRollingNumber] = useState<number>(1);
  const [showWinnerSheet, setShowWinnerSheet] = useState(false);
  const [recentReaction, setRecentReaction] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevPhaseRef = useRef<string>('IDLE');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTheme: ThemeType = appState?.theme || 'HALLOWEEN';
  const themeCfg = THEME_STYLES[activeTheme] || THEME_STYLES.HALLOWEEN;

  const triggerWinnerCelebration = useCallback(() => {
    setShowWinnerSheet(true);
    try {
      soundFX.playFanfare();
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([150, 80, 150, 80, 400]);
      } catch {}
    }

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [themeCfg.accent, '#FFFFFF', '#A1A1AA'],
      });
    } catch {}
  }, [themeCfg.accent]);

  // 실시간 Firebase 리스너 및 로컬 세션 복구
  useEffect(() => {
    const savedId = localStorage.getItem('lucky_draw_participant_id');
    const savedName = localStorage.getItem('lucky_draw_participant_name');

    if (savedId && savedName) {
      registerParticipantDirect(savedName, savedId)
        .then((p) => setParticipant(p))
        .catch(console.error);
    }

    const unsubscribe = subscribeAppState((state: AppState) => {
      setAppState(state);

      if (participant) {
        const me = state.participants.find((p) => p.id === participant.id);
        if (me) setParticipant(me);
      }

      const currentPhase = state.drawState?.phase;
      if (currentPhase !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhase || 'IDLE';

        if (currentPhase === 'ROULETTE') {
          soundFX.playDrumRoll(3.5);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([80, 40, 80, 40, 100]);
          }

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

          // 호명 카운트다운 타이머
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
  }, [participant?.id, participant?.number, triggerWinnerCelebration]);

  // QR 코드 자동 생성
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

  // 참가자 등록 핸들러
  const handleRegister = useCallback(async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!nameInput.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const newPart = await registerParticipantDirect(nameInput.trim());
      setParticipant(newPart);

      try {
        localStorage.setItem('lucky_draw_participant_id', newPart.id);
        localStorage.setItem('lucky_draw_participant_name', newPart.name);
        localStorage.setItem('lucky_draw_participant_number', newPart.number.toString());
      } catch (storageErr) {
        console.warn('LocalStorage 저장 제한:', storageErr);
      }

      try {
        soundFX.playFanfare();
      } catch {}
    } catch (err: any) {
      console.error('등록 실패:', err);
      alert('입장권 발급 오류: ' + (err?.message || '네트워크 상태를 확인해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [nameInput, isSubmitting]);

  // 당첨자 출석 확인 핸들러
  const handleConfirmPresence = useCallback(async () => {
    if (!participant) return;
    try {
      await confirmPresenceDirect(participant.id);
      soundFX.playFanfare();
    } catch (err) {
      console.error('출석 확인 실패:', err);
    }
  }, [participant]);

  // 실시간 리액션 전송
  const sendReaction = useCallback(async (icon: string) => {
    try {
      await sendCheerDirect(icon, participant?.name || '참가자');
      setRecentReaction(icon);
      soundFX.playTick();
      setTimeout(() => setRecentReaction(null), 1400);
    } catch (err) {
      console.error(err);
    }
  }, [participant?.name]);

  const isMeWinner = participant?.isWinner;
  const currentDraw = appState?.drawState;
  const isRouletteActive = currentDraw?.phase === 'ROULETTE';
  const isAnnounced = Boolean(currentDraw?.phase === 'ANNOUNCED' && currentDraw?.currentWinner);
  const amIThisRoundWinner = Boolean(isAnnounced && participant && currentDraw?.currentWinner?.winnerNumber === participant.number);

  return {
    participant,
    nameInput,
    setNameInput,
    isSubmitting,
    qrDataUrl,
    appState,
    rollingNumber,
    showWinnerSheet,
    setShowWinnerSheet,
    recentReaction,
    timerSeconds,
    themeCfg,
    isMeWinner,
    currentDraw,
    isRouletteActive,
    isAnnounced,
    amIThisRoundWinner,
    handleRegister,
    handleConfirmPresence,
    sendReaction,
    triggerWinnerCelebration,
  };
}
