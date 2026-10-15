import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SoundToggleProps {
  isMuted: boolean;
  onToggle: () => void;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ isMuted, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      aria-label="소리 켜기/끄기"
      className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
    >
      {isMuted ? (
        <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 text-white" />
      )}
    </button>
  );
};
