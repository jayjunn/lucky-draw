/**
 * Web Vibration API (Haptic Feedback) Helper
 * 지원 기기(모바일 Chrome/Android 등)에서 물리적 진동 피드백을 제공합니다.
 * 미지원 브라우저(iOS Safari 등)에서는 graceful fallback 됩니다.
 */

export const Haptic = {
  // 가벼운 버튼 탭 진동 (10ms)
  lightTap() {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {}
    }
  },

  // 룰렛 회전 시 틱틱틱 햅틱 (15ms)
  rouletteTick() {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch (e) {}
    }
  },

  // 당첨 발표 시 축하 진동 패턴 (두구두구 빰!)
  celebrateWinner() {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        // [진동, 정지, 진동, 정지, 강한진동]
        navigator.vibrate([150, 80, 150, 80, 400]);
      } catch (e) {}
    }
  },

  // 성공 / 확인 진동 (50ms - 50ms - 100ms)
  success() {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([50, 50, 100]);
      } catch (e) {}
    }
  },

  // 경고 / 실패 진동
  warning() {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100, 50, 100]);
      } catch (e) {}
    }
  }
};
