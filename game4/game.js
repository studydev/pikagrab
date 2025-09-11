// 능력 종류 및 상태
const abilities = [
  { name: '불꽃', color: '#ff6a00', effect: '#ffb347', particle: '#ffb347' },
  { name: '얼음', color: '#00cfff', effect: '#b3f0ff', particle: '#b3f0ff' },
  { name: '전기', color: '#ffe066', effect: '#fff700', particle: '#fff700' },
  { name: '바람', color: '#b3e6ff', effect: '#b3e6ff', particle: '#b3e6ff' },
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
};

// 바람(흡입/공격) 이펙트
let inhaleActive = false;
let inhaleBox = {x: 0, y: 0, w: 0, h: 0};
let exhaleActive = false;
let exhaleBox = {x: 0, y: 0, w: 0, h: 0, timer: 0};


// 여러 적 생성
const enemies = [
  { x: 500, y: 370, w: 40, h: 40, color: '#6cf', alive: true },
  { x: 350, y: 280, w: 40, h: 40, color: '#f99', alive: true },
  { x: 650, y: 220, w: 40, h: 40, color: '#9f9', alive: true },
  { x: 200, y: 370, w: 40, h: 40, color: '#fcf', alive: true },
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

// 입력
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function rectsCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
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
      color: effectColor,
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
        enemy.alive = false;
        ab.timer = 0;
        // 능력별 파티클
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
    // 적 총알과 충돌
    for (const bullet of bullets) {
      if (rectsCollide(ab, bullet)) {
        bullet.x = -9999;
        ab.timer = 0;
        // 파티클
        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 1.5;
          particles.push({
            x: ab.x + ab.w/2,
            y: ab.y + ab.h/2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: ab.particle,
            life: 10 + Math.random()*8,
          });
        }
      }
    }
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
        enemy.alive = false;
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
      // 플레이어가 맞으면 위치 리셋 및 능력 상실
    player.x = 100; player.y = 350; player.vx = 0; player.vy = 0;
    // 능력은 잃지 않음
    player.hasPower = false; 
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

  // 점프
  if (keys[' '] && player.onGround) {
    player.vy = -player.jumpPower;
    player.onGround = false;
  }

  // 중력
  player.vy += 0.5;

  // 이동
  player.x += player.vx;
  player.y += player.vy;

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
        enemy.alive = false;
        player.hasPower = true;
        // 랜덤 능력 부여
        currentAbility = abilities[Math.floor(Math.random() * abilities.length)];
        player.color = currentAbility.color;
        player.powerTimer = 60 * 5; // 1000000초(60프레임*5)
        abilityNameTimer = 180; // 10000초간 표시
        // 별 파티클 생성
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 2;
          particles.push({
            x: enemy.x + enemy.w/2,
            y: enemy.y + enemy.h/2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#ffe066',
            life: 30 + Math.random()*10,
          });
        }
        beep(900, 0.12);
      }
    }
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
    ctx.fillStyle = ab.color || '#b3e6ff';
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  // 플레이어 총알
  for (const bullet of playerBullets) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x + bullet.w/2, bullet.y + bullet.h/2, bullet.w/2, 0, Math.PI*2);
    ctx.fill();
  }

  // 바람(흡입) 이펙트
  if (inhaleActive) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#6fc5efff';
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

  // 플레이어
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  // 입(공격 중이면 더 크게)
  ctx.fillStyle = '#fff';
  if (player.facing === 1) {
    if (exhaleActive) {
      ctx.fillRect(player.x + player.w - 8, player.y + player.h / 2 - 10, 14, 20);
    } else {
      ctx.fillRect(player.x + player.w - 6, player.y + player.h / 2 - 6, 8, 12);
    }
  } else {
    if (exhaleActive) {
      ctx.fillRect(player.x - 6, player.y + player.h / 2 - 10, 14, 20);
    } else {
      ctx.fillRect(player.x - 2, player.y + player.h / 2 - 6, 8, 12);
    }
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
