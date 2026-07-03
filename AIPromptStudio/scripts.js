let prompts = JSON.parse(localStorage.getItem('ai_prompts')) || [];
let activePromptForCopy = null;
let editModeId = null; // ID промпта, который сейчас редактируется

// Элементы DOM
const promptTitle = document.getElementById('promptTitle');
const promptText = document.getElementById('promptText');
const saveBtn = document.getElementById('saveBtn');
const promptsList = document.getElementById('promptsList');
const promptCount = document.getElementById('promptCount');
const searchBar = document.getElementById('searchBar');

const copyModal = document.getElementById('copyModal');
const modalTitle = document.getElementById('modalTitle');
const variablesContainer = document.getElementById('variablesContainer');
const modalPreview = document.getElementById('modalPreview');
const closeModalBtn = document.getElementById('closeModalBtn');
const copyBtn = document.getElementById('copyBtn');

function saveToStorage() {
    localStorage.setItem('ai_prompts', JSON.stringify(prompts));
    renderPrompts();
}

function renderPrompts() {
    const query = searchBar.value.toLowerCase();
    promptsList.innerHTML = '';
    
    const filtered = prompts.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.text.toLowerCase().includes(query)
    );

    promptCount.textContent = filtered.length;

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.innerHTML = `
            <h3>${p.title}</h3>
            <p>${p.text}</p>
            <div class="card-actions">
                <button class="btn-action-copy">КОПІЮВАТИ</button>
                <button class="btn-action-edit">РЕДАГУВАТИ</button>
                <button class="btn-action-delete">ВИДАЛИТИ</button>
            </div>
        `;

        card.querySelector('.btn-action-copy').addEventListener('click', () => openCopyModal(p));
        card.querySelector('.btn-action-edit').addEventListener('click', () => startEdit(p));
        card.querySelector('.btn-action-delete').addEventListener('click', () => deletePrompt(p.id));
        
        promptsList.appendChild(card);
    });
}

// Переключение кнопки в режим редактирования и заполнение формы
function startEdit(prompt) {
    editModeId = prompt.id;
    promptTitle.value = prompt.title;
    promptText.value = prompt.text;
    saveBtn.textContent = 'ОНОВИТИ ПРОМПТ';
    saveBtn.scrollIntoView({ behavior: 'smooth' });
}

// Событие создания или обновления
saveBtn.addEventListener('click', () => {
    const title = promptTitle.value.trim();
    const text = promptText.value.trim();

    if (!title || !text) {
        alert('Заповніть назву та текст промпту!');
        return;
    }

    if (editModeId) {
        // Режим обновления существующего промпта
        prompts = prompts.map(p => p.id === editModeId ? { ...p, title, text } : p);
        editModeId = null;
        saveBtn.textContent = 'ЗБЕРЕГТИ ПРОМПТ';
    } else {
        // Режим создания нового промпта
        const newPrompt = { id: Date.now(), title, text };
        prompts.push(newPrompt);
    }
    
    promptTitle.value = '';
    promptText.value = '';
    
    saveToStorage();
});

function deletePrompt(id) {
    if (confirm('Видалити цей промпт?')) {
        if (editModeId === id) {
            editModeId = null;
            saveBtn.textContent = 'ЗБЕРЕГТИ ПРОМПТ';
            promptTitle.value = '';
            promptText.value = '';
        }
        prompts = prompts.filter(p => p.id !== id);
        saveToStorage();
    }
}

searchBar.addEventListener('input', renderPrompts);

// Логика работы с переменными в модалке
function openCopyModal(prompt) {
    activePromptForCopy = prompt;
    modalTitle.textContent = prompt.title;
    variablesContainer.innerHTML = '';
    
    const regex = /\[(.*?)\]/g;
    let match;
    const vars = [];
    
    while ((match = regex.exec(prompt.text)) !== null) {
        if (!vars.includes(match[1])) vars.push(match[1]);
    }

    if (vars.length > 0) {
        vars.forEach(v => {
            const div = document.createElement('div');
            div.className = 'var-input-group';
            div.innerHTML = `
                <label>Замінити [${v}] на:</label>
                <input type="text" class="var-input" data-var="${v}" placeholder="Введіть значення...">
            `;
            div.querySelector('input').addEventListener('input', updatePreview);
            variablesContainer.appendChild(div);
        });
    } else {
        variablesContainer.innerHTML = '<p style="color:#64748b; font-size:12px;">Цей промпт не має динамічних змінних.</p>';
    }

    updatePreview();
    copyModal.classList.remove('hidden');
}

function updatePreview() {
    if (!activePromptForCopy) return;
    let updatedText = activePromptForCopy.text;
    const inputs = variablesContainer.querySelectorAll('.var-input');
    
    inputs.forEach(input => {
        const varName = input.getAttribute('data-var');
        const val = input.value.trim() || `[${varName}]`;
        updatedText = updatedText.split(`[${varName}]`).join(val);
    });

    modalPreview.value = updatedText;
}

closeModalBtn.addEventListener('click', () => copyModal.classList.add('hidden'));

copyBtn.addEventListener('click', () => {
    modalPreview.select();
    navigator.clipboard.writeText(modalPreview.value);
    alert('Промпт успішно скопійовано!');
    copyModal.classList.add('hidden');
});

renderPrompts();
