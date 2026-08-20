// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Данные пользователя из Telegram (если открыто не в телеграме, берем тестового игрока)
const user = tg.initDataUnsafe?.user || { id: 12345, first_name: "Геймер" };

// Настройки Supabase
const SUPABASE_URL = 'https://zknhyaqrqvhktzzdirtp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YjQIZVMyXGPpKhLn7hnwTw_IF-ENBmg';

// Создаем клиент Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Переменные состояния игры
let balance = 1000;
let score1 = 0;
let score2 = 0;

// Элементы на странице
const balanceEl = document.querySelector('.viberush-vrsh'); // Настрой селектор под свой HTML, если нужно
const score1El = document.querySelector('.streamer-1-score'); // Пример селектора очков 1
const score2El = document.querySelector('.streamer-2-score'); // Пример селектора очков 2

// Загрузка данных игрока при старте
async function loadPlayerData() {
    try {
        let { data, error } = await supabaseClient
            .from('players')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            // Если игрока еще нет в базе — создаем с дефолтными значениями
            const { error: insertError } = await supabaseClient
                .from('players')
                .insert([{ id: user.id, username: user.first_name, balance: 1000, score1: 0, score2: 0 }]);
            
            if (insertError) console.error('Ошибка создания игрока:', insertError);
        } else {
            // Загружаем данные из базы в игру
            balance = data.balance;
            score1 = data.score1;
            score2 = data.score2;
            updateUI();
        }
    } catch (err) {
        console.error('Ошибка подключения к Supabase:', err);
    }
}

// Функция сохранения данных в базу
async function saveToDB() {
    const { error } = await supabaseClient
        .from('players')
        .update({ balance: balance, score1: score1, score2: score2 })
        .eq('id', user.id);

    if (error) {
        console.error('Ошибка сохранения:', error);
    }
}

// Обновление интерфейса
function updateUI() {
    // Находим элементы на странице и обновляем текст (проверь свои классы в HTML)
    const vrshText = document.querySelector('div:has(> .fa-fish, img), .viberush-vrsh'); 
    // Или если у тебя конкретный класс баланса, например id="balance":
    // document.getElementById('balance').innerText = balance;
    
    // Обновляем баланс везде, где он выводится
    document.querySelectorAll('.user-balance').forEach(el => el.innerText = balance);
}

// Пример функции клика на кнопку (например, отправка ракеты или рыбки)
window.makeAction = async function(type, streamerNum) {
    if (type === 'fish') {
        balance -= 50;
        if (streamerNum === 1) score1 += 50;
        if (streamerNum === 2) score2 += 50;
    } else if (type === 'rocket') {
        balance -= 1000;
        if (streamerNum === 1) score1 += 1000;
        if (streamerNum === 2) score2 += 1000;
    }
    
    updateUI();
    await saveToDB(); // Сохраняем в базу данных!
}

// Запускаем загрузку при открытии страницы
loadPlayerData();
