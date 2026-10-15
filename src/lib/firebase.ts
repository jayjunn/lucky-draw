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
  runTransaction,
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

export const DEFAULT_EVENT_NOTICE = {
  instagramUrl: 'https://www.instagram.com/yuntaku.seoul?utm_source=ig_web_button_share_sheet&psln=ZDNlZDc0MzIxNw==',
  instagramHandle: '@yuntaku.seoul',
  posterImageUrl: '/images/poster.jpg',
  eventDate: '10.30 FRI — 10.31 SAT',
  location: '서울 중구 을지로18길 25-2, 4F (을지로 윤타쿠)',
  entryFee: '25,000 KRW (데킬라 & 보드카 무제한)',
  luckyDrawInfo: '1인 1회 (바틀, 패션, 리빙, 키링 등 20종+ 선물)',
  noticeTitle: '🎃 HALLOWEEN × 1st ANNIVERSARY 🎉',
  noticeFullText: `ハイサイ! 여러분, 혹시 알고 계셨나요? 👀
다가오는 11월, 윤타쿠가 벌써 1️⃣주년을 맞이합니다! 🎂🎉

작년 10월 30일부터 11월 1일까지, 
설레는 마음으로 가오픈을 했던 게 엊그제 같은데 벌써 1년이라뇻?!!🥹

윤타쿠의 첫 시작을 함께해 주시고, 지금까지 꾸준히 찾아와 주신 모든 분들께 진심으로 감사드립니다🙇‍♀️🙇🙇‍♀️🙇

그리고 이 특별한 순간을 그냥 지나칠 수 없겠죠?

💃🏻올해도 준비했습니다!🕺
💙 𝒀𝑼𝑵𝑻𝑨𝑲𝑼 𝑺𝑶𝑪𝑰𝑨𝑳 𝑪𝑳𝑼𝑩 💙
🎃 ʜᴀʟʟᴏᴡᴇᴇɴ × 𝟷sᴛ ᴀɴɴɪᴠᴇʀsᴀʀʏ 🎉

📅 𝟭𝟬.𝟯𝟬 𝗙𝗥𝗜 — 𝟭𝟬.𝟯𝟭 𝗦𝗔𝗧
10월 30일(금)과 31일(토), 이틀 동안 윤타쿠의 1주년과 할로윈을 함께 기념하는 특별한 파티를 진행합니다! 🥂

이번에는 조금 더 자유롭게, 조금 더 신나게 즐길 수 있도록 준비했어요🎶

🎁 𝗟𝗨𝗖𝗞𝗬 𝗗𝗥𝗔𝗪
절대 놓칠 수 없는 럭키드로우🍀
참여 기회는 1인당 한 번씩!
바틀부터 패션, 리빙, 키링 등 무려 20가지가 넘는 다양한 선물을 준비했습니다. 🎁🧸
가벼운 마음으로 참여해 보시고, 행운의 주인공이 되어보세요. 🪄

🍸 𝗘𝗡𝗧𝗥𝗬 𝗙𝗘𝗘 — 𝟮𝟱,𝟬𝟬𝟬 𝗞𝗥𝗪
입장료는 1인 25,000원!
입장과 함께 데킬라와 보드카를 무제한으로 즐기실 수 있습니다. 🥃✨
🧃논알콜을 원하시는 분들을 위해 콜라와 토닉(각 2,000원)도 준비되어 있으나 외부에서 가져오셔도 완.전. 괜찮습니다! 🆗👌

👯친구와 함께 오셔도, 혼자 오셔도 좋습니다.🧚‍♀️
클럽처럼 정해진 방식으로 즐기기보다는 각자의 방식으로 자유롭게 어울리고, 처음 만난 사람과도 자연스럽게 이야기를 나눌 수 있는 윤타쿠!
할로윈을 핑계 삼아 일상에서 벗어난 특별한 밤을 보내보세요. 🕯️🦇 

지난 1년 동안 윤타쿠를 찾아주신 분들도,
이번 기회에 처음 방문하시는 분들도 모두 환영합니다!
윤타쿠의 첫 번째 생일을 함께 축하해 주세요! 🥂🖤 💋

𝚂𝚎𝚎 𝚢𝚘𝚞 𝚊𝚝 𝚈𝚄𝙽𝚃𝙰𝙺𝚄 𝚂𝙾𝙲𝙸𝙰𝙻 𝙲𝙻𝚄𝙱. 
𝟷𝟶.𝟹𝟶 𝙵𝚁𝙸 — 𝟷𝟶.𝟹𝟷 𝚂𝙰𝚃

📍 윤타쿠 | 서울 중구 을지로18길 25-2, 4F`,
};

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
  notice: DEFAULT_EVENT_NOTICE,
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

// 2. 참가자 등록 (Client-side Firebase Direct with Atomic Transaction)
export async function registerParticipantDirect(name: string, existingId?: string): Promise<Participant | null> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  return await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);

    let currentParticipants: Participant[] = [];
    if (snap.exists()) {
      const data = snap.data() as AppState;
      currentParticipants = data.participants || [];
    }

    // 기존 등록자 재접속 확인 (존재하지 않으면 절대 자동 생성하지 않고 null 반환!)
    if (existingId) {
      const found = currentParticipants.find((p) => p.id === existingId);
      if (found) return found;
      return null; // DB에 없으면(초기화된 상태) 새 번호를 만들지 않음
    }

    // 이름 유효성 검사 (최소 2글자 이상)
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      throw new Error('이름(닉네임)은 최소 2글자 이상 입력해주세요.');
    }

    // 중복 닉네임 원자적 검사 (동일 이름 중복 방지)
    const normalized = cleanName.toLowerCase();
    const isDuplicate = currentParticipants.some(
      (p) => p.name.trim().toLowerCase() === normalized
    );
    if (isDuplicate) {
      throw new Error(`'${cleanName}'(은)는 이미 등록된 이름입니다. 다른 이름을 입력해주세요.`);
    }

    // 신규 번호 원자적(Atomic) 채번
    const maxNumber = currentParticipants.reduce((max, p) => Math.max(max, p.number || 0), 0);
    const nextNumber = maxNumber + 1;
    const newParticipant: Participant = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      number: nextNumber,
      name: cleanName,
      registeredAt: Date.now(),
      status: 'ACTIVE',
      presenceConfirmed: false,
    };

    const updatedParticipants = [...currentParticipants, newParticipant];
    if (!snap.exists()) {
      transaction.set(eventRef, {
        ...INITIAL_APP_STATE,
        participants: updatedParticipants,
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.update(eventRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp(),
      });
    }

    return newParticipant;
  });
}

// 3. 참가자 현장 출석 확인 (Atomic Transaction)
export async function confirmPresenceDirect(participantId: string): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppState;
    const updatedParticipants = (data.participants || []).map((p) => {
      if (p.id === participantId) {
        return { ...p, presenceConfirmed: true };
      }
      return p;
    });

    const targetParticipant = (data.participants || []).find((p) => p.id === participantId);
    const targetNumber = targetParticipant?.number;

    let updatedDrawState = { ...data.drawState };
    if (updatedDrawState.currentWinner) {
      updatedDrawState.currentWinner.confirmed = true;
    }

    const updatedPrizes = (data.prizes || []).map((prize) => {
      if (prize.winner && (prize.winner.number === targetNumber || (updatedDrawState.currentWinner && prize.rank === updatedDrawState.currentWinner.rank))) {
        return {
          ...prize,
          winner: { ...prize.winner, confirmed: true },
        };
      }
      return prize;
    });

    transaction.update(eventRef, {
      participants: updatedParticipants,
      prizes: updatedPrizes,
      drawState: updatedDrawState,
      updatedAt: serverTimestamp(),
    });
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

// 5. 어드민 당첨자 발표 (Atomic Transaction)
export async function announceWinnerDirect(rank: number, targetNumber?: number): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  let winnerInfo: any = null;

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
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
    winnerInfo = {
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

    transaction.update(eventRef, {
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
  });

  // 당첨 로그 추가 (비동기)
  if (winnerInfo) {
    await addDoc(collection(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1], 'draw_logs'), {
      ...winnerInfo,
      type: 'WINNER',
      createdAt: new Date().toISOString(),
      formattedDate: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      timestamp: serverTimestamp(),
    });
  }
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

// 10. 파티 공지 및 인스타그램 설정 업데이트 (어드민 커스텀)
export async function updateEventNoticeDirect(notice: Partial<typeof DEFAULT_EVENT_NOTICE>): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  const snap = await getDoc(eventRef);
  let currentNotice = DEFAULT_EVENT_NOTICE;
  if (snap.exists()) {
    const data = snap.data() as AppState;
    if (data.notice) {
      currentNotice = { ...DEFAULT_EVENT_NOTICE, ...data.notice };
    }
  }
  await updateDoc(eventRef, {
    notice: { ...currentNotice, ...notice },
    updatedAt: serverTimestamp(),
  });
}

// 기존 로컬 백업 호환용 빈 구현
export async function saveEventStateToDb(state: AppState) {}
export async function logDrawResultToDb(data: any) {}
