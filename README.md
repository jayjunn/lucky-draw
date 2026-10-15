# 🎰 Real-time Lucky Draw App (실시간 럭키드로우 웹 애플리케이션)

현장 이벤트 및 파티(을지로 YUNTAKU 파티 등)를 위한 **실시간 인터랙티브 럭키드로우 플랫폼**입니다.
Next.js 14, Socket.io, Tailwind CSS, Framer Motion, Firebase Firestore를 기반으로 제작되었습니다.

---

## ✨ 핵심 기능

1. **📱 모바일 우선(Mobile-First) 디지털 패스**
   - 1인 1매 고유 추첨 번호(`#001`, `#002`...) 및 QR 코드 입장권 자동 발급.
   - Apple Wallet / 현대카드 감성의 미니멀 글래스모피즘 모바일 핏(`100dvh`).
   - 추첨 롤링 시 햅틱 진동 및 실시간 사운드 동기화.

2. **🏆 당첨자 현장 인터랙션 & 부재자 즉시 재추첨**
   - 당첨자 스마트폰에만 즉시 **당첨 알림 시트 + 폭죽 효과 + 팡파레 + [저 현장에 있습니다 (출석 확인)]** 버튼 활성화.
   - 30초 내 미출석 시 관리자 화면에서 **원클릭 부재 실격 처리 및 자동 재추첨** 지원.

3. **🖥️ 대형 빔프로젝터용 전광판 (`/display`)**
   - 16:9 메인 무대 스크린 최적화.
   - 드럼롤, 화려한 룰렛 롤링, 당첨자 실시간 대형 노출.
   - 관객들의 실시간 리액션(박수, 불꽃 등) 플로팅 애니메이션.

4. **⚙️ 어드민 콘솔 (`/admin`)**
   - 등수별 상품 커스텀 등록, 삭제, 수정.
   - 4가지 프리셋 테마 원클릭 변경 (할로윈 / 미니멀 모노 / 사이버펑크 / 골드).
   - 실시간 참가자 현황 및 당첨/부재자 히스토리 JSON 다운로드.
   - Firebase Firestore 및 로컬 영구 백업.

---

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Framer Motion, Lucide Icons, Canvas Confetti
- **Backend & Realtime**: Node.js HTTP Server, Socket.io, TypeScript
- **Audio FX**: Web Audio API (자체 오실레이터 합성 사운드)
- **Database**: Firebase Firestore & Local JSON Dual-Persistence

---

## 🚀 로컬 실행 방법

```bash
# 1. 패키지 설치
npm install

# 2. 프로덕션 빌드 & 서버 실행
npm run build
npm start

# (또는 개발 모드)
npm run dev
```

브라우저에서 다음 주소로 접속합니다:
- **참가자 모바일 입장권**: `http://localhost:3000`
- **무대 빔프로젝터 전광판**: `http://localhost:3000/display`
- **주최자 관리자 콘솔**: `http://localhost:3000/admin`
