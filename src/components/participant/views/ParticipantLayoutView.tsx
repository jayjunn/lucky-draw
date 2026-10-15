import React from 'react';
import { ThemeStyleConfig } from '@/hooks/useParticipant';

interface ParticipantLayoutViewProps {
  themeCfg: ThemeStyleConfig;
  header: React.ReactNode;
  children: React.ReactNode;
  footerText?: string;
  overlays?: React.ReactNode;
}

export const ParticipantLayoutView: React.FC<ParticipantLayoutViewProps> = ({
  themeCfg,
  header,
  children,
  footerText = 'YUNTAKU SOCIAL CLUB • SEOUL',
  overlays,
}) => {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#0A0A0C] text-white flex flex-col justify-center items-center overflow-hidden p-0 sm:p-4 select-none">
      {/* 백그라운드 앰비언트 글로우 */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 18%, ${themeCfg.glow} 0%, transparent 60%)`,
        }}
      />

      {/* 모바일 뷰포트 컨테이너 (정밀한 390~420px 네이티브 핏) */}
      <div className="relative z-10 w-full h-full max-w-[420px] flex flex-col justify-between p-5 pb-6 sm:h-[880px] sm:max-h-[94vh] sm:rounded-[36px] sm:border sm:border-white/10 sm:bg-[#101014]/80 sm:backdrop-blur-3xl sm:shadow-2xl overflow-hidden">
        {header}

        <main className="flex-1 flex flex-col justify-center my-auto py-2 overflow-y-auto">
          {children}
        </main>

        <footer className="text-center pt-2">
          <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
            {footerText}
          </p>
        </footer>

        {overlays}
      </div>
    </div>
  );
};
