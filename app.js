let balance = 1000;
let score1 = 0;
let score2 = 0;

const balanceEl = document.getElementById('balance');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');

function support(fighterId, cost, type) {
    if (balance < cost) {
        alert('Недостаточно VRSH на балансе!');
        return;
    }

    balance -= cost;
    
    if (fighterId === 1) {
        score1 += cost / 10;
    } else {
        score2 += cost / 10;
    }

    updateUI();
}

function updateUI() {
    balanceEl.innerText = balance;
    score1El.innerText = score1;
    score2El.innerText = score2;
}

// Инициализация Telegram WebApp, если открыто в мессенджере
if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
}
