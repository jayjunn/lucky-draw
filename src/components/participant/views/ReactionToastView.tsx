import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReactionToastViewProps {
  recentReaction: string | null;
}

export const ReactionToastView: React.FC<ReactionToastViewProps> = ({ recentReaction }) => {
  return (
    <AnimatePresence>
      {recentReaction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1.5 shadow-2xl z-40"
        >
          <span>{recentReaction}</span>
          <span>전광판에 응원을 보냈습니다!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
