export interface Participant {
  id: string; // 고유 ID
  number: number; // 입장 번호 (#001, #002...)
  name: string; // 참가자 이름/닉네임
  registeredAt: number;
  status?: 'ACTIVE' | 'ABSENT'; // ABSENT: 자리에 없어서 부재 처리됨
  presenceConfirmed?: boolean; // 당첨 후 '저 여기 있어요!' 눌렀는지 여부
  isWinner?: {
    rank: number;
    prize: string;
    announcedAt: number;
  };
}

export interface Prize {
  id: string;
  rank: number; // 5등, 4등, 3등, 2등, 1등 등
  title: string; // 상품명
  description?: string;
  count: number;
  winner?: {
    number: number;
    name: string;
    confirmed?: boolean;
  } | null;
  announced: boolean;
  absentHistory?: {
    number: number;
    name: string;
    at: number;
  }[]; // 부재로 지나간 참가자들 이력
}

export type DrawPhase = 'IDLE' | 'ROULETTE' | 'ANNOUNCED';

export interface DrawState {
  currentRank: number | null;
  phase: DrawPhase;
  candidateNumber?: number;
  callTimer?: number | null; // 호명 카운트다운 초
  currentWinner?: {
    rank: number;
    prize: string;
    winnerNumber: number;
    winnerName: string;
    announcedAt: number;
    confirmed?: boolean;
  } | null;
}

export type ThemeType = 'HALLOWEEN' | 'MONO' | 'CYBER' | 'GOLD';

export interface EventNoticeConfig {
  instagramUrl: string;
  instagramHandle: string;
  posterImageUrl: string;
  eventDate: string;
  location: string;
  entryFee: string;
  luckyDrawInfo: string;
  noticeTitle: string;
  noticeFullText: string;
}

export interface AppState {
  participants: Participant[];
  prizes: Prize[];
  drawState: DrawState;
  eventName: string;
  allowDuplicateWin: boolean;
  theme?: ThemeType;
  notice?: EventNoticeConfig;
}
