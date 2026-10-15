import React from 'react';
import { ThemeStyleConfig } from '@/hooks/useParticipant';
import { TimerBadge } from '@/components/common/TimerBadge';
import { SoundToggle } from '@/components/common/SoundToggle';
import { Info } from 'lucide-react';

interface ParticipantHeaderViewProps {
  themeCfg: ThemeStyleConfig;
  timerSeconds: number | null;
  isMuted: boolean;
  onToggleSound: () => void;
  onOpenNotice?: () => void;
}

export const ParticipantHeaderView: React.FC<ParticipantHeaderViewProps> = ({
  themeCfg,
  timerSeconds,
  isMuted,
  onToggleSound,
  onOpenNotice,
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

      <div className="flex items-center gap-1.5">
        <TimerBadge seconds={timerSeconds} />
        {onOpenNotice && (
          <button
            type="button"
            onClick={onOpenNotice}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-zinc-300 hover:text-white flex items-center justify-center transition border border-white/10"
            title="파티 공지사항"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
        <SoundToggle isMuted={isMuted} onToggle={onToggleSound} />
      </div>
    </header>
  );
};
