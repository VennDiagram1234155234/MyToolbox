/**
 * @fileoverview Main controller for code files ingestion, validation, and browser-driven PDF generation.
 */

// --- Global DOM Elements Subsystem ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const mergeModeCheckbox = document.getElementById('mergeModeCheckbox');
const aiPrompt = document.getElementById('aiPrompt'); 
const savePromptBtn = document.getElementById('savePromptBtn');
const promptsLibraryList = document.getElementById('promptsLibraryList');

/**
 * Runtime cache array acting as a data buffer to hold processed file structures.
 * @global
 * @type {Array<{name: string, extension: string, text: string}>}
 */
let currentFilesData = []; 

// Клик по зоне (но мимо ссылки) открывает только файлы
dropZone.addEventListener('click', function(e) {
  if (!e.target.closest('#folderSelectLink')) {
    fileInput.click();
  }
});

// Клик по золотой ссылке открывает строго выбор папки
document.getElementById('folderSelectLink').addEventListener('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('folderInput').click();
});

// Вешаем обработчик на новый инпут папок
document.getElementById('folderInput').addEventListener('change', (e) => {
  handleFiles(e.target.files);
});


// --- Handle file drag actions to toggle visual states ---
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.background = '#29292e';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.background = '#202024';
});

// --- Capture dropped files array ---
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = '#202024';
    handleFiles(e.dataTransfer.files);
});

// --- Handle standard file picker selection event ---
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

/**
 * Validates file extensions, tracks asynchronous read states, and routes datasets to layout engines.
 * 
 * @function handleFiles
 * @param {FileList} files - Native file collection object containing manual uploads.
 * @returns {void} This function modifies session arrays and updates DOM properties directly.
 */
function handleFiles(files) {
  if (!files || files.length === 0) return;

  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  status.innerText = `Обработка данных...`;

  let filesProcessed = 0;
  const isMergeMode = mergeModeCheckbox.checked;
  let itemsToProcess = [];

  // Рекурсивний обхід папок з розумним фільтром сміття
  async function traverseFileTree(item, path = "") {
    // Список папок та файлів, які потрібно повністю ігнорувати
    const blacklist = [
      '.git', '.dart_tool', 'build', 'node_modules', '.idea', 
      '.vscode', 'bin', 'obj', '.DS_Store', 'thumbs.db'
    ];

    // Якщо назва елемента є у чорному списку — виходимо
    if (blacklist.includes(item.name)) return;

    if (item.isFile) {
      const file = await new Promise((resolve) => item.file(resolve));
      file.customPath = path + file.name;
      itemsToProcess.push(file);
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const entries = await new Promise((resolve) => {
        dirReader.readEntries(resolve);
      });
      for (const entry of entries) {
        await traverseFileTree(entry, path + item.name + "/");
      }
    }
  }


  // Главный асинхронный обработчик входящих данных
  (async () => {
    // 1. Проверяем, был ли это Drag-and-Drop папки/файлов
    if (window.event && window.event.type === 'drop' && window.event.dataTransfer && window.event.dataTransfer.items) {
      const items = window.event.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) await traverseFileTree(item);
      }
    } else {
      // 2. Стандартний вибір через провідник (файли або папка)
      const blacklist = ['.git', '.dart_tool', 'build', 'node_modules', '.idea', '.vscode', 'bin', 'obj', '.DS_Store', 'thumbs.db'];

      Array.from(files).forEach(file => {
        file.customPath = file.webkitRelativePath || file.name;

        // Розбиваємо шлях на частини, щоб перевірити, чи немає сміттєвих папок всередині шляху
        const pathParts = file.customPath.split('/');
        const hasBlacklistedPart = pathParts.some(part => blacklist.includes(part));

        if (!hasBlacklistedPart) {
          itemsToProcess.push(file);
        }
      });
    }


    const totalFiles = itemsToProcess.length;
    if (totalFiles === 0) {
      finishProcessing();
      return;
    }

    let mergedTextData = [];
    currentFilesData = [];

    itemsToProcess.forEach(file => {
      const extension = file.name.split('.').pop().toLowerCase();

      if (!['html', 'css', 'js', 'json', 'py', 'dart', 'pdf'].includes(extension)) {
        filesProcessed++;
        if (filesProcessed === totalFiles) isMergeMode ? processMergedPdf(mergedTextData) : finishProcessing();
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const resultData = e.target.result;

        const fileStructure = { 
          name: file.name, 
          path: file.customPath, 
          extension: extension, 
          text: extension === 'pdf' ? resultData : resultData // Передаем данные (текст или base64)
        };

        currentFilesData.push(fileStructure);
        mergedTextData.push(fileStructure);

        if (!isMergeMode) {
          if (extension === 'pdf') {
            // Одиночные PDF просто открываем в новом окне для печати
            const win = window.open(resultData);
            if (win) win.print();
          } else {
            printTextAsPdf(resultData, file.name);
          }
        }

        filesProcessed++;
        const percent = Math.round((filesProcessed / totalFiles) * 100);
        progressBar.style.width = `${percent}%`;
        status.innerText = `Обработка файлов (${filesProcessed} из ${totalFiles})...`;

        if (filesProcessed === totalFiles) {
          if (isMergeMode) {
            processMergedPdf(mergedTextData);
          } else {
            finishProcessing();
          }
        }
      };

      // PDF читаем как Base64 (DataURL), код — как обычный текст
      if (extension === 'pdf') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  })();
}

/**
 * Processes, validates, and packages multiple code assets into a single cohesive layout structure for PDF printing.
 * Includes dynamic injection of structural text guidelines configured for external AI grading audits.
 * 
 * @function processMergedPdf
 * @param {Array<{name: string, text: string}>} filesArray - Collection holding targeted filenames and source code strings.
 * @returns {void} Generates background runtime variables and manipulates DOM properties directly.
 */
function processMergedPdf(filesArray) {
    status.innerText = "Генерація спільного PDF...";

    // Сортування файлів за їхніми повними шляхами для збереження структури папок
    filesArray.sort((a, b) => a.path.localeCompare(b.path));

    let numberedCodeHtml = '';

    // --- Побудова візуального дерева папок та файлів для першої сторінки ---
    let treeHtml = `<div class="folder-tree-title">📁 СТРУКТУРА ПРОЄКТУ (ДЕРЕВО КАТАЛОГІВ):</div><div class="tree-container">`;
    let openFolders = [];

    filesArray.forEach(fileObj => {
        const parts = fileObj.path.split('/');
        const fileName = parts.pop(); // Витягуємо назву файлу

        // Аналізуємо папки в шляху файлу
        parts.forEach((part, index) => {
        if (openFolders[index] !== part) {
            // Якщо папка змінилась, закриваємо старі вкладеності та відкриваємо нову
            openFolders = openFolders.slice(0, index);
            const indent = '&nbsp;'.repeat(index * 4);
            treeHtml += `<div class="tree-line folder-node">${indent}📁 <b>${part}/</b></div>`;
            openFolders[index] = part;
        }
        });

        // Додаємо сам файл у дерево з правильним відступом
        const fileIndent = '&nbsp;'.repeat(parts.length * 4);
        treeHtml += `<div class="tree-line file-node">${fileIndent}📄 ${fileName}</div>`;
    });
    treeHtml += `</div><div style="page-break-after: always;"></div>`;

    // Інструкція для ІИ (якщо є)
    const promptValue = aiPrompt.value.trim();
    let aiInstructionsHtml = '';

    if (promptValue) {
        aiInstructionsHtml = `
        <div class="ai-instruction-box">
        <div class="ai-instruction-title">🤖 ИНСТРУКЦИЯ И КРИТЕРИИ ДЛЯ ПРОВЕРКИ ИИ:</div>
        <div class="ai-instruction-text">${promptValue.replace(/\n/g, '<br>')}</div>
        </div>
        <div style="page-break-after: always;"></div>
        `;
    }

    // Генерація контенту з кодом та PDF-файлами
    filesArray.forEach(fileObj => {
        if (fileObj.extension === 'pdf') {
        numberedCodeHtml += `
            <div class="file-header">📄 Файл (PDF-документ): ${fileObj.path}</div>
            <div class="pdf-embed-container">
            <iframe src="${fileObj.text}" type="application/pdf" class="pdf-embed-frame"></iframe>
            </div>
            <div style="page-break-after: always;"></div>
        `;
        } else {
        numberedCodeHtml += `<div class="file-header">📄 Файл: ${fileObj.path}</div>`;

        let fileLineNumber = 1;
        const lines = fileObj.text.split(/\r?\n/);

        lines.forEach(line => {
            const safeLine = line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

            numberedCodeHtml += `<div class="code-row"><span class="line-number">${fileLineNumber}</span><span class="code-text">${safeLine || ' '}</span></div>`;
            fileLineNumber++;
        });
        }
    });

    // Capture backup tracking titles to enable post-print system state restoration loops
    const originalTitle = document.title;
    document.title = "merged_code";

    // Instantiate hidden sandboxed iframe infrastructure intended to handle isolated printing triggers
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    
    doc.open();
    // --- Write layout structures and custom print sheets into the sandboxed frame document ---
    doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>merged_code</title>
        <style>
            @page { size: auto; margin: 0mm; }
            body { margin: 20mm; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; }
            .ai-instruction-box { font-family: Arial, sans-serif; border: 2px dashed #007acc; background: #f4f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
            .ai-instruction-title { font-weight: bold; color: #007acc; font-size: 13px; margin-bottom: 8px; }
            .ai-instruction-text { font-size: 12px; color: #333; line-height: 1.5; white-space: pre-wrap; }
            .file-header { margin-top: 25px; margin-bottom: 15px; padding: 6px 10px; background: #eef2f7; border-left: 4px solid #007acc; font-family: Arial, sans-serif; font-weight: bold; font-size: 13px; color: #222; page-break-after: avoid; }
            .code-row { display: flex; align-items: flex-start; line-height: 1.4; }
            .folder-tree-title { font-family: Arial, sans-serif; font-weight: bold; font-size: 14px; color: #111; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .tree-container { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #333; line-height: 1.6; background: #fafafa; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
            .tree-line { white-space: nowrap; }
            .folder-node { color: #007acc; }
            .file-node { color: #222; }
            .line-number { width: 40px; color: #757575; text-align: right; padding-right: 12px; user-select: none; border-right: 1px solid #e0e0e0; margin-right: 12px; }
            .code-text { white-space: pre-wrap; word-wrap: break-word; flex: 1; }
            @media print { html, body { background: #fff; color: #000; } }
            .pdf-embed-container { width: 100%; height: 1120px; margin-bottom: 20px; }
            .pdf-embed-frame { width: 100%; height: 100%; border: none; }
            @media print { .pdf-embed-frame { width: 100%; height: 100%; } }
        </style>
    </head>
    <body>
        ${aiInstructionsHtml}
        ${treeHtml}
        <div>${numberedCodeHtml}</div>
    </body>
    </html>
    `);
    doc.close();

    // --- Focus iframe container context and invoke native system layout print views ---
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Restore previous tracking data descriptors
        document.title = originalTitle;
        finishProcessing();
        
        // Asynchronously garbage collect temporary iframe node objects after usage cooldown
        setTimeout(() => document.body.removeChild(iframe), 60000);
    }, 50);
}

/**
 * Resets process-tracking elements and resets structural progress bar layouts back to zero boundaries.
 * 
 * @function finishProcessing
 * @returns {void} Shifts structural layout fields inside the DOM interface directly.
 */
function finishProcessing() {
    status.innerText = "Готово! Файли оброблені.";
    setTimeout(() => {
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
    }, 2000);
}

/**
 * Spawns an isolated sandbox frame container to compile and print an individual target code source asset.
 * 
 * @function printTextAsPdf
 * @param {string} text - Raw string text source parsed out of target file upload arrays.
 * @param {string} originalName - Baseline code identifier label utilized for renaming workflows.
 * @returns {void} Overrides runtime variables and communicates with system queues directly.
 */
function printTextAsPdf(text, originalName) {
    const originalTitle = document.title;
    const newFileName = originalName.replace(/\./g, "_");
    document.title = newFileName;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    
    // --- Extract and parse AI validation guidelines configured in the text field ---
    const promptValue = aiPrompt.value.trim();
    let aiInstructionsHtml = '';
    if (promptValue) {
        aiInstructionsHtml = `
        <div class="ai-instruction-box">
            <div class="ai-instruction-title">🤖 ИНСТРУКЦИЯ И КРИТЕРИИ ДЛЯ ПРОВЕРКИ ИИ:</div>
            <div class="ai-instruction-text">${promptValue.replace(/\n/g, '<br>')}</div>
        </div>
        <div style="page-break-after: always;"></div>
        `;
    }

    const codeLines = text.split(/\r?\n/);
    let numberedCodeHtml = '';
    
    // --- Loop through code strings to apply row indexing and escape HTML layout characters ---
    codeLines.forEach((line, index) => {
        const safeLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const lineNumber = index + 1;
        numberedCodeHtml += `<div class="code-row"><span class="line-number">${lineNumber}</span><span class="code-text">${safeLine || ' '}</span></div>`;
    });

    // --- Build isolated standalone document template structure ---
    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>${newFileName}</title>
        <style>
            @page { size: auto; margin: 0mm; }
            body { margin: 20mm; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; }
            .ai-instruction-box { font-family: Arial, sans-serif; border: 2px dashed #007acc; background: #f4f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
            .ai-instruction-title { font-weight: bold; color: #007acc; font-size: 13px; margin-bottom: 8px; }
            .ai-instruction-text { font-size: 12px; color: #333; line-height: 1.5; white-space: pre-wrap; }
            .code-row { display: flex; align-items: flex-start; line-height: 1.4; }
            .line-number { width: 35px; color: #757575; text-align: right; padding-right: 12px; user-select: none; border-right: 1px solid #e0e0e0; margin-right: 12px; }
            .code-text { white-space: pre-wrap; word-wrap: break-word; flex: 1; }
            @media print { html, body { background: #fff; color: #000; } }
        </style>
    </head>
    <body>
        ${aiInstructionsHtml}
        <div>${numberedCodeHtml}</div>
    </body>
    </html>
    `);
    doc.close();

    // --- Execute standalone system print triggers and schedule frame node garbage collection ---
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        document.title = originalTitle;
        finishProcessing();
        setTimeout(() => document.body.removeChild(iframe), 60000);
    }, 50);
}

// --- Local Prompt Notepad Interface Elements ---
const toggleLibraryBtn = document.getElementById('toggleLibraryBtn');
let isLibraryOpen = false;

// --- Initialize saved layouts and sync cache state indicators upon DOM loading ---
document.addEventListener("DOMContentLoaded", () => {
    renderPromptsLibrary();
    if (localStorage.getItem("current_draft_prompt")) {
        aiPrompt.value = localStorage.getItem("current_draft_prompt");
    }
});

// --- Periodically persist pending field draft text updates directly into LocalStorage ---
aiPrompt.addEventListener("input", () => {
    localStorage.setItem("current_draft_prompt", aiPrompt.value);
});

// --- Dynamic action trigger configuration for toggling prompt library interface layouts ---
toggleLibraryBtn.addEventListener('click', () => {
    isLibraryOpen = !isLibraryOpen;
    
    if (isLibraryOpen) {
        promptsLibraryList.style.setProperty('display', 'block', 'important');
        toggleLibraryBtn.innerText = "✕ Закрити бібліотеку";
        toggleLibraryBtn.style.color = "#ef4444";
        toggleLibraryBtn.style.borderColor = "#ef4444";
    } else {
        promptsLibraryList.style.setProperty('display', 'none', 'important');
        toggleLibraryBtn.innerText = "📋 Переглянути збережені промпти";
        toggleLibraryBtn.style.color = "#00b0ff";
        toggleLibraryBtn.style.borderColor = "#00b0ff";
    }
});

// --- Event handler to save the current text as a new prompt to the notepad library ---
savePromptBtn.addEventListener('click', () => {
    const textToSave = aiPrompt.value.trim();
    if (!textToSave) {
        alert("Спочатку напишіть текст промпту в полі!");
        return;
    }

    const title = prompt("Введіть коротку назву для цього промпту:");
    if (!title) return;

    const library = JSON.parse(localStorage.getItem('ai_prompts_notepad') || '[]');
    library.push({
        id: 'prompt_' + Date.now(),
        title: title,
        text: textToSave
    });

    localStorage.setItem('ai_prompts_notepad', JSON.stringify(library));
    aiPrompt.value = '';
    localStorage.removeItem("current_draft_prompt");
    renderPromptsLibrary();
    
    // Automatically open the library container view to display the newly saved card item
    isLibraryOpen = true;
    promptsLibraryList.style.setProperty('display', 'block', 'important');
    toggleLibraryBtn.innerText = "✕ Закрити бібліотеку";
    toggleLibraryBtn.style.color = "#ef4444";
    toggleLibraryBtn.style.borderColor = "#ef4444";
});

/**
 * Re-reads persistent storage arrays to dynamically construct, bind events, and render active prompt cards.
 * 
 * @function renderPromptsLibrary
 * @returns {void} Direct-mutates layout element trees; does not return a structural value.
 */
function renderPromptsLibrary() {
    if (!promptsLibraryList) return;
    promptsLibraryList.innerHTML = '';
    
    // Check for existing records; if absent or empty, programmatically inject default system presets
    const currentData = localStorage.getItem('ai_prompts_notepad');
    if (!currentData || JSON.parse(currentData).length === 0) {
        const defaultPrompts = [
            {
                id: 'prompt_default_1',
                title: '📊 Оцінка роботи (1-12 балів)',
                text: 'РОЛЬ: Професор кафедри програмування.\nЗАВДАННЯ: Перевір цю лабораторну роботу студента. Знайди помилки у логіці, оціни чистоту коду, дотримання стандартів і виведи фінальну оцінку за 12-бальною шкалою (від 1 до 12).'
            },
            {
                id: 'prompt_default_2',
                title: '🔍 Повний аудит коду',
                text: 'РОЛЬ: Старший викладач, Code Reviewer.\nЗАВДАННЯ: Проведи розгорнутий аналіз архітектури коду. Знайди критичні вразливості, неоптимальні цикли чи витоки пам\'яті. Напиши коротку рецензію для викладацької відомості.'
            }
        ];
        localStorage.setItem('ai_prompts_notepad', JSON.stringify(defaultPrompts));
    }

    // Pull the active updated snapshot list out of local system cache bounds
    const library = JSON.parse(localStorage.getItem('ai_prompts_notepad') || '[]');

    if (library.length === 0) {
        promptsLibraryList.innerHTML = '<div style="font-size: 12px; color: #8a99ad; text-align: center; padding: 5px;">Блокнот порожній. Збережіть новий промпт!</div>';
        return;
    }

    // Generate specific card frame templates for each active prompt item
    library.forEach(item => {
        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.padding = '10px 0';
        card.style.borderBottom = '1px solid #262f3d';
        card.style.boxSizing = 'border-box';

        card.innerHTML = `
        <div style="text-align: left; max-width: 55%; overflow: hidden;">
            <div style="font-size: 13px; font-weight: bold; color: #ffb000; margin-bottom: 3px;">📌 ${item.title}</div>
            <div style="font-size: 11px; color: #8a99ad; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.text}</div>
        </div>
        <div style="display: flex; gap: 6px;">
            <button class="prompt-quick-btn copy-action" data-id="${item.id}" style="padding: 6px 10px; font-size: 11px;">📋 Копіювати</button>
            <button class="prompt-quick-btn edit-action" data-id="${item.id}" style="padding: 6px 10px; font-size: 11px; border-color: #00b0ff; color: #00b0ff;">✏️ Редагувати</button>
            <button class="prompt-quick-btn delete-action" data-id="${item.id}" style="padding: 6px 10px; font-size: 11px; border-color: #ef4444; color: #ef4444;">❌ Видалити</button>
        </div>
        `;
        promptsLibraryList.appendChild(card);
    });

    // --- Attach dynamic event listener actions to copy prompt text data to clipboard ---
    promptsLibraryList.querySelectorAll('.copy-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const targetItem = library.find(i => i.id === id);
            if (targetItem) {
                navigator.clipboard.writeText(targetItem.text).then(() => {
                    const oldText = e.target.innerText;
                    e.target.innerText = "✓ Скопійовано";
                    setTimeout(() => e.target.innerText = oldText, 1500);
                });
            }
        });
    });

    // --- Attach interactive action hooks to return prompt text back to input field for editing ---
    promptsLibraryList.querySelectorAll('.edit-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const targetItem = library.find(i => i.id === id);
            if (targetItem) {
                aiPrompt.value = targetItem.text;
                localStorage.setItem("current_draft_prompt", targetItem.text);
                
                // Remove the old entry from collection storage arrays to allow overwriting on resave
                const updatedLibrary = library.filter(i => i.id !== id);
                localStorage.setItem('ai_prompts_notepad', JSON.stringify(updatedLibrary));
                
                renderPromptsLibrary();
                aiPrompt.focus();
            }
        });
    });

    // --- Attach system verification popups to permanently erase custom saved elements ---
    promptsLibraryList.querySelectorAll('.delete-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.delete-action');
            const id = button.getAttribute('data-id');
            if (confirm("Вилучити цей промпт з блокноту?")) {
                const updatedLibrary = library.filter(i => i.id !== id);
                localStorage.setItem('ai_prompts_notepad', JSON.stringify(updatedLibrary));
                renderPromptsLibrary();
            }
        });
    });
}
