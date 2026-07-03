/**
 * @fileoverview Grading system logic controller.
 * Manages deadline calculations, penalty evaluation, and dynamic UI state toggles.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements Initialization ---
    const checkboxes = document.querySelectorAll('.criterion-checkbox');
    const scoreDisplay = document.getElementById('total-score');
    const grade11Checkbox = document.getElementById('is-11th-grade');
    const lessonFormatSelect = document.getElementById('lesson-format');
    const resetBtn = document.getElementById('reset-btn');

    const deadlineInput = document.getElementById('deadline-date');
    const submissionInput = document.getElementById('submission-date');
    const deadlineStatus = document.getElementById('deadline-status');
    const penaltyInfo = document.getElementById('penalty-info');

    // Переменные состояния ИИ-режима
    let isAiMode = false;
    const n8nWebhookUrl = "https://n8n.cloud";

    // Функция обновления отображаемого имени файла в кастомном инпуте
    window.updateFileName = function(inputId, placeholderId) {
        const fileInput = document.getElementById(inputId);
        const placeholder = document.getElementById(placeholderId);
        
        if (fileInput.files.length === 1) {
            placeholder.innerText = `[ ${fileInput.files[0].name.toUpperCase()} ]`;
            placeholder.classList.add('active-file');
        } else if (fileInput.files.length > 1) {
            placeholder.innerText = `[ ВЫБРАНО ФАЙЛОВ: ${fileInput.files.length} ]`;
            placeholder.classList.add('active-file');
        } else {
            placeholder.innerText = inputId === 'task-file' ? '[ ВЫБРАТЬ ФАЙЛЫ ЗАДАНИЯ (МОЖНО НЕСКОЛЬКО) ]' : '[ ВЫБРАТЬ ФАЙЛЫ РАБОТЫ (МОЖНО НЕСКОЛЬКО) ]';
            placeholder.classList.remove('active-file');
        }
    };

    window.toggleGradeMode = function() {
        isAiMode = !isAiMode;
        const modeBtn = document.getElementById('mode-btn');
        const aiPanel = document.getElementById('ai-grading-panel');

        if (isAiMode) {
            modeBtn.innerText = "Режим: ИИ (Автоматический анализ)";
            modeBtn.classList.add('ai-active');
            aiPanel.classList.remove('hidden');
            aiPanel.classList.remove('disabled-layer');
            
            lessonFormatSelect.value = 'online';
            toggleFormatFields();
        } else {
            modeBtn.innerText = "Режим: Мануально";
            modeBtn.classList.remove('ai-active');
            aiPanel.classList.add('hidden');
            aiPanel.classList.add('disabled-layer');
        }
    };

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            if (!file) resolve("");
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    window.runAiGrading = async function() {
        const taskFiles = document.getElementById('task-file').files;
        const studentFiles = document.getElementById('student-file').files;
        const loadingText = document.getElementById('ai-loading');
        const verdictBox = document.getElementById('ai-verdict-box');

        if (taskFiles.length === 0 || studentFiles.length === 0) {
            alert("Пожалуйста, загрузите файлы: и в раздел Заданий, и в раздел Студенческих работ!");
            return;
        }

        loadingText.classList.remove('hidden');
        verdictBox.classList.add('hidden');

        try {
            // Циклом склеиваем пачку файлов ТЗ в один структурированный блок текста
            let combinedTaskContent = "";
            for (const file of taskFiles) {
                const content = await readFileAsText(file);
                combinedTaskContent += `\n=== START_OF_FILE: ${file.name} ===\n${content}\n=== END_OF_FILE: ${file.name} ===\n`;
            }

            // Циклом склеиваем пачку файлов решений в один структурированный блок текста
            let combinedStudentContent = "";
            for (const file of studentFiles) {
                const content = await readFileAsText(file);
                combinedStudentContent += `\n=== START_OF_FILE: ${file.name} ===\n${content}\n=== END_OF_FILE: ${file.name} ===\n`;
            }

            const response = await fetch(n8nWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "gradez_eval",
                    task: combinedTaskContent,
                    solution: combinedStudentContent
                })
            });


            if (response.ok) {
                const data = await response.json();
                
                verdictBox.innerHTML = `<h3>[ СИСТЕМНЫЙ ВЕРДИКТ ИИ ]:</h3>${data.analysis_text}`;
                verdictBox.classList.remove('hidden');

                if (data.criteria_state) {
                    document.getElementById('crit1').checked = !!data.criteria_state.crit1;
                    document.getElementById('crit3').checked = !!data.criteria_state.crit3;
                    document.getElementById('crit4').checked = !!data.criteria_state.crit4;

                    if (data.criteria_state.completeness === 1) document.getElementById('crit2_1').checked = true;
                    if (data.criteria_state.completeness === 2) document.getElementById('crit2_2').checked = true;
                    if (data.criteria_state.completeness === 3) document.getElementById('crit2_3').checked = true;
                }

                calculateScore();

            } else {
                alert(`Ошибка ИИ-сервера n8n: ${response.status}`);
            }
        } catch (err) {
            console.error(err);
            alert("Критическая ошибка отправки файлов на ИИ-анализ.");
        } finally {
            loadingText.classList.add('hidden');
        }
    };

    function toggleFormatFields() {
        const format = lessonFormatSelect.value;
        const offlineItems = document.querySelectorAll('.format-offline');

        if (format === 'offline') {
            offlineItems.forEach(item => {
                item.style.display = 'flex';
            });
        } else {
            offlineItems.forEach(item => {
                item.style.display = 'none';
                const cb = item.querySelector('input');
                if (cb) cb.checked = false;
            });
        }
        calculateScore();
    }

    function calculateScore() {
        const format = lessonFormatSelect.value;
        const isOnline = format === 'online';
        
        const penaltyRate = grade11Checkbox.checked ? 0.2 : 0.4; 

        const deadlineDate = deadlineInput.value ? new Date(deadlineInput.value) : null;
        const submissionDate = submissionInput.value ? new Date(submissionInput.value) : null;
        
        let diffDays = 0;
        if (deadlineDate && submissionDate) {
            const diffTime = submissionDate - deadlineDate;
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const gracePeriod = 3;
        const overdueDays = diffDays > gracePeriod ? diffDays - gracePeriod : 0;

        let baseScore = 0;
        if (!isOnline) {
            baseScore = 2;
        }

        checkboxes.forEach(checkbox => {
            const parentItem = checkbox.closest('.criterion-item');
            if (checkbox.checked && parentItem && parentItem.style.display !== 'none') {
                baseScore += parseInt(checkbox.getAttribute('data-points'), 10);
            }
        });

        let deadlinePenalty = 0;

        if (deadlineDate && submissionDate) {
            if (diffDays <= 0) {
                deadlineStatus.textContent = "Статус: Сдано вовремя";
                deadlineStatus.className = "status-ok";
            } else if (diffDays <= gracePeriod) {
                deadlineStatus.textContent = `Статус: Грейс-период (${diffDays} дн. просрочки)`;
                deadlineStatus.className = "status-warn";
            } else {
                deadlinePenalty = Math.floor(overdueDays * penaltyRate);
                if (deadlinePenalty < 0) deadlinePenalty = 0;
                
                deadlineStatus.textContent = `Статус: Просрочено на ${overdueDays} дн.`;
                deadlineStatus.className = "status-crit";
            }
        } else {
            deadlineStatus.textContent = "Статус: Ожидание ввода дат";
            deadlineStatus.className = "status-warn";
        }

        if (deadlinePenalty > 0) {
            penaltyInfo.textContent = `[ Снижено баллов за просрочку дедлайна: -${deadlinePenalty} ]`;
            penaltyInfo.style.display = 'block';
        } else {
            penaltyInfo.style.display = 'none';
        }

        let finalScore = baseScore;

        if (isOnline && finalScore > 0) {
            finalScore += 2;
        }

        finalScore -= deadlinePenalty;

        if (baseScore >= 4 && finalScore < 4) {
            finalScore = 4;
        } else if (finalScore < 0) {
            finalScore = 0;
        }

        if (finalScore > 12) {
            finalScore = 12;
        }

        scoreDisplay.textContent = finalScore;
    }

    // --- DOM Event Listeners Setup ---
    checkboxes.forEach(checkbox => checkbox.addEventListener('change', calculateScore));
    grade11Checkbox.addEventListener('change', calculateScore);
    lessonFormatSelect.addEventListener('change', toggleFormatFields);
    deadlineInput.addEventListener('change', calculateScore);
    submissionInput.addEventListener('change', calculateScore);

    resetBtn.addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = false);
        grade11Checkbox.checked = false;
        lessonFormatSelect.value = 'offline';
        deadlineInput.value = '';
        submissionInput.value = '';
        
        // Сбрасываем имена файлов в плейсхолдерах под мультивыбор
        document.getElementById('task-file-name').innerText = '[ ВЫБРАТЬ ФАЙЛЫ ЗАДАНИЯ (МОЖНО НЕСКОЛЬКО) ]';
        document.getElementById('task-file-name').classList.remove('active-file');
        document.getElementById('student-file-name').innerText = '[ ВЫБРАТЬ ФАЙЛЫ РАБОТЫ (МОЖНО НЕСКОЛЬКО) ]';
        document.getElementById('student-file-name').classList.remove('active-file');
        
        if(isAiMode) toggleGradeMode();
        toggleFormatFields();
    });

    toggleFormatFields();
});
