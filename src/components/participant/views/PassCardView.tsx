import React from 'react';
import { Participant } from '@/types';
import { ThemeStyleConfig } from '@/hooks/useParticipant';
import { Trophy, MapPin, Share2, Instagram, Info, Sparkles } from 'lucide-react';

interface PassCardViewProps {
  participant: Participant;
  qrDataUrl: string;
  themeCfg: ThemeStyleConfig;
  isMeWinner?: {
    rank: number;
    prize: string;
  };
  onShare?: () => void;
  onOpenNotice?: () => void;
  instagramUrl?: string;
  location?: string;
  eventDate?: string;
}

export const PassCardView: React.FC<PassCardViewProps> = ({
  participant,
  qrDataUrl,
  themeCfg,
  isMeWinner,
  onShare,
  onOpenNotice,
  instagramUrl = 'https://www.instagram.com/yuntaku.seoul',
  location = '을지로 YUNTAKU 4F',
  eventDate = '10.30 FRI — 10.31 SAT',
}) => {
  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-[#181820] to-[#111116] border border-white/[0.12] p-6 shadow-2xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
      {/* 상단 메타 바 */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: themeCfg.accent }}
          />
          <span className="text-[11px] font-bold tracking-wider text-zinc-300">
            OFFICIAL PASS
          </span>
        </div>
        <span className="text-[10px] font-mono font-medium text-zinc-400">
          ID: {participant.id.slice(-6).toUpperCase()}
        </span>
      </div>

      {/* 중앙 행운 번호 */}
      <div className="py-6 text-center">
        <p className="text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase mb-1">
          LUCKY DRAW NUMBER
        </p>

        <div className="text-6xl font-black font-mono tracking-tight text-white py-1">
          #{String(participant.number).padStart(3, '0')}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-2">
          <span className="text-sm font-bold text-zinc-200">
            {participant.name}
          </span>
          <span className="text-[10px] font-medium text-zinc-400 px-1.5 py-0.5 rounded bg-white/5">
            PLAYER
          </span>
        </div>

        {isMeWinner && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-black shadow-md"
            style={{ backgroundColor: themeCfg.accent }}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{isMeWinner.rank}등 당첨 확정</span>
          </div>
        )}

        {participant.status === 'ABSENT' && (
          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700">
            현장 부재 (실격 처리됨)
          </div>
        )}
      </div>

      {/* 하단 패스 스펙 (QR코드 + 장소/혜택 안내) */}
      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
        <div className="p-1.5 bg-white rounded-xl shrink-0 shadow-sm">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="PASS QR"
              className="w-16 h-16 object-contain"
            />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
              QR
            </div>
          )}
        </div>

        <div className="flex-1 text-left space-y-1">
          <p className="text-[11px] font-bold text-white flex items-center gap-1">
            <MapPin className="w-3 h-3 text-zinc-400" />
            {location}
          </p>
          <p className="text-[10px] text-zinc-400 leading-tight">
            무제한 데킬라·보드카 + 1 Lucky Ticket
          </p>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[9px] font-mono text-zinc-400">
              {eventDate}
            </span>
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[10px] font-medium text-white transition-all border border-white/10"
              >
                <Share2 className="w-2.5 h-2.5" />
                <span>공유</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 인스타그램 팔로우 & 파티 공지 액션 바 */}
      <div className="mt-4 pt-3 border-t border-white/[0.08] grid grid-cols-2 gap-2">
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 border border-white/10 hover:border-pink-500/40 text-[11px] font-bold text-white transition active:scale-95 shadow-sm"
        >
          <Instagram className="w-3.5 h-3.5 text-pink-400" />
          <span>인스타 팔로우</span>
        </a>

        {onOpenNotice && (
          <button
            type="button"
            onClick={onOpenNotice}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-zinc-200 transition active:scale-95"
          >
            <Info className="w-3.5 h-3.5 text-orange-400" />
            <span>파티 공지·혜택</span>
          </button>
        )}
      </div>
    </div>
  );
};
