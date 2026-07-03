// Настройки языка сессии (english — по умолчанию, german — на будущее)
let currentLang = "english"; 

// Глобальная переменная для хранения всей скачанной базы данных
let wordsDatabase = null;

// Состояние онлайн-режима (загружается из памяти, по умолчанию false)
let isOnlineMode = localStorage.getItem('isOnlineMode') === 'true';

const stack = document.getElementById('stack');
const zones = { 
  L: document.getElementById('zoneL'), 
  R: document.getElementById('zoneR'), 
  T: document.getElementById('zoneT') 
};

// Переключатель режимов онлайн/офлайн
function toggleMode() {
  isOnlineMode = !isOnlineMode;
  localStorage.setItem('isOnlineMode', isOnlineMode);
  updateModeButtonVisuals();
  
  // При смене режима полностью перезапускаем текущий уровень, чтобы обновить колоду
  setLevel(currentLevel);
}

// Обновление внешнего вида кнопки режима
function updateModeButtonVisuals() {
  const btn = document.getElementById('modeBtn');
  if (!btn) return;
  if (isOnlineMode) {
    btn.innerText = "Режим: Онлайн";
    btn.classList.add('online-active');
  } else {
    btn.innerText = "Режим: Офлайн";
    btn.classList.remove('online-active');
  }
}

// Постоянная боевая ссылка на твой n8n Webhook
const n8nWebhookUrl = "https://vennerkurh.app.n8n.cloud/webhook/2d4f1b30-8ace-48db-bfe5-af0034d701ba";

// Функция поиска слова (локально или через интернет в зависимости от режима)
async function fetchWordDetails(wordText) {
  const cleanWord = wordText.trim();
  let phonetic = "/.../", translation = "Переклад не знайдено";

  // --- ОНЛАЙН РЕЖИМ ЧЕРЕЗ АГЕНТА N8N ---
  if (isOnlineMode) {
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: cleanWord // Шлем чистое слово строкой
      });

      if (response.ok) {
        const rawData = await response.json();
        
        // n8n может вернуть ответ как объектом, так и массивом из-за ноды Code
        const result = Array.isArray(rawData) ? rawData[0] : rawData;
        
        // Защита: если нода n8n вернула сырую строку в output вместо объекта
        let finalData = result;
        if (result && result.output && typeof result.output === 'string') {
          try { finalData = JSON.parse(result.output.trim()); } catch(e) {}
        }

        // Проверяем ключи перевода и транскрипции (с твоей ноды Format Response1)
        if (finalData && (finalData.translation || finalData.phonetic || finalData.t || finalData.p)) {
          phonetic = finalData.phonetic || finalData.p || "/.../";
          translation = finalData.translation || finalData.t || "Переклад відсутній";
          translation = translation.toLowerCase();
        }
      } else {
        translation = `Помилка сервера n8n (${response.status})`;
      }
    } catch (e) {
      console.error("Ошибка n8n перевода:", e);
      translation = "Помилка зв'язку з ИИ";
    }

    return { w: cleanWord, p: phonetic || "/.../", t: translation };
  }

  // --- ОФЛАЙН РЕЖИМ ---
  try {
    if (!wordsDatabase) {
      const response = await fetch('./words.json');
      if (!response.ok) throw new Error();
      wordsDatabase = await response.json();
    }

    const levelWords = wordsDatabase[currentLang]?.[currentLevel] || [];
    const found = levelWords.find(item => item.w.toLowerCase() === cleanWord.toLowerCase());

    if (found) {
      phonetic = found.p || "/.../";
      translation = found.t || "Переклад не знайдено";
    } else {
      translation = "Слово не знайдено в JSON";
    }
  } catch (e) {
    translation = "Помилка файлу words.json";
  }

  return { w: cleanWord, p: phonetic, t: translation };
}

// Текущий уровень и глобальное состояние колоды
let decksState = JSON.parse(localStorage.getItem('decksState')) || {}; 
let currentLevel = localStorage.getItem('currentLevel') || 'A1'; 
let currentDeck = [];

async function setLevel(lvl) {
  currentLevel = lvl; 
  localStorage.setItem('currentLevel', lvl); 
  
  document.querySelectorAll('.level-btn').forEach(b => {
    if(!b.classList.contains('mode-btn') && !b.classList.contains('reset-btn')) {
      b.classList.toggle('active', b.innerText === lvl);
    }
  });
  
  document.getElementById('status').innerText = `ЗАВАНТАЖЕННЯ...`;
  
  // --- ОНЛАЙН РЕЖИМ ---
  if (isOnlineMode) {
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: lvl 
      });

      if (response.ok) {
        const rawData = await response.json();
        
        // n8n возвращает массив объектов. Берем первый элемент, если это массив
        const result = Array.isArray(rawData) ? rawData[0] : rawData;
        
        // Вытаскиваем строку, сгенерированную ИИ
        let aiString = "";
        if (result && result.type === "level_words") {
          aiString = result.output;
        } else if (result) {
          aiString = result.output || result.text || (typeof result === 'string' ? result : JSON.stringify(result));
        }
        
        // На случай, если n8n вернул вложенный JSON в output
        if (aiString.includes('"output":')) {
          try {
            const nested = JSON.parse(aiString);
            aiString = nested.output || aiString;
          } catch(e) {}
        }
        
        // Парсим полученный массив слов
        const wordsArray = JSON.parse(aiString.trim());
        
        if (Array.isArray(wordsArray)) {
          let tempDeck = [];
          wordsArray.forEach(word => {
            tempDeck.push({ w: word.toLowerCase().trim(), p: "/.../", t: "Завантаження...", loaded: false });
          });
          
          currentDeck = tempDeck;
          document.getElementById('status').innerText = `ЗАЛИШИЛОСЬ: ${currentDeck.length}`;
          await renderCard();
          return;
        }
      }
    } catch (e) {
      console.error("Ошибка загрузки онлайн-уровня ИИ:", e);
    }
    
    currentDeck = [{ w: "error", p: "/.../", t: "Помилка завантаження рівня", loaded: true }];
    await renderCard();
    return;
  }

  // --- ОФЛАЙН РЕЖИМ (Твой оригинальный код) ---
  try {
    if (!wordsDatabase) {
      const response = await fetch('./words.json');
      if (!response.ok) throw new Error();
      wordsDatabase = await response.json();
    }

    if (decksState[lvl]) {
      currentDeck = decksState[lvl]; 
    } else {
      const wordsList = wordsDatabase[currentLang]?.[lvl] || [];
      let tempDeck = [];
      wordsList.forEach(item => {
        tempDeck.push({ w: item.w, p: item.p || '/.../', t: item.t, loaded: true });
      });
      
      for (let i = tempDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tempDeck[i], tempDeck[j]] = [tempDeck[j], tempDeck[i]];
      }
      
      currentDeck = tempDeck;
      decksState[lvl] = currentDeck; 
      localStorage.setItem('decksState', JSON.stringify(decksState)); 
    }
  } catch (e) {
    console.error("Не вдалося завантажити слова з JSON:", e);
    currentDeck = [{ w: "Error", p: "/.../", t: "Створіть words.json", loaded: true }];
  }

  await renderCard();
}


// Инициализация интерфейса при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  updateModeButtonVisuals();
  setLevel(currentLevel);
});

async function renderCard() {
    stack.innerHTML = "";

    if (!currentDeck || currentDeck.length === 0) {
        stack.innerHTML = "<div style='text-align:center; padding-top:150px;'><h3>РІВЕНЬ ПРОЙДЕНО!</h3></div>";
        document.getElementById('status').innerText = `ЗАЛИШИЛОСЬ: 0`;
        return;
    }

    document.getElementById('status').innerText = `ЗАЛИШИЛОСЬ: ${currentDeck.length}`;
    
    // Этот блок теперь отрабатывает мгновенно, так как все данные уже loaded: true
    if (!currentDeck[0].loaded) {
        stack.innerHTML = "<div style='text-align:center; padding-top:150px; color: var(--accent); font-weight:bold;'>ЗАВАНТАЖЕННЯ...</div>";
        const details = await fetchWordDetails(currentDeck[0].w);
        currentDeck[0] = { ...details, loaded: true };
        renderCard();
        return; 
    }

    const data = currentDeck[0];
    const card = document.createElement('div');
    card.className = 'card';
    card.style.touchAction = 'none'; 
    
    card.innerHTML = `
        <button class="audio-btn" onclick="event.stopPropagation(); speak('${data.w.replace(/'/g, "\\'")}')">
            <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
        </button>
        <div class="word">${data.w}</div>
        <div class="phonetic">${data.p}</div>
        <div class="translation">${data.t}</div>
    `;
    
    card.addEventListener('pointerdown', startDrag);
    stack.appendChild(card);
}

// Обновленная функция озвучки с поддержкой будущих языков
function speak(text) {
    window.speechSynthesis.cancel();
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = (currentLang === "german") ? 'de-DE' : 'en-US';
    window.speechSynthesis.speak(ut);
}

function startDrag(e) {
    const card = e.currentTarget;
    let startX = e.clientX;
    let startY = e.clientY;
    let isDragging = false;

    const move = (me) => {
        let dx = me.clientX - startX;
        let dy = me.clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDragging = true;
        }

        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 25}deg)`;

        Object.values(zones).forEach(z => z.classList.remove('active-learned', 'active-review', 'active-deferred'));

        if (dx > 130) {
            zones.R.classList.add('active-learned');
        } else if (dx < -130) {
            zones.L.classList.add('active-deferred');
        } else if (dy < -130) {
            zones.T.classList.add('active-review');
        }
    };

    const up = (ue) => {
        let dx = ue.clientX - startX;
        let dy = ue.clientY - startY;

        if (!isDragging) {
            card.classList.toggle('show-translation');
            card.style.transform = '';
        } else {
            if (dx > 160) {
                finalize(card, 1200, dy, 'next');
            } else if (dx < -160) {
                finalize(card, -1200, dy, 'next');
            } else if (dy < -160) {
                finalize(card, dx, -1200, 'repeat');
            } else {
                card.style.transform = '';
            }
        }

        Object.values(zones).forEach(z => z.classList.remove('active-learned', 'active-review', 'active-deferred'));
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
}

function finalize(card, x, y, action) {
    card.style.transition = '0.5s cubic-bezier(0.23, 1, 0.32, 1)';
    card.style.transform = `translate(${x}px, ${y}px) rotate(${x / 10}deg)`;
    card.style.opacity = '0';

    const word = currentDeck.shift();

    if (action === 'repeat' && word) {
        currentDeck.splice(4, 0, word);
    }

    // === КРОК 3: Зберігаємо оновлений стан колоди в постійну пам'ять браузера ===
    localStorage.setItem('decksState', JSON.stringify(decksState));

    setTimeout(renderCard, 400);
}


// Запуск стартового уровня при первой загрузке страницы
setLevel('C1');

function resetProgress() {
    // Показуємо вікно підтвердження, щоб користувач не скинув прогрес випадковим кліком
    const confirmReset = confirm("Ви впевнені, що хочете повністю скинути весь прогрес навчання на всіх рівнях?");
    
    if (confirmReset) {
        // Очищаємо збережені колоди з localStorage
        localStorage.removeItem('decksState');
        
        // Також можна скинути поточний рівень на початковий 'A1'
        localStorage.setItem('currentLevel', 'A1');
        
        // Перезавантажуємо сторінку, щоб додаток повністю оновився з чистого аркуша
        window.location.reload();
    }
}
