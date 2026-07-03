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

    /**
     * Toggles the visibility of offline-specific penalty checkboxes and headers
     * based on the currently selected lesson format (Offline vs. Online).
     * Automatically unchecks hidden options and updates the overall score.
     * 
     * @function toggleFormatFields
     * @returns {void} This function does not return a value.
     */
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

    /**
     * Calculates the final student score based on selected criteria checkboxes,
     * class type penalties, and late submission deadline tracking.
     * Implements an unbreakable minimum floor and scale constraints.
     * 
     * @function calculateScore
     * @returns {void} This function updates the DOM directly and does not return a value.
     */
    function calculateScore() {
        const format = lessonFormatSelect.value;
        const isOnline = format === 'online';
        
        // Multiplier config: 11th grade has a soft penalty (0.2), other grades have a strict penalty (0.4)
        const penaltyRate = grade11Checkbox.checked ? 0.2 : 0.4; 

        // Extract dates and convert to standard Date objects
        const deadlineDate = deadlineInput.value ? new Date(deadlineInput.value) : null;
        const submissionDate = submissionInput.value ? new Date(submissionInput.value) : null;
        
        let diffDays = 0;
        if (deadlineDate && submissionDate) {
            const diffTime = submissionDate - deadlineDate;
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Configuration rule: Fixed grace period of 3 days applies to everyone
        const gracePeriod = 3;
        const overdueDays = diffDays > gracePeriod ? diffDays - gracePeriod : 0;

        let baseScore = 0;
        
        // Context rule: Offline format awards an initial +2 points for active workspace status
        if (!isOnline) {
            baseScore = 2;
        }

        // Aggregate points strictly from visible and active checkbox/radio options
        checkboxes.forEach(checkbox => {
            const parentItem = checkbox.closest('.criterion-item');
            if (checkbox.checked && parentItem && parentItem.style.display !== 'none') {
                baseScore += parseInt(checkbox.getAttribute('data-points'), 10);
            }
        });

        let deadlinePenalty = 0;

        // Process deadline tracking status messages and mathematical penalties
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

        // Render late penalty overlay data panel
        if (deadlinePenalty > 0) {
            penaltyInfo.textContent = `[ Снижено баллов за просрочку дедлайна: -${deadlinePenalty} ]`;
            penaltyInfo.style.display = 'block';
        } else {
            penaltyInfo.style.display = 'none';
        }

        let finalScore = baseScore;

        // Compensation rule: Online learning hides Block 3, auto-compensating +2 discipline points
        if (isOnline && finalScore > 0) {
            finalScore += 2;
        }

        // Deduct calculated late submission penalty
        finalScore -= deadlinePenalty;

        // Hard minimum constraint: Keep at least 4 points if the base calculation reached 4 points
        if (baseScore >= 4 && finalScore < 4) {
            finalScore = 4;
        } else if (finalScore < 0) {
            finalScore = 0;
        }

        // Scale max constraint: Cap calculations to fit inside the updated 12-point grading system
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

    /**
     * Resets all form controls, inputs, and selected checkboxes to their default states.
     * Re-triggers layout alignment configuration logic.
     * 
     * @listener resetBtn.click
     * @returns {void} This listener modifies local scope variables and DOM properties directly.
     */
    resetBtn.addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = false);
        grade11Checkbox.checked = false;
        lessonFormatSelect.value = 'offline';
        deadlineInput.value = '';
        submissionInput.value = '';
        toggleFormatFields();
    });

    // Run initial workspace configuration on load
    toggleFormatFields();
});

