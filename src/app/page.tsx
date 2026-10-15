'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParticipant } from '@/hooks/useParticipant';
import { useSound } from '@/hooks/useSound';

import { ParticipantLayoutView } from '@/components/participant/views/ParticipantLayoutView';
import { ParticipantHeaderView } from '@/components/participant/views/ParticipantHeaderView';
import { CheckInView } from '@/components/participant/views/CheckInView';
import { PassCardView } from '@/components/participant/views/PassCardView';
import { DrawStatusView } from '@/components/participant/views/DrawStatusView';
import { WinnerModalView } from '@/components/participant/views/WinnerModalView';
import { ReactionToastView } from '@/components/participant/views/ReactionToastView';
import { EventSplashScreen } from '@/components/common/EventSplashScreen';
import { EventNoticeModal } from '@/components/common/EventNoticeModal';

export default function ParticipantPage() {
  const { isMuted, toggleSound } = useSound();
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const {
    participant,
    nameInput,
    setNameInput,
    isSubmitting,
    qrDataUrl,
    appState,
    rollingNumber,
    showWinnerSheet,
    setShowWinnerSheet,
    recentReaction,
    timerSeconds,
    themeCfg,
    isMeWinner,
    currentDraw,
    isRouletteActive,
    isAnnounced,
    amIThisRoundWinner,
    handleRegister,
    handleConfirmPresence,
    sendReaction,
    handleShareTicket,
  } = useParticipant();

  const noticeConfig = appState?.notice;

  return (
    <>
      {/* 파티 포스터 플래시 스플래시 (첫 진입 시 1.2초 노출) */}
      <EventSplashScreen
        durationMs={1200}
        posterSrc={noticeConfig?.posterImageUrl}
        title={noticeConfig?.noticeTitle}
        dateText={noticeConfig?.eventDate}
      />

      {/* 공식 파티 공지사항 모달 */}
      <EventNoticeModal
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
        notice={noticeConfig}
      />

      <ParticipantLayoutView
        themeCfg={themeCfg}
        header={
          <ParticipantHeaderView
            themeCfg={themeCfg}
            timerSeconds={timerSeconds}
            isMuted={isMuted}
            onToggleSound={toggleSound}
            onOpenNotice={() => setIsNoticeOpen(true)}
          />
        }
        overlays={
          <>
            <ReactionToastView recentReaction={recentReaction} />
            <WinnerModalView
              isOpen={showWinnerSheet}
              onClose={() => setShowWinnerSheet(false)}
              participant={participant}
              currentDraw={currentDraw}
              themeCfg={themeCfg}
              onConfirmPresence={handleConfirmPresence}
            />
          </>
        }
      >
      <AnimatePresence mode="wait">
        {!participant ? (
          <CheckInView
            nameInput={nameInput}
            onChangeName={setNameInput}
            onSubmit={handleRegister}
            isSubmitting={isSubmitting}
            participantCount={appState?.participants?.length || 0}
            themeCfg={themeCfg}
          />
        ) : (
          <motion.div
            key="pass-view"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="space-y-4"
          >
            <PassCardView
              participant={participant}
              qrDataUrl={qrDataUrl}
              themeCfg={themeCfg}
              isMeWinner={isMeWinner}
              onShare={handleShareTicket}
              onOpenNotice={() => setIsNoticeOpen(true)}
              instagramUrl={noticeConfig?.instagramUrl}
              location={noticeConfig?.location}
              eventDate={noticeConfig?.eventDate}
            />

            <DrawStatusView
              currentDraw={currentDraw}
              isRouletteActive={isRouletteActive}
              isAnnounced={isAnnounced}
              amIThisRoundWinner={amIThisRoundWinner}
              rollingNumber={rollingNumber}
              participant={participant}
              themeCfg={themeCfg}
              onConfirmPresence={handleConfirmPresence}
              onSendReaction={sendReaction}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </ParticipantLayoutView>
    </>
  );
}
