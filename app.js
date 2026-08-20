const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || { id: 12345, first_name: "Геймер" };

const SUPABASE_URL = 'https://zknhyaqrqvhktzzdirtp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YjQIZVMyXGPpKhLn7hnwTw_IF-ENBmg';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let balance = 1000;
let score1 = 0;
let score2 = 0;

// Элементы
const balanceEl = document.getElementById('balance');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');

// Переключение вкладок меню
window.switchTab = function(tabName, btnElement) {
    // Скрываем все экраны
    document.getElementById('screen-battle').style.display = 'none';
    document.getElementById('screen-cabinet').style.display = 'none';
    document.getElementById('screen-top').style.display = 'none';

    // Показываем нужный
    document.getElementById('screen--' + tabName === 'screen--top' ? 'screen-top' : 'screen-' + tabName).style.display = 'block'; 
    // Упрощенно:
    if(tabName === 'battle') document.getElementById('screen-battle').style.display = 'block';
    if(tabName === 'cabinet') {
        document.getElementById('screen-cabinet').style.display = 'block';
        updateCabinetUI();
    }
    if(tabName === 'top') {
        document.getElementById('screen-top').style.display = 'block';
        loadLeaderboard();
    }

    // Подсветка кнопок меню
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
}

// Загрузка данных игрока
async function loadPlayerData() {
    try {
        let { data, error } = await supabaseClient
            .from('players')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            await supabaseClient
                .from('players')
                .insert([{ id: user.id, username: user.first_name, balance: 1000, score1: 0, score2: 0 }]);
        } else {
            balance = data.balance;
            score1 = data.score1;
            score2 = data.score2;
        }
        updateUI();
    } catch (err) {
        console.error('Ошибка загрузки:', err);
    }
}

async function saveToDB() {
    await supabaseClient
        .from('players')
        .update({ balance: balance, score1: score1, score2: score2 })
        .eq('id', user.id);
}

function updateUI() {
    if (balanceEl) balanceEl.innerText = balance;
    if (score1El) score1El.innerText = score1;
    if (score2El) score2El.innerText = score2;
}

function updateCabinetUI() {
    document.getElementById('profile-name').innerText = user.first_name;
    document.getElementById('profile-id').innerText = user.id;
    document.getElementById('profile-balance').innerText = balance;
}

// Загрузка топа игроков из базы
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

// Кнопка поддержки
window.support = async function(streamerNum, cost, type) {
    if (balance < cost) {
        alert('Недостаточно VRSH на балансе!');
        return;
    }

    balance -= cost;

    if (streamerNum === 1) score1 += cost;
    else if (streamerNum === 2) score2 += cost;

    updateUI();
    await saveToDB();
}

loadPlayerData();
