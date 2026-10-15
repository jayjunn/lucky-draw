import { useState, useEffect, useCallback } from 'react';
import { AppState, Prize, ThemeType } from '@/types';
import { getSocket } from '@/lib/socket';
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

export function useAdmin() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'prizes' | 'themes' | 'logs' | 'settings'>('draw');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [manualNumberInput, setManualNumberInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eventNameInput, setEventNameInput] = useState<string>('');

  const [newPrizeTitle, setNewPrizeTitle] = useState<string>('');
  const [newPrizeRank, setNewPrizeRank] = useState<number>(1);
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editRank, setEditRank] = useState<number>(1);

  // 세션스토리지 PIN 인증 복구
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const unlocked = sessionStorage.getItem('lucky_draw_admin_unlocked') === 'true';
      setIsUnlocked(unlocked);
    }
  }, []);

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lucky_draw_admin_unlocked', 'true');
    }
  }, []);

  const handleLock = useCallback(() => {
    setIsUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('lucky_draw_admin_unlocked');
    }
  }, []);

  // Firebase 실시간 리스너 구독
  useEffect(() => {
    const socket = getSocket();

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

  // 추첨 시작 (롤링)
  const handleStartDraw = async (rank: number) => {
    try {
      await startRouletteDirect(rank);
    } catch (e) {
      console.warn(e);
    }
    const socket = getSocket();
    socket.emit('admin_start_draw', { rank });
  };

  // 당첨자 발표
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

  // 부재자 실격 및 재추첨
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

  // 호명 타이머 시작
  const handleStartTimer = (seconds: number = 30) => {
    const socket = getSocket();
    socket.emit('admin_start_call_timer', { seconds });
  };

  // 더미 참가자 생성
  const handleGenerateDummies = async (count: number) => {
    const dummyNames = [
      '김을지', '박파티', '이유령', '최할로윈', '정잭오', '강호박', '윤마녀', '장뱀파',
      '신늑대', '한프랑켄', '오미라', '서스켈레톤', '권고스트', '황블랙', '안오렌지',
      '송을지로', '유클럽', '홍윤탁', '문소셜', '배을지'
    ];
    
    if (!appState) return;
    const currentMax = (appState.participants || []).reduce((max, p) => Math.max(max, p.number || 0), 0);
    const newDummies = Array.from({ length: count }, (_, i) => ({
      id: 'dummy_' + Math.random().toString(36).substring(2, 9),
      number: currentMax + i + 1,
      name: dummyNames[(currentMax + i) % dummyNames.length] + `_${currentMax + i + 1}`,
      registeredAt: Date.now() + i * 10,
      status: 'ACTIVE' as const,
      presenceConfirmed: false,
    }));

    const updatedParticipants = [...(appState.participants || []), ...newDummies];
    try {
      const firestore = getFirebaseDb();
      await updateDoc(doc(firestore, 'lucky_draw_events', 'current_event'), {
        participants: updatedParticipants,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn(e);
    }

    const socket = getSocket();
    socket.emit('admin_generate_dummies', { count });
  };

  // 당첨 내역만 초기화
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

  // 전체 초기화
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

  // 상품 추가
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

  // 상품 삭제
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

  // 테마 변경
  const handleThemeChange = async (theme: ThemeType) => {
    try {
      await setThemeDirect(theme);
    } catch (e) {
      console.warn(e);
    }
    const socket = getSocket();
    socket.emit('admin_set_theme', { theme });
  };

  // 이벤트명 변경
  const handleSaveEventName = async () => {
    if (!eventNameInput.trim()) return;
    try {
      const firestore = getFirebaseDb();
      await updateDoc(doc(firestore, 'lucky_draw_events', 'current_event'), {
        eventName: eventNameInput.trim(),
        updatedAt: serverTimestamp(),
      });
      alert('이벤트 타이틀이 저장되었습니다.');
    } catch (e) {
      console.warn(e);
    }
  };

  return {
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
    editingPrizeId,
    setEditingPrizeId,
    editTitle,
    setEditTitle,
    editRank,
    setEditRank,
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
  };
}
