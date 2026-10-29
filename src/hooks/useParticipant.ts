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
  sendCheerDirect,
  getFirebaseDb,
  EVENT_DOC_PATH
} from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface ThemeStyleConfig {
  accent: string;
  accentBg: string;
  accentBorder: string;
  glow: string;
  badge: string;
  tag: string;
}

// 다중 계층 세션 저장소 (URL Query + LocalStorage + SessionStorage + Cookie)
function saveParticipantSession(p: Participant) {
  if (typeof window === 'undefined') return;

  // 1. LocalStorage
  try {
    localStorage.setItem('lucky_draw_participant_id', p.id);
    localStorage.setItem('lucky_draw_participant_name', p.name);
    localStorage.setItem('lucky_draw_participant_number', p.number.toString());
  } catch {}

  // 2. SessionStorage
  try {
    sessionStorage.setItem('lucky_draw_participant_id', p.id);
    sessionStorage.setItem('lucky_draw_participant_name', p.name);
    sessionStorage.setItem('lucky_draw_participant_number', p.number.toString());
  } catch {}

  // 3. Document Cookie (7일간 유효, 인앱 브라우저 및 Safari Private 모드 대응)
  try {
    document.cookie = `lucky_draw_pid=${encodeURIComponent(p.id)}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `lucky_draw_pname=${encodeURIComponent(p.name)}; path=/; max-age=604800; SameSite=Lax`;
  } catch {}

  // 4. URL Query Param (?p=user_xxx) - 브라우저 새로고침(F5) 시 100% 영구 보존
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('p') !== p.id) {
      url.searchParams.set('p', p.id);
      window.history.replaceState(null, '', url.toString());
    }
  } catch {}
}

function clearParticipantSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('lucky_draw_participant_id');
    localStorage.removeItem('lucky_draw_participant_name');
    localStorage.removeItem('lucky_draw_participant_number');
  } catch {}
  try {
    sessionStorage.removeItem('lucky_draw_participant_id');
    sessionStorage.removeItem('lucky_draw_participant_name');
    sessionStorage.removeItem('lucky_draw_participant_number');
  } catch {}
  try {
    document.cookie = 'lucky_draw_pid=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'lucky_draw_pname=; path=/; max-age=0; SameSite=Lax';
  } catch {}
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('p')) {
      url.searchParams.delete('p');
      window.history.replaceState(null, '', url.toString());
    }
  } catch {}
}

function getSavedParticipantInfo(): { targetId: string | null; targetName: string | null } {
  if (typeof window === 'undefined') return { targetId: null, targetName: null };

  // 1. URL 쿼리 파라미터 우선 확인 (?p=xxx 또는 ?name=xxx)
  let urlId: string | null = null;
  let urlName: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    urlId = params.get('p');
    urlName = params.get('name');
  } catch {}

  // 2. LocalStorage
  let localId: string | null = null;
  let localName: string | null = null;
  try {
    localId = localStorage.getItem('lucky_draw_participant_id');
    localName = localStorage.getItem('lucky_draw_participant_name');
  } catch {}

  // 3. SessionStorage
  let sessId: string | null = null;
  let sessName: string | null = null;
  try {
    sessId = sessionStorage.getItem('lucky_draw_participant_id');
    sessName = sessionStorage.getItem('lucky_draw_participant_name');
  } catch {}

  // 4. Cookie
  let cookieId: string | null = null;
  let cookieName: string | null = null;
  try {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'lucky_draw_pid' && v) cookieId = decodeURIComponent(v);
      if (k === 'lucky_draw_pname' && v) cookieName = decodeURIComponent(v);
    }
  } catch {}

  const targetId = urlId || localId || sessId || cookieId || null;
  const targetName = urlName || localName || sessName || cookieName || null;

  return { targetId, targetName };
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

      // 세션 참가자 매칭: 다중 계층 세션 저장소에서 안전하게 복구
      const { targetId: savedId, targetName: savedName } = getSavedParticipantInfo();
      const targetId = participantRef.current?.id || savedId;
      const targetName = participantRef.current?.name || savedName;

      let currentMe: Participant | null = null;
      if (targetId || targetName) {
        const found = state.participants.find((p) => 
          (targetId && p.id === targetId) ||
          (targetName && p.name.trim().toLowerCase() === targetName.trim().toLowerCase())
        );

        if (found) {
          currentMe = found;
          setParticipant(found);
          participantRef.current = found;
          saveParticipantSession(found);

          // 내가 당첨자인데 아직 출석 확인을 안 했다면 바로 당첨 화면 띄우기!
          if (found.isWinner && !found.presenceConfirmed) {
            setShowWinnerSheet(true);
          } else if (!found.isWinner) {
            setShowWinnerSheet(false);
          }
        } else if (state.participants.length === 0) {
          // 어드민이 명단을 '0명 완전 초기화'했을 때만 세션 클리어!
          setParticipant(null);
          participantRef.current = null;
          clearParticipantSession();
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

      // 당첨자 발표 처리
      const announcedWinners = state.drawState?.currentWinners && state.drawState.currentWinners.length > 0
        ? state.drawState.currentWinners
        : (currentWinner ? [currentWinner] : []);

      if (currentPhase === 'ANNOUNCED' && announcedWinners.length > 0) {
        const winnerTime = announcedWinners[0]?.announcedAt || currentWinner?.announcedAt || 0;
        const isFreshAnnouncement = prevWinnerTimeRef.current !== 0 && winnerTime !== prevWinnerTimeRef.current;
        const timeSinceAnnouncedSec = winnerTime ? Math.floor((Date.now() - winnerTime) / 1000) : 999;

        if (winnerTime !== prevWinnerTimeRef.current) {
          prevWinnerTimeRef.current = winnerTime;

          const myNumber = currentMe?.number || (targetId ? parseInt(localStorage.getItem('lucky_draw_participant_number') || '0', 10) : null);
          const isMe = myNumber !== null && announcedWinners.some((w) => w.winnerNumber === myNumber);

          // 실시간으로 방금 발표되었거나 15초 이내의 최신 발표일 때만 축하 효과 발동
          if (isFreshAnnouncement || timeSinceAnnouncedSec < 15) {
            if (isMe) {
              triggerWinnerCelebration();
            } else {
              soundFX.playCheer();
            }
          }

          // 호명 카운트다운 타이머:
          // 발표 후 30초가 이미 지났거나 이전 발표인 경우 타이머를 띄우지 않음!
          // 실시간 발표이거나 30초 이내인 경우 남은 초만큼만 카운트다운
          const remainingSec = Math.max(0, 30 - timeSinceAnnouncedSec);
          if ((isFreshAnnouncement || timeSinceAnnouncedSec < 30) && remainingSec > 0) {
            setTimerSeconds(remainingSec);
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
          } else {
            setTimerSeconds(null);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          }
        }
      } else if (currentPhase === 'IDLE' || !currentPhase) {
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
  }, [triggerWinnerCelebration]);

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

  // 최초 진입 시 저장된 이름이 있으면 자동 채우기 및 복구 시도
  useEffect(() => {
    if (typeof window !== 'undefined' && !participant) {
      const { targetName } = getSavedParticipantInfo();
      if (targetName && !nameInput) {
        setNameInput(targetName);
      }
    }
  }, [participant]);

  // 기존 참가자 패스 즉시 복구 핸들러
  const handleRecoverParticipant = useCallback(async (targetName: string) => {
    const clean = targetName.trim().toLowerCase();
    if (!clean) return false;

    // 1. 메모리상의 appState에서 검색
    let existing = (appState?.participants || []).find(
      (p) => p.name.trim().toLowerCase() === clean
    );

    // 2. 만약 메모리에 없다면 Firestore 직접 조회 시도 (새로고침 직후 등)
    if (!existing) {
      try {
        const firestore = getFirebaseDb();
        const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
        const snap = await getDoc(eventRef);
        if (snap.exists()) {
          const data = snap.data() as AppState;
          existing = (data.participants || []).find(
            (p) => p.name.trim().toLowerCase() === clean
          );
        }
      } catch (e) {
        console.warn('패스 복구 직접 조회 실패:', e);
      }
    }

    if (existing) {
      setParticipant(existing);
      participantRef.current = existing;
      saveParticipantSession(existing);

      try {
        soundFX.playFanfare();
      } catch {}
      Haptic.success();
      setNameInput('');
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
      await handleRecoverParticipant(clean);
      return;
    }

    try {
      setIsSubmitting(true);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lucky_draw_participant_name', clean);
          sessionStorage.setItem('lucky_draw_participant_name', clean);
          document.cookie = `lucky_draw_pname=${encodeURIComponent(clean)}; path=/; max-age=604800; SameSite=Lax`;
        } catch {}
      }

      const newPart = await registerParticipantDirect(clean);
      if (newPart) {
        setParticipant(newPart);
        participantRef.current = newPart;
        saveParticipantSession(newPart);

        try {
          soundFX.playFanfare();
        } catch {}
        Haptic.success();
        setNameInput('');
      }
    } catch (err: any) {
      console.warn('등록 1차 처리 중 예외 발생, 백엔드 직접 조회 복구 시도:', err);
      // 모바일 환경에서 네트워크 순단/타임아웃 등으로 에러가 발생했더라도,
      // 백엔드 Firestore에 이미 등록되었는지 최신 데이터를 직접 확인!
      try {
        const firestore = getFirebaseDb();
        const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
        const snap = await getDoc(eventRef);
        if (snap.exists()) {
          const data = snap.data() as AppState;
          const found = (data.participants || []).find(
            (p) => p.name.trim().toLowerCase() === clean.toLowerCase()
          );
          if (found) {
            setParticipant(found);
            participantRef.current = found;
            saveParticipantSession(found);
            setNameInput('');
            try { soundFX.playFanfare(); } catch {}
            Haptic.success();
            return;
          }
        }
      } catch (recoverErr) {
        console.warn('직접 복구 조회 실패:', recoverErr);
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
  const roundWinners = currentDraw?.currentWinners && currentDraw.currentWinners.length > 0
    ? currentDraw.currentWinners
    : (currentDraw?.currentWinner ? [currentDraw.currentWinner] : []);
  const isAnnounced = Boolean(currentDraw?.phase === 'ANNOUNCED' && roundWinners.length > 0);
  const amIThisRoundWinner = Boolean(
    isAnnounced && participant && roundWinners.some((w) => w.winnerNumber === participant.number)
  );

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
