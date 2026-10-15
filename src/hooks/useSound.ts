import { useState, useCallback } from 'react';
import { soundFX } from '@/lib/sound';

export function useSound() {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFX.getMuted());

  const toggleSound = useCallback(() => {
    const nextMuted = soundFX.toggleMute();
    setIsMuted(nextMuted);
    return nextMuted;
  }, []);

  return {
    isMuted,
    toggleSound,
    soundFX,
  };
}
