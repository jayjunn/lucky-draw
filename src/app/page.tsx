'use client';

import React from 'react';
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

export default function ParticipantPage() {
  const { isMuted, toggleSound } = useSound();
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
  } = useParticipant();

  return (
    <ParticipantLayoutView
      themeCfg={themeCfg}
      header={
        <ParticipantHeaderView
          themeCfg={themeCfg}
          timerSeconds={timerSeconds}
          isMuted={isMuted}
          onToggleSound={toggleSound}
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
  );
}
