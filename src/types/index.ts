export interface Participant {
  id: string; // 고유 ID
  number: number; // 입장 번호 (#001, #002...)
  name: string; // 참가자 이름/닉네임
  registeredAt: number;
  status?: 'ACTIVE' | 'ABSENT'; // ABSENT: 자리에 없어서 부재 처리됨
  presenceConfirmed?: boolean; // 당첨 후 '저 여기 있어요!' 눌렀는지 여부
  isWinner?: {
    rank: number;
    rankLabel?: string; // 커스텀 명칭 (예: "대상", "특별상", "행운상", "1등")
    hideRank?: boolean; // 등수 숨김 여부 (true면 화면에 등수 미표시)
    prize: string;
    announcedAt: number;
  };
}

export interface WinnerInfo {
  number: number;
  name: string;
  confirmed?: boolean;
  id?: string;
}

export interface Prize {
  id: string;
  rank: number; // 순서 정렬 번호 (5, 4, 3, 2, 1 등)
  rankLabel?: string; // 커스텀 표시 명칭 (예: "대상", "특별상", "행운상", "1등")
  hideRank?: boolean; // 등수/라벨 숨김 여부 (true면 화면에 등수 뱃지 미표시)
  title: string; // 상품명
  description?: string;
  count: number;
  winner?: WinnerInfo | null;
  winners?: WinnerInfo[]; // 일괄 추첨 다중 당첨자 목록
  announced: boolean;
  absentHistory?: {
    number: number;
    name: string;
    at: number;
  }[]; // 부재로 지나간 참가자들 이력
}

export type DrawPhase = 'IDLE' | 'ROULETTE' | 'ANNOUNCED';

export interface AnnouncedWinner {
  rank: number;
  rankLabel?: string;
  hideRank?: boolean;
  prize: string;
  winnerNumber: number;
  winnerName: string;
  announcedAt: number;
  confirmed?: boolean;
  participantId?: string;
}

export interface DrawState {
  currentRank: number | null;
  currentRankLabel?: string;
  currentHideRank?: boolean;
  phase: DrawPhase;
  candidateNumber?: number;
  candidateNumbers?: number[];
  batchCount?: number;
  callTimer?: number | null; // 호명 카운트다운 초
  currentWinner?: AnnouncedWinner | null;
  currentWinners?: AnnouncedWinner[]; // 일괄 추첨 발표된 당첨자 전체 목록
}

/**
 * 등수/라벨 포맷팅 헬퍼
 * - hideRank가 true이면 빈 문자열 반환 (등수 미표시)
 * - rankLabel이 지정되어 있으면 해당 커스텀 라벨 반환 (예: "대상", "특별상")
 * - 아무것도 없으면 기본값인 `${rank}${fallbackSuffix}` 반환 (예: "1등")
 */
export function getRankLabel(
  item?: { rank?: number; rankLabel?: string; hideRank?: boolean } | null,
  fallbackSuffix: string = '등'
): string {
  if (!item) return '';
  if (item.hideRank) return '';
  if (item.rankLabel && item.rankLabel.trim() !== '') {
    return item.rankLabel.trim();
  }
  if (typeof item.rank === 'number' && item.rank > 0) {
    return `${item.rank}${fallbackSuffix}`;
  }
  return '';
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
