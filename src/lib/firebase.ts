import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { AppState, Participant, Prize } from '../types';
import fs from 'fs';
import path from 'path';

// Firebase 설정 (환경변수 또는 관리자 화면에서 입력 가능)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Firebase 초기화 시도
export function getFirebaseDb(): Firestore | null {
  if (db) return db;

  if (firebaseConfig.projectId && firebaseConfig.apiKey) {
    try {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      db = getFirestore(app);
      console.log('✅ Firebase Firestore 연결 성공! (Project:', firebaseConfig.projectId, ')');
      return db;
    } catch (err) {
      console.warn('⚠️ Firebase 초기화 실패:', err);
    }
  }
  return null;
}

// 오프라인 / 미연동 시 로컬 백업 파일 경로
const LOCAL_BACKUP_DIR = path.join(process.cwd(), 'data');
const LOCAL_BACKUP_PATH = path.join(LOCAL_BACKUP_DIR, 'event_history.json');

function ensureLocalBackupDir() {
  if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
  }
}

// 1. 행사 상태 전체 저장 (Firebase + 로컬 백업)
export async function saveEventStateToDb(state: AppState) {
  const now = new Date();
  const dateStr = now.toISOString();

  const eventData = {
    eventName: state.eventName,
    updatedAt: dateStr,
    allowDuplicateWin: state.allowDuplicateWin,
    prizes: state.prizes,
    participantsCount: state.participants.length,
    drawState: state.drawState,
  };

  // 로컬 파일 백업 항상 수행
  try {
    ensureLocalBackupDir();
    fs.writeFileSync(LOCAL_BACKUP_PATH, JSON.stringify({
      ...eventData,
      participants: state.participants,
    }, null, 2), 'utf-8');
  } catch (err) {
    console.error('로컬 파일 백업 실패:', err);
  }

  // Firebase 저장 시도
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const eventDocRef = doc(firestore, 'lucky_draw_events', 'current_event');
      await setDoc(eventDocRef, {
        ...eventData,
        timestamp: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Firebase 이벤트 저장 에러:', err);
    }
  }
}

// 2. 당첨 및 부재중 발생 시 로그 기록 (날짜/시간 영구 보관)
export async function logDrawResultToDb(data: {
  rank: number;
  prize: string;
  winnerNumber: number;
  winnerName: string;
  type: 'WINNER' | 'ABSENT_CANCELLED';
  reason?: string;
}) {
  const now = new Date();
  const logItem = {
    ...data,
    createdAt: now.toISOString(),
    formattedDate: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
  };

  // 로컬 파일에 누적
  try {
    ensureLocalBackupDir();
    const logPath = path.join(LOCAL_BACKUP_DIR, 'draw_logs.json');
    let logs: any[] = [];
    if (fs.existsSync(logPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      } catch {}
    }
    logs.push(logItem);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('로컬 로그 저장 실패:', err);
  }

  // Firebase Firestore 컬렉션에 추가
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const logsCol = collection(firestore, 'lucky_draw_events', 'current_event', 'draw_logs');
      await addDoc(logsCol, {
        ...logItem,
        timestamp: serverTimestamp(),
      });
      console.log('✅ Firebase Firestore 당첨 로그 저장 완료:', logItem.formattedDate, `[${logItem.rank}등]`, logItem.winnerName);
    } catch (err) {
      console.error('Firebase 로그 저장 에러:', err);
    }
  }
}
