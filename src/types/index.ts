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
  adminTag?: string; // 관리자 전용 구분 태그/메모 (예: "30일", "31일", "10/30", "10/31") - 전광판/참가자에겐 비공개
  tagColor?: string; // 태그 색상 ('blue' | 'purple' | 'amber' | 'emerald' | 'rose' | 'zinc')
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

/**
 * 관리자 화면용 등수/라벨 포맷팅 헬퍼
 * - 화면/참가자에게 숨김(hideRank: true) 처리되어 있더라도, 관리자 화면에서는 항상 원래 등수/라벨을 식별할 수 있도록 반환
 */
export function getAdminPrizeLabel(
  item?: { rank?: number; rankLabel?: string } | null,
  fallbackSuffix: string = '등'
): string {
  if (!item) return '';
  if (item.rankLabel && item.rankLabel.trim() !== '') {
    return item.rankLabel.trim();
  }
  if (typeof item.rank === 'number' && item.rank > 0) {
    return `${item.rank}${fallbackSuffix}`;
  }
  return '';
}

/**
 * 관리자 전용 구분 태그 색상 클래스 반환
 */
export function getTagColorClass(tag?: string, color?: string): string {
  if (!tag) return '';
  const chosenColor = color || (tag.includes('30') ? 'blue' : tag.includes('31') ? 'purple' : 'zinc');
  switch (chosenColor) {
    case 'blue':
      return 'bg-sky-50 text-sky-700 border-sky-300 ring-1 ring-sky-200';
    case 'purple':
      return 'bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-200';
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200';
    case 'amber':
    case 'orange':
      return 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200';
    case 'rose':
      return 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-200';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-300';
  }
}

export type AdminTabType = 'draw' | 'prizes' | 'themes' | 'notice' | 'logs' | 'settings';

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
