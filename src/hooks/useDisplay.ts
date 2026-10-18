import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { getSocket } from '@/lib/socket';
import { soundFX } from '@/lib/sound';
import { AppState, ThemeType } from '@/types';
import { subscribeAppState } from '@/lib/firebase';

export interface FloatingReaction {
  id: string;
  emoji: string;
  name: string;
  x: number;
}

export function useDisplay() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [rollingNumber, setRollingNumber] = useState<number>(1);
  const [rollingNumbers, setRollingNumbers] = useState<number[]>([1]);
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
        const batchCount = state.drawState.batchCount || 1;
        const maxNum = Math.max(state.participants?.length || 0, 99);

        if (!rollingIntervalRef.current) {
          soundFX.playDrumRoll(4);
          rollingIntervalRef.current = setInterval(() => {
            const nextNums = Array.from({ length: batchCount }, () => Math.floor(Math.random() * maxNum) + 1);
            setRollingNumbers(nextNums);
            setRollingNumber(nextNums[0]);
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

    socket.on('draw_roulette_start', (data?: { batchCount?: number }) => {
      soundFX.playDrumRoll(4);
      setTimerSeconds(null);
      setPresenceAlert(null);
      setCancelAlert(null);

      const count = data?.batchCount || 1;
      if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
      rollingIntervalRef.current = setInterval(() => {
        const nextNums = Array.from({ length: count }, () => Math.floor(Math.random() * 99) + 1);
        setRollingNumbers(nextNums);
        setRollingNumber(nextNums[0]);
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

  return {
    appState,
    qrUrl,
    showQrModal,
    setShowQrModal,
    isMuted,
    toggleSound,
    toggleFullScreen,
    rollingNumber,
    rollingNumbers,
    reactions,
    timerSeconds,
    presenceAlert,
    cancelAlert,
    theme,
  };
}
