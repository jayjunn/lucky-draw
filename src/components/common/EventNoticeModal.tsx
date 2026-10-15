'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Gift, Wine, Instagram, ExternalLink } from 'lucide-react';
import { EventNoticeConfig } from '@/types';
import { DEFAULT_EVENT_NOTICE } from '@/lib/firebase';

interface EventNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice?: EventNoticeConfig;
}

export const EventNoticeModal: React.FC<EventNoticeModalProps> = ({
  isOpen,
  onClose,
  notice,
}) => {
  const currentNotice: EventNoticeConfig = {
    ...DEFAULT_EVENT_NOTICE,
    ...(notice || {}),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
          {/* 백드롭 닫기 */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg max-h-[90vh] bg-[#141418] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
          >
            {/* 상단 헤더 바 */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-900/60 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>{currentNotice.noticeTitle || '🎃 PARTY NOTICE'}</span>
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 스크롤 가능한 본문 영역 */}
            <div className="p-6 overflow-y-auto space-y-6 text-zinc-300 text-xs leading-relaxed font-sans">
              {/* 포스터 미리보기 배너 */}
              {currentNotice.posterImageUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                  <img
                    src={currentNotice.posterImageUrl}
                    alt={currentNotice.noticeTitle}
                    className="w-full h-44 object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest font-mono">
                      OFFICIAL EVENT
                    </span>
                    <h4 className="text-lg font-black text-white tracking-tight">
                      {currentNotice.noticeTitle}
                    </h4>
                  </div>
                </div>
              )}

              {/* 핵심 요약 카드 그리드 */}
              <div className="grid grid-cols-2 gap-2.5 font-mono">
                {currentNotice.eventDate && (
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 일시 (DATE)
                    </span>
                    <p className="text-xs font-bold text-white leading-tight">{currentNotice.eventDate}</p>
                  </div>
                )}

                {currentNotice.entryFee && (
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <Wine className="w-3 h-3" /> 입장료 (ENTRY)
                    </span>
                    <p className="text-xs font-bold text-white leading-tight">{currentNotice.entryFee}</p>
                  </div>
                )}

                {currentNotice.luckyDrawInfo && (
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <Gift className="w-3 h-3" /> 럭키드로우
                    </span>
                    <p className="text-xs font-bold text-white leading-tight">{currentNotice.luckyDrawInfo}</p>
                  </div>
                )}

                {currentNotice.location && (
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> 위치 (LOCATION)
                    </span>
                    <p className="text-xs font-bold text-white leading-tight">{currentNotice.location}</p>
                  </div>
                )}
              </div>

              {/* 공식 공지 전문 내용 (줄바꿈 보존) */}
              {currentNotice.noticeFullText && (
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] whitespace-pre-line leading-relaxed text-zinc-300">
                  {currentNotice.noticeFullText}
                </div>
              )}

              {/* 공식 인스타그램 팔로우 배너 */}
              {currentNotice.instagramUrl && (
                <a
                  href={currentNotice.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#833ab4]/30 via-[#fd1d1d]/30 to-[#fcb045]/30 border border-white/20 flex items-center justify-between group hover:scale-[1.01] active:scale-[0.99] transition shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-md">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-pink-400 font-mono uppercase tracking-wider">
                        OFFICIAL INSTAGRAM
                      </span>
                      <h5 className="text-sm font-bold text-white">
                        {currentNotice.instagramHandle || '@yuntaku.seoul'}
                      </h5>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white/90 group-hover:text-white flex items-center gap-1 font-mono">
                    팔로우하기 <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </a>
              )}
            </div>

            {/* 하단 확인 버튼 */}
            <div className="p-4 border-t border-white/10 bg-zinc-900/80">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200 active:scale-[0.99] transition shadow-lg"
              >
                확인 완료 & 파티 즐기기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
