// 모바일 터치 입력용 변수
let isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
let touchMove = {active: false, id: null, x: 0, y: 0, dx: 0, dy: 0};
let touchShoot = {active: false, id: null, x: 0, y: 0, dx: 0, dy: 0};
// Game 5: Brawl Stars-like Top-down Shooter (기본 샘플)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 480;
// 모바일 브라우저의 더블탭/핀치 줌을 방지
try { canvas.style.touchAction = 'none'; } catch (e) {}

const player = { x: 400, y: 240, r: 22, color: '#4ecdc4', speed: 4, vx: 0, vy: 0, angle: 0, hp: 10, maxHp: 10 };
let keys = {};
let bullets = [];
let enemies = [];
let cakes = [];
// 마지막 포인터 위치(마우스/터치)를 추적
let lastPointer = { x: 400, y: 240 };
let charge = 0;
let maxCharge = 9;
let canBigShot = 0;
// 디버그 모드: 화면에 각도/벡터/이벤트를 그림
let DEBUG = true;
let debugEvents = [];
let gameOver = false;
let restartBtn = { x: 0, y: 0, w: 220, h: 60, visible: false };
let score = 0;
let highScore = Number(localStorage.getItem('game5_highScore') || 0);
// 공격 버튼 상태
let normalBtn = { x: 0, y: 0, w: 120, h: 52, pressed: false, touchId: null };
let bigBtn = { x: 0, y: 0, w: 120, h: 52, pressed: false, touchId: null };

function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 300 + Math.random() * 100;
  const ex = player.x + Math.cos(angle) * dist;
  const ey = player.y + Math.sin(angle) * dist;
  // 5% 초강력, 10% 느린 공격형, 10% 빠른, 20% 강한, 나머지 일반
  const roll = Math.random();
  if (roll < 0.05) {
    enemies.push({ x: ex, y: ey, r: 48, color: '#ffd700', hp: 30, maxHp: 30, strong: 'super', vx: 0, vy: 0 });
  } else if (roll < 0.15) {
    // 공격이 새고 느린 적: 빨간색, HP 8, 느림, 공격력 2, 점수 7
    enemies.push({ x: ex, y: ey, r: 26, color: '#e80ba6ff', hp: 8, maxHp: 8, strong: 'slowAttacker', vx: 0, vy: 0 });
  } else if (roll < 0.25) {
    enemies.push({ x: ex, y: ey, r: 18, color: '#2ecc40', hp: 2, maxHp: 2, strong: 'fast', vx: 0, vy: 0 });
  } else if (roll < 0.45) {
    enemies.push({ x: ex, y: ey, r: 32, color: '#a259e6', hp: 10, maxHp: 10, strong: true, vx: 0, vy: 0 });
  } else {
    enemies.push({ x: ex, y: ey, r: 20, color: '#ff6b6b', hp: 3, maxHp: 3, strong: false, vx: 0, vy: 0 });
  }
}

function spawnCake() {
  // 1% 확률로 소환 시도, 맵에 이미 케이크가 1개 이상 있으면 소환 안 함
  if (cakes.length >= 1) return;
  if (Math.random() < 0.01) {
    const x = 40 + Math.random() * (canvas.width - 80);
    const y = 40 + Math.random() * (canvas.height - 80);
    cakes.push({ x, y, r: 18 });
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(0, 0, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBullets() {
  for (const b of bullets) {
    ctx.beginPath();
    if (b.big) {
      ctx.fillStyle = '#ff3300';
      ctx.arc(b.x, b.y, 40, 0, Math.PI * 2);
    } else {
      ctx.fillStyle = '#ffe066';
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of enemies) {
    // 각 적에 고유 id 부여(없으면)
    if (e._id === undefined) e._id = Math.random().toString(36).slice(2);
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
    // HP bar
    ctx.fillStyle = '#222';
    let barW, barColor;
    if (e.strong === 'super') {
      barW = 120; barColor = '#ffd700';
    } else if (e.strong === 'slowAttacker') {
      barW = 60; barColor = '#e74c3c';
    } else if (e.strong === 'fast') {
      barW = 32; barColor = '#2ecc40';
    } else if (e.strong) {
      barW = 80; barColor = '#a259e6';
    } else {
      barW = 40; barColor = '#ff6b6b';
    }
    const barX = e.x - barW/2;
    ctx.fillRect(barX, e.y - e.r - 16, barW, 6);
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, e.y - e.r - 16, barW * (e.hp/e.maxHp), 6);
  }
}

function drawCakes() {
  for (const c of cakes) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff6b8';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e07a5f';
    ctx.stroke();
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#e07a5f';
    ctx.textAlign = 'center';
    ctx.fillText('🍰', c.x, c.y + 6);
    ctx.restore();
  }
}

function drawAttackButtons() {
  // 버튼 위치를 매 프레임 계산(우하단 기준)
  normalBtn.x = canvas.width - 160;
  normalBtn.y = canvas.height - 160;
  bigBtn.x = canvas.width - 160;
  bigBtn.y = canvas.height - 90;

  // 일반 버튼
  ctx.save();
  ctx.fillStyle = normalBtn.pressed ? '#ddd' : '#fff';
  ctx.fillRect(normalBtn.x, normalBtn.y, normalBtn.w, normalBtn.h);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(normalBtn.x, normalBtn.y, normalBtn.w, normalBtn.h);
  ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#222'; ctx.textAlign = 'center';
  ctx.fillText('일반공격', normalBtn.x + normalBtn.w/2, normalBtn.y + 34);
  // 거대 버튼
  ctx.fillStyle = bigBtn.pressed ? '#ffb3b3' : '#ffdddd';
  ctx.fillRect(bigBtn.x, bigBtn.y, bigBtn.w, bigBtn.h);
  ctx.strokeStyle = '#b33'; ctx.lineWidth = 2; ctx.strokeRect(bigBtn.x, bigBtn.y, bigBtn.w, bigBtn.h);
  ctx.fillStyle = '#550';
  ctx.fillText('거대공격', bigBtn.x + bigBtn.w/2, bigBtn.y + 34);
  // 거대공격 보유 수
  ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#00f';
  ctx.fillText(`x${canBigShot}`, bigBtn.x + bigBtn.w - 18, bigBtn.y + 16);
  ctx.restore();
}

// aim 각도 계산: 우선순위 - shooting pad 방향(충분한 입력), 마지막 포인터 위치, player.angle
// 세 번째 인자 forcePointer를 true로 주면 mx,my 좌표를 우선 사용하려 시도한다(작은 거리일 경우에는 폴백).
function getAimAngle(mx, my, forcePointer = false) {
  // shooting pad 우선
  if (touchShoot.active) {
    const len = Math.hypot(touchShoot.dx, touchShoot.dy);
    if (len > 6) return Math.atan2(touchShoot.dy, touchShoot.dx);
  }
  // 강제로 포인터 좌표를 사용하도록 요청된 경우(버튼 클릭/터치)
  if (forcePointer && typeof mx === 'number' && typeof my === 'number') {
    const dx0 = mx - player.x, dy0 = my - player.y;
    const l0 = Math.hypot(dx0, dy0);
    // 아주 극단적으로 플레이어와 같지 않은 한도(1px)면 해당 방향 사용
    if (l0 > 1) return Math.atan2(dy0, dx0);
    // 그렇지 않으면 다음 우선순위로 진행
  }
  // 마지막 포인터(클릭/터치) 사용
  if (typeof mx === 'number' && typeof my === 'number') {
    const dx = mx - player.x, dy = my - player.y;
    const l = Math.hypot(dx, dy);
    if (l > 6) return Math.atan2(dy, dx);
  }
  // 폴백으로 player.angle
  return player.angle;
}

// 좌하단에 항상 보이는 보조 패드(눈에 띄게 표시)
function drawAlwaysVisiblePad() {
  const x = 90, y = canvas.height - 90;
  ctx.save();
  // 큰 반투명 배경
  ctx.beginPath();
  ctx.arc(x, y, 70, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  // 밝은 테두리
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#4ecdc4';
  ctx.stroke();
  // MOVE 텍스트
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('MOVE', x, y + 6);
  ctx.restore();
}

function updatePlayer() {
  // 모바일 이동 입력
  if (isMobile && touchMove.active) {
    // 터치 조이스틱이 활성화된 경우 터치 입력 우선
    const len = Math.hypot(touchMove.dx, touchMove.dy);
    if (len > 10) {
      player.vx = (touchMove.dx / len) * player.speed;
      player.vy = (touchMove.dy / len) * player.speed;
    } else {
      player.vx = 0; player.vy = 0;
    }
  } else {
    // 데스크탑/키보드 이동(항상 유지)
    player.vx = (keys['ArrowRight'] ? 1 : 0) - (keys['ArrowLeft'] ? 1 : 0);
    player.vy = (keys['ArrowDown'] ? 1 : 0) - (keys['ArrowUp'] ? 1 : 0);
  }
  const len = Math.hypot(player.vx, player.vy);
  if (len > 0) {
    player.vx = (player.vx / len) * player.speed;
    player.vy = (player.vy / len) * player.speed;
  }
  player.x += player.vx;
  player.y += player.vy;
  // 화면 경계
  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    // 화면 밖 제거 (거대 총알은 반지름 24)
  const radius = b.big ? 40 : 8;
    if (b.x < -radius || b.x > canvas.width + radius || b.y < -radius || b.y > canvas.height + radius) {
      bullets.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (const e of enemies) {
    // 플레이어 추적
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const len = Math.hypot(dx, dy);
    let speed = 1.5;
    if (e.strong === 'fast') speed = 3.5;
    if (e.strong === 'slowAttacker') speed = 0.7;
    if (len > 1) {
      e.vx = (dx / len) * speed;
      e.vy = (dy / len) * speed;
      e.x += e.vx;
      e.y += e.vy;
    }
  }
}

function checkCollisions() {
  // 총알-적
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    // 거대 총알은 관통한 적 id를 저장
    if (b.big && !b.hitIds) b.hitIds = [];
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const radius = b.big ? 40 : 8;
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < e.r + radius) {
        if (!b.big) {
          e.hp -= 1;
          charge++;
          if (charge >= maxCharge) {
            charge = 0;
            canBigShot++;
          }
          bullets.splice(i, 1);
          if (e.hp <= 0) {
            // 점수 가산
            if (e.strong === 'super') score += 10;
            else if (e.strong === 'slowAttacker') score += 7;
            else if (e.strong === 'fast') score += 3;
            else if (e.strong) score += 5;
            else score += 1;
            enemies.splice(j, 1);
          }
          break;
        } else {
          // 거대 총알: 이미 맞은 적은 무시
          if (b.hitIds.includes(e._id)) continue;
          b.hitIds.push(e._id);
          e.hp -= 3;
          if (e.hp <= 0) {
            // 점수 가산 (거대 총알로 처치 시도 포함)
            if (e.strong === 'super') score += 10;
            else if (e.strong === 'slowAttacker') score += 7;
            else if (e.strong === 'fast') score += 3;
            else if (e.strong) score += 5;
            else score += 1;
            enemies.splice(j, 1);
          }
          // 거대 총알은 관통
        }
      }
    }
  }
  // 적-플레이어
  for (const e of enemies) {
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (dist < player.r + e.r) {
      // 느린 공격형 적은 2의 피해, 나머지는 1
      if (e.strong === 'slowAttacker') player.hp -= 2;
      else player.hp--;
      // 피격 시 플레이어를 살짝 밀어냄
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      player.x += (dx/len) * 20;
      player.y += (dy/len) * 20;
      if (player.hp <= 0) {
        player.hp = 0;
        gameOver = true;
        // 최고 점수 갱신
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('game5_highScore', highScore);
        }
      }
      break;
    }
  }
  // 케이크-플레이어
  for (let i = cakes.length - 1; i >= 0; i--) {
    const c = cakes[i];
    const dist = Math.hypot(player.x - c.x, player.y - c.y);
    if (dist < player.r + c.r) {
      player.hp = Math.min(player.maxHp, player.hp + 2);
      cakes.splice(i, 1);
    }
  }
}

function draw() {
  // 가상 패드 UI (모바일 전용이 아니도록 항상 렌더링)
  {
    // 이동 조이스틱: 터치 시작 지점을 기준으로 다이내믹하게 표시
    ctx.save();
    ctx.globalAlpha = 0.5;
    if (touchMove.active) {
      // 베이스
      ctx.beginPath();
      ctx.arc(touchMove.x, touchMove.y, 60, 0, Math.PI*2);
      ctx.fillStyle = '#888';
      ctx.fill();
      // 노브
      ctx.beginPath();
      ctx.arc(touchMove.x + touchMove.dx, touchMove.y + touchMove.dy, 30, 0, Math.PI*2);
      ctx.fillStyle = '#4ecdc4';
      ctx.fill();
    } else {
      // 비활성 시에도 좌하단에 더 눈에 띄는 베이스 표시
      ctx.beginPath();
      ctx.arc(90, canvas.height-90, 60, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(136,136,136,0.15)';
      ctx.fill();
      // 중앙 노브(비활성 안내)
      ctx.beginPath();
      ctx.arc(90, canvas.height-90, 18, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(78,205,196,0.25)';
      ctx.fill();
    }
    // 슈팅 패드(우하단)
    ctx.beginPath();
    ctx.arc(canvas.width-90, canvas.height-90, 60, 0, Math.PI*2);
    ctx.fillStyle = '#888';
    ctx.fill();
    if (touchShoot.active) {
      ctx.beginPath();
      ctx.arc(canvas.width-90+touchShoot.dx, canvas.height-90+touchShoot.dy, 30, 0, Math.PI*2);
      ctx.fillStyle = '#ffe066';
      ctx.fill();
    }
    ctx.restore();
  }
// 모바일 터치 이벤트: 이동/슈팅 패드
canvas.addEventListener('touchstart', function(e) {
  // 터치 기본 동작(확대 등)을 막음
  e.preventDefault();
  for (const t of e.changedTouches) {
    const x = t.clientX - canvas.getBoundingClientRect().left;
    const y = t.clientY - canvas.getBoundingClientRect().top;
    // 만약 버튼 영역이면 패드 할당을 건너뜀(버튼 터치 우선)
    if (x >= normalBtn.x && x <= normalBtn.x + normalBtn.w && y >= normalBtn.y && y <= normalBtn.y + normalBtn.h) continue;
    if (x >= bigBtn.x && x <= bigBtn.x + bigBtn.w && y >= bigBtn.y && y <= bigBtn.y + bigBtn.h) continue;
    // 이동 패드(좌하단)
    if (x < 180 && y > canvas.height-180) {
      touchMove.active = true; touchMove.id = t.identifier;
      touchMove.x = x; touchMove.y = y; touchMove.dx = 0; touchMove.dy = 0;
    }
    // 슈팅 패드(우하단)
    if (x > canvas.width-180 && y > canvas.height-180) {
      touchShoot.active = true; touchShoot.id = t.identifier;
      touchShoot.x = x; touchShoot.y = y; touchShoot.dx = 0; touchShoot.dy = 0;
    }
  }
}, { passive: false });
canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const x = t.clientX - canvas.getBoundingClientRect().left;
    const y = t.clientY - canvas.getBoundingClientRect().top;
    // 이동 패드
    if (touchMove.active && t.identifier === touchMove.id) {
      touchMove.dx = Math.max(-60, Math.min(60, x - touchMove.x));
      touchMove.dy = Math.max(-60, Math.min(60, y - touchMove.y));
    }
    // 슈팅 패드
    if (touchShoot.active && t.identifier === touchShoot.id) {
      touchShoot.dx = Math.max(-60, Math.min(60, x - touchShoot.x));
      touchShoot.dy = Math.max(-60, Math.min(60, y - touchShoot.y));
    }
  }
}, { passive: false });
canvas.addEventListener('touchend', function(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    // 이동 패드 해제
    if (touchMove.active && t.identifier === touchMove.id) {
      touchMove.active = false;
      touchMove.dx = 0; touchMove.dy = 0;
    }
    // 슈팅 패드 해제 및 총알 발사
    if (touchShoot.active && t.identifier === touchShoot.id) {
      // 슈팅 방향
      const dx = touchShoot.dx, dy = touchShoot.dy;
      const len = Math.hypot(dx, dy);
      if (len > 20) {
        // 차지샷 우선(2손가락 터치시)
        let big = false;
        if (canBigShot > 0 && e.touches.length > 1) { big = true; canBigShot--; }
        const speed = big ? 5 : 10;
        bullets.push({
          x: player.x + (dx/len) * player.r,
          y: player.y + (dy/len) * player.r,
          vx: (dx/len) * speed,
          vy: (dy/len) * speed,
          ...(big ? {big:true} : {})
        });
      }
      touchShoot.active = false;
      touchShoot.dx = 0; touchShoot.dy = 0;
    }
  }
}, { passive: false });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 바깥 테두리
  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#333';
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawCakes();
  // 항상 보이는 조이스틱 안내
  drawAlwaysVisiblePad();
  // 공격 버튼 UI
  drawAttackButtons();
  // 디버그 오버레이
  if (DEBUG) drawDebugOverlay();
  ctx.save();
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#170303ff';
  ctx.fillText(`차지: ${charge} / ${maxCharge}  (거대공격: ${canBigShot})`, 24, 40);
  ctx.restore();
  ctx.save();
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`점수: ${score}`, canvas.width - 180, 44);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#3af';
  ctx.fillText(`최고: ${highScore}`, canvas.width - 180, 70);
  ctx.restore();

  // 플레이어 HP바
  ctx.save();
  ctx.fillStyle = '#222';
  ctx.fillRect(24, 60, 200, 20);
  ctx.fillStyle = '#4ecdc4';
  ctx.fillRect(24, 60, 200 * (player.hp/player.maxHp), 20);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 60, 200, 20);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 32, 76);
  ctx.restore();

  // 게임 오버 표시
  if (gameOver) {
    ctx.save();
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#f00';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 40);
    // 다시하기 버튼
    restartBtn.w = 220;
    restartBtn.h = 60;
    restartBtn.x = canvas.width/2 - restartBtn.w/2;
    restartBtn.y = canvas.height/2 + 10;
    ctx.fillStyle = '#fff';
    ctx.fillRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 3;
    ctx.strokeRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h);
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#222';
    ctx.fillText('다시하기', canvas.width/2, canvas.height/2 + 52);
    ctx.restore();
    restartBtn.visible = true;
  } else {
    restartBtn.visible = false;
  }
// 다시하기 버튼 클릭 처리
canvas.addEventListener('mousedown', function(e) {
  if (!gameOver || !restartBtn.visible) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (
    mx >= restartBtn.x && mx <= restartBtn.x + restartBtn.w &&
    my >= restartBtn.y && my <= restartBtn.y + restartBtn.h
  ) {
    // 게임 상태 리셋
  player.x = 400; player.y = 240; player.hp = player.maxHp;
  bullets.length = 0;
  enemies.length = 0;
  cakes.length = 0;
  charge = 0; canBigShot = 0;
  score = 0;
  gameOver = false;
  }
});
}

function drawDebugOverlay() {
  ctx.save();
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  // last pointer
  ctx.fillText(`lastPointer: ${Math.round(lastPointer.x)},${Math.round(lastPointer.y)}`, 10, canvas.height - 10);
  // shooting pad vector
  ctx.fillText(`touchShoot: dx=${Math.round(touchShoot.dx)}, dy=${Math.round(touchShoot.dy)} active=${touchShoot.active}`, 10, canvas.height - 26);
  // draw arrow for aim
  const aim = getAimAngle(lastPointer.x, lastPointer.y);
  const ax = player.x, ay = player.y;
  const bx = ax + Math.cos(aim) * 60, by = ay + Math.sin(aim) * 60;
  ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  // recent events
  for (let i = 0; i < debugEvents.length; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(debugEvents[i], 10, 20 + i * 14);
  }
  ctx.restore();
}

function pushDebugEvent(msg) {
  debugEvents.unshift(msg);
  if (debugEvents.length > 6) debugEvents.pop();
}

function update() {
  if (gameOver) return;
  updatePlayer();
  updateBullets();
  updateEnemies();
  spawnCake();
  checkCollisions();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Controls
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('mousemove', function(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  player.angle = Math.atan2(my - player.y, mx - player.x);
  // 마지막 포인터 위치 업데이트
  lastPointer.x = mx; lastPointer.y = my;
  // 마우스 드래그로 조이스틱 제어(데스크탑용)
  if (touchMove.active && touchMove.id === 'mouse') {
    // 사용자가 마우스로 직접 누른 상태에서 드래그
    touchMove.dx = Math.max(-60, Math.min(60, mx - touchMove.x));
    touchMove.dy = Math.max(-60, Math.min(60, my - touchMove.y));
  } else {
    // 마우스가 좌하단 조이스틱 영역에 들어오면 클릭 없이도 조이스틱 활성화
    // 단, 공격 버튼이 눌려있다면 hover로 패드가 활성화되지 않도록 방지
    const inPad = (!isMobile && mx < 180 && my > canvas.height - 180 && !normalBtn.pressed && !bigBtn.pressed);
    const baseX = 90, baseY = canvas.height - 90;
    if (inPad) {
      // hover 활성화 (id = 'mousehover')
      if (!touchMove.active || touchMove.id !== 'mousehover') {
        touchMove.active = true;
        touchMove.id = 'mousehover';
        touchMove.x = baseX; touchMove.y = baseY;
      }
      touchMove.dx = Math.max(-60, Math.min(60, mx - touchMove.x));
      touchMove.dy = Math.max(-60, Math.min(60, my - touchMove.y));
    } else {
      // hover 영역을 벗어나면 hover 해제(단, 직접 누른 mouse 드래그는 유지)
      if (touchMove.active && touchMove.id === 'mousehover') {
        touchMove.active = false;
        touchMove.id = null;
        touchMove.dx = 0; touchMove.dy = 0;
      }
    }
  }
});

canvas.addEventListener('mousedown', function(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  // 공격 버튼 클릭 처리
  if (mx >= normalBtn.x && mx <= normalBtn.x + normalBtn.w && my >= normalBtn.y && my <= normalBtn.y + normalBtn.h) {
    // 일반 공격: 조준 방향 우선
    const angle = getAimAngle(mx, my, true);
    // 디버그 및 화살표 표시를 위해 player.angle을 갱신
    player.angle = angle;
    bullets.push({ x: player.x + Math.cos(angle) * player.r, y: player.y + Math.sin(angle) * player.r, vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10 });
  pushDebugEvent(`NORMAL fire ang=${angle.toFixed(2)}`);
    normalBtn.pressed = true;
    return;
  }
    if (mx >= bigBtn.x && mx <= bigBtn.x + bigBtn.w && my >= bigBtn.y && my <= bigBtn.y + bigBtn.h) {
    // 거대 공격
    if (canBigShot > 0) {
  const angle = getAimAngle(mx, my, true);
  player.angle = angle;
      bullets.push({ x: player.x + Math.cos(angle) * player.r, y: player.y + Math.sin(angle) * player.r, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, big: true });
  pushDebugEvent(`BIG fire ang=${angle.toFixed(2)} left=${canBigShot-1}`);
      canBigShot--;
      bigBtn.pressed = true;
    }
    return;
  }
  // 좌하단을 클릭하면 데스크탑에서도 조이스틱 시작
  if (!isMobile && mx < 180 && my > canvas.height - 180 && !normalBtn.pressed && !bigBtn.pressed) {
    touchMove.active = true;
    touchMove.id = 'mouse';
    touchMove.x = mx; touchMove.y = my; touchMove.dx = 0; touchMove.dy = 0;
    return;
  }
  const angle = Math.atan2(my - player.y, mx - player.x);
  if (e.button === 2) {
    // 우클릭: 거대 총알(차지 필요)
    if (canBigShot > 0) {
      const speed = 5;
      bullets.push({
        x: player.x + Math.cos(angle) * player.r,
        y: player.y + Math.sin(angle) * player.r,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        big: true
      });
      canBigShot--;
    }
  } else if (e.button === 0) {
    // 좌클릭: 일반 총알
    const speed = 10;
    bullets.push({
      x: player.x + Math.cos(angle) * player.r,
      y: player.y + Math.sin(angle) * player.r,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed
    });
  }
});

canvas.addEventListener('mouseup', function(e) {
  normalBtn.pressed = false;
  bigBtn.pressed = false;
});

// 터치로 버튼 누르기 (touchstart/touchend)
canvas.addEventListener('touchstart', function(e) {
  for (const t of e.changedTouches) {
    const x = t.clientX - canvas.getBoundingClientRect().left;
    const y = t.clientY - canvas.getBoundingClientRect().top;
    // 마지막 포인터 위치는 우선 업데이트하되, 버튼 터치 시에는 패드 할당과 충돌하지 않도록 처리
    lastPointer.x = x; lastPointer.y = y;
    if (x >= normalBtn.x && x <= normalBtn.x + normalBtn.w && y >= normalBtn.y && y <= normalBtn.y + normalBtn.h) {
      normalBtn.pressed = true; normalBtn.touchId = t.identifier;
  // 버튼 터치 시에는 터치 좌표를 강제로 사용하여 각도를 계산
  const angle = getAimAngle(x, y, true);
  player.angle = angle;
  bullets.push({ x: player.x + Math.cos(angle) * player.r, y: player.y + Math.sin(angle) * player.r, vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10 });
  pushDebugEvent(`NORMAL touch fire ang=${angle.toFixed(2)}`);
    }
    if (x >= bigBtn.x && x <= bigBtn.x + bigBtn.w && y >= bigBtn.y && y <= bigBtn.y + bigBtn.h) {
      if (canBigShot > 0) {
        bigBtn.pressed = true; bigBtn.touchId = t.identifier;
  const angle = getAimAngle(x, y, true);
  player.angle = angle;
  bullets.push({ x: player.x + Math.cos(angle) * player.r, y: player.y + Math.sin(angle) * player.r, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, big: true });
  pushDebugEvent(`BIG touch fire ang=${angle.toFixed(2)} left=${canBigShot-1}`);
        canBigShot--;
      }
    }
  }
});

canvas.addEventListener('touchend', function(e) {
  for (const t of e.changedTouches) {
    if (normalBtn.touchId === t.identifier) { normalBtn.pressed = false; normalBtn.touchId = null; }
    if (bigBtn.touchId === t.identifier) { bigBtn.pressed = false; bigBtn.touchId = null; }
  }
});

// 마우스 업에서 조이스틱 해제
canvas.addEventListener('mouseup', function(e) {
  if (touchMove.active && touchMove.id === 'mouse') {
    touchMove.active = false;
    touchMove.id = null;
    touchMove.dx = 0; touchMove.dy = 0;
  }
});

// 우클릭 메뉴 방지
canvas.addEventListener('contextmenu', e => e.preventDefault());

// 적 자동 생성
setInterval(() => {
  if (enemies.length < 5) spawnEnemy();
}, 1500);

loop();
