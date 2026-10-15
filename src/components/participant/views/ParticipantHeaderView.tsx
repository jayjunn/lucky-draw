import React from 'react';
import { ThemeStyleConfig } from '@/hooks/useParticipant';
import { TimerBadge } from '@/components/common/TimerBadge';
import { SoundToggle } from '@/components/common/SoundToggle';

interface ParticipantHeaderViewProps {
  themeCfg: ThemeStyleConfig;
  timerSeconds: number | null;
  isMuted: boolean;
  onToggleSound: () => void;
}

export const ParticipantHeaderView: React.FC<ParticipantHeaderViewProps> = ({
  themeCfg,
  timerSeconds,
  isMuted,
  onToggleSound,
}) => {
  return (
    <header className="flex items-center justify-between pt-1">
      <div className="flex items-center gap-2">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${themeCfg.badge}`}
        >
          {themeCfg.tag}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <TimerBadge seconds={timerSeconds} />
        <SoundToggle isMuted={isMuted} onToggle={onToggleSound} />
      </div>
    </header>
  );
};
