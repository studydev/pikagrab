const square = document.getElementById('square');
let playerName = '';
const userNameDisplay = document.getElementById('userNameDisplay');
const changeUserBtn = document.getElementById('changeUserBtn');
const nameInputModal = document.getElementById('nameInputModal');
const playerNameInput = document.getElementById('playerNameInput');
const nameSubmitBtn = document.getElementById('nameSubmitBtn');
let gameActive = false;
const rankingBoard = document.getElementById('rankingBoard');
const rankingList = document.getElementById('rankingList');

let hitCount = 0;
const maxHit = 5;
const heartsDiv = document.getElementById('hearts');
const gameOverDiv = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');

// 점수 관련 변수 및 요소 추가
let score = 0;
const scoreBoard = document.getElementById('scoreBoard');

// 이스터에그: 작은 네모 7번 클릭 시 777점 추가
const easterEggBox = document.getElementById('easterEggBox');
let easterEggClickCount = 0;
easterEggBox.addEventListener('click', function() {
    easterEggClickCount++;
    if (easterEggClickCount === 7) {
        score += 777;
        updateScore();
        easterEggClickCount = 0;
        // 살짝 효과
        easterEggBox.style.opacity = '1';
        setTimeout(() => { easterEggBox.style.opacity = '0.3'; }, 500);
    }
});

// 이름 입력 모달 표시 및 처리
function showNameInputModal() {
    nameInputModal.style.display = 'flex';
    playerNameInput.value = '';
    playerNameInput.focus();
}

function hideNameInputModal() {
    nameInputModal.style.display = 'none';
}

function startGameWithName() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('이름을 입력하세요!');
    gameActive = false;
        playerNameInput.focus();
        return;
    }
    playerName = name;
    hideNameInputModal();
    // square, pika1, pika2 보이기
    document.getElementById('square').style.display = 'block';
    document.getElementById('pika1').style.display = 'block';
    document.getElementById('pika2').style.display = 'block';
    // 사용자 이름 표시
    userNameDisplay.textContent = `👤 ${playerName}`;
    userNameDisplay.style.display = 'block';
    restartGame();
    rankingBoard.style.display = 'block';
    fetchAndShowRanking();
}

nameSubmitBtn.addEventListener('click', startGameWithName);
playerNameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') startGameWithName();
});

// 게임 진입 시 이름 입력 강제
window.addEventListener('DOMContentLoaded', () => {
    // square, pika1, pika2 숨기기 (새로고침 시)
    document.getElementById('square').style.display = 'none';
    document.getElementById('pika1').style.display = 'none';
    document.getElementById('pika2').style.display = 'none';
    userNameDisplay.style.display = 'none';
    showNameInputModal();
    gameActive = true;
});

// 사용자 교체 버튼 동작 (중복 등록 방지)
changeUserBtn.addEventListener('click', () => {
    // 게임 화면 요소 숨기기
    document.getElementById('square').style.display = 'none';
    document.getElementById('pika1').style.display = 'none';
    document.getElementById('pika2').style.display = 'none';
    userNameDisplay.style.display = 'none';
    gameActive = false;
    showNameInputModal();
});
const pika1 = document.getElementById('pika1');
const pika2 = document.getElementById('pika2');
let x = 0;
let y = 0;
const step = 20;

// 두 pika를 배열로 관리
const pikas = [pika1, pika2];

function placePikaRandom(pika) {
    const max = 360;
    const pikaX = Math.floor(Math.random() * (max / step + 1)) * step;
    const pikaY = Math.floor(Math.random() * (max / step + 1)) * step;
    pika.style.left = pikaX + 'px';
    pika.style.top = pikaY + 'px';
    pika.style.display = 'block';
}

function isCatch(pika) {
    const squareRect = square.getBoundingClientRect();
    const pikaRect = pika.getBoundingClientRect();
    return !(
        squareRect.right < pikaRect.left ||
        squareRect.left > pikaRect.right ||
        squareRect.bottom < pikaRect.top ||
        squareRect.top > pikaRect.bottom
    );
}

// 두 pika 모두 랜덤 위치에 놓기
pikas.forEach(placePikaRandom);

// 마우스/터치 드래그로 네모 움직이기
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let lastX = 0, lastY = 0;

// 마우스 이벤트
square.addEventListener('mousedown', function(e) {
    isDragging = true;
    offsetX = e.clientX - square.offsetLeft;
    offsetY = e.clientY - square.offsetTop;
});

document.addEventListener('mousemove', function(e) {
    if (isDragging) {
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        newX = Math.max(0, Math.min(360, newX));
        newY = Math.max(0, Math.min(360, newY));
        square.style.left = newX + 'px';
        square.style.top = newY + 'px';
        x = newX;
        y = newY;

        // 3D 효과 방향 계산
        setSquare3DEffect(Math.sign(newX - lastX), Math.sign(newY - lastY));
        lastX = newX;
        lastY = newY;
    }
});

document.addEventListener('mouseup', function() {
    isDragging = false;
    // 멈추면 원래대로
    square.style.transform = 'perspective(300px) rotateX(0deg) rotateY(0deg)';
});

// 터치 이벤트
square.addEventListener('touchstart', function(e) {
    isDragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - square.offsetLeft;
    offsetY = touch.clientY - square.offsetTop;
    e.preventDefault();
});

document.addEventListener('touchmove', function(e) {
    if (isDragging) {
        const touch = e.touches[0];
        let newX = touch.clientX - offsetX;
        let newY = touch.clientY - offsetY;
        newX = Math.max(0, Math.min(360, newX));
        newY = Math.max(0, Math.min(360, newY));
        square.style.left = newX + 'px';
        square.style.top = newY + 'px';
        x = newX;
        y = newY;
        e.preventDefault();
    }
});

document.addEventListener('touchend', function() {
    isDragging = false;
});

// 마우스/터치 드래그 코드는 그대로 사용

// 우클릭 시 총알 발사 (두 pika 모두 맞출 수 있게)
document.getElementById('gameArea').addEventListener('contextmenu', function(e) {
    e.preventDefault();

    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    bullet.style.background = 'blue'; // ★ 파란색 총알로 변경!
    const gameAreaRect = this.getBoundingClientRect();
    const squareRect = square.getBoundingClientRect();
    const startX = squareRect.left - gameAreaRect.left + squareRect.width / 2 - 5;
    const startY = squareRect.top - gameAreaRect.top + squareRect.height / 2 - 5;
    bullet.style.left = startX + 'px';
    bullet.style.top = startY + 'px';
    this.appendChild(bullet);

    const targetX = e.clientX - gameAreaRect.left;
    const targetY = e.clientY - gameAreaRect.top;
    const dx = targetX - (startX + 5);
    const dy = targetY - (startY + 5);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 5;
    const vx = dx / distance * speed;
    const vy = dy / distance * speed;

    let bulletX = startX;
    let bulletY = startY;

    function moveBullet() {
        bulletX += vx;
        bulletY += vy;
        bullet.style.left = bulletX + 'px';
        bullet.style.top = bulletY + 'px';

        // 두 pika 중 하나라도 맞으면
        for (const pika of pikas) {
            const bulletRect = bullet.getBoundingClientRect();
            const pikaRect = pika.getBoundingClientRect();
            if (
                bulletRect.right > pikaRect.left &&
                bulletRect.left < pikaRect.right &&
                bulletRect.bottom > pikaRect.top &&
                bulletRect.top < pikaRect.bottom &&
                pika.style.display !== 'none'
            ) {
                pika.style.display = 'none';
                // 1% 확률로 1000점, 아니면 1점
                if (Math.random() < 0.01) {
                    score += 1000;
                } else {
                    score += 1;
                }
                updateScore();        // 점수판 업데이트
                setTimeout(() => placePikaRandom(pika), 1000);
                bullet.remove();
                return;
            }
        }

        if (
            bulletX < 0 || bulletX > 390 ||
            bulletY < 0 || bulletY > 390
        ) {
            bullet.remove();
            return;
        }

        requestAnimationFrame(moveBullet);
    }

    moveBullet();
});

// pika가 1초마다 총알 발사 (각각 따로)
function firePikaBullet(pika) {
    if (pika.style.display === 'none') {
        // 점수에 따라 발사 간격을 줄임 (최소 500ms)
        const interval = Math.max(500, 1000 - score * 5);
        setTimeout(() => firePikaBullet(pika), interval);
        return;
    }

    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    bullet.style.background = 'red';
    const gameArea = document.getElementById('gameArea');
    const gameAreaRect = gameArea.getBoundingClientRect();
    const pikaRect = pika.getBoundingClientRect();
    const startX = pikaRect.left - gameAreaRect.left + pikaRect.width / 2 - 5;
    const startY = pikaRect.top - gameAreaRect.top + pikaRect.height / 2 - 5;
    bullet.style.left = startX + 'px';
    bullet.style.top = startY + 'px';
    gameArea.appendChild(bullet);

    // 랜덤 방향
    const angle = Math.random() * 2 * Math.PI;
    const speed = 5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    let bulletX = startX;
    let bulletY = startY;

    function moveBullet() {
        bulletX += vx;
        bulletY += vy;
        bullet.style.left = bulletX + 'px';
        bullet.style.top = bulletY + 'px';

        const bulletRect = bullet.getBoundingClientRect();
        const squareRect = square.getBoundingClientRect();
        if (
            bulletRect.right > squareRect.left &&
            bulletRect.left < squareRect.right &&
            bulletRect.bottom > squareRect.top &&
            bulletRect.top < squareRect.bottom &&
            square.style.display !== 'none'
        ) {
            pikaBulletHitSquare(); // ← 이 함수가 반드시 여기서만 실행되어야 해요!
            bullet.remove();
            return;
        }

        if (
            bulletX < 0 || bulletX > 390 ||
            bulletY < 0 || bulletY > 390
        ) {
            bullet.remove();
            return;
        }

        requestAnimationFrame(moveBullet);
    }

    moveBullet();

    // 점수에 따라 발사 간격을 줄임 (최소 10ms)
    const interval = Math.max(10, 1000 - score * 5);
    setTimeout(() => firePikaBullet(pika), interval);
}

// 두 pika 모두 총알 발사 시작
pikas.forEach(firePikaBullet);

// 3D 효과 함수 추가
function setSquare3DEffect(dx, dy) {
    // dx, dy는 -1, 0, 1 값 (방향)
    const rotateY = dx * 20; // 좌우 이동시 Y축 회전
    const rotateX = dy * -20; // 상하 이동시 X축 회전
    square.style.transform = `perspective(300px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

// 하트 표시 함수
function updateHearts() {
    let hearts = '';
    for (let i = 0; i < maxHit - hitCount; i++) {
        hearts += '❤️';
    }
    for (let i = 0; i < hitCount; i++) {
        hearts += '🤍';
    }
    heartsDiv.innerHTML = hearts;
}

// 점수판 업데이트 함수
function updateScore() {
    scoreBoard.textContent = `점수: ${score}`;
}

// 게임 오버 처리 함수
async function gameOver() {
    gameOverDiv.style.display = 'block';
    square.style.display = 'none';
    pikas.forEach(pika => pika.style.display = 'none');
    heartsDiv.style.display = 'none';
    // 점수 upsert
    if (playerName) {
        await window.upsertScore(playerName, score);
        fetchAndShowRanking();
    }
}

// 다시하기 함수
function restartGame() {
    hitCount = 0;
    score = 0; // 점수 초기화
    gameOverDiv.style.display = 'none';
    square.style.display = 'block';
    heartsDiv.style.display = 'block';
    pikas.forEach(placePikaRandom);
    pikas.forEach(pika => pika.style.display = 'block');
    updateHearts();
    updateScore(); // 점수판 초기화
    fetchAndShowRanking();
}
// 랭킹 보드 표시 함수
async function fetchAndShowRanking() {
    const { data, error } = await window.fetchTop10();
    if (error) {
        rankingList.innerHTML = '<div>랭킹을 불러올 수 없습니다</div>';
        return;
    }
    let html = `<table style="width:100%;border-collapse:collapse;text-align:center;table-layout:fixed;">
        <thead><tr style="background:#ffe082;"><th style="width:20%">순위</th><th style="width:50%">이름</th><th style="width:30%">점수</th></tr></thead><tbody>`;
    data.forEach((row, idx) => {
        const highlight = row.name === playerName ? ' style="color:#d2691e;font-weight:bold;background:#fff3c0;"' : '';
        html += `<tr${highlight}><td>${idx+1}</td><td>${row.name}</td><td>${row.score}</td></tr>`;
    });
    html += '</tbody></table>';
    rankingList.innerHTML = html;
}

// 다시하기 버튼 이벤트
restartBtn.addEventListener('click', restartGame);

// 피카 총알이 캐릭터에 맞았을 때
function pikaBulletHitSquare() {
    hitCount += 1;
    updateHearts();
    updateScore(); // 점수판 업데이트
    if (hitCount >= maxHit) {
        gameOver();
    }
}

// 게임 시작 시 하트 및 점수 표시
updateHearts();
updateScore();

const gameArea = document.getElementById('gameArea');

function fireCharacterBulletTo(x, y) {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    bullet.style.background = 'blue';
    const gameAreaRect = gameArea.getBoundingClientRect();
    const squareRect = square.getBoundingClientRect();
    const startX = squareRect.left - gameAreaRect.left + squareRect.width / 2 - 5;
    const startY = squareRect.top - gameAreaRect.top + squareRect.height / 2 - 5;
    bullet.style.left = startX + 'px';
    bullet.style.top = startY + 'px';
    gameArea.appendChild(bullet);

    const dx = x - (startX + 5);
    const dy = y - (startY + 5);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 5;
    const vx = dx / distance * speed;
    const vy = dy / distance * speed;

    let bulletX = startX;
    let bulletY = startY;

    function moveBullet() {
        bulletX += vx;
        bulletY += vy;
        bullet.style.left = bulletX + 'px';
        bullet.style.top = bulletY + 'px';

        for (const pika of pikas) {
            const bulletRect = bullet.getBoundingClientRect();
            const pikaRect = pika.getBoundingClientRect();
            if (
                bulletRect.right > pikaRect.left &&
                bulletRect.left < pikaRect.right &&
                bulletRect.bottom > pikaRect.top &&
                bulletRect.top < pikaRect.bottom &&
                pika.style.display !== 'none'
            ) {
                pika.style.display = 'none';
                // 0.1% 확률로 100점, 아니면 1점
                if (Math.random() < 0.001) {
                    score += 100;
                } else {
                    score += 1;
                }
                updateScore();
                setTimeout(() => placePikaRandom(pika), 1000);
                bullet.remove();
                return;
            }
        }

        if (
            bulletX < 0 || bulletX > 390 ||
            bulletY < 0 || bulletY > 390
        ) {
            bullet.remove();
            return;
        }

        requestAnimationFrame(moveBullet);
    }

    moveBullet();
}

// 캐릭터 외곽 40px에서 터치/클릭 시 총알 발사
gameArea.addEventListener('click', function(e) {
    // 모바일 터치도 click 이벤트로 동작함
    const gameAreaRect = gameArea.getBoundingClientRect();
    const squareRect = square.getBoundingClientRect();
    const clickX = e.clientX - gameAreaRect.left;
    const clickY = e.clientY - gameAreaRect.top;
    const squareCenterX = squareRect.left - gameAreaRect.left + squareRect.width / 2;
    const squareCenterY = squareRect.top - gameAreaRect.top + squareRect.height / 2;

    // 캐릭터 중심에서 40px 이상 떨어진 곳만 총알 발사
    const dist = Math.sqrt(
        Math.pow(clickX - squareCenterX, 2) +
        Math.pow(clickY - squareCenterY, 2)
    );
    if (dist > 40) {
        fireCharacterBulletTo(clickX, clickY);
    }
});