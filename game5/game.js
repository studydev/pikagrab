// 모바일 터치 입력용 변수
let isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
let touchMove = {active: false, id: null, x: 0, y: 0, dx: 0, dy: 0};
let touchShoot = {active: false, id: null, x: 0, y: 0, dx: 0, dy: 0};
// Game 5: Brawl Stars-like Top-down Shooter (기본 샘플)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 480;
// DOM 디버그 오버레이: canvas 렌더링 문제가 있을 때도 확실히 보이도록 HTML 레이어에 표시
const debugDom = (function(){
  try {
    const d = document.createElement('div');
    d.id = 'debug-dom-overlay';
    d.style.position = 'fixed';
    d.style.left = '10px';
    d.style.top = '10px';
    d.style.zIndex = 99999;
    d.style.pointerEvents = 'none';
    d.style.background = 'rgba(0,0,0,0.45)';
    d.style.color = '#fff';
    d.style.padding = '8px 12px';
    d.style.borderRadius = '6px';
    d.style.font = 'bold 18px sans-serif';
    d.style.maxWidth = 'calc(100% - 20px)';
    d.style.whiteSpace = 'nowrap';
    d.style.overflow = 'hidden';
    d.style.textOverflow = 'ellipsis';
    d.style.display = 'none';
    document.body.appendChild(d);
    return d;
  } catch (e) { return null; }
})();

// persistent status panel for diagnostics (always visible)
const debugStatus = (function(){
  try {
    const s = document.createElement('div');
    s.id = 'debug-dom-status';
    s.style.position = 'fixed';
    s.style.right = '10px';
    s.style.top = '10px';
    s.style.zIndex = 99999;
    s.style.pointerEvents = 'none';
    s.style.background = 'rgba(0,0,0,0.6)';
    s.style.color = '#fff';
    s.style.padding = '8px 12px';
    s.style.borderRadius = '6px';
    s.style.font = '12px monospace';
    s.style.maxWidth = '260px';
    s.style.whiteSpace = 'pre-wrap';
    document.body.appendChild(s);
    return s;
  } catch (e) { return null; }
})();

function updateDebugStatus() {
  if (!debugStatus) return;
  try {
    const bulletsInfo = bullets.map((b,i)=> {
      if (!b) return '';
      return `#${i} ${b.debugOnly? 'DBG' : (b.big? 'BIG':'n')} (${Math.round(b.x)},${Math.round(b.y)}) vx=${(b.vx||0).toFixed(1)} vy=${(b.vy||0).toFixed(1)}`;
    }).slice(-6).join('\n');
    debugStatus.textContent = `bullets: ${bullets.length}\nlastEvents:\n${debugEvents.slice(0,6).join('\n')}\n---\n${bulletsInfo}`;
  } catch (e) {}
}

function showDebugDOM(msg, ms = 1000) {
  if (!debugDom) return;
  debugDom.textContent = msg;
  debugDom.style.display = 'block';
  clearTimeout(debugDom._hideTimeout);
  debugDom._hideTimeout = setTimeout(() => { debugDom.style.display = 'none'; }, ms);
}
// 모바일 브라우저의 더블탭/핀치 줌을 방지
try { canvas.style.touchAction = 'none'; } catch (e) {}

// helper: convert client (CSS) coords to canvas internal coords (handles CSS scaling / DPR)
function clientToCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

// 전역 진단: 페이지 수준에서 터치/포인터가 들어오는지 확인
document.addEventListener('touchstart', function(e) {
  // don't preventDefault here; just log
  pushDebugEvent(`GLOBAL touchstart changed=${e.changedTouches.length} total=${e.touches.length}`);
}, { passive: true, capture: true });
document.addEventListener('pointerdown', function(e) {
  const p = clientToCanvas(e.clientX, e.clientY);
  const x = Math.round(p.x), y = Math.round(p.y);
  pushDebugEvent(`GLOBAL pointerdown type=${e.pointerType} btn=${e.button} at=${x},${y}`);
}, { passive: true, capture: true });

const player = { x: 400, y: 240, r: 22, color: '#4ecdc4', speed: 4, vx: 0, vy: 0, angle: 0, hp: 10, maxHp: 10 };
let keys = {};
let bullets = [];
let enemies = [];
let cakes = [];
// 전역 발사 레이트 리미터(하나의 입력에서 대량 발사 방지)
let lastFireTime = 0;
function safePushBullet(b) {
  try {
    const now = Date.now();
    const MIN_DT = 120; // ms
    if (now - lastFireTime < MIN_DT) {
      pushDebugEvent(`SKIP_PUSH_RATE dt=${now - lastFireTime}`);
      return false;
    }

    // Burst protection and diagnostics: keep a short sliding window of push timestamps
    // and skip pushing if too many pushes happen within WINDOW_MS.
    if (!safePushBullet._pushTimestamps) safePushBullet._pushTimestamps = [];
    const ts = safePushBullet._pushTimestamps;
    const WINDOW_MS = 1000;
    // drop old timestamps
    while (ts.length && now - ts[0] > WINDOW_MS) ts.shift();
    const MAX_PER_WINDOW = 10; // allow at most this many pushes per WINDOW_MS
    if (ts.length >= MAX_PER_WINDOW) {
      pushDebugEvent(`SKIP_PUSH_BURST count=${ts.length}`);
      if (typeof DEBUG !== 'undefined' && DEBUG) {
        // capture a short stack for debugging (truncate to a few frames)
        try {
          const trace = (new Error()).stack || '';
          const short = trace.split('\n').slice(1, 6).map(s => s.trim()).join(' | ');
          pushDebugEvent(`STACK ${short}`);
          console.warn('safePushBullet SKIP_PUSH_BURST', short);
        } catch (ee) { /* ignore stack capture failures */ }
      }
      return false;
    }
    ts.push(now);

    bullets.push(b);
    lastFireTime = now;
    return true;
  } catch (e) {
    console.error('safePushBullet error', e);
    return false;
  }
}
// 마지막 포인터 위치(마우스/터치)를 추적
let lastPointer = { x: 400, y: 240 };
let charge = 0;
let maxCharge = 9;
let canBigShot = 0;
// 디버그 모드: 화면에 각도/벡터/이벤트를 그림
let DEBUG = true;
let debugEvents = [];
// 현재 활성화된 터치들(디버깅용)
let currentTouches = {};
// touch id로 이미 발사한 터치를 추적하여 중복 발사를 방지
let lastFiredTouchIds = new Set();
// touch별 최근 발사 타임스탬프(중복 발사/버스트 방지)
let firedTimestamps = {};
// (디버그 점 표시 비활성화) 터치/디버그 점 관련 변수들은 더이상 사용하지 않습니다
let touchFlashes = []; // kept empty for compatibility
let debugShots = [];
let persistentDebugBullets = [];
let bigFire = null; // {t, text}

function addTouchFlash(x, y, id, kind = 'none') {
  // 디버그 점(캔버스 상의 원형 마커) 제거 요청에 따라 시각적 점 생성을 하지 않습니다.
  try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}
  pushDebugEvent(`FLASH id=${id} at ${Math.round(x)},${Math.round(y)} kind=${kind}`);
  // DOM 레이어의 간단한 피드백(텍스트)은 유지하되 점 표시는 하지 않음
  showDebugDOM(`FLASH id=${id} ${kind}`, 700);
}

function fireNormalTouch(x, y, id) {
  const angle = getAimAngle(x, y, true);
  player.angle = angle;
  safePushBullet({ x: player.x + Math.cos(angle) * player.r, y: player.y + Math.sin(angle) * player.r, vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10 });
  pushDebugEvent(`NORMAL touch fire ang=${angle.toFixed(2)} id=${id}`);
  // 추가 디버그: 직후 bullets 상태
  const b = bullets[bullets.length - 1];
  if (b) pushDebugEvent(`BULLET_PUSHED id=${id} x=${Math.round(b.x)} y=${Math.round(b.y)} vx=${b.vx.toFixed(1)} vy=${b.vy.toFixed(1)} total=${bullets.length}`);
  if (typeof id !== 'undefined' && id !== null) lastFiredTouchIds.add(id);
  if (typeof id !== 'undefined' && id !== null) firedTimestamps[`t${id}`] = Date.now();
  addTouchFlash(x, y, id);
  // 중앙 FIRE 표시
  bigFire = { t: Date.now(), text: 'FIRE!' };
  // DOM 레이어에도 표시
  showDebugDOM('NORMAL FIRE');
}

function fireBigTouch(x, y, id) {
  const angle = getAimAngle(x, y, true);
  player.angle = angle;
  safePushBullet({ x: player.x + Math.cos(angle) * player.r, y: player.y + Math.sin(angle) * player.r, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, big: true });
  pushDebugEvent(`BIG touch fire ang=${angle.toFixed(2)} left=${canBigShot-1} id=${id}`);
  const b2 = bullets[bullets.length - 1];
  if (b2) pushDebugEvent(`BULLET_PUSHED_BIG id=${id} x=${Math.round(b2.x)} y=${Math.round(b2.y)} vx=${b2.vx.toFixed(1)} vy=${b2.vy.toFixed(1)} total=${bullets.length}`);
  if (typeof id !== 'undefined' && id !== null) lastFiredTouchIds.add(id);
  canBigShot = Math.max(0, canBigShot-1);
  if (typeof id !== 'undefined' && id !== null) firedTimestamps[`t${id}`] = Date.now();
  addTouchFlash(x, y, id);
  bigFire = { t: Date.now(), text: 'BIG FIRE!' };
  showDebugDOM('BIG FIRE');
}
let gameOver = false;
let restartBtn = { x: 0, y: 0, w: 220, h: 60, visible: false };
let score = 0;
let highScore = Number(localStorage.getItem('game5_highScore') || 0);
// 공격 버튼 상태
// normalBtn / bigBtn 제거: 버튼 UI와 버튼 입력을 사용하지 않음
let normalBtn = null;
let bigBtn = null;

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
    // 디버그 전용 총알은 이동하지 않고 일정 시간 이후 제거
    if (b.debugOnly) {
      if (Date.now() > (b._expire || 0)) bullets.splice(i, 1);
      continue;
    }
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
    if (b.debugOnly) continue; // 디버그 전용 총알은 충돌 검사 무시
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
  // 업데이트 currentTouches for debugging
  for (const t of e.changedTouches) {
    const p = clientToCanvas(t.clientX, t.clientY);
    currentTouches[t.identifier] = { x: p.x, y: p.y };
  }
  for (const t of e.changedTouches) {
  const p = clientToCanvas(t.clientX, t.clientY);
  const x = p.x, y = p.y;
    // 터치별 쿨다운(중복/버스트 발사 방지)
    const idKey = `t${t.identifier}`;
    const now = Date.now();
    if (firedTimestamps[idKey] && now - firedTimestamps[idKey] < 300) {
      pushDebugEvent(`SKIP_TOUCH_FAST id=${t.identifier} dt=${now - firedTimestamps[idKey]}`);
      // update currentTouches but skip further handling
      currentTouches[t.identifier] = { x: p.x, y: p.y };
      continue;
    }
    // 게임오버 상태에서 다시하기 버튼 터치 처리
    if (gameOver && restartBtn.visible) {
      if (x >= restartBtn.x && x <= restartBtn.x + restartBtn.w && y >= restartBtn.y && y <= restartBtn.y + restartBtn.h) {
        pushDebugEvent(`RESTART touch id=${t.identifier} at ${Math.round(x)},${Math.round(y)}`);
        player.x = 400; player.y = 240; player.hp = player.maxHp;
        bullets.length = 0;
        enemies.length = 0;
        cakes.length = 0;
        charge = 0; canBigShot = 0;
        score = 0;
        gameOver = false;
        // consume this touch
        continue;
      }
    }
    // 만약 버튼 영역이면 패드 할당을 건너뜀(버튼 터치 우선)
    if (x >= normalBtn.x && x <= normalBtn.x + normalBtn.w && y >= normalBtn.y && y <= normalBtn.y + normalBtn.h) continue;
    if (x >= bigBtn.x && x <= bigBtn.x + bigBtn.w && y >= bigBtn.y && y <= bigBtn.y + bigBtn.h) continue;
    // 이동/슈팅 패드 또는 화면 탭(공격)
    let handled = false;
    // 이동 패드(좌하단)
    if (x < 180 && y > canvas.height-180) {
      touchMove.active = true; touchMove.id = t.identifier;
      touchMove.x = x; touchMove.y = y; touchMove.dx = 0; touchMove.dy = 0;
      handled = true;
    }
    // 슈팅 패드(우하단)
    if (x > canvas.width-180 && y > canvas.height-180) {
      touchShoot.active = true; touchShoot.id = t.identifier;
      touchShoot.x = x; touchShoot.y = y; touchShoot.dx = 0; touchShoot.dy = 0;
      handled = true;
    }
    // 버튼/패드가 아닌 화면을 터치하면 즉시 일반 공격
    if (!handled) {
      // 즉각 피드백과 발사
      addTouchFlash(x, y, t.identifier);
      // 간단하게 즉시 총알을 직접 푸시하여 탭에서 발사가 확실히 되도록 함
      try {
        const ang = Math.atan2(y - player.y, x - player.x);
        player.angle = ang;
        const speed = 10;
  safePushBullet({ x: player.x + Math.cos(ang) * player.r, y: player.y + Math.sin(ang) * player.r, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed });
        pushDebugEvent(`TAP_DIRECT_PUSH ang=${ang.toFixed(2)} id=${t.identifier}`);
        firedTimestamps[idKey] = Date.now();
  // 시각 표시 보강(비활성화됨)
  // debugShots 및 persistentDebugBullets 생성은 비활성화되어 있습니다.
        showDebugDOM('TAP FIRE', 900);
        if (typeof t.identifier !== 'undefined' && t.identifier !== null) lastFiredTouchIds.add(t.identifier);
      } catch (e) {
        pushDebugEvent(`TAP_DIRECT_PUSH_ERR id=${t.identifier}`);
      }
    }
  }
}, { passive: false });
canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const p = clientToCanvas(t.clientX, t.clientY);
    const tx = p.x, ty = p.y;
    if (currentTouches[t.identifier]) {
      currentTouches[t.identifier].x = tx; currentTouches[t.identifier].y = ty;
    }
  }
  for (const t of e.changedTouches) {
  const p = clientToCanvas(t.clientX, t.clientY);
  const x = p.x, y = p.y;
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
    // remove from debug touches
    delete currentTouches[t.identifier];
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
        safePushBullet({
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
  // attack buttons removed — no drawing
  // 디버그 점(임시 시각화) 기능은 비활성화됨 — 화면의 원형 디버그 마커를 더 이상 그리지 않습니다.
  // bigFire 표시
  if (bigFire) {
    const age = Date.now() - bigFire.t;
    if (age < 400) {
      ctx.save();
      ctx.globalAlpha = 1 - age / 400;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bigFire.text, canvas.width/2, canvas.height/2);
      ctx.restore();
    } else {
      bigFire = null;
    }
  }
  // 터치 플래시 렌더링은 비활성화됨
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

  // Debug DOM status 업데이트
  updateDebugStatus();

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
  const p = clientToCanvas(e.clientX, e.clientY);
  const mx = p.x;
  const my = p.y;
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
  // current touches (debug)
  let ty = 20 + debugEvents.length * 14 + 8;
  ctx.fillStyle = 'rgba(0,255,0,0.9)';
  for (const id in currentTouches) {
    const t = currentTouches[id];
    ctx.fillText(`touch ${id}: ${Math.round(t.x)},${Math.round(t.y)}`, 10, ty);
    ty += 14;
  }
  // bullets info
  ctx.fillStyle = 'rgba(255,200,0,0.9)';
  ctx.fillText(`bullets: ${bullets.length}`, 10, ty + 4);
  let bi = 0;
  for (let i = Math.max(0, bullets.length - 4); i < bullets.length; i++) {
    const b = bullets[i];
    if (!b) continue;
    ctx.fillText(`b${i}: ${Math.round(b.x)},${Math.round(b.y)} vx=${b.vx.toFixed(1)},vy=${b.vy.toFixed(1)}${b.big?',BIG':''}`, 10, ty + 20 + bi * 14);
    bi++;
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
  const p = clientToCanvas(e.clientX, e.clientY);
  const mx = p.x;
  const my = p.y;
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
  const inPad = (!isMobile && mx < 180 && my > canvas.height - 180);
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
  const p = clientToCanvas(e.clientX, e.clientY);
  const mx = p.x;
  const my = p.y;
  // 좌하단을 클릭하면 데스크탑에서도 조이스틱 시작 (버튼 UI 없음)
  if (!isMobile && mx < 180 && my > canvas.height - 180) {
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
      safePushBullet({
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
    safePushBullet({
      x: player.x + Math.cos(angle) * player.r,
      y: player.y + Math.sin(angle) * player.r,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed
    });
    showDebugDOM('MOUSE CLICK FIRE');
  }
});

canvas.addEventListener('mouseup', function(e) {
  normalBtn.pressed = false;
  bigBtn.pressed = false;
});

// 포인터 이벤트로 다시하기 처리(마우스/터치/펜 통합)
canvas.addEventListener('pointerdown', function(e) {
  const p = clientToCanvas(e.clientX, e.clientY);
  const mx = p.x, my = p.y;
  if (!gameOver || !restartBtn.visible) return;
  if (mx >= restartBtn.x && mx <= restartBtn.x + restartBtn.w && my >= restartBtn.y && my <= restartBtn.y + restartBtn.h) {
    pushDebugEvent(`RESTART pointer id type=${e.pointerType} at ${Math.round(mx)},${Math.round(my)}`);
    player.x = 400; player.y = 240; player.hp = player.maxHp;
    bullets.length = 0;
    enemies.length = 0;
    cakes.length = 0;
    charge = 0; canBigShot = 0;
    score = 0;
    gameOver = false;
  }
});

// Duplicate touch handlers removed — consolidated earlier in file to avoid multiple firings

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
