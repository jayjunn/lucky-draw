import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface TimerBadgeProps {
  seconds: number | null;
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({ seconds }) => {
  if (seconds === null) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black flex items-center gap-1 shadow-md"
    >
      <Clock className="w-3 h-3 animate-spin text-zinc-900" />
      <span>{seconds}s</span>
    </motion.div>
  );
};
