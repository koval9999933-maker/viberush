// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Данные пользователя из Telegram (или тестовые, если открыто в обычном браузере)
const user = tg.initDataUnsafe?.user || { id: 12345, first_name: "Геймер" };

// Настройки Supabase
const SUPABASE_URL = 'https://zknhyaqrqvhktzzdirtp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YjQIZVMyXGPpKhLn7hnwTw_IF-ENBmg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Переменные состояния
let balance = 1000;
let score1 = 0;
let score2 = 0;

// Элементы интерфейса
const balanceEl = document.getElementById('balance');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');

// Загрузка данных игрока при старте
async function loadPlayerData() {
    try {
        let { data, error } = await supabaseClient
            .from('players')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            // Если игрока еще нет — создаем в базе
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

// Сохранение данных в базу
async function saveToDB() {
    await supabaseClient
        .from('players')
        .update({ balance: balance, score1: score1, score2: score2 })
        .eq('id', user.id);
}

// Обновление экрана
function updateUI() {
    if (balanceEl) balanceEl.innerText = balance;
    if (score1El) score1El.innerText = score1;
    if (score2El) score2El.innerText = score2;
}

// Функция поддержки стримеров (вызывается по клику на кнопки)
window.support = async function(streamerNum, cost, type) {
    if (balance < cost) {
        alert('Недостаточно VRSH на балансе!');
        return;
    }

    balance -= cost;

    if (streamerNum === 1) {
        score1 += cost;
    } else if (streamerNum === 2) {
        score2 += cost;
    }

    updateUI();
    await saveToDB();
}

// Запуск при загрузке страницы
loadPlayerData();
