import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  getDoc,
  collection, 
  addDoc, 
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { AppState, Participant, Prize, DrawState, ThemeType } from '../types';

// personal-app에서 가져온 Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD5r_oM048hxGgBt79clJ-k8-svm0BURHg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "portfolio-ddc4d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "portfolio-ddc4d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "portfolio-ddc4d.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "864436147965",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:864436147965:web:57291e7e66624983dd1094",
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseDb(): Firestore {
  if (db) return db;
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  return db;
}

const EVENT_DOC_PATH = ['lucky_draw_events', 'current_event'] as const;

// 기본 상품 목록
const DEFAULT_PRIZES: Prize[] = [
  { id: 'prize-5', rank: 5, title: '스타벅스 e-카드 3만원권', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-4', rank: 4, title: '올리브영 기프트카드 5만원권', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-3', rank: 3, title: '에어팟 4세대 노이즈캔슬링', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-2', rank: 2, title: '다이슨 슈퍼소닉 헤어드라이어', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-1', rank: 1, title: 'iPhone 16 Pro 256GB', count: 1, announced: false, winner: null, absentHistory: [] },
];

export const INITIAL_APP_STATE: AppState = {
  participants: [],
  prizes: DEFAULT_PRIZES,
  drawState: {
    currentRank: null,
    phase: 'IDLE',
    currentWinner: null,
    callTimer: null,
  },
  eventName: 'YUNTAKU 1ST & HALLOWEEN PARTY',
  allowDuplicateWin: false,
  theme: 'HALLOWEEN',
};

// 1. 실시간 이벤트 상태 구독 (onSnapshot)
export function subscribeAppState(callback: (state: AppState) => void): Unsubscribe {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  return onSnapshot(eventRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data() as AppState;
      callback({
        ...INITIAL_APP_STATE,
        ...data,
      });
    } else {
      // 최초 실행 시 기본 상태로 초기화
      await setDoc(eventRef, {
        ...INITIAL_APP_STATE,
        updatedAt: serverTimestamp(),
      });
      callback(INITIAL_APP_STATE);
    }
  }, (error) => {
    console.error('Firebase snapshot listener error:', error);
  });
}

// 2. 참가자 등록 (Client-side Firebase Direct)
export async function registerParticipantDirect(name: string, existingId?: string): Promise<Participant> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  const snap = await getDoc(eventRef);

  let currentParticipants: Participant[] = [];
  if (snap.exists()) {
    const data = snap.data() as AppState;
    currentParticipants = data.participants || [];
  }

  // 기존 등록자 재접속 확인
  if (existingId) {
    const found = currentParticipants.find((p) => p.id === existingId);
    if (found) return found;
  }

  // 신규 번호 채번
  const maxNumber = currentParticipants.reduce((max, p) => Math.max(max, p.number || 0), 0);
  const nextNumber = maxNumber + 1;
  const newParticipant: Participant = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    number: nextNumber,
    name: name.trim(),
    registeredAt: Date.now(),
    status: 'ACTIVE',
    presenceConfirmed: false,
  };

  const updatedParticipants = [...currentParticipants, newParticipant];
  await updateDoc(eventRef, {
    participants: updatedParticipants,
    updatedAt: serverTimestamp(),
  });

  return newParticipant;
}

// 3. 참가자 현장 출석 확인
export async function confirmPresenceDirect(participantId: string): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;

  const data = snap.data() as AppState;
  const updatedParticipants = (data.participants || []).map((p) => {
    if (p.id === participantId) {
      return { ...p, presenceConfirmed: true };
    }
    return p;
  });

  let updatedDrawState = { ...data.drawState };
  if (updatedDrawState.currentWinner) {
    updatedDrawState.currentWinner.confirmed = true;
  }

  await updateDoc(eventRef, {
    participants: updatedParticipants,
    drawState: updatedDrawState,
    updatedAt: serverTimestamp(),
  });
}

// 4. 어드민 추첨 롤링 시작
export async function startRouletteDirect(rank: number): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  await updateDoc(eventRef, {
    drawState: {
      currentRank: rank,
      phase: 'ROULETTE',
      currentWinner: null,
      callTimer: null,
    },
    updatedAt: serverTimestamp(),
  });
}

// 5. 어드민 당첨자 발표
export async function announceWinnerDirect(rank: number, targetNumber?: number): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;

  const data = snap.data() as AppState;
  const prize = data.prizes.find((p) => p.rank === rank);
  if (!prize) return;

  const wonNumbers = new Set(
    data.prizes.filter((p) => p.winner && p.rank !== rank).map((p) => p.winner!.number)
  );
  const absentNumbers = new Set(
    data.participants.filter((p) => p.status === 'ABSENT').map((p) => p.number)
  );

  let candidates = data.participants.filter((p) => {
    if (absentNumbers.has(p.number)) return false;
    if (!data.allowDuplicateWin && wonNumbers.has(p.number)) return false;
    return true;
  });

  if (targetNumber) {
    const specified = candidates.find((p) => p.number === targetNumber);
    if (specified) candidates = [specified];
  }

  if (candidates.length === 0) {
    throw new Error('추첨 가능한 참가자가 없습니다.');
  }

  const winner = candidates[Math.floor(Math.random() * candidates.length)];
  const winnerInfo = {
    rank,
    prize: prize.title,
    winnerNumber: winner.number,
    winnerName: winner.name,
    announcedAt: Date.now(),
    confirmed: false,
  };

  const updatedPrizes = data.prizes.map((p) => {
    if (p.rank === rank) {
      return {
        ...p,
        winner: { number: winner.number, name: winner.name, confirmed: false },
        announced: true,
      };
    }
    return p;
  });

  const updatedParticipants = data.participants.map((p) => {
    if (p.id === winner.id) {
      return {
        ...p,
        isWinner: { rank, prize: prize.title, announcedAt: Date.now() },
        presenceConfirmed: false,
      };
    }
    return p;
  });

  await updateDoc(eventRef, {
    prizes: updatedPrizes,
    participants: updatedParticipants,
    drawState: {
      currentRank: rank,
      phase: 'ANNOUNCED',
      currentWinner: winnerInfo,
      callTimer: 30,
    },
    updatedAt: serverTimestamp(),
  });

  // 당첨 로그 추가
  await addDoc(collection(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1], 'draw_logs'), {
    ...winnerInfo,
    type: 'WINNER',
    createdAt: new Date().toISOString(),
    formattedDate: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    timestamp: serverTimestamp(),
  });
}

// 6. 부재자 실격 및 재추첨
export async function redrawAbsentDirect(rank: number): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;

  const data = snap.data() as AppState;
  const currentWinner = data.drawState.currentWinner;
  if (!currentWinner) return;

  const absentNumber = currentWinner.winnerNumber;
  const absentName = currentWinner.winnerName;

  // 부재자 실격 처리
  const updatedParticipants = data.participants.map((p) => {
    if (p.number === absentNumber) {
      return { ...p, status: 'ABSENT' as const, isWinner: undefined };
    }
    return p;
  });

  const updatedPrizes = data.prizes.map((p) => {
    if (p.rank === rank) {
      const history = p.absentHistory || [];
      return {
        ...p,
        winner: null,
        announced: false,
        absentHistory: [...history, { number: absentNumber, name: absentName, at: Date.now() }],
      };
    }
    return p;
  });

  await updateDoc(eventRef, {
    participants: updatedParticipants,
    prizes: updatedPrizes,
    drawState: {
      currentRank: rank,
      phase: 'IDLE',
      currentWinner: null,
      callTimer: null,
    },
    updatedAt: serverTimestamp(),
  });

  // 부재 로그 기록
  await addDoc(collection(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1], 'draw_logs'), {
    rank,
    prize: currentWinner.prize,
    winnerNumber: absentNumber,
    winnerName: absentName,
    type: 'ABSENT_CANCELLED',
    reason: '현장 미출석으로 인한 실격',
    createdAt: new Date().toISOString(),
    formattedDate: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    timestamp: serverTimestamp(),
  });
}

// 7. 실시간 리액션 전송 (박수/불꽃 등)
export async function sendCheerDirect(emoji: string, name: string): Promise<void> {
  const firestore = getFirebaseDb();
  await addDoc(collection(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1], 'cheers'), {
    emoji,
    name,
    createdAt: Date.now(),
    timestamp: serverTimestamp(),
  });
}

// 8. 테마 변경
export async function setThemeDirect(theme: ThemeType): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  await updateDoc(eventRef, { theme, updatedAt: serverTimestamp() });
}

// 9. 전체 초기화 (데이터 리셋)
export async function resetAllDirect(): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  await setDoc(eventRef, {
    ...INITIAL_APP_STATE,
    updatedAt: serverTimestamp(),
  });
}

// 기존 로컬 백업 호환용 빈 구현
export async function saveEventStateToDb(state: AppState) {}
export async function logDrawResultToDb(data: any) {}
