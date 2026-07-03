// Состояние онлайн-режима (по умолчанию false)
let isOnlineMode = localStorage.getItem('isOnlineMode_traces') === 'true';
const n8nWebhookUrl = "https://vennerkurh.app.n8n.cloud/webhook/2d4f1b30-8ace-48db-bfe5-af0034d701ba";

// Функции управления режимом
function toggleMode() {
    isOnlineMode = !isOnlineMode;
    localStorage.setItem('isOnlineMode_traces', isOnlineMode);
    updateModeButtonVisuals();
}

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

// Запуск визуала при старте
document.addEventListener("DOMContentLoaded", () => {
    updateModeButtonVisuals();
});


const AI_MARKERS = [
    // Скрытые цифровые водяные знаки ИИ (Фиолетовый цвет подсветки)
    { regex: /[\u200B\u200C\u200D\uFEFF\u200E\u200F]/g, label: 'Скрытый водяной знак: Невидимые символы (Zero-Width Characters)', className: 'hl-watermark' },
    { regex: /\u00AD/g, label: 'Скрытый водяной знак: Мягкие переносы генератора (Soft Hyphen)', className: 'hl-watermark' },

    // Стандартные текстовые штампы ИИ (Красный цвет подсветки)
    { regex: /важно отметить|важливо зазначити|it is important to note/i, label: 'Штамп ИИ: Важно отметить / Важливо зазначити', className: 'hl-stamp' },
    { regex: /в заключение|на закінчення|підсумовуючи|in conclusion/i, label: 'Финал ИИ: В заключение / На закінчення', className: 'hl-stamp' },
    { regex: /таким образом|таким чином|thus|therefore/i, label: 'Вводное слово ИИ: Таким образом / Таким чином', className: 'hl-stamp' },
    { regex: /подводя итог|підбиваючи підсумки|to sum up/i, label: 'Резюмирование ИИ: Подводя итог / Підбиваючи підсумки', className: 'hl-stamp' },
    { regex: /с одной стороны|з одного боку|on the one hand/i, label: 'Шаблон баланса ИИ: С одной стороны / З одного боку', className: 'hl-stamp' },
    { regex: /с другой стороны|з іншого боку|on the other hand/i, label: 'Шаблон баланса ИИ: С другой стороны / З іншого боку', className: 'hl-stamp' },
    { regex: /стоит заметить|варто зауважити|it is worth noting/i, label: 'Клише ИИ: Стоит заметить / Варто зауважити', className: 'hl-stamp' },
    { regex: /несомненно|безсумнівно|undoubtedly/i, label: 'Штамп уверенности ИИ: Несомненно / Безсумнівно', className: 'hl-stamp' },
    { regex: /в современном мире|у сучасному світі|in today's world/i, label: 'Введение ИИ: В современном мире / У сучасному світі', className: 'hl-stamp' },
    { regex: /в данной статье|у цій статті|in this article/i, label: 'Канцеляризм ИИ: В данной статье / У цій статті', className: 'hl-stamp' },
    { regex: /рассмотрим далее|розглянемо далі|let's look further/i, label: 'Переход ИИ: Рассмотрим далее / Розглянемо далі', className: 'hl-stamp' },
    { regex: /ключевую роль|ключову роль|a key role/i, label: 'Оборот ИИ: Ключевую роль / Ключову роль', className: 'hl-stamp' },
    { regex: /неотъемлемой частью|невід'ємною частиною|an integral part/i, label: 'ИИ-клише: Неотъемлемая часть / Невід\'ємна частина', className: 'hl-stamp' },
    { regex: /важные примечания|важливі примітки|important notes/i, label: 'Структурный маркер ИИ: Важные примечания', className: 'hl-stamp' },
    { regex: /пример для практического|приклад для практичного/i, label: 'Шаблон генерации примеров ИИ', className: 'hl-stamp' },
    { regex: /основные принципы|основні принципи|основные положения/i, label: 'Канцелярское введение ИИ', className: 'hl-stamp' },
    { regex: /грейс-период|грейс-період/i, label: 'Специфический термин (грейс-период)', className: 'hl-stamp' },
    { regex: /[•]/g, label: 'Артефакт разметки списков ИИ (буллиты ШИ)', className: 'hl-stamp' },

    // Маркеры Google Gemini (Синий цвет подсветки)
    { regex: /примечательно, что|примітно, що/i, label: 'Фирменный штамп Google Gemini ("Примечательно, что")', className: 'hl-gemini' },
    { regex: /стоит подчеркнуть|варто підкреслити/i, label: 'Оборот Gemini ("Стоит подчеркнуть")', className: 'hl-gemini' },
    { regex: /в сухом остатке|у сухому залишку/i, label: 'Разговорный маркер Gemini ("В сухом остатке")', className: 'hl-gemini' },
    { regex: /давайте разберем|давайте розберемо/i, label: 'Инструкторский тон ИИ ("Давайте разберем")', className: 'hl-gemini' },

    // Маркеры ИИ-кода (Зеленый цвет подсветки)
    { regex: /randomInt\(\s*\d*00\s*,\s*\d*00\s*\)/i, label: 'ИИ-диапазон чисел (круглые сотни)', className: 'hl-code' },
    { regex: /`[a-zA-Z0-9_-]+`/, label: 'Стерильная ИИ-строка (шаблонные бэктэки)', className: 'hl-code' },
    { regex: /\/\/\s*(Получаем|Проверяем|Функция для|Элементы интерфейса|Отримуємо|Перевіряємо)/i, label: 'Учебный комментарий ИИ к коду', className: 'hl-code' },
    { regex: /[a-zA-Z0-9]+(Definition|Configuration|Manager|Handler|Helper)\b/, label: 'Академическое название ИИ-функции', className: 'hl-code' },

    // Маркеры разбора ТЗ и списков (Желтый цвет подсветки)
    { regex: /📌\s*(Самое главное|Найголовніше)/i, label: 'Выделение сути от ИИ ("📌 Самое главное")', className: 'hl-tz' },
    { regex: /~\d+/i, label: 'Техническая оценка ИИ с тильдой ("~50-80")', className: 'hl-tz' },
    { regex: /(архитектура|структура) вже дуже (вдала|хороша)/i, label: 'Шаблонный комплимент ИИ (укр)', className: 'hl-tz' },
    { regex: /(архитектура|структура) уже очень (удачная|хорошая)/i, label: 'Шаблонный комплимент ИИ (рус)', className: 'hl-tz' }
];




// Переменная для ИИ детектора
let aiPipeline = null;

// Получаем элементы интерфейса
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const textInput = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsDiv = document.getElementById('results');
const aiScoreSpan = document.getElementById('aiScore');
const markerCountSpan = document.getElementById('markerCount');
const markerList = document.getElementById('markerList');

// Клик по зоне открывает выбор файла
if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]); // Передаем конкретный файл [0]
        }
    });

    // Drag and Drop события
    dropZone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        dropZone.style.background = '#d5dbdb'; 
    });

    dropZone.addEventListener('dragleave', () => { 
        dropZone.style.background = '#ecf0f1'; 
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = '#ecf0f1';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]); // Передаем конкретный файл [0]
        }
    });
}

async function handleFile(file) {
    if (!file) return;
    try {
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.txt')) {
            const text = await file.text();
            textInput.value = text;
        } else if (fileName.endsWith('.pdf')) {
            // Настраиваем путь к локальному воркеру ядра PDF
            pdfjsLib.GlobalWorkerOptions.workerSrc = './build/pdf.worker.mjs';
            
            textInput.value = "Читаю локальный PDF файл, подождите...";
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let extractedText = "";
            
            // Постранично вытаскиваем текст из PDF
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                extractedText += content.items.map(item => item.str).join(" ") + "\n";
            }
            
            textInput.value = extractedText.trim();
        } else {
            alert("Поддерживаются только локальные файлы .txt и .pdf");
        }
    } catch (err) {
        console.error("Ошибка при чтении файла:", err);
        alert("Не удалось прочитать файл. Убедитесь, что в PDF есть текст, а не просто картинка/скан.");
        textInput.value = "";
    }
}


// Кнопка анализа текста
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
        let text = textInput.value.trim();
        if (!text) {
            alert("Пожалуйста, введите текст или перетащите файл.");
            return;
        }

        // ЛИМИТ НА СИМВОЛЫ: Если текст длиннее 5000 символов (например, дипломная работа)
        const MAX_CHARS = 5000;
        if (isOnlineMode && text.length > MAX_CHARS) {
            alert(`⚠️ Текст слишком длинный (${text.length} симв.). Для стабильной работы онлайн-ИИ текст автоматически сокращен до первых ${MAX_CHARS} символов.`);
            text = text.substring(0, MAX_CHARS);
            textInput.value = text; // Обновляем поле визуально, чтобы пользователь видел срез
        }


        // Скрываем прошлые результаты и заглушку, показываем спиннер
        const placeholder = document.getElementById('resultsPlaceholder');
        if (placeholder) placeholder.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.classList.remove('hidden');

        // --- ОНЛАЙН РЕЖИМ ЧЕРЕЗ АГЕНТА N8N ---
        if (isOnlineMode) {
            try {
                const response = await fetch(n8nWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "analyze_text_traces", // Наш Switch в n8n поймает этот экшен!
                        text: text
                    })
                });

                if (response.ok) {
                    const rawData = await response.json();
                    
                    // Ожидаем от будущей ноды n8n объект с вердиктом и массивом подсветок
                    // Структуру ответа n8n мы настроим на следующем шаге
                    aiScoreSpan.textContent = rawData.verdict || "Сканирование завершено";
                    markerCountSpan.textContent = rawData.markers_count || "0";
                    if (rawData.verdict_color) aiScoreSpan.style.color = rawData.verdict_color;

                    const highlightedTextDiv = document.getElementById('highlightedText');
                    if (highlightedTextDiv) highlightedTextDiv.innerHTML = rawData.html || text;

                    markerList.innerHTML = '';
                    if (Array.isArray(rawData.markers)) {
                        rawData.markers.forEach(m => {
                            const li = document.createElement('li');
                            li.className = m.className || 'hl-stamp';
                            li.textContent = m.text;
                            markerList.appendChild(li);
                        });
                    }
                    
                    resultsDiv.classList.remove('hidden');
                } else {
                    alert(`Ошибка сервера n8n: ${response.status}`);
                }
            } catch (e) {
                console.error("Ошибка n8n анализа:", e);
                alert("Ошибка связи с ИИ оркестратором");
            } finally {
                if (spinner) spinner.classList.add('hidden');
            }
            return; // Выходим, офлайн логику ниже выполнять не нужно
        }

        // --- ОФЛАЙН РЕЖИМ (Твой оригинальный код регулярных выражений) ---
        markerList.innerHTML = '';
        let foundMarkersCount = 0;
        let htmlHighlighted = text;
        const highlightedTextDiv = document.getElementById('highlightedText');

        AI_MARKERS.forEach(item => {
            const matches = text.match(item.regex);
            if (matches) {
                foundMarkersCount += matches.length;
                const currentClass = item.className || 'hl-stamp';
                
                const li = document.createElement('li');
                li.className = currentClass;
                li.textContent = `⚠️ Найдено: ${item.label} — ${matches.length} раз(а)`;
                markerList.appendChild(li);

                htmlHighlighted = htmlHighlighted.replace(item.regex, function(found) {
                    let visibleText = found;
                    if (currentClass === 'hl-watermark') visibleText = '[W]';
                    return '<span class="' + currentClass + '">' + visibleText + '</span>';
                });
            }
        });

        if (highlightedTextDiv) highlightedTextDiv.innerHTML = htmlHighlighted;
        markerCountSpan.textContent = foundMarkersCount;

        if (foundMarkersCount === 0) {
            aiScoreSpan.textContent = "Чистый текст (0 ИИ-маркеров)";
            aiScoreSpan.style.color = "#2ecc71";
        } else if (foundMarkersCount <= 2) {
            aiScoreSpan.textContent = "Подозрительно (низкая вероятность ИИ)";
            aiScoreSpan.style.color = "#f39c12";
        } else {
            aiScoreSpan.textContent = "Высокая вероятность ИИ (текст перенасыщен клише)";
            aiScoreSpan.style.color = "#e74c3c";
        }

        if (spinner) spinner.classList.add('hidden');
        resultsDiv.classList.remove('hidden');
    });
}

