import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { soundFX } from '@/lib/sound';
import { Haptic } from '@/lib/haptic';
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

  const participantRef = useRef<Participant | null>(null);
  participantRef.current = participant;

  const rollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevPhaseRef = useRef<string>('IDLE');
  const prevWinnerTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTheme: ThemeType = appState?.theme || 'HALLOWEEN';
  const themeCfg = THEME_STYLES[activeTheme] || THEME_STYLES.HALLOWEEN;

  const triggerWinnerCelebration = useCallback(() => {
    setShowWinnerSheet(true);
    try {
      soundFX.playFanfare();
    } catch {}

    Haptic.celebrateWinner();

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
    const unsubscribe = subscribeAppState((state: AppState) => {
      setAppState(state);

      // 매 스냅샷마다 최신 세션 ID 확인 (신규 등록 시 즉시 반영 보장)
      const currentSavedId = typeof window !== 'undefined' ? localStorage.getItem('lucky_draw_participant_id') : null;
      const targetId = currentSavedId || participantRef.current?.id;

      let currentMe: Participant | null = null;
      if (targetId) {
        const found = state.participants.find((p) => p.id === targetId);
        if (found) {
          currentMe = found;
          setParticipant(found);

          // 내가 당첨자인데 아직 출석 확인을 안 했다면 바로 당첨 화면 띄우기!
          if (found.isWinner && !found.presenceConfirmed) {
            setShowWinnerSheet(true);
          }
        } else {
          // 어드민이 초기화하여 현재 명단에 없으면 이전 세션 클리어 -> 체크인 화면 노출
          setParticipant(null);
          try {
            localStorage.removeItem('lucky_draw_participant_id');
            localStorage.removeItem('lucky_draw_participant_name');
            localStorage.removeItem('lucky_draw_participant_number');
          } catch {}
        }
      }

      const currentPhase = state.drawState?.phase;
      const currentWinner = state.drawState?.currentWinner;
      const winnerTime = currentWinner?.announcedAt || 0;

      // 룰렛 롤링 상태 처리
      if (currentPhase === 'ROULETTE') {
        if (prevPhaseRef.current !== 'ROULETTE') {
          soundFX.playDrumRoll(3.5);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([80, 40, 80, 40, 100]);
          }
        }
        if (!rollingIntervalRef.current) {
          rollingIntervalRef.current = setInterval(() => {
            setRollingNumber(Math.floor(Math.random() * 99) + 1);
            soundFX.playTick();
            Haptic.rouletteTick();
          }, 60);
        }
      } else {
        if (rollingIntervalRef.current) {
          clearInterval(rollingIntervalRef.current);
          rollingIntervalRef.current = null;
        }
      }

      // 당첨자 발표 처리 (phase 변화뿐만 아니라 새로운 당첨자가 발표될 때마다 항상 트리거!)
      if (currentPhase === 'ANNOUNCED' && currentWinner) {
        if (winnerTime !== prevWinnerTimeRef.current) {
          prevWinnerTimeRef.current = winnerTime;

          const myNumber = currentMe?.number || (targetId ? parseInt(localStorage.getItem('lucky_draw_participant_number') || '0', 10) : null);
          const isMe = myNumber !== null && myNumber === currentWinner.winnerNumber;

          if (isMe) {
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
        }
      } else if (currentPhase === 'IDLE') {
        prevWinnerTimeRef.current = 0;
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setTimerSeconds(null);
        setShowWinnerSheet(false);
      }

      prevPhaseRef.current = currentPhase || 'IDLE';
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

  // 기존 참가자 패스 즉시 복구 핸들러
  const handleRecoverParticipant = useCallback((targetName: string) => {
    const clean = targetName.trim().toLowerCase();
    if (!clean) return false;

    const existing = (appState?.participants || []).find(
      (p) => p.name.trim().toLowerCase() === clean
    );

    if (existing) {
      setParticipant(existing);
      participantRef.current = existing;

      try {
        localStorage.setItem('lucky_draw_participant_id', existing.id);
        localStorage.setItem('lucky_draw_participant_name', existing.name);
        localStorage.setItem('lucky_draw_participant_number', existing.number.toString());
      } catch (storageErr) {
        console.warn('LocalStorage 저장 제한:', storageErr);
      }

      try {
        soundFX.playFanfare();
      } catch {}
      Haptic.success();
      return true;
    }
    return false;
  }, [appState?.participants]);

  // 참가자 등록 핸들러
  const handleRegister = useCallback(async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const clean = nameInput.trim();
    if (!clean || isSubmitting) return;

    if (clean.length < 2) {
      Haptic.warning();
      alert('이름(닉네임)은 최소 2글자 이상 입력해주세요.');
      return;
    }

    // 클라이언트 사전 중복 검사: 이미 등록된 이름인 경우 즉시 본인 패스를 복구
    const existing = (appState?.participants || []).find(
      (p) => p.name.trim().toLowerCase() === clean.toLowerCase()
    );
    if (existing) {
      handleRecoverParticipant(clean);
      return;
    }

    try {
      setIsSubmitting(true);
      const newPart = await registerParticipantDirect(clean);
      if (newPart) {
        setParticipant(newPart);
        participantRef.current = newPart;

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
        Haptic.success();
      }
    } catch (err: any) {
      console.error('등록 실패:', err);
      const retryExisting = (appState?.participants || []).find(
        (p) => p.name.trim().toLowerCase() === clean.toLowerCase()
      );
      if (retryExisting) {
        handleRecoverParticipant(clean);
        return;
      }
      Haptic.warning();
      alert('입장권 발급 오류: ' + (err?.message || '네트워크 상태를 확인해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [nameInput, isSubmitting, appState?.participants, handleRecoverParticipant]);

  // 당첨자 출석 확인 핸들러
  const handleConfirmPresence = useCallback(async () => {
    if (!participant) return;
    try {
      await confirmPresenceDirect(participant.id);
      soundFX.playFanfare();
      Haptic.celebrateWinner();
    } catch (err) {
      console.error('출석 확인 실패:', err);
    }
  }, [participant]);

  // 실시간 리액션 전송
  const sendReaction = useCallback(async (icon: string) => {
    try {
      Haptic.lightTap();
      await sendCheerDirect(icon, participant?.name || '참가자');
      setRecentReaction(icon);
      soundFX.playTick();
      setTimeout(() => setRecentReaction(null), 1400);
    } catch (err) {
      console.error(err);
    }
  }, [participant?.name]);

  // Web Share API를 활용한 디지털 패스 공유 기능
  const handleShareTicket = useCallback(async () => {
    if (!participant) return;
    Haptic.lightTap();

    const shareData = {
      title: `${appState?.eventName || '행운의 럭키드로우'} 입장권`,
      text: `[${participant.name}]님의 행운의 번호는 No.${String(participant.number).padStart(3, '0')} 입니다! 행운을 빕니다 ✨`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        // 사용자가 취소했거나 미지원
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        alert('입장권 번호와 링크가 클립보드에 복사되었습니다!');
      } catch (e) {}
    }
  }, [participant, appState?.eventName]);

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
    handleRecoverParticipant,
    handleConfirmPresence,
    sendReaction,
    triggerWinnerCelebration,
    handleShareTicket,
  };
}
