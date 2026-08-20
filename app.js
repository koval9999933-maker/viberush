// 1. Инициализация Supabase с твоими ключами
const SUPABASE_URL = 'https://zknhyaqrqvhktzzdirtp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YjQIZVMyXGPpKhLn7hnwTw_IF-ENBmg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Глобальные переменные приложения
let userBalance = 1000;
let currentBattleId = null; // Здесь будет ID активного батла
let battleScores = { score1: 0, score2: 0 };

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', async () => {
    // Инициализация Telegram WebApp (если открыто в боте)
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }
    
    // Загружаем тестовый или активный батл
    await initBattle();
});

// Функция создания/получения активного батла
async function initBattle() {
    const { data, error } = await supabaseClient
        .from('battles')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

    if (data) {
        currentBattleId = data.id;
        battleScores.score1 = data.score_1;
        battleScores.score2 = data.score_2;
        updateBattleUI();
    } else {
        // Если батла нет, создаем новый
        const { data: newBattle, error: createError } = await supabaseClient
            .from('battles')
            .insert([{ score_1: 0, score_2: 0, is_active: true }])
            .select()
            .single();
            
        if (newBattle) {
            currentBattleId = newBattle.id;
            updateBattleUI();
        }
    }
}

// Обновление интерфейса счета
function updateBattleUI() {
    const scoreEl = document.getElementById('scoreDisplay');
    if (scoreEl) {
        scoreEl.innerText = `${battleScores.score1} : ${battleScores.score2}`;
    }
    const balanceEl = document.getElementById('cryptoBalanceDisplay');
    if (balanceEl) {
        balanceEl.innerText = `Баланс: ${userBalance.toLocaleString()} VRSH`;
    }
}

// Защищенная отправка подарка с Optimistic UI и защитой от двойного клика
async function sendGiftSecure(giftName, cost, targetStreamer, type, btnElement) {
    if (btnElement.classList.contains('btn-loading')) return;
    
    if (userBalance < cost) {
        alert('❌ Недостаточно средств!');
        return;
    }

    // Блокируем кнопку от двойного клика
    btnElement.classList.add('btn-loading');
    const originalText = btnElement.innerText;
    btnElement.innerText = 'Отправка...';

    // Оптимистичное обновление UI (мгновенный отклик)
    const previousBalance = userBalance;
    userBalance -= cost;
    if (targetStreamer === 1) { battleScores.score1 += cost; } else { battleScores.score2 += cost; }
    updateBattleUI();

    try {
        // Вызов защищенной серверной функции Supabase RPC
        const { data, error } = await supabaseClient.rpc('send_battle_gift_rpc', {
            p_battle_id: currentBattleId,
            p_gift_name: giftName,
            p_cost: cost,
            p_target_streamer: targetStreamer
        });

        if (error || (data && !data.success)) {
            throw new Error(error ? error.message : (data ? data.message : 'Ошибка транзакции'));
        }

        // Синхронизация реального баланса с сервера
        userBalance = data.new_balance;
        updateBattleUI();
        console.log(`✨ Успешно отправлено: ${giftName}`);

    } catch (err) {
        console.error('Ошибка:', err);
        // Откат UI при сбое
        userBalance = previousBalance;
        if (targetStreamer === 1) { battleScores.score1 -= cost; } else { battleScores.score2 -= cost; }
        updateBattleUI();
        alert('⚠️ Ошибка сети или авторизации: транзакция отменена.');
    } finally {
        btnElement.classList.remove('btn-loading');
        btnElement.innerText = originalText;
    }
}// Подписка на изменения в таблице battles (реальное время)
supabase
  .channel('custom-all-channel')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battles' }, (payload) => {
    console.log('Изменение получено!', payload);
    // Обновляем счет на экране без перезагрузки
    document.getElementById('scoreDisplay').innerText = `${payload.new.score_1} : ${payload.new.score_2}`;
  })
  .subscribe();