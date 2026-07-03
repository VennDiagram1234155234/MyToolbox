const fileInput = document.getElementById('file-input');
const uploadText = document.getElementById('upload-text');
const statsBlock = document.getElementById('stats-block');
const errorBlock = document.getElementById('error-block');
const downloadBtn = document.getElementById('download-btn');

let processedJSON = null;
let originalFileName = 'dictionary_fixed.json';

fileInput.addEventListener('change', handleFile);

function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    originalFileName = file.name.replace('.json', '_fixed.json');
    uploadText.innerText = `Выбран файл: ${file.name}`;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const json = JSON.parse(event.target.result);
            processDictionary(json);
        } catch (err) {
            showError("Ошибка чтения файла: Неверный формат JSON.");
        }
    };
    reader.readAsText(file);
}

function processDictionary(data) {
    hideError();
    let totalBefore = 0;
    let totalAfter = 0;

    const seenWords = new Set();
    const deletedLog = []; // Массив для хранения истории удалений

    // Измененная функция очистки, теперь она принимает имя текущего уровня (категории)
    function cleanArray(arr, levelName = "По умолчанию") {
        if (!Array.isArray(arr)) return arr;
        totalBefore += arr.length;

        const filtered = arr.filter(item => {
            if (!item.w) return true;

            const wordKey = item.w.toLowerCase().trim();
            
            if (seenWords.has(wordKey)) {
                // Запоминаем данные об удаляемом дубликате
                deletedLog.push({
                    word: item.w,
                    translation: item.t || "нет перевода",
                    level: levelName
                });
                return false; 
            } else {
                seenWords.add(wordKey); 
                return true; 
            }
        });

        totalAfter += filtered.length;
        return filtered;
    }

    // Проходим по структуре и передаем имя ключа (A1, A2...) в функцию очистки
    if (data.english) {
        for (const level in data.english) {
            if (Array.isArray(data.english[level])) {
                data.english[level] = cleanArray(data.english[level], level);
            }
        }
    } else if (Array.isArray(data)) {
        data = cleanArray(data);
    } else {
        for (const key in data) {
            if (Array.isArray(data[key])) {
                data[key] = cleanArray(data[key], key);
            }
        }
    }

    if (totalBefore === 0) {
        showError("В файле не найдено массивов со словами для очистки.");
        return;
    }

    // Выводим цифры статистики
    document.getElementById('total-before').innerText = totalBefore;
    document.getElementById('total-after').innerText = totalAfter;
    document.getElementById('total-deleted').innerText = totalBefore - totalAfter;
    
    // Рендерим список удаленных слов
    const logContainer = document.getElementById('deleted-words-container');
    const logList = document.getElementById('deleted-words-list');
    
    if (deletedLog.length > 0) {
        logList.innerHTML = deletedLog.map(item => 
            `<div style="margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px dashed #f0f2f5;">
                [Уровень: <b>${item.level}</b>] 
                <span style="color: #e74c3c; font-weight: bold;">${item.word}</span> 
                — ${item.translation}
             </div>`
        ).join('');
        logContainer.style.display = 'block';
    } else {
        logList.innerHTML = '<div style="color: #909399;">Повторяющихся слов не обнаружено.</div>';
        logContainer.style.display = 'block';
    }

    statsBlock.style.display = 'block';
    downloadBtn.style.display = 'block';

    processedJSON = data;
}


// Замените существующий обработчик клика downloadBtn на этот код:
downloadBtn.addEventListener('click', () => {
    if (!processedJSON) return;
    
    // Кастомный сборщик JSON для красивого форматирования слов в одну строку
    let customJson = "{\n  \"english\": {\n";
    
    const levels = Object.keys(processedJSON.english);
    
    levels.forEach((level, levelIdx) => {
        customJson += `    "${level}": [\n`;
        
        const words = processedJSON.english[level];
        words.forEach((item, itemIdx) => {
            // Собираем объект слова в одну строчку
            const wordStr = JSON.stringify(item); 
            
            // Добавляем запятую, если это не последнее слово в массиве уровня
            const comma = (itemIdx < words.length - 1) ? "," : "";
            
            customJson += `      ${wordStr}${comma}\n`;
        });
        
        // Добавляем запятую между блоками уровней (A1, A2...)
        const levelComma = (levelIdx < levels.length - 1) ? "," : "";
        customJson += `    ]${levelComma}\n`;
    });
    
    customJson += "  }\n}";

    // Скачивание сформированного файла
    const blob = new Blob([customJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});


function showError(text) {
    errorBlock.innerText = text;
    errorBlock.style.display = 'block';
    statsBlock.style.display = 'none';
    downloadBtn.style.display = 'none';
}

function hideError() {
    errorBlock.style.display = 'none';
}