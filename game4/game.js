// 능력 종류 및 상태
const abilities = [
  { name: '불꽃', color: '#ff6a00', effect: '#ffb347', particle: '#ffb347' },
  { name: '얼음', color: '#00cfff', effect: '#56d7f8ff', particle: '#b3f0ff' },
  { name: '전기', color: '#ffe066', effect: '#fff700', particle: '#fff700' },
  { name: '바람', color: '#6f9bb1ff', effect: '#6a97adff', particle: '#78a5bcff' },
];
let currentAbility = null;
let abilityNameTimer = 0;
// 파티클(별) 배열
const particles = [];
// 공기탄 배열
const airBullets = [];
// 비프음 함수(간단한 Web Audio)
function beep(freq = 600, duration = 0.08) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {}
}
// 총알 배열
const bullets = [];
const playerBullets = [];

// 적 총알 발사 타이머
let lastShootTime = 0;
const shootInterval = 7000; // 7초
// Pobi Platformer - Kirby-like basic prototype
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 오브젝트
// 재시작 버튼
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) {
  restartBtn.onclick = () => {
    // 게임 상태 초기화
    gameOver = false;
    player.x = 100; player.y = 350; player.vx = 0; player.vy = 0;
    player.hasPower = false;
    player.color = player.baseColor;
    player.hearts = [true, true, true, true, true];
    score = 0;
    currentAbility = null;
    // 적 초기화
    for (let i = 0; i < enemies.length; i++) {
      enemies[i].alive = true;
      enemies[i].x = 100 + Math.random() * 600;
      enemies[i].y = 100 + Math.random() * 250;
    }
    // 총알, 파티클 등 초기화
    bullets.length = 0;
    playerBullets.length = 0;
    airBullets.length = 0;
    particles.length = 0;
    restartBtn.style.display = 'none';
  };
}
let gameOver = false;
const player = {
  x: 100, y: 350, w: 40, h: 40,
  vx: 0, vy: 0,
  speed: 3, jumpPower: 13,
  onGround: false,
  color: '#ffb6e6',
  baseColor: '#ffb6e6',
  hasPower: false,
  facing: 1, // 1: 오른쪽, -1: 왼쪽
  powerTimer: 0,
  hearts: [true, true, true, true, true], // 5개 하트(목숨)
};

let score = 0; // 적 제거 점수

// 바람(흡입/공격) 이펙트
let inhaleActive = false;
let inhaleBox = {x: 0, y: 0, w: 0, h: 0};
let exhaleActive = false;
let exhaleBox = {x: 0, y: 0, w: 0, h: 0, timer: 0};


// 여러 적 생성
const enemies = [
  { x: 500, y: 370, w: 40, h: 40, color: '#6cf', alive: true, respawnTimer: 0 },
  { x: 350, y: 280, w: 40, h: 40, color: '#f99', alive: true, respawnTimer: 0 },
  { x: 650, y: 220, w: 40, h: 40, color: '#9f9', alive: true, respawnTimer: 0 },
  { x: 200, y: 370, w: 40, h: 40, color: '#fcf', alive: true, respawnTimer: 0 },
];

const platforms = [
  {x: 0, y: 410, w: 800, h: 40},
  {x: 300, y: 320, w: 120, h: 20},
  {x: 600, y: 260, w: 100, h: 20},
  {x: 100, y: 220, w: 100, h: 20},
  {x: 250, y: 150, w: 120, h: 20},
  {x: 500, y: 120, w: 180, h: 20},
  {x: 700, y: 350, w: 60, h: 20},
];


// 적 자동 생성 타이머
let respawnTimer = 0;

// 입력
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function rectsCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
  // 플레이어 총알이 적을 관통하면서도 적을 맞추면 효과(적 제거, 점수, 능력 변경)는 남기고 총알은 사라지지 않게 구현
  for (const bullet of playerBullets) {
    for (const enemy of enemies) {
      if (enemy.alive && rectsCollide(bullet, enemy)) {
        enemy.alive = false;
        score++;
        // 능력 항상 새로 부여
        player.hasPower = true;
        let newAbility;
        do {
          newAbility = abilities[Math.floor(Math.random() * abilities.length)];
        } while (currentAbility && newAbility === currentAbility && abilities.length > 1);
        currentAbility = newAbility;
        player.color = currentAbility.color;
        player.powerTimer = 60 * 10000;
        abilityNameTimer = 180;
      }
    }
  }
  // 플레이어 총알 이동 및 화면 끝 반사
  for (const bullet of playerBullets) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    // 좌우 벽에 닿으면 x방향 반전
    if (bullet.x < 0) {
      bullet.x = 0;
      bullet.vx *= -1;
    } else if (bullet.x + bullet.w > canvas.width) {
      bullet.x = canvas.width - bullet.w;
      bullet.vx *= -1;
    }
    // 상하 벽에 닿으면 y방향 반전
    if (bullet.y < 0) {
      bullet.y = 0;
      bullet.vy *= -1;
    } else if (bullet.y + bullet.h > canvas.height) {
      bullet.y = canvas.height - bullet.h;
      bullet.vy *= -1;
    }
  }
  // 모든 적이 사라졌으면 즉시 새로 생성
  if (enemies.every(e => !e.alive)) {
    for (let i = 0; i < 4; i++) {
      enemies[i] = {
        x: 60 + Math.random() * (canvas.width - 120),
        y: 60 + Math.random() * (canvas.height - 180),
        w: 36, h: 36,
        color: ['#ffb347', '#56d7f8ff', '#ffe066', '#6a97adff'][i % 4],
        alive: true
      };
    }
  }
  if (gameOver) return;
  // 플레이어 방향
  if (keys['ArrowLeft']) player.facing = -1;
  else if (keys['ArrowRight']) player.facing = 1;

  // 바람(흡입) 이펙트: 스페이스바 누르고 있을 때
  inhaleActive = !!(keys[' '] && !player.hasPower);
  if (inhaleActive) {
    inhaleBox.w = 50;
    inhaleBox.h = 24;
    inhaleBox.x = player.facing === 1 ? player.x + player.w : player.x - 50;
    inhaleBox.y = player.y + player.h / 2 - 12;
  } else {
    inhaleBox.w = 0;
    inhaleBox.h = 0;
    inhaleBox.x = 0;
    inhaleBox.y = 0;
  }

  // 바람(공격) 이펙트: 능력 있을 때 스페이스바 누르면
  if (player.hasPower && keys[' '] && !exhaleActive) {
    exhaleActive = true;
    exhaleBox.w = 70;
    exhaleBox.h = 32;
    exhaleBox.x = player.facing === 1 ? player.x + player.w : player.x - 70;
    exhaleBox.y = player.y + player.h / 2 - 16;
    exhaleBox.timer = 16; // 16프레임 유지
    // 능력별 공기탄/이펙트 색상
    let effectColor = currentAbility ? currentAbility.effect : '#b3e6ff';
    let particleColor = currentAbility ? currentAbility.particle : '#b3e6ff';
    airBullets.push({
      x: player.facing === 1 ? player.x + player.w : player.x - 24,
      y: player.y + player.h / 2 - 8,
      w: 24, h: 16,
      vx: player.facing * 8,
      vy: 0,
      timer: 30,
      color: currentAbility && player.hasPower ? currentAbility.effect : effectColor,
      particle: particleColor,
    });
    beep(700, 0.09);
  }
  if (exhaleActive) {
    exhaleBox.x = player.facing === 1 ? player.x + player.w : player.x - 70;
    exhaleBox.y = player.y + player.h / 2 - 16;
    exhaleBox.timer--;
    if (exhaleBox.timer <= 0) exhaleActive = false;
  }
  // 공기탄 이동 및 충돌
  for (const ab of airBullets) {
    ab.x += ab.vx;
    ab.y += ab.vy;
    ab.timer--;
    // 적과 충돌
    for (const enemy of enemies) {
      if (enemy.alive && rectsCollide(ab, enemy)) {
        enemy.alive = false; // 적 완전 제거
        ab.timer = 0;
        score++;
        // 능력 항상 새로 부여
        player.hasPower = true;
        let newAbility;
        do {
          newAbility = abilities[Math.floor(Math.random() * abilities.length)];
        } while (currentAbility && newAbility === currentAbility && abilities.length > 1);
        currentAbility = newAbility;
        player.color = currentAbility.color;
        player.powerTimer = 60 * 10000;
        abilityNameTimer = 180;
        // 별 파티클 생성
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 2;
          particles.push({
            x: enemy.x + enemy.w/2,
            y: enemy.y + enemy.h/2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: ab.particle,
            life: 20 + Math.random()*10,
          });
        }
      }
    }
  // 적 총알과 충돌: 플레이어 총알은 무시(화면 밖에서만 사라짐)
  }
  // 공기탄 제거
  for (let i = airBullets.length - 1; i >= 0; i--) {
    if (airBullets[i].timer <= 0 || airBullets[i].x < -40 || airBullets[i].x > canvas.width + 40) {
      airBullets.splice(i, 1);
    }
  }

  // 능력 타이머(5초 후 원래 색상/능력 복귀)
  if (player.hasPower) {
    player.powerTimer--;
    if (player.powerTimer <= 0) {
      player.hasPower = false;
      player.color = player.baseColor;
    }
  }
  // 플레이어 바람 공격(이펙트에 닿으면 적 제거)
  if (exhaleActive) {
    for (const enemy of enemies) {
      if (enemy.alive && rectsCollide(exhaleBox, enemy)) {
        enemy.alive = false; // 적 완전 제거
        score++;
        // 능력 항상 새로 부여
        player.hasPower = true;
        let newAbility;
        do {
          newAbility = abilities[Math.floor(Math.random() * abilities.length)];
        } while (currentAbility && newAbility === currentAbility && abilities.length > 1);
        currentAbility = newAbility;
        player.color = currentAbility.color;
        player.powerTimer = 60 * 10000;
        abilityNameTimer = 180;
      }
    }
  }
  const now = Date.now();
  // 5초마다 살아있는 적이 플레이어 방향으로 총알 발사
  if (now - lastShootTime > shootInterval) {
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      // 총알 방향 계산 (플레이어 중심)
      const dx = player.x + player.w/2 - (enemy.x + enemy.w/2);
      const dy = player.y + player.h/2 - (enemy.y + enemy.h/2);
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
  const speed = 2;
      bullets.push({
        x: enemy.x + enemy.w/2 - 6,
        y: enemy.y + enemy.h/2 - 6,
        w: 12, h: 12,
        vx: dx/len * speed,
        vy: dy/len * speed,
        color: '#f00',
      });
    }
    lastShootTime = now;
  }

  // 총알 이동
  for (const bullet of bullets) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
  }

  // 총알과 플레이어 충돌 체크(맞으면 리셋)
  for (const bullet of bullets) {
    if (rectsCollide(player, bullet)) {
      // 하트 감소
      let idx = player.hearts.findIndex(h => h);
      if (idx !== -1) player.hearts[idx] = false;
      // 총알 제거
      bullet.x = -9999;
      // 하트가 남아있으면 위치 리셋, 없으면 게임 오버
      if (player.hearts.some(h => h)) {
        player.x = 100; player.y = 350; player.vx = 0; player.vy = 0;
        player.hasPower = false;
      } else {
        gameOver = true;
      }
      break;
    }
  }

  // 화면 밖 총알 제거
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (b.x < -20 || b.x > canvas.width + 20 || b.y < -20 || b.y > canvas.height + 20) {
      bullets.splice(i, 1);
    }
  }
  // 좌우 이동
  if (keys['ArrowLeft']) player.vx = -player.speed;
  else if (keys['ArrowRight']) player.vx = player.speed;
  else player.vx = 0;

  // 점프(W 또는 ArrowUp)
  if ((keys['w'] || keys['W'] || keys['ArrowUp']) && player.onGround) {
    player.vy = -player.jumpPower;
    player.onGround = false;
  }

  // 중력
  player.vy += 0.5;

  // 이동
  player.x += player.vx;
  player.y += player.vy;

  // 화면 밖으로 못 나가게(좌우, 위, 아래)
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
  if (player.y < 0) player.y = 0;
  if (player.y < 0) {
    player.y = 0;
    player.vy = 0;
    // onGround는 false 유지 (점프 중 자연스러움)
  }
  if (player.y + player.h > canvas.height) {
    player.y = canvas.height - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  // 플랫폼 충돌
  player.onGround = false;
  for (const pf of platforms) {
    if (rectsCollide(player, pf) && player.vy >= 0) {
      player.y = pf.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  // 여러 적 흡수(흡입 이펙트에 닿으면)
  if (inhaleActive) {
    for (const enemy of enemies) {
      if (enemy.alive && rectsCollide(inhaleBox, enemy)) {
        enemy.alive = false; // 적 완전 제거
        // 흡수 시 능력 항상 새로 부여
        player.hasPower = true;
        let newAbility;
        do {
          newAbility = abilities[Math.floor(Math.random() * abilities.length)];
        } while (currentAbility && newAbility === currentAbility && abilities.length > 1);
        currentAbility = newAbility;
        player.color = currentAbility.color;
        player.powerTimer = 60 * 10000;
        abilityNameTimer = 180;
      }
    }
  }
  // 적 부활 타이머
  for (const enemy of enemies) {
  // 즉시 부활 방식으로 변경: 아무것도 하지 않음
  }
  // 능력 이름 표시 타이머 감소
  if (abilityNameTimer > 0) abilityNameTimer--;
  // 능력 이름 표시
  if (currentAbility && abilityNameTimer > 0) {
    ctx.save();
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, abilityNameTimer/30);
    ctx.fillStyle = currentAbility.color;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.strokeText(currentAbility.name + '!', canvas.width/2, 60);
    ctx.fillText(currentAbility.name + '!', canvas.width/2, 60);
    ctx.restore();
  }
  // 파티클 이동
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life--;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  // 공기탄
  for (const ab of airBullets) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = ab.color || '#39b8f7ff';
    ctx.beginPath();
    ctx.ellipse(ab.x + ab.w/2, ab.y + ab.h/2, ab.w/2, ab.h/2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // 별 파티클
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life/40);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

function draw() {
  if (gameOver) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#ff4d6d';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', canvas.width/2, canvas.height/2 - 20);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#333';
    ctx.fillText('최종 점수: ' + score, canvas.width/2, canvas.height/2 + 30);
    ctx.restore();
    // 버튼 보이기
    if (restartBtn) restartBtn.style.display = 'block';
    return;
  }
  // 게임 중에는 버튼 숨김
  if (restartBtn) restartBtn.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // UI: 하트(목숨) 5개와 점수 표시
  ctx.save();
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    // 하트 위치: (20 + i*36, 20)
    const x = 20 + i * 36;
    const y = 24;
    // 하트 그리기(활성: 빨강, 비활성: 회색)
    ctx.moveTo(x, y);
    ctx.fillStyle = player.hearts[i] ? '#ff4d6d' : '#bbb';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 10, y - 10, x - 18, y + 10, x, y + 18);
    ctx.bezierCurveTo(x + 18, y + 10, x + 10, y - 10, x, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 점수 표시 (하트 오른쪽)
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#333';
  ctx.fillText('점수: ' + score, 210, 34);
  // 현재 능력 종류 표시
  let abilityText = currentAbility && player.hasPower ? currentAbility.name : '없음';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#555';
  ctx.fillText('능력: ' + abilityText, 320, 34);
  ctx.restore();

  // 플랫폼
  ctx.fillStyle = '#444';
  for (const pf of platforms) ctx.fillRect(pf.x, pf.y, pf.w, pf.h);

  // 여러 적
  for (const enemy of enemies) {
    if (enemy.alive) {
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    }
  }

  // 총알
  for (const bullet of bullets) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x + bullet.w/2, bullet.y + bullet.h/2, bullet.w/2, 0, Math.PI*2);
    ctx.fill();
  }

  // 플레이어 총알(능력 색상 적용)
  for (const bullet of playerBullets) {
    let color = bullet.color;
    if (currentAbility && player.hasPower) color = currentAbility.effect;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bullet.x + bullet.w/2, bullet.y + bullet.h/2, bullet.w/2, 0, Math.PI*2);
    ctx.fill();
  }

  // 공기탄(능력 색상 적용)
  for (const ab of airBullets) {
    let color = ab.color;
    if (currentAbility && player.hasPower) color = currentAbility.effect;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(ab.x + ab.w/2, ab.y + ab.h/2, ab.w/2, ab.h/2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // 바람(흡입) 이펙트
  if (inhaleActive) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#08a0ecff';
    ctx.beginPath();
    ctx.ellipse(
      player.facing === 1 ? player.x + player.w + inhaleBox.w / 2 : player.x - inhaleBox.w / 2,
      player.y + player.h / 2,
      inhaleBox.w / 2, inhaleBox.h / 2, 0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }
  // 바람(공격) 이펙트
  if (exhaleActive) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = (currentAbility && currentAbility.effect) ? currentAbility.effect : '#ffe066';
    ctx.beginPath();
    ctx.ellipse(
      player.facing === 1 ? player.x + player.w + exhaleBox.w / 2 : player.x - exhaleBox.w / 2,
      player.y + player.h / 2,
      exhaleBox.w / 2, exhaleBox.h / 2, 0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  // 플레이어(동그란 원형)
  ctx.save();
  // 본체(더 밝은 분홍)
  ctx.beginPath();
  ctx.arc(player.x + player.w/2, player.y + player.h/2, player.w/2, 0, Math.PI*2);
  ctx.fillStyle = player.ability === 'fire' ? '#ffb6c1' : player.ability === 'wind' ? '#b6eaff' : '#ffd6ec';
  ctx.shadowColor = '#ffd6ec';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 볼터치(홍조)
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(player.x + player.w/2 - player.w/3.2, player.y + player.h/2 + player.h/4.5, player.w/7, player.h/16, 0, 0, Math.PI*2);
  ctx.fillStyle = '#ff7eb9';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(player.x + player.w/2 + player.w/3.2, player.y + player.h/2 + player.h/4.5, player.w/7, player.h/16, 0, 0, Math.PI*2);
  ctx.fillStyle = '#ff7eb9';
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // 커비 스타일 눈(더 크고 아래쪽, 동글고 반짝임 강조)
  let eyeOffsetX = player.w/5.2;
  let eyeOffsetY = player.h/10;
  let eyeW = player.w/10.5; // 더 작게
  let eyeH = player.h/4.2; // 더 작게
  function drawKirbyEye(x, y) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, eyeW, eyeH, 0, 0, Math.PI*2);
    ctx.fillStyle = '#222b5c';
    ctx.fill();
    // 큰 하이라이트
    ctx.beginPath();
    ctx.ellipse(x-eyeW/3, y-eyeH/2.5, eyeW/2.5, eyeH/3, 0, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    // 작은 하이라이트
    ctx.beginPath();
    ctx.ellipse(x+eyeW/4, y+eyeH/4, eyeW/6, eyeH/7, 0, 0, Math.PI*2);
    ctx.fillStyle = '#b6eaff';
    ctx.fill();
    ctx.restore();
  }
  drawKirbyEye(player.x + player.w/2 - eyeOffsetX, player.y + player.h/2 + eyeOffsetY);
  drawKirbyEye(player.x + player.w/2 + eyeOffsetX, player.y + player.h/2 + eyeOffsetY);

  // 입(작고 귀엽게, 살짝 미소)
  ctx.save();
  ctx.beginPath();
  ctx.arc(player.x + player.w/2, player.y + player.h/2 + player.h/3.7, player.w/10, Math.PI*0.15, Math.PI*0.85, false);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#a23c5a';
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
