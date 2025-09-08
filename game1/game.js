const square = document.getElementById('square');
const pika = document.getElementById('pika');
const scoreBoard = document.getElementById('scoreBoard');
let x = 0;
let y = 0;
const step = 20;
let score = 0;

function placePikaRandom() {
    const max = 360;
    const pikaX = Math.floor(Math.random() * (max / step + 1)) * step;
    const pikaY = Math.floor(Math.random() * (max / step + 1)) * step;
    pika.style.left = pikaX + 'px';
    pika.style.top = pikaY + 'px';
    pika.style.display = 'block';
}

function isCatch() {
    const squareRect = square.getBoundingClientRect();
    const pikaRect = pika.getBoundingClientRect();

    // 두 사각형이 겹치는지 확인
    return !(
        squareRect.right < pikaRect.left ||
        squareRect.left > pikaRect.right ||
        squareRect.bottom < pikaRect.top ||
        squareRect.top > pikaRect.bottom
    );
}

function updateScore() {
    scoreBoard.textContent = `점수: ${score}`;
}

placePikaRandom();
updateScore();

// 마우스로 드래그해서 네모 움직이기
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

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

        if (isCatch()) {
            pika.style.display = 'none';
            score += 1;
            updateScore();
            setTimeout(placePikaRandom, 1000);
        }
    }
});

document.addEventListener('mouseup', function() {
    isDragging = false;
});

// === 터치 이벤트 추가 ===
square.addEventListener('touchstart', function(e) {
    isDragging = true;
    // 터치 위치에서 네모의 위치 차이 저장
    const touch = e.touches[0];
    offsetX = touch.clientX - square.offsetLeft;
    offsetY = touch.clientY - square.offsetTop;
    // 스크롤 방지
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

        if (isCatch()) {
            pika.style.display = 'none';
            score += 1;
            updateScore();
            setTimeout(placePikaRandom, 1000);
        }
        // 스크롤 방지
        e.preventDefault();
    }
});

document.addEventListener('touchend', function() {
    isDragging = false;
});