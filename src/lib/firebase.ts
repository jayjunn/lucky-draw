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

const EVENT_DOC_ID = process.env.NEXT_PUBLIC_EVENT_DOC_ID || 'current_event';
export const EVENT_DOC_PATH = ['lucky_draw_events', EVENT_DOC_ID] as const;

/**
 * Firestore는 undefined 값을 허용하지 않으므로 (Unsupported field value: undefined 오류),
 * 객체 및 배열 내 모든 undefined 속성을 재귀적으로 안전하게 제거하는 헬퍼 함수
 * (serverTimestamp 등 FieldValue 및 Date 객체는 온전히 보존)
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;
  if (val instanceof Date) return val;
  // Firestore FieldValue (_methodName 또는 constructor 확인)
  if ('_methodName' in (val as any)) return val;

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const key of Object.keys(val as any)) {
    const v = (val as any)[key];
    if (v !== undefined) {
      result[key] = sanitizeForFirestore(v);
    }
  }
  return result as T;
}

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

    // 중복 닉네임 원자적 검사 (동일 이름 중복 시 새 번호를 발급하지 않고 기존 등록자 정보 반환)
    const normalized = cleanName.toLowerCase();
    const existingParticipant = currentParticipants.find(
      (p) => p.name.trim().toLowerCase() === normalized
    );
    if (existingParticipant) {
      return existingParticipant;
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
    const targetParticipant = (data.participants || []).find((p) => p.id === participantId);
    const targetNumber = targetParticipant?.number;

    const updatedParticipants = (data.participants || []).map((p) => {
      if (p.id === participantId) {
        return { ...p, presenceConfirmed: true };
      }
      return p;
    });

    let updatedDrawState = { ...data.drawState };
    if (updatedDrawState.currentWinner) {
      if (
        updatedDrawState.currentWinner.participantId === participantId ||
        updatedDrawState.currentWinner.winnerNumber === targetNumber
      ) {
        updatedDrawState.currentWinner = { ...updatedDrawState.currentWinner, confirmed: true };
      }
    }
    if (updatedDrawState.currentWinners) {
      updatedDrawState.currentWinners = updatedDrawState.currentWinners.map((w) => {
        if (w.participantId === participantId || w.winnerNumber === targetNumber) {
          return { ...w, confirmed: true };
        }
        return w;
      });
    }

    const updatedPrizes = (data.prizes || []).map((prize) => {
      let isTargetPrize = false;
      const updatedWinners = (prize.winners || []).map((w) => {
        if (w.number === targetNumber || w.id === participantId) {
          isTargetPrize = true;
          return { ...w, confirmed: true };
        }
        return w;
      });

      let updatedWinner = prize.winner;
      if (
        prize.winner &&
        (prize.winner.number === targetNumber ||
          (updatedDrawState.currentWinner && prize.rank === updatedDrawState.currentWinner.rank))
      ) {
        updatedWinner = { ...prize.winner, confirmed: true };
      }

      if (isTargetPrize || (updatedWinner && updatedWinner.confirmed !== prize.winner?.confirmed)) {
        return {
          ...prize,
          winner: updatedWinner,
          winners: updatedWinners.length > 0 ? updatedWinners : (updatedWinner ? [updatedWinner] : []),
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

// 4. 어드민 추첨 롤링 시작 (일괄 추첨 인원수 batchCount 지원)
export async function startRouletteDirect(rank: number, batchCount: number = 1): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  const snap = await getDoc(eventRef);
  let rankLabel: string | undefined;
  let hideRank: boolean | undefined;
  if (snap.exists()) {
    const data = snap.data() as AppState;
    const prize = data.prizes?.find((p) => p.rank === rank);
    if (prize) {
      rankLabel = prize.rankLabel;
      hideRank = prize.hideRank;
    }
  }
  await updateDoc(eventRef, {
    drawState: {
      currentRank: rank,
      currentRankLabel: rankLabel || '',
      currentHideRank: Boolean(hideRank),
      phase: 'ROULETTE',
      batchCount: Math.max(1, batchCount),
      currentWinner: null,
      currentWinners: [],
      callTimer: null,
    },
    updatedAt: serverTimestamp(),
  });
}

// 5. 어드민 당첨자 발표 (일괄 추첨/다중 당첨 지원 Atomic Transaction)
export async function announceWinnerDirect(
  rank: number,
  targetNumber?: number,
  count: number = 1
): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  let announcedWinnersList: any[] = [];

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppState;
    const prize = data.prizes.find((p) => p.rank === rank);
    if (!prize) return;

    const targetCount = targetNumber ? 1 : Math.max(1, count || prize.count || 1);

    // 1. 이미 당첨된 참가자 ID 및 입장 번호 철저히 수집 (중복 당첨 방지)
    const wonNumbers = new Set<number>();
    const wonIds = new Set<string>();

    data.prizes.forEach((p) => {
      // 다른 등수의 당첨자들
      if (p.rank !== rank) {
        if (p.winner) {
          wonNumbers.add(p.winner.number);
          if (p.winner.id) wonIds.add(p.winner.id);
        }
        if (p.winners) {
          p.winners.forEach((w) => {
            wonNumbers.add(w.number);
            if (w.id) wonIds.add(w.id);
          });
        }
      }
    });

    // 2. 참가자 객체에 이미 isWinner가 있는 사람도 수집 (현재 등수 제외)
    data.participants.forEach((p) => {
      if (p.isWinner && p.isWinner.rank !== rank) {
        wonNumbers.add(p.number);
        wonIds.add(p.id);
      }
    });

    const absentNumbers = new Set(
      data.participants.filter((p) => p.status === 'ABSENT').map((p) => p.number)
    );

    // 중복 당첨 불가 조건: 이미 당첨된 적이 있거나 부재 처리된 사람은 원천 제외
    let candidates = data.participants.filter((p) => {
      if (absentNumbers.has(p.number)) return false;
      if (!data.allowDuplicateWin) {
        if (wonNumbers.has(p.number) || wonIds.has(p.id)) return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      throw new Error('추첨 가능한 참가자가 없습니다.');
    }

    const chosenParticipants: Participant[] = [];
    const pickedIds = new Set<string>();

    // 수동 지정 번호가 있는 경우
    if (targetNumber) {
      const specified = candidates.find((p) => p.number === targetNumber);
      if (specified) {
        chosenParticipants.push(specified);
        pickedIds.add(specified.id);
        candidates = candidates.filter((p) => p.id !== specified.id && p.number !== specified.number);
      }
    }

    // 남은 인원수만큼 무작위 셔플 후 엄격하게 중복 없이 선발
    const needCount = targetCount - chosenParticipants.length;
    if (needCount > 0) {
      const shuffled = [...candidates].sort(() => 0.5 - Math.random());
      for (const cand of shuffled) {
        if (chosenParticipants.length >= targetCount) break;
        if (!pickedIds.has(cand.id)) {
          chosenParticipants.push(cand);
          pickedIds.add(cand.id);
        }
      }
    }

    if (chosenParticipants.length === 0) {
      throw new Error('추첨 가능한 참가자가 없습니다.');
    }

    const now = Date.now();
    announcedWinnersList = chosenParticipants.map((p) => ({
      rank,
      rankLabel: prize.rankLabel || '',
      hideRank: Boolean(prize.hideRank),
      prize: prize.title,
      winnerNumber: p.number,
      winnerName: p.name,
      announcedAt: now,
      confirmed: false,
      participantId: p.id,
    }));

    const newWinnersData = chosenParticipants.map((p) => ({
      number: p.number,
      name: p.name,
      confirmed: false,
      id: p.id,
    }));

    const updatedPrizes = data.prizes.map((p) => {
      if (p.rank === rank) {
        return {
          ...p,
          winner: newWinnersData[0] || null,
          winners: newWinnersData,
          announced: true,
        };
      }
      return p;
    });

    const chosenIds = new Set(chosenParticipants.map((p) => p.id));
    const updatedParticipants = data.participants.map((p) => {
      // 새로 당첨된 참가자
      if (chosenIds.has(p.id)) {
        return {
          ...p,
          isWinner: {
            rank,
            rankLabel: prize.rankLabel || '',
            hideRank: Boolean(prize.hideRank),
            prize: prize.title,
            announcedAt: now,
          },
          presenceConfirmed: false,
        };
      }
      // 해당 등수에 이전에 당첨되어 있던 이전 당첨자 정보는 반드시 초기화 (2명 동시 당첨 버그 방지)
      if (p.isWinner?.rank === rank) {
        const { isWinner, ...cleanParticipant } = p;
        return {
          ...cleanParticipant,
          presenceConfirmed: false,
        };
      }
      return p;
    });

    transaction.update(eventRef, sanitizeForFirestore({
      prizes: updatedPrizes,
      participants: updatedParticipants,
      drawState: {
        currentRank: rank,
        currentRankLabel: prize.rankLabel || '',
        currentHideRank: Boolean(prize.hideRank),
        phase: 'ANNOUNCED',
        batchCount: chosenParticipants.length,
        currentWinner: announcedWinnersList[0] || null,
        currentWinners: announcedWinnersList,
        callTimer: 30,
      },
      updatedAt: serverTimestamp(),
    }));
  });

  // 당첨 로그 추가 (비동기)
  if (announcedWinnersList.length > 0) {
    const logsCol = collection(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1], 'draw_logs');
    for (const winInfo of announcedWinnersList) {
      await addDoc(logsCol, {
        ...winInfo,
        type: 'WINNER',
        createdAt: new Date().toISOString(),
        formattedDate: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        timestamp: serverTimestamp(),
      });
    }
  }
}

// 6-1. 특정 부재자 실격 및 1명 대체 재추첨
export async function redrawSpecificAbsentDirect(rank: number, absentNumber: number): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  let replacedWinner: any = null;
  let absentName = '';
  let prizeTitle = '';

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppState;
    const prize = data.prizes.find((p) => p.rank === rank);
    if (!prize) return;
    prizeTitle = prize.title;

    const currentWinners = prize.winners && prize.winners.length > 0 ? prize.winners : (prize.winner ? [prize.winner] : []);
    const targetAbsent = currentWinners.find((w) => w.number === absentNumber);
    if (!targetAbsent) return;
    absentName = targetAbsent.name;

    // 참가자 실격 처리
    const updatedParticipants = data.participants.map((p) => {
      if (p.number === absentNumber) {
        const { isWinner, ...cleanParticipant } = p;
        return { ...cleanParticipant, status: 'ABSENT' as const, presenceConfirmed: false };
      }
      return p;
    });

    // 재추첨 가능한 후보 선발
    const wonNumbers = new Set<number>();
    data.prizes.forEach((p) => {
      if (p.winner) wonNumbers.add(p.winner.number);
      if (p.winners) p.winners.forEach((w) => wonNumbers.add(w.number));
    });
    // 현재 실격자 번호는 제외
    wonNumbers.delete(absentNumber);

    const absentNumbers = new Set(
      updatedParticipants.filter((p) => p.status === 'ABSENT').map((p) => p.number)
    );

    const candidates = updatedParticipants.filter((p) => {
      if (absentNumbers.has(p.number)) return false;
      if (!data.allowDuplicateWin && wonNumbers.has(p.number)) return false;
      return true;
    });

    const now = Date.now();
    let updatedWinnersList = [...currentWinners];
    let newParticipantWinner: Participant | null = null;

    if (candidates.length > 0) {
      newParticipantWinner = candidates[Math.floor(Math.random() * candidates.length)];
      replacedWinner = {
        rank,
        rankLabel: prize.rankLabel || '',
        hideRank: Boolean(prize.hideRank),
        prize: prize.title,
        winnerNumber: newParticipantWinner.number,
        winnerName: newParticipantWinner.name,
        announcedAt: now,
        confirmed: false,
        participantId: newParticipantWinner.id,
      };

      updatedWinnersList = updatedWinnersList.map((w) => {
        if (w.number === absentNumber) {
          return {
            number: newParticipantWinner!.number,
            name: newParticipantWinner!.name,
            confirmed: false,
            id: newParticipantWinner!.id,
          };
        }
        return w;
      });

      // 새 당첨자 상태 업데이트
      const pIdx = updatedParticipants.findIndex((p) => p.id === newParticipantWinner!.id);
      if (pIdx !== -1) {
        updatedParticipants[pIdx] = {
          ...updatedParticipants[pIdx],
          isWinner: {
            rank,
            rankLabel: prize.rankLabel || '',
            hideRank: Boolean(prize.hideRank),
            prize: prize.title,
            announcedAt: now,
          },
          presenceConfirmed: false,
        };
      }
    } else {
      // 대체할 사람이 없으면 해당 당첨자 제거
      updatedWinnersList = updatedWinnersList.filter((w) => w.number !== absentNumber);
    }

    const history = prize.absentHistory || [];
    const updatedHistory = [...history, { number: absentNumber, name: absentName, at: now }];

    const updatedPrizes = data.prizes.map((p) => {
      if (p.rank === rank) {
        return {
          ...p,
          winner: updatedWinnersList[0] || null,
          winners: updatedWinnersList,
          announced: updatedWinnersList.length > 0,
          absentHistory: updatedHistory,
        };
      }
      return p;
    });

    const newAnnouncedWinners = (data.drawState.currentWinners || []).map((w) => {
      if (w.winnerNumber === absentNumber && replacedWinner) {
        return replacedWinner;
      }
      return w;
    }).filter((w) => w.winnerNumber !== absentNumber || replacedWinner);

    transaction.update(eventRef, {
      participants: updatedParticipants,
      prizes: updatedPrizes,
      drawState: {
        ...data.drawState,
        currentWinner: newAnnouncedWinners[0] || null,
        currentWinners: newAnnouncedWinners,
        callTimer: 30,
      },
      updatedAt: serverTimestamp(),
    });
  });

  // 부재 로그 기록
  await addDoc(collection(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1], 'draw_logs'), {
    rank,
    prize: prizeTitle,
    winnerNumber: absentNumber,
    winnerName: absentName,
    type: 'ABSENT_CANCELLED',
    reason: '현장 미출석으로 인한 실격',
    createdAt: new Date().toISOString(),
    formattedDate: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    timestamp: serverTimestamp(),
  });
}

// 6-2. 기존 단일 부재자 실격 및 재추첨 (하위 호환)
export async function redrawAbsentDirect(rank: number): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;

  const data = snap.data() as AppState;
  const prize = data.prizes.find((p) => p.rank === rank);
  const targetWinner = prize?.winner || data.drawState.currentWinner;
  if (!targetWinner) return;

  const absentNumber = 'winnerNumber' in targetWinner ? targetWinner.winnerNumber : targetWinner.number;
  await redrawSpecificAbsentDirect(rank, absentNumber);
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

// 9. 전체 리셋 (저장되어 있는 상품 목록은 100% 보존하고 참가자 및 추첨 상태만 초기화)
export async function resetAllDirect(): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppState;

    // 현재 등록된 상품 커스텀 목록은 그대로 보존 (당첨 정보만 클리어)
    const preservedPrizes = (data.prizes || []).map((p) => ({
      ...p,
      winner: null,
      winners: [],
      announced: false,
      absentHistory: [],
    }));

    transaction.update(
      eventRef,
      sanitizeForFirestore({
        participants: [],
        prizes: preservedPrizes,
        drawState: {
          currentRank: null,
          phase: 'IDLE',
          currentWinner: null,
          currentWinners: [],
          callTimer: null,
        },
        updatedAt: serverTimestamp(),
      })
    );
  });
}

// 9-1. 참가자 명단만 리셋 (상품 목록 보존 및 당첨 상태 리셋)
export async function resetParticipantsDirect(): Promise<void> {
  await resetAllDirect();
}

// 9-2. 참가자 개별 1명 삭제
export async function deleteParticipantDirect(participantId: string): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppState;
    const target = (data.participants || []).find((p) => p.id === participantId);
    if (!target) return;

    const targetNumber = target.number;
    const updatedParticipants = (data.participants || []).filter((p) => p.id !== participantId);

    // 삭제된 참가자가 당첨자였다면 경품에서도 당첨 정보 정리
    const updatedPrizes = (data.prizes || []).map((prize) => {
      const remainingWinners = (prize.winners || []).filter(
        (w) => w.id !== participantId && w.number !== targetNumber
      );
      const isSingleMatch = prize.winner && (prize.winner.id === participantId || prize.winner.number === targetNumber);
      return {
        ...prize,
        winner: isSingleMatch ? (remainingWinners[0] || null) : prize.winner,
        winners: remainingWinners,
        announced: remainingWinners.length > 0,
      };
    });

    let updatedDrawState = { ...data.drawState };
    if (
      updatedDrawState.currentWinner &&
      (updatedDrawState.currentWinner.participantId === participantId || updatedDrawState.currentWinner.winnerNumber === targetNumber)
    ) {
      updatedDrawState.currentWinner = null;
      updatedDrawState.phase = 'IDLE';
    }
    if (updatedDrawState.currentWinners) {
      updatedDrawState.currentWinners = updatedDrawState.currentWinners.filter(
        (w) => w.participantId !== participantId && w.winnerNumber !== targetNumber
      );
    }

    transaction.update(
      eventRef,
      sanitizeForFirestore({
        participants: updatedParticipants,
        prizes: updatedPrizes,
        drawState: updatedDrawState,
        updatedAt: serverTimestamp(),
      })
    );
  });
}

// 9-1. 당첨 내역만 초기화 (참가자 명단 유지)
export async function resetDrawsDirect(): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppState;

    // 1. 모든 상품 당첨 정보 및 부재 이력 초기화 (winner, winners, announced, absentHistory)
    const resetPrizes = (data.prizes || []).map((p) => ({
      ...p,
      winner: null,
      winners: [],
      announced: false,
      absentHistory: [],
    }));

    // 2. 모든 참가자의 당첨 정보(isWinner) 및 출석확인 초기화 (isWinner 속성을 완전히 제거)
    const resetParticipants = (data.participants || []).map((p) => {
      const { isWinner, ...cleanParticipant } = p;
      return {
        ...cleanParticipant,
        status: 'ACTIVE' as const,
        presenceConfirmed: false,
      };
    });

    // 3. 추첨 상태 초기화
    const resetDrawState: DrawState = {
      currentRank: null,
      phase: 'IDLE',
      currentWinner: null,
      currentWinners: [],
      callTimer: null,
    };

    transaction.update(eventRef, {
      prizes: resetPrizes,
      participants: resetParticipants,
      drawState: resetDrawState,
      updatedAt: serverTimestamp(),
    });
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

// 11. 상품 등수 커스텀 명칭 및 숨김/관리자 태그 설정 업데이트
export async function updatePrizeRankConfigDirect(
  prizeId: string,
  rankLabel?: string,
  hideRank?: boolean,
  adminTag?: string,
  tagColor?: string
): Promise<void> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);
  
  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppState;
    const updatedPrizes = (data.prizes || []).map((p) => {
      if (p.id === prizeId) {
        return {
          ...p,
          rankLabel: rankLabel !== undefined ? (rankLabel.trim() || undefined) : p.rankLabel,
          hideRank: hideRank !== undefined ? Boolean(hideRank) : p.hideRank,
          adminTag: adminTag !== undefined ? (adminTag.trim() || undefined) : p.adminTag,
          tagColor: tagColor !== undefined ? (tagColor.trim() || undefined) : p.tagColor,
        };
      }
      return p;
    });

    transaction.update(eventRef, sanitizeForFirestore({
      prizes: updatedPrizes,
      updatedAt: serverTimestamp(),
    }));
  });
}

// 12. 상품 안전 추가 (트랜잭션으로 최신 목록에 원자적 추가하여 덮어쓰기 방지)
export async function addPrizeDirect(newPrize: Prize): Promise<Prize[]> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  return await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return [newPrize];

    const data = snap.data() as AppState;
    const existingPrizes = data.prizes || [];
    const updatedPrizes = [...existingPrizes, newPrize];

    transaction.update(eventRef, sanitizeForFirestore({
      prizes: updatedPrizes,
      updatedAt: serverTimestamp(),
    }));

    return updatedPrizes;
  });
}

// 13. 상품 안전 삭제
export async function deletePrizeDirect(prizeId: string): Promise<Prize[]> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  return await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return [];

    const data = snap.data() as AppState;
    const updatedPrizes = (data.prizes || []).filter((p) => p.id !== prizeId);

    transaction.update(eventRef, sanitizeForFirestore({
      prizes: updatedPrizes,
      updatedAt: serverTimestamp(),
    }));

    return updatedPrizes;
  });
}

// 14. 상품 안전 편집
export async function editPrizeDirect(
  prizeId: string,
  fields: { title?: string; rank?: number; rankLabel?: string; hideRank?: boolean; adminTag?: string; tagColor?: string }
): Promise<Prize[]> {
  const firestore = getFirebaseDb();
  const eventRef = doc(firestore, EVENT_DOC_PATH[0], EVENT_DOC_PATH[1]);

  return await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) return [];

    const data = snap.data() as AppState;
    const updatedPrizes = (data.prizes || []).map((p) => {
      if (p.id === prizeId) {
        return {
          ...p,
          title: fields.title !== undefined ? fields.title.trim() : p.title,
          rank: fields.rank !== undefined ? Number(fields.rank) : p.rank,
          rankLabel: fields.rankLabel !== undefined ? (fields.rankLabel.trim() || undefined) : p.rankLabel,
          hideRank: fields.hideRank !== undefined ? Boolean(fields.hideRank) : p.hideRank,
          adminTag: fields.adminTag !== undefined ? (fields.adminTag.trim() || undefined) : p.adminTag,
          tagColor: fields.tagColor !== undefined ? (fields.tagColor.trim() || undefined) : p.tagColor,
        };
      }
      return p;
    });

    transaction.update(eventRef, sanitizeForFirestore({
      prizes: updatedPrizes,
      updatedAt: serverTimestamp(),
    }));

    return updatedPrizes;
  });
}

// 기존 로컬 백업 호환용 빈 구현
export async function saveEventStateToDb(state: AppState) {}
export async function logDrawResultToDb(data: any) {}
