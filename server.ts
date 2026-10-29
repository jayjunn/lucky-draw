import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server, Socket } from 'socket.io';
import { AppState, Participant, Prize, DrawState, ThemeType } from './src/types';
import { saveEventStateToDb, logDrawResultToDb } from './src/lib/firebase';
import fs from 'fs';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 기본 상품 목록
const defaultPrizes: Prize[] = [
  { id: 'prize-5', rank: 5, title: '스타벅스 e-카드 3만원권', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-4', rank: 4, title: '올리브영 기프트카드 5만원권', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-3', rank: 3, title: '에어팟 4세대 노이즈캔슬링', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-2', rank: 2, title: '다이슨 슈퍼소닉 헤어드라이어', count: 1, announced: false, winner: null, absentHistory: [] },
  { id: 'prize-1', rank: 1, title: 'iPhone 16 Pro 256GB', count: 1, announced: false, winner: null, absentHistory: [] },
];

let participants: Participant[] = [];
let prizes: Prize[] = JSON.parse(JSON.stringify(defaultPrizes));
let nextParticipantNumber = 1;
let allowDuplicateWin = false;
let eventName = '2026 LUCKY DRAW FESTIVAL';

let drawState: DrawState = {
  currentRank: null,
  phase: 'IDLE',
  currentWinner: null,
  callTimer: null,
};

let timerInterval: NodeJS.Timeout | null = null;

// 로컬 백업에서 이전 상태 복구 시도
try {
  const backupPath = path.join(process.cwd(), 'data', 'event_history.json');
  if (fs.existsSync(backupPath)) {
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    if (backup.prizes && backup.prizes.length > 0) prizes = backup.prizes;
    if (backup.eventName) eventName = backup.eventName;
    if (backup.participants && backup.participants.length > 0) {
      participants = backup.participants;
      const maxNum = Math.max(...participants.map((p: Participant) => p.number), 0);
      nextParticipantNumber = maxNum + 1;
    }
    console.log('📦 이전 행사 데이터 복구 완료: 참가자', participants.length, '명, 상품', prizes.length, '개');
  }
} catch (e) {
  console.log('신규 세션으로 시작합니다.');
}

let theme: ThemeType = 'HALLOWEEN'; // 기본 할로윈 이벤트 테마

function getAppState(): AppState {
  return {
    participants,
    prizes,
    drawState,
    eventName,
    allowDuplicateWin,
    theme,
  };
}

// 다음 당첨 후보자 추첨 함수 (중복 당첨 원천 방지)
function pickNextWinner(rank: number, targetNumber?: number): Participant | null {
  const prize = prizes.find((p) => p.rank === rank);
  if (!prize) return null;

  const wonNumbers = new Set<number>();
  const wonIds = new Set<string>();

  prizes.forEach((p) => {
    if (p.rank !== rank) {
      if (p.winner) {
        wonNumbers.add(p.winner.number);
        if (p.winner.id) wonIds.add(p.winner.id);
      }
      if (p.winners) {
        p.winners.forEach((w) => {
          wonNumbers.add(w.number);
          if (w.id) wonIds.add(w.id);
        });
      }
    }
  });

  participants.forEach((p) => {
    if (p.isWinner && p.isWinner.rank !== rank) {
      wonNumbers.add(p.number);
      wonIds.add(p.id);
    }
  });

  const absentNumbers = new Set(
    participants.filter((p) => p.status === 'ABSENT').map((p) => p.number)
  );

  let candidates = participants.filter((p) => {
    if (absentNumbers.has(p.number)) return false;
    if (!allowDuplicateWin && (wonNumbers.has(p.number) || wonIds.has(p.id))) return false;
    return true;
  });

  if (targetNumber) {
    const specified = candidates.find((p) => p.number === targetNumber);
    if (specified) return specified;
  }

  if (candidates.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      if (parsedUrl.pathname === '/api/test-reset') {
        participants = [];
        nextParticipantNumber = 1;
        prizes = JSON.parse(JSON.stringify(defaultPrizes));
        drawState = {
          currentRank: null,
          phase: 'IDLE',
          currentWinner: null,
          callTimer: null,
        };
        if (timerInterval) clearInterval(timerInterval);
        io.emit('draw_reset', {});
        io.emit('state_sync', getAppState());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.emit('state_sync', getAppState());

    // 1. 참가자 등록 (또는 기존 번호 복구)
    socket.on('register_participant', async (data: { name: string; existingId?: string }) => {
      let participant: Participant | undefined;

      if (data.existingId) {
        participant = participants.find((p) => p.id === data.existingId);
        if (!participant) {
          // DB/메모리에 없는 ID(초기화됨)이면 자동 생성하지 않음!
          return;
        }
      } else {
        // 신규 등록일 때만 새 번호 채번
        participant = {
          id: 'user_' + Math.random().toString(36).substring(2, 9),
          number: nextParticipantNumber++,
          name: data.name?.trim() || `참가자 #${nextParticipantNumber}`,
          registeredAt: Date.now(),
          status: 'ACTIVE',
        };
        participants.push(participant);
      }

      socket.emit('participant_registered', participant);
      io.emit('state_sync', getAppState());
      saveEventStateToDb(getAppState()).catch(() => {});
    });

    // 2. 관리자: 룰렛/추첨 시작 (일괄 추첨 지원)
    socket.on('admin_start_draw', (data: { rank: number; count?: number }) => {
      const prize = prizes.find((p) => p.rank === data.rank);
      if (!prize) return;

      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      const batchCount = Math.max(1, data.count || prize.count || 1);

      drawState = {
        currentRank: data.rank,
        currentRankLabel: prize.rankLabel || '',
        currentHideRank: Boolean(prize.hideRank),
        phase: 'ROULETTE',
        batchCount,
        currentWinner: null,
        currentWinners: [],
        callTimer: null,
      };

      io.emit('draw_roulette_start', {
        rank: data.rank,
        prize: prize.title,
        batchCount,
      });
      io.emit('state_sync', getAppState());
    });

    // 3. 관리자: 당첨자 확정 및 발표! (일괄 다중 발표 지원)
    socket.on('admin_announce_winner', async (data: { rank: number; targetNumber?: number; count?: number }) => {
      const prize = prizes.find((p) => p.rank === data.rank);
      if (!prize) return;

      const targetCount = Math.max(1, data.count || prize.count || 1);
      const chosenWinners: Participant[] = [];

      if (data.targetNumber) {
        const specified = pickNextWinner(data.rank, data.targetNumber);
        if (specified) chosenWinners.push(specified);
      }

      while (chosenWinners.length < targetCount) {
        const next = pickNextWinner(data.rank);
        if (!next) break;
        if (!chosenWinners.some((w) => w.number === next.number)) {
          chosenWinners.push(next);
        }
      }

      if (chosenWinners.length === 0) {
        socket.emit('admin_alert', { message: '추첨 가능한 남은 참가자가 없습니다.' });
        return;
      }

      const now = Date.now();
      const announcedWinners = chosenWinners.map((winner) => ({
        rank: prize.rank,
        rankLabel: prize.rankLabel || '',
        hideRank: Boolean(prize.hideRank),
        prize: prize.title,
        winnerNumber: winner.number,
        winnerName: winner.name,
        announcedAt: now,
        confirmed: false,
        participantId: winner.id,
      }));

      const newWinnersData = chosenWinners.map((winner) => ({
        number: winner.number,
        name: winner.name,
        confirmed: false,
        id: winner.id,
      }));

      prize.winner = newWinnersData[0] || null;
      prize.winners = newWinnersData;
      prize.announced = true;

      chosenWinners.forEach((winner) => {
        winner.isWinner = {
          rank: prize.rank,
          rankLabel: prize.rankLabel || '',
          hideRank: Boolean(prize.hideRank),
          prize: prize.title,
          announcedAt: now,
        };
        winner.presenceConfirmed = false;
      });

      drawState = {
        currentRank: data.rank,
        currentRankLabel: prize.rankLabel || '',
        currentHideRank: Boolean(prize.hideRank),
        phase: 'ANNOUNCED',
        batchCount: chosenWinners.length,
        callTimer: 30,
        currentWinner: announcedWinners[0] || null,
        currentWinners: announcedWinners,
      };

      io.emit('draw_announced', drawState.currentWinner);
      io.emit('state_sync', getAppState());

      // Firebase & 로컬 영구 로그 저장
      for (const w of announcedWinners) {
        await logDrawResultToDb({
          rank: prize.rank,
          prize: prize.title,
          winnerNumber: w.winnerNumber,
          winnerName: w.winnerName,
          type: 'WINNER',
        });
      }
      await saveEventStateToDb(getAppState());
    });

    // 4. 🔥 핵심: 부재중/미출석 처리 후 다음 사람 재추첨! 🔥
    socket.on('admin_redraw_absent', async (data: { rank: number }) => {
      const prize = prizes.find((p) => p.rank === data.rank);
      if (!prize || !prize.winner) return;

      const absentPerson = participants.find((p) => p.number === prize.winner!.number);
      if (absentPerson) {
        absentPerson.status = 'ABSENT';
        delete absentPerson.isWinner;
        absentPerson.presenceConfirmed = false;
      }

      if (!prize.absentHistory) prize.absentHistory = [];
      prize.absentHistory.push({
        number: prize.winner.number,
        name: prize.winner.name,
        at: Date.now(),
      });

      // 부재중 취소 로그 저장
      await logDrawResultToDb({
        rank: prize.rank,
        prize: prize.title,
        winnerNumber: prize.winner.number,
        winnerName: prize.winner.name,
        type: 'ABSENT_CANCELLED',
        reason: '현장 미출석(부재)으로 인한 당첨 취소',
      });

      // 기존 당첨 취소 브로드캐스트
      io.emit('draw_winner_cancelled', {
        cancelledNumber: prize.winner.number,
        cancelledName: prize.winner.name,
        rank: prize.rank,
      });

      // 자리에 있는 사람 나올 때까지 다음 사람 즉시 선출!
      const nextWinner = pickNextWinner(data.rank);

      if (!nextWinner) {
        prize.winner = null;
        prize.announced = false;
        drawState = {
          currentRank: data.rank,
          phase: 'IDLE',
          currentWinner: null,
        };
        io.emit('state_sync', getAppState());
        socket.emit('admin_alert', { message: '더 이상 추첨할 수 있는 참가자가 없습니다.' });
        return;
      }

      // 새 당첨자 확정
      prize.winner = {
        number: nextWinner.number,
        name: nextWinner.name,
        confirmed: false,
      };
      nextWinner.isWinner = {
        rank: prize.rank,
        prize: prize.title,
        announcedAt: Date.now(),
      };
      nextWinner.presenceConfirmed = false;

      drawState = {
        currentRank: data.rank,
        phase: 'ANNOUNCED',
        callTimer: null,
        currentWinner: {
          rank: prize.rank,
          prize: prize.title,
          winnerNumber: nextWinner.number,
          winnerName: nextWinner.name,
          announcedAt: Date.now(),
          confirmed: false,
        },
      };

      io.emit('draw_announced', drawState.currentWinner);
      io.emit('state_sync', getAppState());

      // 새 당첨자 로그 저장
      await logDrawResultToDb({
        rank: prize.rank,
        prize: prize.title,
        winnerNumber: nextWinner.number,
        winnerName: nextWinner.name,
        type: 'WINNER',
      });
      await saveEventStateToDb(getAppState());
    });

    // 5. 호명 카운트다운 타이머 (예: 30초)
    socket.on('admin_start_call_timer', (data: { seconds?: number }) => {
      const duration = data.seconds || 30;
      let remain = duration;

      if (timerInterval) clearInterval(timerInterval);

      drawState.callTimer = remain;
      io.emit('call_timer_tick', { seconds: remain });

      timerInterval = setInterval(() => {
        remain--;
        drawState.callTimer = remain;
        io.emit('call_timer_tick', { seconds: remain });

        if (remain <= 0) {
          if (timerInterval) clearInterval(timerInterval);
          timerInterval = null;
          drawState.callTimer = 0;
          io.emit('call_timer_ended', {});
          io.emit('state_sync', getAppState());
        }
      }, 1000);
    });

    // 6. 당첨자 본인의 "🙋 저 여기 있어요!(출석 확인)" 응답
    socket.on('participant_confirm_presence', async (data: { id: string }) => {
      const p = participants.find((part) => part.id === data.id);
      if (p && p.isWinner) {
        p.presenceConfirmed = true;
        if (drawState.currentWinner && drawState.currentWinner.winnerNumber === p.number) {
          drawState.currentWinner.confirmed = true;
        }
        const prize = prizes.find((prz) => prz.rank === p.isWinner?.rank);
        if (prize && prize.winner) {
          prize.winner.confirmed = true;
        }

        io.emit('presence_confirmed', {
          number: p.number,
          name: p.name,
        });
        io.emit('state_sync', getAppState());
        await saveEventStateToDb(getAppState());
      }
    });

    // 7. 관리자: 상품 목록 저장 및 행사명 설정 (완전 커스텀 가능)
    socket.on('admin_update_prizes', async (updatedPrizes: Prize[]) => {
      prizes = updatedPrizes;
      io.emit('state_sync', getAppState());
      await saveEventStateToDb(getAppState());
    });

    socket.on('admin_update_event_name', async (data: { eventName: string }) => {
      if (data.eventName?.trim()) {
        eventName = data.eventName.trim();
        io.emit('state_sync', getAppState());
        await saveEventStateToDb(getAppState());
      }
    });

    // 8. 더미 참가자 생성
    socket.on('admin_generate_dummies', async (data: { count: number }) => {
      const count = Math.min(Math.max(data.count || 10, 1), 200);
      const dummyNames = [
        '김민준', '이지은', '박도윤', '최서아', '정도현', '강하은', '조시우', '윤지아',
        '장건우', '임수아', '한예준', '오채원', '서우진', '신지우', '권유찬', '황다은',
        '안태윤', '송채은', '류준서', '전소율', '홍서준', '고은우', '문시윤', '양하율',
        '배지호', '백예린', '허서진', '유아린', '남민재', '심채윤', '노승우', '하윤아'
      ];

      for (let i = 0; i < count; i++) {
        const randomName = dummyNames[Math.floor(Math.random() * dummyNames.length)] + ` (${nextParticipantNumber})`;
        participants.push({
          id: 'dummy_' + Math.random().toString(36).substring(2, 9),
          number: nextParticipantNumber++,
          name: randomName,
          status: 'ACTIVE',
          registeredAt: Date.now(),
        });
      }

      io.emit('state_sync', getAppState());
      await saveEventStateToDb(getAppState());
    });

    // 9. 리셋 기능들
    socket.on('admin_reset_draws', async () => {
      prizes.forEach((p) => {
        p.winner = null;
        p.winners = [];
        p.announced = false;
        p.absentHistory = [];
      });
      participants.forEach((p) => {
        delete p.isWinner;
        p.presenceConfirmed = false;
        p.status = 'ACTIVE';
      });
      drawState = {
        currentRank: null,
        phase: 'IDLE',
        currentWinner: null,
        currentWinners: [],
        callTimer: null,
      };
      if (timerInterval) clearInterval(timerInterval);
      io.emit('draw_reset', {});
      io.emit('state_sync', getAppState());
    });

    socket.on('admin_reset_all', async () => {
      participants = [];
      nextParticipantNumber = 1;
      // 현재 저장된 상품 목록은 100% 보존하고 당첨 정보만 초기화
      prizes.forEach((p) => {
        p.winner = null;
        p.winners = [];
        p.announced = false;
        p.absentHistory = [];
      });
      drawState = {
        currentRank: null,
        phase: 'IDLE',
        currentWinner: null,
        currentWinners: [],
        callTimer: null,
      };
      if (timerInterval) clearInterval(timerInterval);
      io.emit('draw_reset', {});
      io.emit('state_sync', getAppState());
      await saveEventStateToDb(getAppState());
    });

    socket.on('admin_delete_participant', async (data: { participantId: string }) => {
      const targetId = data.participantId;
      const target = participants.find((p) => p.id === targetId);
      participants = participants.filter((p) => p.id !== targetId);
      if (target) {
        prizes.forEach((prize) => {
          if (prize.winners) {
            prize.winners = prize.winners.filter((w) => w.id !== targetId && w.number !== target.number);
          }
          if (prize.winner && (prize.winner.id === targetId || prize.winner.number === target.number)) {
            prize.winner = prize.winners?.[0] || null;
            prize.announced = Boolean(prize.winner);
          }
        });
      }
      io.emit('state_sync', getAppState());
      await saveEventStateToDb(getAppState());
    });

    socket.on('admin_set_theme', async (data: { theme: ThemeType }) => {
      theme = data.theme;
      io.emit('state_sync', getAppState());
      await saveEventStateToDb(getAppState());
    });

    socket.on('admin_toggle_duplicate_win', async () => {
      allowDuplicateWin = !allowDuplicateWin;
      io.emit('state_sync', getAppState());
      await saveEventStateToDb(getAppState());
    });

    socket.on('participant_cheer', (data: { emoji: string; name?: string }) => {
      io.emit('cheer_burst', {
        emoji: data.emoji || '👏',
        name: data.name || '참가자',
        timestamp: Date.now(),
      });
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
