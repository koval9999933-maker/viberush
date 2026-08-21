const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || { id: 12345, first_name: "Геймер" };

const SUPABASE_URL = 'https://zknhyaqrqvhktzzdirtp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YjQIZVMyXGPpKhLn7hnwTw_IF-ENBmg';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let balance = 1000;
let score1 = 0;
let score2 = 0;
let lastBonusDate = '';

const balanceEl = document.getElementById('balance');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const progressBarEl = document.getElementById('progress-bar');

// Подписка на обновление ОБЩИХ очков в реальном времени
supabaseClient
  .channel('public:game_stats')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_stats' }, (payload) => {
    if (payload.new) {
      score1 = payload.new.score1;
      score2 = payload.new.score2;
      updateUI();
    }
  })
  .subscribe();

// Генератор звуков без внешних файлов (Web Audio API)
function playSound(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'bonus') {
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        }
    } catch (e) {}
}

// Таймер обратного отсчета раунда
let timeLeft = 300; 
function startTimer() {
    const timerEl = document.getElementById('battle-timer');
    setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            let mins = Math.floor(timeLeft / 60);
            let secs = timeLeft % 60;
            if (timerEl) {
                timerEl.innerText = `⏳ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        } else {
            timeLeft = 300;
        }
    }, 1000);
}
startTimer();

// Переключение вкладок меню
window.switchTab = function(tabName, btnElement) {
    playSound('click');
    document.getElementById('screen-battle').style.display = 'none';
    document.getElementById('screen-cabinet').style.display = 'none';
    document.getElementById('screen-top').style.display = 'none';

    if(tabName === 'battle') document.getElementById('screen-battle').style.display = 'block';
    if(tabName === 'cabinet') {
        document.getElementById('screen-cabinet').style.display = 'block';
        updateCabinetUI();
    }
    if(tabName === 'top') {
        document.getElementById('screen-top').style.display = 'block';
        loadLeaderboard();
    }

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
}

async function loadPlayerData() {
    try {
        // 1. Загружаем личный баланс игрока
        let { data, error } = await supabaseClient
            .from('players')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            await supabaseClient
                .from('players')
                .insert([{ id: user.id, username: user.first_name, balance: 1000, last_bonus: '' }]);
        } else {
            balance = data.balance;
            lastBonusDate = data.last_bonus || '';
        }

        // 2. Загружаем общие очки батла
        let { data: stats } = await supabaseClient
            .from('game_stats')
            .select('*')
            .eq('id', 1)
            .single();

        if (stats) {
            score1 = stats.score1 || 0;
            score2 = stats.score2 || 0;
        }

        updateUI();
    } catch (err) {
        console.error('Ошибка загрузки:', err);
    }
}

async function saveBalanceToDB() {
    await supabaseClient
        .from('players')
        .update({ balance: balance, last_bonus: lastBonusDate })
        .eq('id', user.id);
}

function updateUI() {
    if (balanceEl) balanceEl.innerText = balance;
    if (score1El) score1El.innerText = score1;
    if (score2El) score2El.innerText = score2;

    const total = score1 + score2;
    let percent = 50;
    if (total > 0) {
        percent = (score1 / total) * 100;
    }
    if (progressBarEl) {
        progressBarEl.style.width = percent + '%';
    }
}

function updateCabinetUI() {
    document.getElementById('profile-name').innerText = user.first_name;
    document.getElementById('profile-id').innerText = user.id;
    document.getElementById('profile-balance').innerText = balance;
    checkBonusButtonState();
}

function checkBonusButtonState() {
    const btn = document.getElementById('bonus-btn');
    const today = new Date().toDateString();
    if (lastBonusDate === today) {
        btn.innerText = '🎁 Бонус уже получен сегодня';
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    } else {
        btn.innerText = '🎁 Забрать ежедневный бонус (+200 VRSH)';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    }
}

window.claimDailyBonus = async function() {
    const today = new Date().toDateString();
    if (lastBonusDate === today) return;

    balance += 200;
    lastBonusDate = today;
    playSound('bonus');
    updateUI();
    updateCabinetUI();
    await saveBalanceToDB();
    alert('Вы успешно получили ежедневный бонус +200 VRSH!');
}

async function loadLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    listEl.innerHTML = '<p style="text-align:center;">Загрузка...</p>';

    let { data, error } = await supabaseClient
        .from('players')
        .select('username, balance')
        .order('balance', { ascending: false })
        .limit(5);

    if (error || !data) {
        listEl.innerHTML = '<p style="text-align:center; color:red;">Ошибка загрузки топа</p>';
        return;
    }

    let html = '<table style="width:100%; text-align:left; border-collapse:collapse;">';
    html += '<tr style="border-bottom:1px solid #333; color:#888;"><th style="padding:8px;">Игрок</th><th style="padding:8px; text-align:right;">Баланс</th></tr>';
    
    data.forEach((player, index) => {
        html += `<tr style="border-bottom:1px solid #222;">
            <td style="padding:8px;">${index + 1}. ${player.username || 'Игрок'}</td>
            <td style="padding:8px; text-align:right; color:#4ade80;">${player.balance} VRSH</td>
        </tr>`;
    });
    html += '</table>';
    
    listEl.innerHTML = html;
}

// Поддержка стримера (обновляет общую таблицу game_stats)
window.support = async function(streamerNum, cost, type, event) {
    if (balance < cost) {
        alert('Недостаточно VRSH на балансе!');
        return;
    }

    balance -= cost;
    playSound('click');

    // Считаем новые общие очки
    let newScore1 = streamerNum === 1 ? score1 + cost : score1;
    let newScore2 = streamerNum === 2 ? score2 + cost : score2;

    // Обновляем локально для скорости
    score1 = newScore1;
    score2 = newScore2;
    updateUI();

    // 1. Сохраняем уменьшенный баланс игрока
    await saveBalanceToDB();

    // 2. Отправляем новые общие очки в таблицу game_stats (все увидят мгновенно!)
    await supabaseClient
        .from('game_stats')
        .update({ score1: newScore1, score2: newScore2 })
        .eq('id', 1);

    if (event && event.currentTarget) {
        showFloatingText(event.currentTarget, `+${cost}`);
    }
}

function showFloatingText(buttonElement, text) {
    const floatEl = document.createElement('div');
    floatEl.innerText = text;
    floatEl.className = 'floating-score';
    
    const rect = buttonElement.getBoundingClientRect();
    floatEl.style.left = (rect.left + rect.width / 2) + 'px';
    floatEl.style.top = rect.top + 'px';
    
    document.body.appendChild(floatEl);
    setTimeout(() => {
        floatEl.remove();
    }, 800);
}

loadPlayerData();
