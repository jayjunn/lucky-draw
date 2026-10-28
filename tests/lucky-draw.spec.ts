import { test, expect } from '@playwright/test';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD5r_oM048hxGgBt79clJ-k8-svm0BURHg',
  authDomain: 'portfolio-ddc4d.firebaseapp.com',
  projectId: 'portfolio-ddc4d',
  storageBucket: 'portfolio-ddc4d.appspot.com',
  messagingSenderId: '864436147965',
  appId: '1:864436147965:web:57291e7e66624983dd1094',
};

const DEFAULT_PRIZES = [
  { id: 'prize-5', rank: 5, title: '스타벅스 e-카드 3만원권', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-4', rank: 4, title: '올리브영 기프트카드 5만원권', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-3', rank: 3, title: '에어팟 4세대 노이즈캔슬링', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-2', rank: 2, title: '다이슨 슈퍼소닉 헤어드라이어', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-1', rank: 1, title: 'iPhone 16 Pro 256GB', count: 1, announced: false, winner: null, absentHistory: [] },
];

async function resetDb() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app);
  await setDoc(doc(db, 'lucky_draw_events', 'current_event'), {
    participants: [],
    prizes: DEFAULT_PRIZES,
    drawState: { currentRank: null, phase: 'IDLE', currentWinner: null, callTimer: null },
    eventName: 'YUNTAKU 1ST & HALLOWEEN PARTY',
    allowDuplicateWin: false,
    theme: 'HALLOWEEN',
    updatedAt: new Date().toISOString(),
  });

  try {
    await fetch('http://localhost:3000/api/test-reset').catch(() => {});
  } catch {}
}

async function unlockAdmin(page: any) {
  const pinTitle = page.locator('text=관리자 인증');
  if (await pinTitle.isVisible({ timeout: 4000 }).catch(() => false)) {
    const btn7 = page.locator('button:has-text("7")');
    for (let i = 0; i < 4; i++) {
      await btn7.click();
      await page.waitForTimeout(80);
    }
  }
  await expect(page.locator('h1:has-text("MANAGEMENT")')).toBeVisible({ timeout: 15000 });
}

test.describe('럭키드로우 전체 E2E 실시간 시나리오 테스트', () => {
  test.setTimeout(90000);

  test.beforeEach(async () => {
    await resetDb();
  });

  test('참가자 모바일 체크인부터 어드민 추첨 및 당첨자 출석 확인까지 전체 플로우 검증', async ({ browser }) => {
    // 1. 모바일 참가자 브라우저 컨텍스트
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mobilePage = await mobileContext.newPage();

    // 2. 어드민 관리자 브라우저 컨텍스트
    const adminContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const adminPage = await adminContext.newPage();

    // 3. 빔프로젝터 전광판 브라우저 컨텍스트
    const displayContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const displayPage = await displayContext.newPage();

    // --- STEP 1: 모바일 참가자 체크인 (입장 패스 발급) ---
    await mobilePage.goto('/');
    
    const nameInput = mobilePage.locator('input[placeholder*="이름 또는 닉네임"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    const testNickName = '테스터_' + Math.floor(Math.random() * 10000);
    const submitBtn = mobilePage.locator('button:has-text("입장 패스 받기")');

    // 1글자 입력 시 실시간 경고 및 버튼 비활성화 검증
    await nameInput.fill('테');
    await expect(mobilePage.locator('text=최소 2글자 이상 입력해주세요')).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // 2글자 이상 유효한 닉네임 입력
    await nameInput.fill(testNickName);
    await expect(mobilePage.locator('text=사용 가능한 이름입니다')).toBeVisible();
    await submitBtn.click();

    // 발급 완료 후 디지털 패스 카드 렌더링 검증
    await expect(mobilePage.locator('text=LUCKY DRAW NUMBER')).toBeVisible({ timeout: 10000 });
    await expect(mobilePage.locator(`text=${testNickName}`)).toBeVisible();
    await expect(mobilePage.locator('img[alt="PASS QR"]')).toBeVisible();

    // --- STEP 2: 어드민 페이지에서 PIN 잠금 해제 및 실시간 참가자 확인 ---
    await adminPage.goto('/admin');
    await unlockAdmin(adminPage);
    await expect(adminPage.locator(`text=${testNickName}`).first()).toBeVisible({ timeout: 10000 });

    // --- STEP 3: 5등 상품 실시간 롤링 시작 ---
    const rollButton = adminPage.locator('button:has-text("1. 롤링")').first();
    await rollButton.click();
    await expect(mobilePage.locator('text=추첨 롤링 중')).toBeVisible({ timeout: 10000 });

    // --- STEP 4: 당첨자 확정 발표 ---
    const announceButton = adminPage.locator('button:has-text("2. 발표")').first();
    await announceButton.click();

    // --- STEP 5: 당첨 축하 화면 자동 팝업 검증 및 출석 확인 ---
    // 모달 시트의 출석 확인 버튼을 우선 클릭 (last)
    const confirmPresenceBtn = mobilePage.locator('button:has-text("저 현장에 있습니다")').last();
    await expect(confirmPresenceBtn).toBeVisible({ timeout: 10000 });
    await confirmPresenceBtn.click();

    // 모바일 출석 확인 완료 상태 검증
    await expect(mobilePage.locator('text=출석 확인 완료').first()).toBeVisible({ timeout: 8000 });

    // 어드민에서도 '출석확인됨' 뱃지 동기화 확인
    await expect(adminPage.locator('text=출석확인됨').first()).toBeVisible({ timeout: 10000 });

    // --- STEP 6: 전광판(/display) 실시간 동기화 검증 ---
    await displayPage.goto('/display');
    await expect(displayPage.locator('text=YUNTAKU').first()).toBeVisible({ timeout: 10000 });

    // --- STEP 7: 모바일 실시간 리액션 전송 ---
    // 모달이 열려있다면 닫기 버튼 클릭
    const closeBtn = mobilePage.locator('button:has-text("패스 화면으로 돌아가기")');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    const cheerBtn = mobilePage.locator('button:has-text("👏")').first();
    if (await cheerBtn.isVisible({ timeout: 5000 })) {
      await cheerBtn.click();
      await expect(mobilePage.locator('text=전광판에 응원을 보냈습니다')).toBeVisible({ timeout: 5000 });
    }

    // 리소스 정리
    await mobileContext.close();
    await adminContext.close();
    await displayContext.close();
  });

  test('한번에 여러명 일괄 롤링 및 동시 발표(다중 당첨) 플로우 검증', async ({ browser }) => {
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const adminPage = await adminContext.newPage();
    const displayContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const displayPage = await displayContext.newPage();

    // 1. 어드민 페이지 접근 및 PIN 해제
    await adminPage.goto('/admin');
    await unlockAdmin(adminPage);

    // 2. 더미 참가자 10명 생성
    const addDummiesBtn = adminPage.locator('button:has-text("+10명")');
    await addDummiesBtn.click();
    await expect(adminPage.locator('text=PLAYERS')).toBeVisible();

    // 3. 전광판(/display) 페이지 열기
    await displayPage.goto('/display');
    await expect(displayPage.locator('text=PLAYERS')).toBeVisible({ timeout: 10000 });

    // 4. 5등 상품에서 '3' 프리셋 버튼을 눌러 3명 일괄 추첨 설정
    const btn3Count = adminPage.locator('button[data-testid="batch-preset-3"]').first();
    await btn3Count.click();
    await expect(adminPage.locator('button:has-text("3명 롤링")').first()).toBeVisible({ timeout: 5000 });

    // 5. 3명 동시 롤링 시작
    const batchRollBtn = adminPage.locator('button:has-text("3명 롤링")').first();
    await batchRollBtn.click();

    // 전광판에 3개 슬롯 머신 또는 롤링 중 텍스트 동기화 검증
    await expect(displayPage.locator('text=3명 일괄 롤링 중')).toBeVisible({ timeout: 10000 });
    await expect(displayPage.locator('text=SLOT #1')).toBeVisible();
    await expect(displayPage.locator('text=SLOT #2')).toBeVisible();
    await expect(displayPage.locator('text=SLOT #3')).toBeVisible();

    // 6. 3명 동시 일괄 발표
    const batchAnnounceBtn = adminPage.locator('button:has-text("발표")').first();
    await batchAnnounceBtn.click();

    // 전광판에 3명 동시 당첨자 그리드 카드 표시 검증
    await expect(displayPage.locator('text=총 3명 동시 당첨 발표')).toBeVisible({ timeout: 10000 });
    await expect(displayPage.locator('text=WINNER #1')).toBeVisible();
    await expect(displayPage.locator('text=WINNER #2')).toBeVisible();
    await expect(displayPage.locator('text=WINNER #3')).toBeVisible();

    // 어드민 콘솔에 3명 당첨 완료 상태 표시 검증
    await expect(adminPage.locator('text=총 3명 일괄 당첨 완료')).toBeVisible({ timeout: 10000 });

    // 리소스 정리
    await adminContext.close();
    await displayContext.close();
  });

  test('등수 숨기기 및 커스텀 등수 라벨(대상, 특별상 등) 설정과 전광판 반영 검증', async ({ browser }) => {
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const adminPage = await adminContext.newPage();

    const displayContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const displayPage = await displayContext.newPage();

    // 1. 어드민 접속 및 PIN 해제
    await adminPage.goto('/admin');
    await unlockAdmin(adminPage);

    // 2. 상품 관리 탭으로 이동
    const prizesTabBtn = adminPage.locator('button:has-text("상품 설정")');
    await prizesTabBtn.click();
    await expect(adminPage.locator('text=상품 목록 커스텀 설정')).toBeVisible();

    // 3. 커스텀 라벨 '대상' 프리셋 클릭 및 상품 추가
    const daesangPresetBtn = adminPage.locator('button:has-text("대상")').first();
    await daesangPresetBtn.click();
    const prizeTitleInput = adminPage.locator('input[placeholder*="다이슨 에어랩"]');
    await prizeTitleInput.fill('최고급 안마의자');
    await adminPage.locator('button:has-text("추가하기")').click();

    // 어드민 상품 목록에 '대상' 뱃지와 상품명 노출 확인
    await expect(adminPage.locator('text=최고급 안마의자')).toBeVisible({ timeout: 5000 });
    await expect(prizeTitleInput).toHaveValue('');

    // 4. '등수 숨기기' 체크 후 상품 추가
    const hideRankCheckbox = adminPage.locator('label:has-text("등수/라벨 숨기기") input[type="checkbox"]');
    await hideRankCheckbox.check();
    await expect(hideRankCheckbox).toBeChecked();
    await prizeTitleInput.fill('서프라이즈 선물박스');
    await expect(prizeTitleInput).toHaveValue('서프라이즈 선물박스');
    await adminPage.locator('button:has-text("추가하기")').click();

    // 어드민 상품 목록에 '등수 숨김' 태그 확인
    await expect(adminPage.locator('text=서프라이즈 선물박스')).toBeVisible({ timeout: 5000 });
    await expect(adminPage.locator('span:has-text("등수 숨김")').first()).toBeVisible();

    // 5. 전광판(/display) 화면에서 커스텀 라벨 및 등수 숨김 반영 확인
    await displayPage.goto('/display');
    await expect(displayPage.locator('text=최고급 안마의자').first()).toBeVisible({ timeout: 10000 });
    await expect(displayPage.locator('text=대상').first()).toBeVisible({ timeout: 10000 });
    await expect(displayPage.locator('text=서프라이즈 선물박스').first()).toBeVisible({ timeout: 10000 });

    await adminContext.close();
    await displayContext.close();
  });

});

