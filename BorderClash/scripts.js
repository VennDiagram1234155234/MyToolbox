// Массив для хранения городов и деревень
let settlements = [];

// Конфигурация типов войск
const TROOP_TYPES = {
    INFANTRY: { name: 'Пехота', minW: 50, maxW: 70, minH: 40, maxH: 50, speedY: 4, marchX: 6, pushPower: 5, icon: 'infantry' },
    TANK:     { name: 'Тяжелый танк', minW: 90, maxW: 110, minH: 55, maxH: 65, speedY: 2, marchX: 3, pushPower: 12, icon: 'tank' },
    RECON:    { name: 'Разведка', minW: 30, maxW: 40, minH: 25, maxH: 35, speedY: 7, marchX: 10, pushPower: 2, icon: 'recon' }

};

// Конфигурация типов скругленного рельефа
const TERRAIN_TYPES = {
    PLAINS: { name: 'Равнина', speedMult: 1.0, powerMult: 1.0 },
    MOUNTAIN: { name: 'Горы', color: '#5a5e6b', speedMult: 0.3, powerMult: 1.5 },
    RIVER: { name: 'Река', color: '#3b82f6', speedMult: 0.4, powerMult: 0.6 },
    LAKE: { name: 'Озеро', color: '#1d4ed8', speedMult: 0.15, powerMult: 0.4 },
    FOREST: { name: 'Лес', color: '#1e3f20', speedMult: 0.8, powerMult: 1.0 },  // Новое: Лес (зеленый)
    SWAMP: { name: 'Болото', color: '#323c23', speedMult: 0.35, powerMult: 0.7 } // Новое: Болото (хаки/гнилой)
};

// Объект для хранения векторных сглаженных объектов рельефа
let worldTerrain = {
    mountains: [],
    lakes: [],
    riverPoints: [],
    forests: [], // Добавили масив для лісів
    swamps: []   // Добавили масив для боліт
};


function getTerrainTypeAt(x, y) {
    // 1. Проверяем озёра
    for (let lake of worldTerrain.lakes) {
        let dx = x - lake.x; let dy = y - lake.y;
        if (dx * dx + dy * dy < lake.radius * lake.radius) return TERRAIN_TYPES.LAKE;
    }
    // 2. Проверяем горы
    for (let mnt of worldTerrain.mountains) {
        let dx = x - mnt.x; let dy = y - mnt.y;
        if (dx * dx + dy * dy < mnt.radius * mnt.radius) return TERRAIN_TYPES.MOUNTAIN;
    }
    // 3. Проверяем реку (с защитой от пустых объектов и динамической толщиной)
    if (worldTerrain.riverPoints && worldTerrain.riverPoints.length > 0) {
        for (let pt of worldTerrain.riverPoints) {
            if (!pt || pt.x === undefined || pt.y === undefined) continue; 
            let dx = x - pt.x; 
            let dy = y - pt.y;
            let currentRadius = pt.radius || 25; 
            if (dx * dx + dy * dy < currentRadius * currentRadius) return TERRAIN_TYPES.RIVER;
        }
    }

    // 4. Проверяем болота по реальным координатам
    if (worldTerrain.swamps) {
        for (let swp of worldTerrain.swamps) {
            let dx = x - swp.x; let dy = y - swp.y;
            if (dx * dx + dy * dy < swp.radius * swp.radius) return TERRAIN_TYPES.SWAMP;
        }
    }
    // 5. Проверяем леса по реальным координатам
    if (worldTerrain.forests) {
        for (let frst of worldTerrain.forests) {
            let dx = x - frst.x; let dy = y - frst.y;
            if (dx * dx + dy * dy < frst.radius * frst.radius) return TERRAIN_TYPES.FOREST;
        }
    }

    return TERRAIN_TYPES.PLAINS;
}

// Функция случайного выбора типа войск (например: 60% пехота, 20% танки, 20% разведка)
function getRandomTroopType() {
    const rand = Math.random();
    if (rand < 0.6) return TROOP_TYPES.INFANTRY;
    if (rand < 0.8) return TROOP_TYPES.TANK;
    return TROOP_TYPES.RECON;
}

// Об'єкт для зберігання унікального візуального стилю країн на поточну гру
let countryStyles = {
    left: { bg: '#1e293b', flagType: 'tricolor', colors: [] },
    right: { bg: '#3b1e1e', flagType: 'bicolor', colors: [] }
};

// Находим элементы интерфейса и инициализируем контекст рисования
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const btnReset = document.getElementById('btn-reset');
const statusText = document.getElementById('status');
const btnAuto = document.getElementById('btn-auto');
// Привязываем новые кнопки
const btnPeace = document.getElementById('btn-peace');
const btnConfirmBorder = document.getElementById('btn-confirm-border');

let autoInterval = null;                             // Переменная для хранения таймера
const btnSpeed = document.getElementById('btn-speed'); // Посилання на кнопку швидкості
let simSpeed = 1;  
let reinforcementInterval = null; // Таймер для появления подкреплений

const btnHeatmap = document.getElementById('btn-heatmap');
const GRID_SIZE = 24; // Размер ячейки хитмапа в пикселях
let heatmapGrid = [];
let showHeatmap = false;


const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Состояния игры: 'drawing' (рисуем), 'ready' (готовы к бою), 'battle' (идет бой), 'gameover' (финал)
let gameState = 'drawing'; 
let isDrawing = false;

// Массив границы: для каждой Y-координаты от 0 до HEIGHT-1 храним одну X-координату
let borderPoints = new Array(HEIGHT).fill(WIDTH / 2);
let originalBorderPoints = [];

// Массивы для хранения прямоугольников войск обеих стран
let troopsLeft = [];
let troopsRight = [];
// Переменные для подсчета потерь в реальном времени (в квадратных пикселях площади)
let lossesLeft = 0;
let lossesRight = 0;

// Координата последней точки для сглаживания линии при быстром движении мыши
let lastPoint = null;

// Запуск игры
init();

/**
 * Инициализация и сброс игры в начальное состояние
 */
function init() {
    originalBorderPoints = [];
    // ОБНУЛЯЕМ ПОТЕРИ ПРИ СБРОСЕ
    
    lossesLeft = 0;
    lossesRight = 0;
    // Создаем пустую сетку хитмапа под размер экрана
    heatmapGrid = Array.from({ length: Math.ceil(HEIGHT / GRID_SIZE) }, () => new Array(Math.ceil(WIDTH / GRID_SIZE)).fill(0));
    // Генерация пустой сетки рельефа (по умолчанию равнина)
    const rows = Math.ceil(HEIGHT / GRID_SIZE);
    const cols = Math.ceil(WIDTH / GRID_SIZE);
    terrainGrid = Array.from({ length: rows }, () => new Array(cols).fill(TERRAIN_TYPES.PLAINS));

    // Функция генерации "пятна" ландшафта (для гор и озёр)
    function spawnTerrainBlob(type, size) {
        let startX = Math.floor(Math.random() * cols);
        let startY = Math.floor(Math.random() * rows);
        for (let i = 0; i < size; i++) {
            if (startY >= 0 && startY < rows && startX >= 0 && startX < cols) {
                terrainGrid[startY][startX] = type;
            }
            // Случайный шаг в сторону для создания естественной формы
            startX += Math.floor(Math.random() * 3) - 1;
            startY += Math.floor(Math.random() * 3) - 1;
        }
    }

    // Очищаем старые векторные данные рельефа перед генерацией новой карты
    worldTerrain.mountains = [];
    worldTerrain.lakes = [];
    worldTerrain.riverPoints = [];

    // 1. РАНДОМНАЯ РЕКА (появляется с шансом 60% в разных направлениях, сложных формах и с разной толщиной)
    if (Math.random() < 0.60) {
        // Выбираем направление: 0 - Вертикальная, 1 - Горизонтальная, 2 - Диагональная
        const directionType = Math.floor(Math.random() * 3);
        let startX, startY, endX, endY;
        
        if (directionType === 0) {
            startX = Math.floor(Math.random() * (WIDTH - 400)) + 200;
            startY = -40;
            endX = startX + (Math.random() * 200 - 100);
            endY = HEIGHT + 40;
        } else if (directionType === 1) {
            startX = -40;
            startY = Math.floor(Math.random() * (HEIGHT - 300)) + 150;
            endX = WIDTH + 40;
            endY = startY + (Math.random() * 160 - 80);
        } else {
            if (Math.random() < 0.5) {
                startX = Math.floor(Math.random() * (WIDTH * 0.3));
                startY = -40;
                endX = WIDTH - Math.floor(Math.random() * (WIDTH * 0.3));
                endY = HEIGHT + 40;
            } else {
                startX = WIDTH - Math.floor(Math.random() * (WIDTH * 0.3));
                startY = -40;
                endX = Math.floor(Math.random() * (WIDTH * 0.3));
                endY = HEIGHT + 40;
            }
        }

        // Параметры толщины реки
        const baseWidth = Math.floor(Math.random() * 16) + 20; // От 20px до 35px
        const widthFluctuation = Math.random() * 0.4 + 0.2;     // Колебания (20%-60%)
        const widthFreq = Math.random() * 3 + 2;                // Частота перекатов
        
        // Рандомный обрыв русла (Шанс 35%, что река станет слепой и закончится посреди карты)
        const endsEarly = Math.random() < 0.35;
        const earlyEndCutoff = endsEarly ? (Math.random() * 0.35 + 0.50) : 1.0; 

        const formType = Math.floor(Math.random() * 4);
        const dx = endX - startX;
        const dy = endY - startY;
        const riverLength = Math.hypot(dx, dy);
        const nx = dx / riverLength;
        const ny = dy / riverLength;
        const px = -ny;
        const py = nx;

        // БЕЗОПАСНАЯ СТРЕЛОЧНАЯ ФУНКЦИЯ (устраняет ошибку падения скрипта в блоке IF)
        const generateRiverBranch = (sX, sY, eX, eY, amp, freq, noise, isMainTail = false) => {
            const bDx = eX - sX;
            const bDy = eY - sY;
            const bLen = Math.hypot(bDx, bDy);
            
            const effectiveCutoff = isMainTail ? earlyEndCutoff : 1.0;
            const steps = Math.max(5, Math.ceil((bLen * effectiveCutoff) / 12));
            const points = [];
            const phase = Math.random() * Math.PI * 2;
            const widthPhase = Math.random() * Math.PI * 2;

            for (let i = 0; i <= steps; i++) {
                const progress = i / steps;
                const globalProgress = (i / Math.ceil(bLen / 12)) * effectiveCutoff;

                const baseX = sX + bDx * globalProgress;
                const baseY = sY + bDy * globalProgress;

                const envelope = Math.sin(globalProgress * Math.PI); 
                const wave = Math.sin(globalProgress * Math.PI * 2 * freq + phase) * amp;
                const microNoise = (Math.sin(globalProgress * bLen * 0.1) + Math.cos(globalProgress * bLen * 0.04)) * noise;
                
                const totalOffset = (wave + microNoise) * (isMainTail && endsEarly ? 1.0 : envelope);
                
                let currentRadius = baseWidth * (1 + Math.sin(globalProgress * Math.PI * widthFreq + widthPhase) * widthFluctuation);
                
                // Если включен обрыв — плавно сужаем устье до 0
                if (isMainTail && endsEarly && i > steps * 0.7) {
                    const fadeProgress = (i - steps * 0.7) / (steps * 0.3);
                    currentRadius *= (1 - fadeProgress);
                }

                if (currentRadius < 6) currentRadius = 6;

                points.push({
                    x: baseX + px * totalOffset,
                    y: baseY + py * totalOffset,
                    radius: currentRadius
                });
            }
            return points;
        };

        if (formType === 0) {
            worldTerrain.riverPoints.push(...generateRiverBranch(startX, startY, endX, endY, 110, 3.5, 8, true));
        } else if (formType === 1) {
            const midX = startX + dx * 0.45;
            const midY = startY + dy * 0.45;
            
            const mainBranch = generateRiverBranch(startX, startY, midX, midY, 30, 1.0, 5, false);
            worldTerrain.riverPoints.push(...mainBranch);

            const branchAX = endX + px * 180;
            const branchAY = endY + py * 180;
            const branchA = generateRiverBranch(midX, midY, branchAX, branchAY, 40, 1.5, 4, !endsEarly);
            worldTerrain.riverPoints.push(...branchA);

            const branchAReversed = [...branchA].reverse();
            worldTerrain.riverPoints.push(...branchAReversed);

            const branchBX = endX - px * 180;
            const branchBY = endY - py * 180;
            const branchB = generateRiverBranch(midX, midY, branchBX, branchBY, 45, 1.2, 4, true);
            worldTerrain.riverPoints.push(...branchB);
        } else if (formType === 2) {
            const midX1 = startX + dx * 0.3;
            const midY1 = startY + dy * 0.3;
            const midX2 = startX + dx * 0.7;
            const midY2 = startY + dy * 0.7;

            const headBranch = generateRiverBranch(startX, startY, midX1, midY1, 20, 0.8, 4, false);
            worldTerrain.riverPoints.push(...headBranch);

            const leftBranch = generateRiverBranch(midX1, midY1, midX2, midY2, 60, 1.0, 3, false);
            worldTerrain.riverPoints.push(...leftBranch);

            const tailBranch = generateRiverBranch(midX2, midY2, endX, endY, 20, 0.8, 4, true);
            worldTerrain.riverPoints.push(...tailBranch);

            const tailReversed = [...tailBranch].reverse();
            worldTerrain.riverPoints.push(...tailReversed);

            const rightBranch = generateRiverBranch(midX1, midY1, midX2, midY2, -60, 1.0, 3, false);
            const rightBranchReversed = [...rightBranch].reverse();
            worldTerrain.riverPoints.push(...rightBranchReversed);
        } else {
            worldTerrain.riverPoints.push(...generateRiverBranch(startX, startY, endX, endY, 40, 0.7, 12, true));
        }

        // Безопасная валидация границ с проверкой существования точек
        worldTerrain.riverPoints.forEach((pt, idx) => {
            if (!pt) return;
            if (endsEarly && idx > worldTerrain.riverPoints.length - 5) return; 
            if (pt.x < 15) pt.x = 15;
            if (pt.x > WIDTH - 15) pt.x = WIDTH - 15;
            if (pt.y < 15) pt.y = 15;
            if (pt.y > HEIGHT - 15) pt.y = HEIGHT - 15;
        });
    }

    // Безопасная функция проверки пересечения с рекой (работает корректно, даже если реки нет)
    function hitsRiver(x, y, radius) {
        if (worldTerrain.riverPoints.length === 0) return false; // Если реки нет, пересечения быть не может
        return worldTerrain.riverPoints.some(pt => {
            let dx = x - pt.x;
            let dy = y - pt.y;
            return (dx * dx + dy * dy) < (radius + 25) * (radius + 25);
        });
    }

    // 2. РАНДОМНЫЕ ОЗЕРА (может быть от 0 до 4 озер на карте)
    const lakesCount = Math.floor(Math.random() * 5); // Генерирует 0, 1, 2, 3 или 4 озера
    for (let i = 0; i < lakesCount; i++) {
        let cx, cy, radius, isValid;
        let attempts = 0;
        
        do {
            cx = Math.floor(Math.random() * (WIDTH - 200)) + 100;
            cy = Math.floor(Math.random() * (HEIGHT - 200)) + 100;
            radius = Math.floor(Math.random() * 35) + 35;
            
            isValid = !hitsRiver(cx, cy, radius) && !worldTerrain.lakes.some(lake => {
                let dx = cx - lake.x;
                let dy = cy - lake.y;
                return (dx * dx + dy * dy) < (radius + lake.radius) * (radius + lake.radius);
            });
            attempts++;
        } while (!isValid && attempts < 50);

        if (!isValid) continue;

        let points = [];
        let numPoints = 10;
        for (let j = 0; j < numPoints; j++) {
            let angle = (j / numPoints) * Math.PI * 2;
            let r = radius * (0.75 + Math.random() * 0.5); 
            points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        }
        worldTerrain.lakes.push({ x: cx, y: cy, radius: radius, points: points });
    }

    // Вспомогательная функция создания одной плотной горы
    // Вспомогательная функция создания одной уникальной по форме горы
    function createSingleMountain(cx, cy, radius) {
        let points = [];
        let peakPoints = [];
        let numPoints = 12;
        
        // Коэффициенты деформации: делают гору овальной, вытянутой по вертикали или горизонтали
        const stretchX = Math.random() * 0.6 + 0.7; // Случайная ширина (от 70% до 130%)
        const stretchY = Math.random() * 0.6 + 0.7; // Случайная высота (от 70% до 130%)
        const ruggedness = Math.random() * 0.4 + 0.4; // Степень "скалистости" и неровности краев

        for (let j = 0; j < numPoints; j++) {
            let angle = (j / numPoints) * Math.PI * 2;
            // Добавляем больше хаотичности в радиус для создания острых скальных выступов
            let r = radius * (1.0 + (Math.random() - 0.5) * ruggedness); 
            
            // Применяем коэффициенты растяжения к осям X и Y
            let ptX = cx + Math.cos(angle) * r * stretchX;
            let ptY = cy + Math.sin(angle) * r * stretchY;
            points.push({ x: ptX, y: ptY });

            // Рассчитываем смещенный заснеженный пик, повторяющий форму основания
            let pr = r * 0.35;
            let peakX = (cx - 3) + Math.cos(angle) * pr * stretchX;
            let peakY = (cy - 5) + Math.sin(angle) * pr * stretchY;
            peakPoints.push({ x: peakX, y: peakY });
        }
        worldTerrain.mountains.push({ x: cx, y: cy, radius: radius, points: points, peakPoints: peakPoints });
    }


    // 3. РАНДОМНЫЕ ОДИНОЧНЫЕ ГОРЫ (может быть от 0 до 5 гор на карте)
    const mountainRanges = Math.floor(Math.random() * 6); // Генерирует от 0 до 5 одиночных гор
    for (let i = 0; i < mountainRanges; i++) {
        let cx, cy, radius, isValid;
        let attempts = 0;
        do {
            cx = Math.floor(Math.random() * (WIDTH - 120)) + 60;
            cy = Math.floor(Math.random() * (HEIGHT - 120)) + 60;
            radius = Math.floor(Math.random() * 45) + 45;
            isValid = !hitsRiver(cx, cy, radius) && !worldTerrain.lakes.some(lake => {
                let dx = cx - lake.x;
                let dy = cy - lake.y;
                return (dx * dx + dy * dy) < (radius + lake.radius) * (radius + lake.radius);
            });
            attempts++;
        } while (!isValid && attempts < 50);

        if (isValid) createSingleMountain(cx, cy, radius);
    }

    // 4. РАНДОМНЫЕ ГОРНЫЕ ХРЕБТЫ (появляются с шансом 35%)
    if (Math.random() < 0.35) {
        let hx = Math.floor(Math.random() * (WIDTH - 300)) + 150;
        let hy = Math.floor(Math.random() * (HEIGHT - 300)) + 150;
        let angle = Math.random() * Math.PI * 2;
        let length = Math.floor(Math.random() * 3) + 3;

        for (let k = 0; k < length; k++) {
            let radius = Math.floor(Math.random() * 20) + 40;
            if (!hitsRiver(hx, hy, radius) && !worldTerrain.lakes.some(l => Math.hypot(hx-l.x, hy-l.y) < (radius+l.radius))) {
                createSingleMountain(hx, hy, radius);
            }
            hx += Math.cos(angle) * (radius * 1.1);
            hy += Math.sin(angle) * (radius * 1.1);
        }
    }

    // Очищаем старые данные лесов и болот перед новой игрой
    worldTerrain.forests = [];
    worldTerrain.swamps = [];

    // 5. РАНДОМНЫЕ ЛЕСА (От 0 до 5 массивов природной формы без наложений)
    const forestCount = Math.floor(Math.random() * 6); 
    for (let i = 0; i < forestCount; i++) {
        let cx, cy, radius, isValid;
        let attempts = 0;

        do {
        cx = Math.floor(Math.random() * (WIDTH - 200)) + 100;
        cy = Math.floor(Math.random() * (HEIGHT - 200)) + 100;
        radius = Math.floor(Math.random() * 45) + 40; 

        // Базовая быстрая проверка центра точки
        let centerTerrain = getTerrainTypeAt(cx, cy);
        isValid = centerTerrain === TERRAIN_TYPES.PLAINS;

        if (isValid) {
            // Проверяем, чтобы границы нового леса не пересекали реки, горы, озера и другие леса/болота
            // Радиус проверки берем с запасом (* 1.3), чтобы биомы не слипались вплотную
            const checkDist = radius * 1.3;
            
            // 1. Проверка на пересечение с рекой
            if (hitsRiver(cx, cy, radius)) isValid = false;

            // 2. Проверка на пересечение с горами
            if (isValid && worldTerrain.mountains.some(m => Math.hypot(cx - m.x, cy - m.y) < (checkDist + m.radius))) isValid = false;

            // 3. Проверка на пересечение с озерами
            if (isValid && worldTerrain.lakes.some(l => Math.hypot(cx - l.x, cy - l.y) < (checkDist + l.radius))) isValid = false;

            // 4. Проверка на пересечение с уже созданными лесами
            if (isValid && worldTerrain.forests.some(f => Math.hypot(cx - f.x, cy - f.y) < (radius + f.radius))) isValid = false;
        }

        attempts++;
        } while (!isValid && attempts < 50);

        if (isValid) {
        let points = [];
        let numPoints = 10;
        for (let j = 0; j < numPoints; j++) {
            let angle = (j / numPoints) * Math.PI * 2;
            let r = radius * (0.7 + Math.random() * 0.6);
            points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        }
        
        worldTerrain.forests.push({ x: cx, y: cy, radius: radius, points: points });
        spawnTerrainBlob(TERRAIN_TYPES.FOREST, Math.floor(radius * 1.5));
        }
    }

    // 6. РАНДОМНЫЕ БОЛОТА (От 0 до 3 плавных клякс без наложений)
    if (Math.random() < 0.70) {
        const swampCount = Math.floor(Math.random() * 4);
        for (let i = 0; i < swampCount; i++) {
        let cx, cy, radius, isValid;
        let attempts = 0;

        do {
            cx = Math.floor(Math.random() * (WIDTH - 240)) + 120;
            cy = Math.floor(Math.random() * (HEIGHT - 240)) + 120;
            radius = Math.floor(Math.random() * 40) + 40;

            let centerTerrain = getTerrainTypeAt(cx, cy);
            isValid = centerTerrain === TERRAIN_TYPES.PLAINS;

            if (isValid) {
            const checkDist = radius * 1.3;

            // 1. Проверка на реку
            if (hitsRiver(cx, cy, radius)) isValid = false;

            // 2. Проверка на горы
            if (isValid && worldTerrain.mountains.some(m => Math.hypot(cx - m.x, cy - m.y) < (checkDist + m.radius))) isValid = false;

            // 3. Проверка на озера
            if (isValid && worldTerrain.lakes.some(l => Math.hypot(cx - l.x, cy - l.y) < (checkDist + l.radius))) isValid = false;

            // 4. Проверка на созданные леса (чтобы болота не затекали на деревья)
            if (isValid && worldTerrain.forests.some(f => Math.hypot(cx - f.x, cy - f.y) < (checkDist + f.radius))) isValid = false;

            // 5. Проверка на другие болота
            if (isValid && worldTerrain.swamps.some(s => Math.hypot(cx - s.x, cy - s.y) < (radius + s.radius))) isValid = false;
            }

            attempts++;
        } while (!isValid && attempts < 50);
        
        if (isValid) {
            let points = [];
            let numPoints = 10;
            for (let j = 0; j < numPoints; j++) {
            let angle = (j / numPoints) * Math.PI * 2;
            let r = radius * (0.75 + Math.random() * 0.5); 
            points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
            }
            
            worldTerrain.swamps.push({ x: cx, y: cy, radius: radius, points: points });
            spawnTerrainBlob(TERRAIN_TYPES.SWAMP, Math.floor(radius * 1.2));
        }
        }
    }



    
    generateCountryStyles();

    gameState = 'drawing'; isDrawing = false;
    troopsLeft = []; troopsRight = []; lastPoint = null;
    // Додайте це всередину функції init()
    simSpeed = 1;
    btnSpeed.textContent = "Скорость: 1x";
    btnSpeed.style.display = "none";

    // Останавливаем автобой, если он был запущен
    if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
    }

    // Добавьте это внутрь функции init()
    if (reinforcementInterval) {
        clearInterval(reinforcementInterval);
        reinforcementInterval = null;
    }

    btnAuto.classList.remove('active');
    btnAuto.textContent = "Запустить симуляцию";
    btnAuto.disabled = true;

    borderPoints.fill(WIDTH / 2);
    statusText.textContent = "Шаг 1: Нарисуйте границу сверху вниз";
    statusText.style.color = "#fff";
    // Скрываем кнопки перемирия при полном сбросе игры
    if (typeof btnPeace !== 'undefined') btnPeace.style.display = "none";
    if (typeof btnConfirmBorder !== 'undefined') btnConfirmBorder.style.display = "none";


    // --- ИСПРАВЛЕНО: ГЕНЕРАЦИЯ НАСЕЛЕННЫХ ПУНКТОВ С ЛАТИНСКИМИ НАЗВАНИЯМИ ---
    settlements = [];
    const countSettlements = Math.floor(Math.random() * 16) + 15; 
    
    // Вспомогательная функция для генерации читаемых латинских названий из слогов
    function generateLatinName() {
        const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
        const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z', 'th', 'kr', 'st'];
        let word = "";
        // Длина слова от 2 до 4 слогов
        const syllables = Math.floor(Math.random() * 3) + 2; 
        
        for (let s = 0; s < syllables; s++) {
            word += consonants[Math.floor(Math.random() * consonants.length)];
            word += vowels[Math.floor(Math.random() * vowels.length)];
        }
        // Делаем первую букву заглавной
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    for (let i = 0; i < countSettlements; i++) {
        let sX, sY, terrainType;
        let attempts = 0;

    // Шукаємо сушу (не Озеро, не Річка і не Болото), максимум 50 спроб
    do {
        sX = Math.floor(Math.random() * (WIDTH - 60)) + 30;
        sY = Math.floor(Math.random() * (HEIGHT - 60)) + 30;
        terrainType = getTerrainTypeAt(sX, sY);
        attempts++;
    } while ((terrainType === TERRAIN_TYPES.LAKE || 
            terrainType === TERRAIN_TYPES.RIVER || 
            terrainType === TERRAIN_TYPES.SWAMP) && attempts < 50);

        // Условие остается прежним, но теперь оно надежно фильтрует города от спавна в воде

        const randType = Math.random();

        let sType, sSize, sPrefix;
        
        // Меняем префиксы типов на латиницу (St. / T. / V.) или оставляем просто названия
        if (randType < 0.2) {
            sType = 'city'; sSize = 6; sPrefix = 'St. '; // Sector / Station / Stronghold
        } else if (randType < 0.5) {
            sType = 'town'; sSize = 4; sPrefix = 'T. ';  // Town / Terminus
        } else {
            sType = 'village'; sSize = 2.5; sPrefix = 'V. '; // Village / Outpost
        }
        
        // Генерируем случайное имя: например, "St. Krado", "T. Fesy", "V. Thamyru"
        const sLabel = sPrefix + generateLatinName();
        
        settlements.push({ x: sX, y: sY, type: sType, size: sSize, label: sLabel });
    }


    draw();
}


/**
 * Основная функция отрисовки всего графического содержимого на Canvas
 */
function draw() {
    // 1. Заливаем всю левую часть случайным цветом Страны А
    ctx.fillStyle = countryStyles.left.bg; 
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 2. Отрисовываем полигон правой территории Страны Б по её случайному цвету
    ctx.fillStyle = countryStyles.right.bg; 
    ctx.beginPath();
    ctx.moveTo(borderPoints[0], 0);
    for (let y = 1; y < HEIGHT; y++) {
        ctx.lineTo(borderPoints[y], y);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(WIDTH, 0);
    ctx.closePath();
    ctx.fill();
    
    // --- ВЕКТОРНАЯ ОТРИСОВКА РЕЛЬЕФА (БЕЗ РЯБИ, СО ЗНАЧКАМИ ВОЛН) ---
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    // 1. Отрисовка ПЛОТНЫХ гор без прозрачности и со снежными пиками
    worldTerrain.mountains.forEach(mnt => {
        // Плотное каменное основание горы
        ctx.save();
        ctx.fillStyle = TERRAIN_TYPES.MOUNTAIN.color;
        ctx.globalAlpha = 1.0; // Убрали прозрачность, теперь гора полностью сплошная
        ctx.beginPath();
        ctx.moveTo(mnt.points[0].x, mnt.points[0].y);
        for (let i = 0; i < mnt.points.length; i++) {
            let curr = mnt.points[i];
            let next = mnt.points[(i + 1) % mnt.points.length];
            ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Непрозрачный заснеженный пик
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.9; // Сделали снег ярким и контрастным поверх горы
        ctx.beginPath();
        ctx.moveTo(mnt.peakPoints[0].x, mnt.peakPoints[0].y);
        for (let i = 0; i < mnt.peakPoints.length; i++) {
            let curr = mnt.peakPoints[i];
            let next = mnt.peakPoints[(i + 1) % mnt.peakPoints.length];
            ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });


    // 2. Отрисовка ИДЕАЛЬНО ПЛАВНОЙ И КРИВОЙ РЕКИ С ДИНАМИЧЕСКОЙ ТОЛЩИНОЙ
    if (worldTerrain.riverPoints.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 0.85;

        let points = worldTerrain.riverPoints;
        let p0 = points[0];
        
        // Предыдущие координаты для связывания сегментов
        let lastXc = p0.x;
        let lastYc = p0.y;

        // Проходим по всем точкам реки и рисуем её плавными сегментами разной толщины
        for (let i = 1; i < points.length - 1; i++) {
            let curr = points[i];
            let next = points[i + 1];
            
            // Вычисляем сглаженную точку поворота (середину)
            let xc = (curr.x + next.x) / 2;
            let yc = (curr.y + next.y) / 2;

            ctx.beginPath();
            ctx.strokeStyle = TERRAIN_TYPES.RIVER.color;
            
            // Устанавливаем индивидуальную толщину для текущего участка (умножаем радиус на 2)
            // Если радиус не задан (для старых карт), оставляем базовые 46px
            ctx.lineWidth = curr.radius ? (curr.radius * 2) : 46;

            // Рисуем сглаженный сегмент от предыдущей средней точки до новой через текущую
            ctx.moveTo(lastXc, lastYc);
            ctx.quadraticCurveTo(curr.x, curr.y, xc, yc);
            ctx.stroke();

            // Запоминаем текущую среднюю точку для следующей итерации
            lastXc = xc;
            lastYc = yc;
        }

        // Дорисовываем самый последний финальный кусочек до конечной точки
        let pLast = points[points.length - 1];
        ctx.beginPath();
        ctx.strokeStyle = TERRAIN_TYPES.RIVER.color;
        ctx.lineWidth = pLast.radius ? (pLast.radius * 2) : 46;
        ctx.moveTo(lastXc, lastYc);
        ctx.lineTo(pLast.x, pLast.y);
        ctx.stroke();

        ctx.restore();
    }



    // 3. Отрисовка озер и значка волны по центру
    worldTerrain.lakes.forEach(lake => {
        ctx.save();
        ctx.fillStyle = TERRAIN_TYPES.LAKE.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(lake.points.x, lake.points.y);
        for (let i = 0; i < lake.points.length; i++) {
            let curr = lake.points[i];
            let next = lake.points[(i + 1) % lake.points.length];
            ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // РИСУЕМ ЧЕРНЫЙ ЗНАЧОК ВОЛНЫ ПО ЦЕНТРУ ОЗЕРА
        ctx.save();
        ctx.strokeStyle = "#000000"; // Черный цвет линии
        ctx.lineWidth = 2.5;         // Толщина значка
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.5;       // Слегка приглушенный, чтобы вписывался в стиль

        // Рисуем верхнюю извилистую линию волны
        ctx.beginPath();
        ctx.moveTo(lake.x - 12, lake.y - 3);
        ctx.bezierCurveTo(lake.x - 6, lake.y - 7, lake.x - 3, lake.y + 1, lake.x, lake.y - 3);
        ctx.bezierCurveTo(lake.x + 3, lake.y - 7, lake.x + 6, lake.y + 1, lake.x + 12, lake.y - 3);
        ctx.stroke();

        // Рисуем нижнюю извилистую линию волны со смещением
        ctx.beginPath();
        ctx.moveTo(lake.x - 10, lake.y + 4);
        ctx.bezierCurveTo(lake.x - 5, lake.y, lake.x - 2, lake.y + 8, lake.x, lake.y + 4);
        ctx.bezierCurveTo(lake.x + 2, lake.y, lake.x + 5, lake.y + 8, lake.x + 10, lake.y + 4);
        ctx.stroke();
        
        ctx.restore();
    });

    // --- ОТРИСОВКА ПЛОТНЫХ БОЛОТ СЛОЖНОЙ ФОРМЫ ---
    if (worldTerrain.swamps) {
        worldTerrain.swamps.forEach(swp => {
        ctx.save();
        ctx.fillStyle = TERRAIN_TYPES.SWAMP.color;
        ctx.globalAlpha = 1.0; // Убрали прозрачность, болото теперь сплошное
        ctx.beginPath();
        ctx.moveTo(swp.points[0].x, swp.points[0].y);
        for (let i = 0; i < swp.points.length; i++) {
            let curr = swp.points[i];
            let next = swp.points[(i + 1) % swp.points.length];
            ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // РИСУЕМ ТЕКСТУРУ ТИНЫ ПО ЦЕНТРУ БОЛОТА (Вместо камышей, чтобы не путать с горами)
        ctx.save();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        // Три аккуратные горизонтальные болотные линии
        ctx.moveTo(swp.x - 14, swp.y - 4); ctx.lineTo(swp.x + 14, swp.y - 4);
        ctx.moveTo(swp.x - 20, swp.y + 2); ctx.lineTo(swp.x + 20, swp.y + 2);
        ctx.moveTo(swp.x - 10, swp.y + 8); ctx.lineTo(swp.x + 8, swp.y + 8);
        ctx.stroke();
        ctx.restore();
        });
    }

    // --- ОТРИСОВКА ПЛОТНЫХ ЛЕСОВ СЛУЧАЙНОЙ ФОРМЫ ---
    if (worldTerrain.forests) {
        worldTerrain.forests.forEach(frst => {
            ctx.save();
            ctx.fillStyle = TERRAIN_TYPES.FOREST.color;
            ctx.strokeStyle = "#142b16"; // Более темный зеленый цвет для опушки леса
            ctx.lineWidth = 6;
            ctx.lineJoin = "round";
            ctx.globalAlpha = 0.95; // Почти сплошная закраска площади
            
            ctx.beginPath();
            ctx.moveTo(frst.points[0].x, frst.points[0].y);
            for (let i = 0; i < frst.points.length; i++) {
                let curr = frst.points[i];
                let next = frst.points[(i + 1) % frst.points.length];
                ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke(); // Рисуем красивую сглаженную границу леса
            ctx.restore();

        
        // Иконка дерева по центру леса для индикации
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(frst.x, frst.y - 12); ctx.lineTo(frst.x - 8, frst.y + 2); ctx.lineTo(frst.x - 3,  frst.y + 2);
        ctx.lineTo(frst.x - 3, frst.y + 10); ctx.lineTo(frst.x + 3, frst.y + 10); ctx.lineTo(frst.x + 3,  frst.y + 2);
        ctx.lineTo(frst.x + 8, frst.y + 2);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        });
    }

    ctx.globalAlpha = 1.0; // Сбрасываем прозрачность


    // --- ДИНАМИЧЕСКИЙ ПЛАВНЫЙ ХИТМАП (под войсками и городами) ---
    // --- ДИНАМИЧЕСКИЙ ТОП-ХИТМАП С ОГРАНИЧЕНИЕМ КРАСНЫХ ТОЧЕК (под войсками и городами) ---
    // --- ИДЕАЛЬНО ПЛАВНЫЙ РАДИАЛЬНЫЙ ХИТМАП С ЧЕРНЫМИ ПЯТНАМИ (под войсками и городами) ---
    if (showHeatmap) {
        ctx.save();
        
        // 1. Собираем все активные точки боев в один массив
        let allIntensities = [];
        for (let r = 0; r < heatmapGrid.length; r++) {
            for (let c = 0; c < heatmapGrid[r].length; c++) {
                if (heatmapGrid[r][c] > 0) {
                    allIntensities.push(heatmapGrid[r][c]);
                }
            }
        }
        
        // 2. Сортируем массив по убыванию
        allIntensities.sort((a, b) => b - a);
        
        // Настройка динамических порогов на основе процентилей (5 равных групп по 20%)
        let greenThreshold = 0;
        let yellowThreshold = 0;
        let orangeThreshold = 0;
        let redThreshold = 0;
        let blackThreshold = 0;

        if (allIntensities.length > 0) {
            const totalCount = allIntensities.length;
            // allIntensities уже отсортирован по убыванию, поэтому берем индексы с конца к началу
            greenThreshold  = allIntensities[Math.min(totalCount - 1, Math.floor(totalCount * 0.80))];
            yellowThreshold = allIntensities[Math.min(totalCount - 1, Math.floor(totalCount * 0.60))];
            orangeThreshold = allIntensities[Math.min(totalCount - 1, Math.floor(totalCount * 0.40))];
            redThreshold    = allIntensities[Math.min(totalCount - 1, Math.floor(totalCount * 0.20))];
            blackThreshold  = allIntensities[0]; // Самые жесткие эпицентры (топ-20% и выше)
        }


        // 3. Отрисовка идеально круглых сглаженных пятен
        for (let r = 0; r < heatmapGrid.length; r++) {
            for (let c = 0; c < heatmapGrid[r].length; c++) {
                let intensity = heatmapGrid[r][c];
                
                if (intensity > 0) {
                    let x = c * GRID_SIZE + GRID_SIZE / 2;
                    let y = r * GRID_SIZE + GRID_SIZE / 2;
                    let radius = GRID_SIZE * 1.8; 

                    let grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                    let centerColor;
                    let middleColor = 'rgba(0, 0, 0, 0)'; // По умолчанию размывается в пустоту

                    // Распределение цветов строго по 5 равным группам
                    if (intensity >= redThreshold && intensity > 0) {
                        // Топ-20% самых жестких боев: угольно-черный центр с красным ореолом
                        centerColor = 'rgba(15, 15, 15, 0.9)'; 
                        middleColor = 'rgba(185, 28, 28, 0.4)'; 
                    } else if (intensity >= orangeThreshold && intensity > 0) {
                        // Следующие 20% (от 20% до 40% по интенсивности): плотный красный
                        centerColor = 'rgba(220, 38, 38, 0.75)'; 
                    } else if (intensity >= yellowThreshold && intensity > 0) {
                        // Средние 20% (от 40% до 60%): насыщенный оранжевый
                        centerColor = 'rgba(249, 115, 22, 0.65)'; 
                    } else if (intensity >= greenThreshold && intensity > 0) {
                        // Умеренные 20% (от 60% до 80%): теплый желтый
                        centerColor = 'rgba(234, 179, 8, 0.55)'; 
                    } else if (intensity > 0) {
                        // Самые слабые 20% остаточных боев: мягкий зеленый
                        centerColor = 'rgba(34, 197, 94, 0.45)'; 
                    }


                    // Плавное радиальное затухание цвета от центра к краям
                    grad.addColorStop(0, centerColor);       
                    if (intensity >= redThreshold && intensity > 0) {
                        grad.addColorStop(0.4, middleColor); // Контур для выжженных черных точек
                    }

                    grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); 

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        ctx.restore();
    }



    // Отрисовка изначальной границы с обводкой для видимости на любом фоне
    if (originalBorderPoints.length > 0) {
        ctx.save(); // Сохраняем настройки контекста
        
        // Настраиваем пунктир: 8 пикселей линия, 8 пикселей пропуск
        ctx.setLineDash([8, 8]); 
        ctx.lineWidth = 3; // Делаем линию чуть толще

        // 1. Сначала рисуем черную подложку (размытую тень), чтобы линию было видно на светлых фонах
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(originalBorderPoints[0], 0);
        for (let y = 1; y < HEIGHT; y++) {
        ctx.lineTo(originalBorderPoints[y], y);
        }
        ctx.stroke();

        // 2. Поверх рисуем яркую неоново-желтую пунктирную линию
        ctx.strokeStyle = '#fffb00'; 
        ctx.lineWidth = 2; // Чуть тоньше подложки, чтобы получился эффект контура
        ctx.beginPath();
        ctx.moveTo(originalBorderPoints[0], 0);
        for (let y = 1; y < HEIGHT; y++) {
        ctx.lineTo(originalBorderPoints[y], y);
        }
        ctx.stroke();

        ctx.restore(); // Полностью сбрасываем пунктир и стили для остальных элементов
    }


    // 3. Малюємо прямокутники військ Страни А із прапором
    troopsLeft.forEach(t => {
        // ИСПРАВЛЕНО: добавили шестым параметром true
        drawFlagInsideRect(t.x, t.y, t.w, t.h, t, true); 
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(t.x, t.y, t.w, t.h);
    });

    // 4. Малюємо прямокутники військ Страни Б із прапором
    troopsRight.forEach(t => {
        // ИСПРАВЛЕНО: добавили шестым параметром false
        drawFlagInsideRect(t.x, t.y, t.w, t.h, t, false); 
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(t.x, t.y, t.w, t.h);
    });

    // --- ОТРИСОВКА НАСЕЛЕННЫХ ПУНКТОВ ---
    settlements.forEach(s => {
        // Определяем, на чьей территории находится точка в данный момент
        // Берем текущую координату золотой линии для высоты города
        const borderXatY = borderPoints[s.y];
        
        let controlColor, textColor;
        if (s.x < borderXatY) {
            // Если левее линии — контролирует Страна А (желто-черный флаг)
            controlColor = countryStyles.left.bg;
            textColor = "#fff";
        } else {
            // Если правее — контролирует Страна Б (зеленый флаг)
            controlColor = countryStyles.right.bg;
            textColor = "#fff";
        }

        // 1. Рисуем черную контрастную подложку-кружок
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();

        // 2. Рисуем сам кружок города, окрашенный в цвет контролирующей страны
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = controlColor;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#fff";
        ctx.stroke();

        // 3. Дополнительная иконка для крупных городов (внутренняя точка)
        if (s.type === 'city') {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = "#000";
            ctx.fill();
        }

        // 4. Текстовое название населенного пункта (аккуратный мелкий шрифт под кружком)
        ctx.save();
        ctx.font = "900 10px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        
        // Тень для текста, чтобы читалcя на любом фоне
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#000";
        ctx.fillStyle = textColor;
        ctx.fillText(s.label, s.x, s.y + s.size + 12);
        ctx.restore();
    });



    // 5. Отрисовываем саму линию границы (Золотое свечение)
    ctx.beginPath();
    ctx.strokeStyle = '#eab308'; 
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#eab308';
    ctx.moveTo(borderPoints[0], 0);
    for (let y = 1; y < HEIGHT; y++) {
        ctx.lineTo(borderPoints[y], y);
    }
    ctx.stroke();
    
    // Сбрасываем тени, чтобы они не размывали прямоугольники при следующем кадре
    ctx.shadowBlur = 0;
}

/**
 * Получение точных координат курсора мыши или касания тач-скрина
 */
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Обчислюємо різницю масштабів CSS та внутрішньої роздільної здатності
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;

    return {
        x: Math.max(0, Math.min(WIDTH - 1, Math.floor((clientX - rect.left) * scaleX))),
        y: Math.max(0, Math.min(HEIGHT - 1, Math.floor((clientY - rect.top) * scaleY)))
    };
}


/**
 * Запись координаты X для конкретной горизонтали Y с ограничением по краям экрана
 */
function updateBorderAtPoint(x, y) {
    const targetX = Math.max(50, Math.min(WIDTH - 50, x));
    borderPoints[y] = targetX;
    
    // Дополнительно сглаживаем соседние пиксели по вертикали, 
    // чтобы при резких горизонтальных поворотах не было пустых разрывов
    if (y > 0) borderPoints[y - 1] = (borderPoints[y - 1] + targetX) / 2;
    if (y < HEIGHT - 1) borderPoints[y + 1] = (borderPoints[y + 1] + targetX) / 2;
}

// --- ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ РИСОВАНИЯ ---

function handleStart(e) {
    if (gameState !== 'drawing') return;
    isDrawing = true;
    lastPoint = getMousePos(e);
    updateBorderAtPoint(lastPoint.x, lastPoint.y);
    draw();
}

function handleMove(e) {
    if (!isDrawing || gameState !== 'drawing') return;
    if (e.touches) e.preventDefault();

    const currentPoint = getMousePos(e);
    if (!lastPoint) return;

    const startY = Math.min(lastPoint.y, currentPoint.y);
    const endY = Math.max(lastPoint.y, currentPoint.y);
    const distY = endY - startY;

    // Если мышь движется почти горизонтально (рисуем полку круга)
    if (distY === 0) {
        updateBorderAtPoint(currentPoint.x, currentPoint.y);
    } else {
        // Направленная интерполяция: плавно соединяем точки, не давая срезать углы
        for (let y = startY; y <= endY; y++) {
        const t = (y - lastPoint.y) / (currentPoint.y - lastPoint.y);
        const x = lastPoint.x + t * (currentPoint.x - lastPoint.x);
        updateBorderAtPoint(x, y);
        }
    }

    // СИЛОВОЕ СГЛАЖИВАНИЕ СОСЕДНИХ ЗОН (Убирает «лесенки» при попытке закруглить линию)
    const scanRadius = 8; // Чем выше число, тем мягче и круглее будут выходить петли
    for (let pass = 0; pass < 2; pass++) {
        let tempPoints = [...borderPoints];
        const updateStartY = Math.max(2, startY - scanRadius);
        const updateEndY = Math.min(HEIGHT - 3, endY + scanRadius);
        
        for (let y = updateStartY; y <= updateEndY; y++) {
        tempPoints[y] = (borderPoints[y - 2] + borderPoints[y - 1] + borderPoints[y] + borderPoints[y + 1] + borderPoints[y + 2]) / 5;
        }
        borderPoints = tempPoints;
    }

    lastPoint = currentPoint;
    draw();
}

function handleEnd() {
    if (isDrawing && gameState === 'drawing') {
        isDrawing = false;
        
        // Проверяем, есть ли уже войска на карте (признак режима перемирия)
        if (troopsLeft.length > 0 || troopsRight.length > 0) {
            statusText.textContent = "Линия изменена. Нажмите 'Утвердить новые границы', чтобы зафиксировать её.";
            statusText.style.color = "#cca700";
        } else {
            // Обычный первый запуск игры
            generateTroops();
            gameState = 'ready';
            btnAuto.disabled = false;
            originalBorderPoints = [...borderPoints];
            statusText.textContent = "Войска созданы! Запустите симуляцию для начала боя.";
            statusText.style.color = "#fff";
        }
    }
}

// Привязка событий мыши
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);

// Привязка событий тач-скрина (для мобильных)
canvas.addEventListener('touchstart', handleStart);
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd);

/**
 * Случайная генерация непересекающихся прямоугольников войск по обе стороны границы
 */
function generateTroops() {
    const countLeft = Math.floor(Math.random() * 4) + 3;  // Від 3 до 6 батальйонів
    const countRight = Math.floor(Math.random() * 4) + 3;

    // Функція перевірки перетину прямокутників, щоб вони не злипалися по вертикалі
    const overlaps = (rect, list) => list.some(r => !(
        rect.x + rect.w < r.x || 
        rect.x > r.x + r.w || 
        rect.y + rect.h < r.y || 
        rect.y > r.y + r.h
    ));

    // Генерація для лівої сторони (Сині) — ставимо впритул ліворуч від кордону
    for (let i = 0; i < countLeft; i++) {
        let attempts = 0;
        while (attempts < 100) {
            const tType = getRandomTroopType();
            const h = Math.floor(Math.random() * (tType.maxH - tType.minH)) + tType.minH;
            const w = Math.floor(Math.random() * (tType.maxW - tType.minW)) + tType.minW;
            const y = Math.floor(Math.random() * (HEIGHT - h - 20)) + 10;

            const borderX = borderPoints[Math.floor(y + h / 2)];
            const x = borderX - w;
            
            // Добавляем новые параметры в объект
            const newRect = { 
                x, y, w, h, 
                type: tType.icon,
                troopSpeedY: tType.speedY,
                troopMarchSpeed: tType.marchX,
                pushPower: tType.pushPower
            };
            if (!overlaps(newRect, troopsLeft) && x > 10) {
                troopsLeft.push(newRect);
                break;
            }
            attempts++;
        }
    }

    // Генерація для правої сторони (Червоні) — ставимо впритул праворуч від кордону
    for (let i = 0; i < countRight; i++) {
        let attempts = 0;
        while (attempts < 100) {
            const tType = getRandomTroopType();
            const h = Math.floor(Math.random() * (tType.maxH - tType.minH)) + tType.minH;
            const w = Math.floor(Math.random() * (tType.maxW - tType.minW)) + tType.minW;
            const y = Math.floor(Math.random() * (HEIGHT - h - 20)) + 10;

            const borderX = borderPoints[Math.floor(y + h / 2)];
            const x = borderX - w;
            
            // Добавляем новые параметры в объект
            const newRect = { 
                x, y, w, h, 
                type: tType.icon,
                troopSpeedY: tType.speedY,
                troopMarchSpeed: tType.marchX,
                pushPower: tType.pushPower
            };
            if (!overlaps(newRect, troopsRight) && x < WIDTH - w - 10) {
                troopsRight.push(newRect);
                break;
            }
            attempts++;
        }
    }
    draw();
}


/**
 * Проверка: перекрывает ли список войск конкретную Y-координату строки
 */
function isYCoveredByTroops(y, troopsList) {
    return troopsList.some(t => y >= t.y && y <= (t.y + t.h));
}

// --- ЛОГИКА КНОПКИ АТАКОВАТЬ ---
function runBattleTick() {
    if (gameState !== 'ready' && gameState !== 'battle') return;
    gameState = 'battle';

    if (typeof startReinforcements === 'function') {
        startReinforcements();
    }

    const combatShiftSpeed = 5; 
    const freeShiftSpeed = 2;   
    const troopMoveYSpeed = 4;  
    const marchSpeed = 6;       
    const padding = 8; // Безопасный отступ от золотой линии

    // 1. Сбрасываем флаги боя перед проверкой
    troopsLeft.forEach(t => t.underAttack = false);
    troopsRight.forEach(t => t.underAttack = false);

    // 2. Рассчитываем движение для участков активного столкновения армий
    // Бой засчитывается, если отряды просто пересекаются по вертикали (Y) и находятся близко к фронту
    troopsLeft.forEach(l => {
        troopsRight.forEach(r => {
            const isCollidingY = !(l.y + l.h < r.y || l.y > r.y + r.h);
            
            // Если они на одной высоте Y и горизонтальное расстояние между ними небольшое — они дерутся
            const distanceX = r.x - (l.x + l.w);
            if (isCollidingY && distanceX < 40) {
                l.underAttack = true;
                r.underAttack = true;

                const overlapYStart = Math.max(l.y, r.y);
                const overlapYEnd = Math.min(l.y + l.h, r.y + r.h);

                // Двигаем границу в зависимости от того, у кого больше pushPower (сила продавливания)
                // (Если силы равны, сравниваем ширину отрядов, как и было)
                // (Если силы равны, сравниваем ширину отрядов, как и было)
                for (let y = overlapYStart; y <= overlapYEnd; y++) {
                    // Получаем реальный векторный рельеф в этой точке фронта!
                    let terrain = getTerrainTypeAt(borderPoints[y], y); 


                    // Модифицируем силу продавливания
                    const powerL = l.pushPower * terrain.powerMult;
                    const powerR = r.pushPower * terrain.powerMult;

                    if (powerL !== powerR) {
                        if (powerL > powerR) borderPoints[y] += (4 * terrain.speedMult);
                        else borderPoints[y] -= (4 * terrain.speedMult);
                    } else {
                        if (l.w > r.w) borderPoints[y] += (3 * terrain.speedMult);
                        else if (r.w > l.w) borderPoints[y] -= (3 * terrain.speedMult);
                    }
                }


            }
        });
    });

    // 3. Для свободных от боя участков двигаем границу
    for (let y = 0; y < HEIGHT; y++) {
        // Проверяем, есть ли на этой высоте отряды, которые уже подошли к фронту
        const hasLeft = troopsLeft.some(t => y >= t.y && y <= t.y + t.h && t.x >= borderPoints[y] - t.w - 30);
        const hasRight = troopsRight.some(t => y >= t.y && y <= t.y + t.h && t.x <= borderPoints[y] + 30);

        if (hasLeft && !hasRight) {
            borderPoints[y] += freeShiftSpeed;
        } else if (!hasLeft && hasRight) {
            borderPoints[y] -= freeShiftSpeed;
        }
    }

    // 4. ТАКТИЧЕСКИЙ МАНЕВР: Фланговые обходы для разведки и поддержка для остальных
    troopsLeft.forEach(l => {
    if (!l.underAttack && troopsRight.length > 0) {
        if (l.type === 'recon') {
        // РАЗВЕДКА: ищет координату Y, где НЕТ вражеских войск, чтобы зайти с фланга
        let bestY = l.y;
        let maxDistToEnemy = -1;
        for (let testY = 10; testY < HEIGHT - 10; testY += 40) {
            let hasEnemy = troopsRight.some(r => testY >= r.y && testY <= r.y + r.h);
            if (!hasEnemy) {
            let dist = Math.abs(l.y - testY);
            if (dist > maxDistToEnemy) { maxDistToEnemy = dist; bestY = testY; }
            }
        }
        if (l.y < bestY) l.y += l.troopSpeedY; else if (l.y > bestY) l.y -= l.troopSpeedY;
        } else {
        // Пехота и Танки: идут на помощь к ближайшему врагу (старая логика)
        let closestEnemy = troopsRight[0]; let minDist = HEIGHT * 2;
        troopsRight.forEach(r => { const dist = Math.abs((l.y + l.h/2) - (r.y + r.h/2)); if (dist < minDist) { minDist = dist; closestEnemy = r; } });
        if (l.y + l.h/2 < closestEnemy.y + closestEnemy.h/2) l.y += l.troopSpeedY; else l.y -= l.troopSpeedY;
        }
    }
    });

    troopsRight.forEach(r => {
    if (!r.underAttack && troopsLeft.length > 0) {
        if (r.type === 'recon') {
        // РАЗВЕДКА: ищет пустой фланг
        let bestY = r.y;
        let maxDistToEnemy = -1;
        for (let testY = 10; testY < HEIGHT - 10; testY += 40) {
            let hasEnemy = troopsLeft.some(l => testY >= l.y && testY <= l.y + l.h);
            if (!hasEnemy) {
            let dist = Math.abs(r.y - testY);
            if (dist > maxDistToEnemy) { maxDistToEnemy = dist; bestY = testY; }
            }
        }
        if (r.y < bestY) r.y += r.troopSpeedY; else if (r.y > bestY) r.y -= r.troopSpeedY;
        } else {
        let closestEnemy = troopsLeft[0]; let minDist = HEIGHT * 2;
        troopsLeft.forEach(l => { const dist = Math.abs((r.y + r.h/2) - (l.y + l.h/2)); if (dist < minDist) { minDist = dist; closestEnemy = l; } });
        if (r.y + r.h/2 < closestEnemy.y + closestEnemy.h/2) r.y += r.troopSpeedY; else r.y -= r.troopSpeedY;
        }
    }
    });


    // 5. ДВИЖЕНИЕ ПОДКРЕПЛЕНИЙ С КРАЕВ (Марш к фронту)
    troopsLeft.forEach(t => {
        let minBorderX = WIDTH;
        for (let y = Math.floor(t.y); y < Math.floor(t.y + t.h); y++) {
            if (y >= 0 && y < HEIGHT && borderPoints[y] < minBorderX) minBorderX = borderPoints[y];
        }
        const expectedX = minBorderX - t.w - padding;
        if (t.x < expectedX - 5) {
            // Считываем скорость прямо из точки, где наступает левый отряд
            let terrainL = getTerrainTypeAt(t.x + t.w / 2, t.y + t.h / 2);
            let speedMultL = terrainL.speedMult;

            t.x += (t.troopMarchSpeed * speedMultL);
            if (t.targetY !== undefined) {
                if (t.y < t.targetY) t.y += 2;
                else if (t.y > t.targetY) t.y -= 2;
            }
        }
    });

    troopsRight.forEach(r => {
        let maxBorderX = 0;
        for (let y = Math.floor(r.y); y < Math.floor(r.y + r.h); y++) {
            if (y >= 0 && y < HEIGHT && borderPoints[y] > maxBorderX) maxBorderX = borderPoints[y];
        }
        const expectedX = maxBorderX + padding;
        if (r.x > expectedX + 5) {
            // Считываем скорость прямо из точки, где наступает правый отряд
            let terrainR = getTerrainTypeAt(r.x + r.w / 2, r.y + r.h / 2);
            let speedMultR = terrainR.speedMult;

            r.x -= (r.troopMarchSpeed * speedMultR);
            if (r.targetY !== undefined) {
                if (r.y < r.targetY) r.y += 2;
                else if (r.y > r.targetY) r.y -= 2;
            }
        }
    });

    // Удерживаем координаты Y в рамках экрана
    [...troopsLeft, ...troopsRight].forEach(t => {
        if (t.y < 5) t.y = 5;
        if (t.y + t.h > HEIGHT - 5) t.y = HEIGHT - t.h - 5;
    });

    // 6. ПЛАВНОСТЬ: Сглаживаем углы границы
    for (let pass = 0; pass < 3; pass++) {
        let smoothed = [...borderPoints];
        for (let y = 2; y < HEIGHT - 2; y++) {
            smoothed[y] = (borderPoints[y - 2] + borderPoints[y - 1] + borderPoints[y] + borderPoints[y + 1] + borderPoints[y + 2]) / 5;
        }
        borderPoints = smoothed;
    }

    // 7. НАНЕСЕНИЕ УРОНА: Уменьшаем ширину дерущихся отрядов с учетом окружения и удара в тыл

    // --- РАСЧЕТ ДЛЯ СТРАНЫ А (СИНИЕ) ---
    troopsLeft.forEach(t => {
        if (t.underAttack) {
            let multiplier = 1.0;
            let isFlanked = false;    // Зажат с двух сторон (сверху и снизу)
            let isBackstabbed = false; // Получил удар в тыл (враг зашел справа, а боец развернут влево, либо обойден с тыла)

            // Ищем всех врагов (красных), которые дерутся именно с этим отрядом 't'
            let attackers = troopsRight.filter(r => {
                const isCollidingY = !(t.y + t.h < r.y || t.y > r.y + r.h);
                const distanceX = r.x - (t.x + t.w);
                return isCollidingY && distanceX < 40;
            });

            if (attackers.length >= 2) {
                // Проверяем окружение: есть ли враг выше центра нашего отряда И враг ниже центра нашего отряда
                let myCenterY = t.y + t.h / 2;
                let enemyAbove = attackers.some(r => (r.y + r.h / 2) < myCenterY - 10);
                let enemyBelow = attackers.some(r => (r.y + r.h / 2) > myCenterY + 10);
                if (enemyAbove && enemyBelow) {
                    isFlanked = true;
                }
            }

            // Проверяем удар в тыл: Синие наступают слева направо. Если враг оказался ЛЕВЕЕ, чем передняя линия синего отряда, он бьет в тыл
            isBackstabbed = attackers.some(r => r.x < t.x + 10);

            // Выставляем коэффициенты урона
            if (isFlanked && isBackstabbed) multiplier = 3.0; // И в окружении, и в тыл
            else if (isBackstabbed) multiplier = 2.5;         // Чистый удар в спину
            else if (isFlanked) multiplier = 2.0;             // Зажали сверху и снизу
            
            let armorMultiplier = 1.0;
            // Считываем тип ландшафта прямо под центром текущего батальона
            let currentTerrain = getTerrainTypeAt(t.x + t.w / 2, t.y + t.h / 2); 

            if (t.type === 'tank') armorMultiplier = 0.58;  // Танки очень прочные
            if (t.type === 'recon') armorMultiplier = 1.4;

            // Спец-свойства Леса и Болота для баланса классов:
            if (currentTerrain.name === 'Лес') {
                if (t.type === 'recon') armorMultiplier *= 0.5; // Разведка в лесу маскируется (урон снижен в 2 раза!)
                if (t.type === 'infantry') armorMultiplier *= 0.85; // Пехота тоже использует укрытия деревьев
            }
            if (currentTerrain.name === 'Болото') {
                if (t.type === 'tank') armorMultiplier *= 1.8; // Тяжелые танки застревают в грязи и получают почти двойной урон!
                if (t.type === 'infantry') armorMultiplier *= 0.9; // Легкая пехота без труда обходит трясину
            }

            // Урон для всех типов войск теперь рассчитывается одинаково (множитель удален отсюда)
            const damage = (Math.random() * 4 + 2) * multiplier * armorMultiplier;
            const actualDamage = Math.min(damage, t.w);

            // Определяем коэффициент веса потерь для панели статистики
            let lossWeight = 1.0; 
            if (t.type === 'tank') lossWeight = 0.25;  // Танки дают в 4 раза меньше очков в общие потери
            if (t.type === 'recon') lossWeight = 0.5;   // Разведка дает в 2 раза меньше очков в общие потери

            // Применяем коэффициент ТОЛЬКО к итоговой цифре потерь
            // Танк дает х4 к потере площади, пехота и разведка — х1
            let areaWeight = (t.type === 'tank') ? 2 : 0.5;
            lossesLeft += actualDamage * t.h * areaWeight;

            t.w -= actualDamage;


            // Нагреваем хитмап пропорционально нанесенному урону строго по высоте худеющего отряда
            if (actualDamage > 0) {
                for (let y = Math.floor(t.y); y <= Math.floor(t.y + t.h); y++) {
                    if (y >= 0 && y < borderPoints.length) {
                        let currentX = borderPoints[y]; 
                        let gx = Math.floor(currentX / GRID_SIZE);
                        let gy = Math.floor(y / GRID_SIZE);

                        if (gy >= 0 && gy < heatmapGrid.length && gx >= 0 && gx < heatmapGrid[gy].length) {
                            heatmapGrid[gy][gx] += actualDamage * 0.4; 
                        }
                    }
                }
            }

        }
    });

    // --- РАСЧЕТ ДЛЯ СТРАНЫ Б (КРАСНЫЕ) ---
    troopsRight.forEach(t => {
        if (t.underAttack) {
            let multiplier = 1.0;
            let isFlanked = false;
            let isBackstabbed = false;

            // Ищем всех врагов (синих), которые дерутся с этим отрядом 't'
            let attackers = troopsLeft.filter(l => {
                const isCollidingY = !(l.y + l.h < t.y || l.y > t.y + t.h);
                const distanceX = t.x - (l.x + l.w);
                return isCollidingY && distanceX < 40;
            });

            if (attackers.length >= 2) {
                // Проверяем окружение по вертикали (сверху и снизу)
                let myCenterY = t.y + t.h / 2;
                let enemyAbove = attackers.some(l => (l.y + l.h / 2) < myCenterY - 10);
                let enemyBelow = attackers.some(l => (l.y + l.h / 2) > myCenterY + 10);
                if (enemyAbove && enemyBelow) {
                    isFlanked = true;
                }
            }

            // Проверяем удар в тыл: Красные наступают справа налево. Если синий враг оказался ПРАВЕЕ правого края красного отряда, это удар в тыл
            isBackstabbed = attackers.some(l => (l.x + l.w) > (t.x + t.w - 10));

            // Выставляем коэффициенты урона
            if (isFlanked && isBackstabbed) multiplier = 3.0;
            else if (isBackstabbed) multiplier = 2.5;
            else if (isFlanked) multiplier = 2.0;
            
            let armorMultiplier = 1.0; 
            // Считываем тип ландшафта прямо под центром текущего батальона
            let currentTerrain = getTerrainTypeAt(t.x + t.w / 2, t.y + t.h / 2);


            if (t.type === 'tank') armorMultiplier = 0.58;  // Танки очень прочные
            if (t.type === 'recon') armorMultiplier = 1.4;

            // Спец-свойства Леса и Болота для баланса классов:
            if (currentTerrain.name === 'Лес') {
                if (t.type === 'recon') armorMultiplier *= 0.5; // Разведка в лесу маскируется (урон снижен в 2 раза!)
                if (t.type === 'infantry') armorMultiplier *= 0.85; // Пехота тоже использует укрытия деревьев
            }
            if (currentTerrain.name === 'Болото') {
                if (t.type === 'tank') armorMultiplier *= 1.8; // Тяжелые танки застревают в грязи и получают почти двойной урон!
                if (t.type === 'infantry') armorMultiplier *= 0.9; // Легкая пехота без труда обходит трясину
            }

            // Урон для всех типов войск теперь рассчитывается одинаково (множитель удален отсюда)
            const damage = (Math.random() * 4 + 2) * multiplier * armorMultiplier;
            const actualDamage = Math.min(damage, t.w);

            // Определяем коэффициент веса потерь для панели статистики
            let lossWeight = 1.0; 
            if (t.type === 'tank') lossWeight = 0.25;  
            if (t.type === 'recon') lossWeight = 0.5;   

            // Применяем коэффициент ТОЛЬКО к итоговой цифре потерь
            // Танк дает х4 к потере площади, пехота и разведка — х1
            let areaWeight = (t.type === 'tank') ? 2 : 0.5;
            lossesRight += actualDamage * t.h * areaWeight;

            t.w -= actualDamage;


            // Нагреваем хитмап пропорционально нанесенному урону строго по высоте худеющего отряда
            if (actualDamage > 0) {
                for (let y = Math.floor(t.y); y <= Math.floor(t.y + t.h); y++) {
                    if (y >= 0 && y < borderPoints.length) {
                        let currentX = borderPoints[y]; 
                        let gx = Math.floor(currentX / GRID_SIZE);
                        let gy = Math.floor(y / GRID_SIZE);

                        if (gy >= 0 && gy < heatmapGrid.length && gx >= 0 && gx < heatmapGrid[gy].length) {
                            heatmapGrid[gy][gx] += actualDamage * 0.4; 
                        }
                    }
                }
            }


        }
    });


    // Удаляем уничтоженные войска
    troopsLeft = troopsLeft.filter(t => t.w > 5);
    troopsRight = troopsRight.filter(t => t.w > 5);

    // 8. КОНЕЧНАЯ ПРИВЯЗКА К ЛИНИИ С ЗАЗОРОМ (По новой сглаженной кривой)
    troopsLeft.forEach(t => {
        let minBorderX = WIDTH;
        for (let y = Math.floor(t.y); y < Math.floor(t.y + t.h); y++) {
            if (y >= 0 && y < HEIGHT && borderPoints[y] < minBorderX) minBorderX = borderPoints[y];
        }
        const expectedX = minBorderX - t.w - padding;
        if (t.x >= expectedX - 12) {
            t.x = expectedX;
        }
    });

    troopsRight.forEach(r => {
        let maxBorderX = 0;
        for (let y = Math.floor(r.y); y < Math.floor(r.y + r.h); y++) {
            if (y >= 0 && y < HEIGHT && borderPoints[y] > maxBorderX) maxBorderX = borderPoints[y];
        }
        const expectedX = maxBorderX + padding;
        if (r.x <= expectedX + 12) {
            r.x = expectedX;
        }

        // Жесткая коллизия между отрядами лицом к лицу
        troopsLeft.forEach(l => {
            const isCollidingY = !(l.y + l.h < r.y || l.y > r.y + r.h);
            if (isCollidingY) {
                if (r.x < l.x + l.w + padding) {
                    r.x = l.x + l.w + padding;
                    const overlapYStart = Math.max(l.y, r.y);
                    const overlapYEnd = Math.min(l.y + l.h, r.y + r.h);
                    for (let y = overlapYStart; y <= overlapYEnd; y++) {
                        borderPoints[y] = r.x - padding / 2;
                    }
                }
            }
        });
    });

    // Фиксируем границы экрана
    for (let y = 0; y < HEIGHT; y++) {
        borderPoints[y] = Math.max(0, Math.min(WIDTH, borderPoints[y]));
    }
    
    // ВКЛЮЧАЄМО КОЛІЗІЮ: Розштовхуємо прямокутники синіх і червоних окремо
    resolveTroopCollisions(troopsLeft, true);
    resolveTroopCollisions(troopsRight, false);
    
    // Обновляем счетчик потерь на панели (округляем до целых для красоты)
    if (gameState === 'battle') {
    statusText.textContent = `Потери А: ${Math.floor(lossesLeft)} | Потери Б: ${Math.floor(lossesRight)}`;
    statusText.style.color = "#fff";
    }

    draw();
    checkVictory();

    // --- ДИВЕРСИОННАЯ ЛОГИКА РАЗВЕДКИ (Перехват контроля над городами) ---
    const captureRadius = 70; // Дистанция, на которой разведка замечает и перерезает снабжение города

    settlements.forEach(s => {
        // Синяя разведка (Страна А) продвигает границу за город, если подошла близко к его тылу
        troopsLeft.forEach(t => {
            if (t.type === 'recon') {
                const dist = Math.hypot((t.x + t.w / 2) - s.x, (t.y + t.h / 2) - s.y);
                if (dist < captureRadius) {
                    // Плавно сдвигаем координату границы на высоте города в пользу Страны А
                    borderPoints[Math.floor(s.y)] = Math.max(borderPoints[Math.floor(s.y)], s.x + 15);
                }
            }
        });

        // Красная разведка (Страна Б) захватывает города в тылу Синих
        troopsRight.forEach(t => {
            if (t.type === 'recon') {
                const dist = Math.hypot((t.x + t.w / 2) - s.x, (t.y + t.h / 2) - s.y);
                if (dist < captureRadius) {
                    // Плавно сдвигаем координату границы на высоте города в пользу Страны Б
                    borderPoints[Math.floor(s.y)] = Math.min(borderPoints[Math.floor(s.y)], s.x - 15);
                }
            }
        });
    });

};

/**
 * Проверка условий победы по состоянию границы и остатку армий
 */
function checkVictory() {
    let leftEdgeCount = 0, rightEdgeCount = 0;
    for (let y = 0; y < HEIGHT; y++) { 
        if (borderPoints[y] <= 0) leftEdgeCount++; 
        if (borderPoints[y] >= WIDTH) rightEdgeCount++; 
    }
    
    if (rightEdgeCount > HEIGHT * 0.95 || (troopsRight.length === 0 && troopsLeft.length > 0)) {
        gameState = 'gameover'; 
        if (reinforcementInterval) {
            clearInterval(reinforcementInterval);
            reinforcementInterval = null;
        }
        // Добавлена статистика потерь в конец строки
        statusText.textContent = `ПОБЕДА СТРАНЫ А! 🎉 (Потери А: ${Math.floor(lossesLeft)} | Б: ${Math.floor(lossesRight)})`; 
        statusText.style.color = "#4a90e2";
        
    } else if (leftEdgeCount > HEIGHT * 0.95 || (troopsLeft.length === 0 && troopsRight.length > 0)) {
        gameState = 'gameover'; 
        if (reinforcementInterval) {
            clearInterval(reinforcementInterval);
            reinforcementInterval = null;
        }
        // Добавлена статистика потерь в конец строки
        statusText.textContent = `ПОБЕДА СТРАНЫ Б! 🎉 (Потери А: ${Math.floor(lossesLeft)} | Б: ${Math.floor(lossesRight)})`; 
        statusText.style.color = "#e24a4a";
        
    } else if (troopsLeft.length === 0 && troopsRight.length === 0) {
        gameState = 'gameover'; 
        if (reinforcementInterval) {
            clearInterval(reinforcementInterval);
            reinforcementInterval = null;
        }
        statusText.textContent = `НИЧЬЯ! (Потери А: ${Math.floor(lossesLeft)} | Б: ${Math.floor(lossesRight)})`; 
        statusText.style.color = "#eab308";
    }

    if (gameState === 'gameover' && autoInterval) {
        btnSpeed.style.display = "none";
        clearInterval(autoInterval);
        autoInterval = null;
        btnAuto.disabled = true;
        btnAuto.classList.remove('active');
    }
}


btnReset.addEventListener('click', init);
// Допоміжна функція для запуску/перезапуску таймера з урахуванням швидкості

function startAutoInterval() { 
    if (autoInterval) clearInterval(autoInterval);
    const intervalTime = 100 / simSpeed;
    autoInterval = setInterval(() => {
        runBattleTick(); // Теперь напрямую вызываем боевой шаг без симуляции кликов
    }, intervalTime);
}


btnAuto.addEventListener('click', () => {
    if (gameState === 'gameover' || gameState === 'drawing') return;

    if (autoInterval) {
        // --- ПАУЗА ---
        clearInterval(autoInterval);
        autoInterval = null;
        
        // ЗУПИНЯЄМО підкріплення на паузі, щоб вони не засмічували екран
        if (reinforcementInterval) {
            clearInterval(reinforcementInterval);
            reinforcementInterval = null;
        }

        btnAuto.classList.remove('active');
        btnAuto.textContent = "Запустить симуляцию";
        btnSpeed.style.display = "none"; 

        // Прячем кнопку мира на паузе
        btnPeace.style.display = "none";
    } else {
        // --- СТАРТ ---
        btnAuto.classList.add('active');
        btnAuto.textContent = "Поставить на паузу";
        btnSpeed.style.display = "inline-block"; 
        
        // Автоматически включаем состояние боя, если игра была готова
        if (gameState === 'ready') {
            gameState = 'battle';
        }
        
        // Показываем кнопку заключения мира, скрываем кнопку подтверждения
        if (gameState === 'battle') {
            btnPeace.style.display = "inline-block";
        }

        startAutoInterval();
        
        // ЗНОВУ ЗАПУСКАЄМО підкріплення при знятті з паузи
        if (typeof startReinforcements === 'function') {
            startReinforcements();
        }
    }
});

btnSpeed.addEventListener('click', () => {
    // Циклічно міняємо швидкість: 1x -> 2x -> 3x -> 0.5x -> 1x
    if (simSpeed === 1) {
        simSpeed = 2;
    } else if (simSpeed === 2) {
        simSpeed = 3;
    } else if (simSpeed === 3) {
        simSpeed = 0.5;
    } else {
        simSpeed = 1;
    }
    
    // Оновлюємо текст на кнопці
    btnSpeed.textContent = `Скорость: ${simSpeed}x`;
    
    // Якщо симуляція активна, миттєво перезапускаємо таймер з новою швидкістю
    if (autoInterval) {
        startAutoInterval();
    }
});

function startReinforcements() {
    // Якщо таймер уже працює, нічого не робимо, щоб не дублювати його
    if (reinforcementInterval) return;
    let reinforcementTicks = 0; 

    reinforcementInterval = setInterval(() => {
        // Выбираем случайное количество отрядов для левой и правой стороны (минимум 1)
        const countL = Math.floor(Math.random() * 10) + 1; // Например, от 1 до 3
        const countR = Math.floor(Math.random() * 10) + 1;

        // 1. Создаем левое подкрепление (Синие)
        for (let i = 0; i < countL; i++) {
            // При создании левого подкрепления (Синие)
            const tType = getRandomTroopType();
            const hL = Math.floor(Math.random() * (tType.maxH - tType.minH)) + tType.minH;
            const wL = Math.floor(Math.random() * (tType.maxW - tType.minW)) + tType.minW;
            const yL = Math.floor(Math.random() * (HEIGHT - hL - 20)) + 10;

            troopsLeft.push({
                x: 5, y: yL, w: wL, h: hL,
                type: tType.icon,
                troopSpeedY: tType.speedY,
                troopMarchSpeed: tType.marchX,
                pushPower: tType.pushPower,
                targetY: Math.floor(Math.random() * (HEIGHT - hL - 20)) + 10
            });

        }

        // // 2. Создаем правое подкрепление (Червоні)
        for (let i = 0; i < countR; i++) {
            // При создании правого подкрепления (Червоні)
            const tType = getRandomTroopType();
            const hR = Math.floor(Math.random() * (tType.maxH - tType.minH)) + tType.minH;
            const wR = Math.floor(Math.random() * (tType.maxW - tType.minW)) + tType.minW;
            const yR = Math.floor(Math.random() * (HEIGHT - hR - 20)) + 10;

            // ИСПРАВЛЕНО: Теперь пушим именно в troopsRight и используем правильные переменные со знаком R
            troopsRight.push({
                x: WIDTH - wR - 5,
                y: yR,
                w: wR,
                h: hR,
                type: tType.icon,
                troopSpeedY: tType.speedY,
                troopMarchSpeed: tType.marchX,
                pushPower: tType.pushPower,
                targetY: Math.floor(Math.random() * (HEIGHT - hR - 20)) + 10
            });
        }

        // --- ДОБАВЛЕНИЕ: Гарнизоны из удерживаемых городов ---
        // Поскольку setInterval срабатывает каждые 3000 мс (3 секунды),
        // вводим счетчик циклов, чтобы для оккупированных городов код срабатывал раз в 3 цикла (3 * 3 = 9 секунд).

        if (typeof reinforcementTicks === 'undefined') {
            window.reinforcementTicks = 0;
        }
        window.reinforcementTicks++;

        settlements.forEach(s => {
            const borderXatY = borderPoints[Math.floor(s.y)];
            const isLeftControl = s.x < borderXatY; // Кто сейчас контролирует город
            
            // Изначальный владелец города (в начале игры левая половина экрана — Страна А, правая — Страна Б)
            const originalOwnerLeft = s.x < (WIDTH / 2); 
            const isOccupied = isLeftControl !== originalOwnerLeft; // Город оккупирован, если текущий контроль не совпадает с изначальным

            // Если город оккупирован, пускаем подкрепление только каждый 3-й цикл интервала (раз в 9 секунд)
            if (isOccupied && window.reinforcementTicks % 3 !== 0) {
                return; // Пропускаем этот цикл для оккупированного города
            }

            // С шансом 20% город отправляет небольшой батальон
            if (Math.random() < 0.20) {
                const tType = getRandomTroopType();
                
                // Размеры гарнизонного отряда (чуть меньше стандартных для баланса)
                const h = Math.floor(Math.random() * (tType.maxH - tType.minH)) + tType.minH;
                const w = Math.floor(Math.random() * (tType.maxW - tType.minW)) + tType.minW; 
                
                if (isLeftControl) {
                    troopsLeft.push({
                        x: s.x, y: s.y - h/2, w: w, h: h,
                        type: tType.icon,
                        troopSpeedY: tType.speedY,
                        troopMarchSpeed: tType.marchX,
                        pushPower: tType.pushPower,
                        targetY: Math.floor(Math.random() * (HEIGHT - h - 20)) + 10
                    });
                } else {
                    troopsRight.push({
                        x: s.x - w, y: s.y - h/2, w: w, h: h,
                        type: tType.icon,
                        troopSpeedY: tType.speedY,
                        troopMarchSpeed: tType.marchX,
                        pushPower: tType.pushPower,
                        targetY: Math.floor(Math.random() * (HEIGHT - h - 20)) + 10
                    });
                }
            }
        });

        
        draw(); 
    }, 3000); 

}

function resolveTroopCollisions(list, isLeftCountry) {
    // Проходимо по масиву військ кілька разів для точного розштовхування великих скупчень
    for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i];
                const b = list[j];

                // Обчислюємо перекриття по осях X та Y
                const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
                const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

                // Якщо є перетинання за обома осями — загін наїхав на загін
                if (overlapX > 0 && overlapY > 0) {
                    // Розштовхуємо в тому напрямку, де перекриття менше (по вертикалі)
                    if (overlapY < overlapX) {
                        if (a.y + a.h / 2 < b.y + b.h / 2) {
                            a.y -= overlapY / 2;
                            b.y += overlapY / 2;
                        } else {
                            a.y += overlapY / 2;
                            b.y -= overlapY / 2;
                        }
                    } else {
                        // Якщо перекриття менше по горизонталі — штовхаємо назад у тил того, хто позаду
                        if (isLeftCountry) {
                            // Для синіх: той, у кого менший X, відсувається лівіше (в тил)
                            if (a.x < b.x) a.x -= overlapX; else b.x -= overlapX;
                        } else {
                            // Для червоних: той, у кого більший X, відсувається правіше (в тил)
                            if (a.x > b.x) a.x += overlapX; else b.x += overlapX;
                        }
                    }
                }
            }
        }
    }
}

// Генератор випадкового яскравого кольору в форматі HEX
function getRandomHexColor() {
    // Випадковим чином вирішуємо, який тип кольору згенерувати (0 - пастельний, 1 - монохромний/сірий)
    const type = Math.floor(Math.random() * 2);

    if (type === 0) {
        // Генерація пастельних кольорів (змішуємо випадковий колір з великою кількістю білого)
        const r = Math.floor((Math.random() * 100) + 130);
        const g = Math.floor((Math.random() * 100) + 130);
        const b = Math.floor((Math.random() * 100) + 130);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        // Генерація монохромної палітри: від чистого білого, через сірий, до темного
        const grayscalePresets = [
            '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', 
            '#9ca3af', '#4b5563', '#374151', '#1f2937', '#111827'
        ];
        return grayscalePresets[Math.floor(Math.random() * grayscalePresets.length)];
    }
}


// Генерує унікальний стиль прапора та фону для обох країн
function generateCountryStyles() {
        // База данных реальных стран (название, эмодзи флага и цвет заливки территории)
    const REAL_COUNTRIES = [
        { name: "Украина", flag: "🇺🇦", bg: "#1e3a8a", textColor: "#fff" },
        { name: "США", flag: "🇺🇸", bg: "#0f172a", textColor: "#fff" },
        { name: "Великобритания", flag: "🇬🇧", bg: "#172554", textColor: "#fff" },
        { name: "Германия", flag: "🇩🇪", bg: "#292524", textColor: "#fff" },
        { name: "Франция", flag: "🇫🇷", bg: "#1e1b4b", textColor: "#fff" },
        { name: "Япония", flag: "🇯🇵", bg: "#f8fafc", textColor: "#000" },
        { name: "Канада", flag: "🇨🇦", bg: "#7f1d1d", textColor: "#fff" },
        { name: "Бразилия", flag: "🇧🇷", bg: "#064e3b", textColor: "#fff" },
        { name: "Польша", flag: "🇵🇱", bg: "#fff5f5", textColor: "#000" },
        { name: "Италия", flag: "🇮🇹", bg: "#022c22", textColor: "#fff" },
        { name: "Испания", flag: "🇪🇸", bg: "#451a03", textColor: "#fff" },
        { name: "Казахстан", flag: "🇰🇿", bg: "#06b6d4", textColor: "#fff" }
    ];

    // Шанс появления реальной страны (0.4 = 40% шанс для каждой из сторон)
    const realFlagChance = 0.4;

    // Величезний вибір історичних та класичних типів прапорів
    const flagTypes = [
    'horizontal-tricolor', 'vertical-bicolor', 'monocolor', 'cross', 'nordic',
    'vertical-tricolor', 'triangle-chevron', 'diagonal', 'border-frame',
    'horizontal-bicolor', 'quarters', 'sunburst', 'stripes-multi', 'saltire',           // Андріївський хрест (косий хрест)
    'scand-cross-thin',  // Скандинавський хрест із тонкою внутрішньою лінією
    'pall',              // Вилоподібний хрест (як на прапорі ПАР)
    'stripes-vertical',  // Багато вертикальних смуг
    'double-chevron'     // Подвійний шеврон зліва // Новые типы геометрий
    ]; 

    const emblems = [
    'none', 'star', 'crescent', 'cross-emblem', 'circle', 'crown', 'shield', 
    'sword', 'sun', 'diamond', 'skull', 'heart', 'anchor', 'rune',
    'eagle',      // Геральдичний двоголовий орел
    'lion',       // Геральдичний лев, що стоїть на задніх лапах
    'gear',       // Шестерня (для технократичних націй)
    'tree',       // Древо життя / лісовий союз
    'hammer',     // Молот сили
    'infinity'    // Знак нескінченності / вічна імперія// Новые декорации
    ];

    const realFlagColors = [
        '#ffffff', // Білий
        '#d52b1e', // Червоний
        '#0038a8', // Синій
        '#009b48', // Зелений
        '#ffd100', // Жовтий / Золотий
        '#111111'  // Чорний
    ];

    const getUniqueColors = () => {
        let shuffled = [...realFlagColors].sort(() => Math.random() - 0.5);
        return [shuffled[0], shuffled[1], shuffled[2]];
    };

    // Допоміжна перевірка: чи підходить тип прапора для нанесення емблеми
    const allowsEmblem = (type) => ['horizontal-tricolor', 'vertical-bicolor', 'monocolor', 'vertical-tricolor', 'diagonal', 'border-frame', 'saltire', 'pall'].includes(type);

    // Стиль для Лівої країни (Страна А)
    const typeL = flagTypes[Math.floor(Math.random() * flagTypes.length)];
    const colorsL = getUniqueColors();
    countryStyles.left = {
        bg: getRandomHexColor(),
        flagType: typeL,
        colors: colorsL,
        emblem: allowsEmblem(typeL) ? emblems[Math.floor(Math.random() * emblems.length)] : 'none',
        emblemColor: ['#ffffff', '#ffd100'].includes(colorsL[0]) ? '#111111' : '#ffffff'
    };

    // Стиль для Правої країни (Страна Б)
    const typeR = flagTypes[Math.floor(Math.random() * flagTypes.length)];
    const colorsR = getUniqueColors();
    countryStyles.right = {
        bg: getRandomHexColor(),
        flagType: typeR,
        colors: colorsR,
        emblem: allowsEmblem(typeR) ? emblems[Math.floor(Math.random() * emblems.length)] : 'none',
        emblemColor: ['#ffffff', '#ffd100'].includes(colorsR[0]) ? '#111111' : '#ffffff'
    };

}


// Допоміжна функція малювання прапора всередині прямокутника військ
function drawFlagInsideRect(x, y, w, h, troop, isLeftCountry) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // ИСПРАВЛЕНО: Теперь стиль берется строго по переданному флагу страны, 
    // независимо от того, в какой точке экрана находится прямоугольник!
    const style = isLeftCountry ? countryStyles.left : countryStyles.right;
    const c = style.colors;

    // 1. ОТРИСОВКА БАЗОВОЇ ТЕКСТУРИ ПРАПОРА
    if (style.flagType === 'horizontal-tricolor') {
        const stripeH = h / 3;
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, stripeH);
        ctx.fillStyle = c[1]; ctx.fillRect(x, y + stripeH, w, stripeH);
        ctx.fillStyle = c[2]; ctx.fillRect(x, y + stripeH * 2, w, stripeH);
    } 
    else if (style.flagType === 'vertical-bicolor') {
        const stripeW = w / 2;
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, stripeW, h);
        ctx.fillStyle = c[1]; ctx.fillRect(x + stripeW, y, stripeW, h);
    } 
    else if (style.flagType === 'monocolor') {
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
    }
    else if (style.flagType === 'vertical-tricolor') {
        // Вертикальний триколор (на кшталт Франції чи Італії)
        const stripeW = w / 3;
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, stripeW, h);
        ctx.fillStyle = c[1]; ctx.fillRect(x + stripeW, y, stripeW, h);
        ctx.fillStyle = c[2]; ctx.fillRect(x + stripeW * 2, y, stripeW, h);
    }
    else if (style.flagType === 'triangle-chevron') {
        // Прапор із трикутником зліва (на кшталт Чехії чи Філіппін)
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h / 2);
        ctx.fillStyle = c[1]; ctx.fillRect(x, y + h / 2, w, h / 2);
        ctx.fillStyle = c[2];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w * 0.4, y + h / 2);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
    }
    else if (style.flagType === 'diagonal') {
        // Діагональний розподіл кольорів
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = c[1];
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();
    }
    else if (style.flagType === 'horizontal-bicolor') {
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h / 2);
        ctx.fillStyle = c[1]; ctx.fillRect(x, y + h / 2, w, h / 2);
    }
    else if (style.flagType === 'quarters') {
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w / 2, h / 2);
        ctx.fillStyle = c[1]; ctx.fillRect(x + w / 2, y, w / 2, h / 2);
        ctx.fillStyle = c[1]; ctx.fillRect(x, y + h / 2, w / 2, h / 2);
        ctx.fillStyle = c[2] || c[0]; ctx.fillRect(x + w / 2, y + h / 2, w / 2, h / 2);
    }
    else if (style.flagType === 'stripes-multi') {
        const lines = 5; const lw = h / lines;
        for(let l=0; l<lines; l++) {
            ctx.fillStyle = c[l % 2 === 0 ? 0 : 1];
            ctx.fillRect(x, y + l * lw, w, lw);
        }
    }
    else if (style.flagType === 'sunburst') {
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = c[1];
        const cx = x + w/2, cy = y + h/2;
        for(let angle=0; angle<360; angle+=45) {
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, Math.max(w, h), (angle-15)*Math.PI/180, (angle+15)*Math.PI/180);
            ctx.closePath(); ctx.fill();
        }
    }
    else if (style.flagType === 'border-frame') {
        // Рамковий прапор (кольорова межа по периметру)
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = c[1];
        const bw = Math.min(w, h) * 0.15; // Товщина рамки
        ctx.fillRect(x + bw, y + bw, w - bw * 2, h - bw * 2);
    }
    else if (style.flagType === 'cross') {
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = c[1];
        ctx.fillRect(x, y + h/2 - 4, w, 8);
        ctx.fillRect(x + w/2 - 4, y, 8, h);
    } 
    else if (style.flagType === 'nordic') {
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = c[1];
        ctx.fillRect(x, y + h/2 - 4, w, 8);
        ctx.fillRect(x + w * 0.35 - 4, y, 8, h);
    }
    else if (style.flagType === 'saltire') {
        // Андріївський (косий) хрест
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = c[1]; ctx.lineWidth = Math.min(w, h) * 0.15;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
    }
    else if (style.flagType === 'scand-cross-thin') {
        // Скандинавський хрест із тонкою смужкою всередині
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = c[1];
        ctx.fillRect(x, y + h*0.4, w, h*0.2); ctx.fillRect(x + w*0.3, y, w*0.15, h);
        ctx.fillStyle = c[2] || '#fff'; // Тонка внутрішня лінія
        ctx.fillRect(x, y + h*0.45, w, h*0.1); ctx.fillRect(x + w*0.35, y, w*0.05, h);
    }
    else if (style.flagType === 'pall') {
        // Вилоподібний хрест
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = c[1];
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w*0.4, y + h/2); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h * 0.7); ctx.lineTo(x + w*0.25, y + h/2); ctx.lineTo(x, y + h * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c[2] || '#000'; ctx.fillRect(x + w*0.4, y + h*0.4, w*0.6, h*0.2);
    }
    else if (style.flagType === 'stripes-vertical') {
        // Вертикальні смуги
        let vLines = 5; let strokeW = w / vLines;
        for(let l=0; l<vLines; l++) { ctx.fillStyle = c[l % 2 === 0 ? 0 : 1]; ctx.fillRect(x + l * strokeW, y, strokeW, h); }
    }
    else if (style.flagType === 'double-chevron') {
        // Подвійний шеврон зліва
        ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = c[1]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w*0.3, y + h/2); ctx.lineTo(x, y + h); ctx.lineTo(x + w*0.15, y + h); ctx.lineTo(x + w*0.45, y + h/2); ctx.lineTo(x + w*0.15, y); ctx.closePath(); ctx.fill();
    }

    // 2. НАКЛАДАННЯ НОВИХ ЕМБЛЕМ
    if (style.emblem && style.emblem !== 'none') {
        ctx.fillStyle = style.emblemColor;
        ctx.strokeStyle = style.emblemColor;
        ctx.lineWidth = 2;
        
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const size = Math.min(w, h) * 0.35;

        if (style.emblem === 'circle') {
            ctx.beginPath(); ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2); ctx.fill();
        } 
        else if (style.emblem === 'cross-emblem') {
            ctx.fillRect(centerX - size/2, centerY - 2, size, 4);
            ctx.fillRect(centerX - 2, centerY - size/2, 4, size);
        } 
        else if (style.emblem === 'star') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(centerX + Math.cos((18 + i * 72) * Math.PI / 180) * (size / 2),
                        centerY - Math.sin((18 + i * 72) * Math.PI / 180) * (size / 2));
                ctx.lineTo(centerX + Math.cos((54 + i * 72) * Math.PI / 180) * (size / 5),
                        centerY - Math.sin((54 + i * 72) * Math.PI / 180) * (size / 5));
            }
            ctx.closePath(); ctx.fill();
        } 
        else if (style.emblem === 'crescent') {
            ctx.beginPath(); ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = (style.flagType === 'monocolor') ? c[0] : ((style.flagType === 'horizontal-tricolor') ? c[1] : c[1]); 
            ctx.beginPath(); ctx.arc(centerX + size * 0.2, centerY, size / 2, 0, Math.PI * 2); ctx.fill();
        }
        else if (style.emblem === 'diamond') {
            // Ромб / Діаманд
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - size / 2);
            ctx.lineTo(centerX + size / 2, centerY);
            ctx.lineTo(centerX, centerY + size / 2);
            ctx.lineTo(centerX - size / 2, centerY);
            ctx.closePath(); ctx.fill();
        }
        else if (style.emblem === 'sun') {
            // Сонце з променями
            ctx.beginPath(); ctx.arc(centerX, centerY, size / 4, 0, Math.PI * 2); ctx.fill();
            for (let i = 0; i < 8; i++) {
                const angle = (i * 45) * Math.PI / 180;
                ctx.beginPath();
                ctx.moveTo(centerX + Math.cos(angle) * (size / 3), centerY + Math.sin(angle) * (size / 3));
                ctx.lineTo(centerX + Math.cos(angle) * (size / 2), centerY + Math.sin(angle) * (size / 2));
                ctx.stroke();
            }
        }
        else if (style.emblem === 'shield') {
            // Середньовічний геральдичний щит
            ctx.beginPath();
            ctx.moveTo(centerX - size / 2, centerY - size / 2);
            ctx.lineTo(centerX + size / 2, centerY - size / 2);
            ctx.lineTo(centerX + size / 2, centerY);
            ctx.quadraticCurveTo(centerX + size / 2, centerY + size / 2, centerX, centerY + size / 2);
            ctx.quadraticCurveTo(centerX - size / 2, centerY + size / 2, centerX - size / 2, centerY);
            ctx.closePath(); ctx.fill();
        }
        else if (style.emblem === 'crown') {
            // Корона
            ctx.beginPath();
            ctx.moveTo(centerX - size / 2, centerY + size / 3);
            ctx.lineTo(centerX + size / 2, centerY + size / 3);
            ctx.lineTo(centerX + size / 2, centerY - size / 4);
            ctx.lineTo(centerX + size / 4, centerY + size / 10);
            ctx.lineTo(centerX, centerY - size / 3);
            ctx.lineTo(centerX - size / 4, centerY + size / 10);
            ctx.lineTo(centerX - size / 2, centerY - size / 4);
            ctx.closePath(); ctx.fill();
        }
        else if (style.emblem === 'sword') {
            // Меч (вертикальний)
            ctx.fillRect(centerX - 2, centerY - size / 2, 4, size * 0.8); // Клинок
            ctx.fillRect(centerX - size / 3, centerY + size / 4, (size / 3) * 2, 4); // Гарда
            ctx.fillRect(centerX - 3, centerY + size / 4, 6, size * 0.2); // Руків'я
        }
        else if (style.emblem === 'skull') {
            // Пиратский/военный череп (упрощенный силуэт)
            ctx.beginPath(); ctx.arc(centerX, centerY - size/6, size/3, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(centerX - size/4, centerY, size/2, size/4);
        }
        else if (style.emblem === 'heart') {
            // Сердце (для мирных или гвардейских наций)
            ctx.beginPath();
            ctx.moveTo(centerX, centerY + size/3);
            ctx.bezierCurveTo(centerX - size/2, centerY - size/3, centerX - size/3, centerY - size, centerX, centerY - size/4);
            ctx.bezierCurveTo(centerX + size/3, centerY - size, centerX + size/2, centerY - size/3, centerX, centerY + size/3);
            ctx.fill();
        }
        else if (style.emblem === 'anchor') {
            // Морской якорь
            ctx.lineWidth = size / 6;
            ctx.beginPath(); ctx.moveTo(centerX, centerY - size/2); ctx.lineTo(centerX, centerY + size/3); ctx.stroke();
            ctx.beginPath(); ctx.arc(centerX, centerY, size/3, 0, Math.PI); ctx.stroke();
        }
        else if (style.emblem === 'rune') {
            // Мистическая скандинавская руна (Одал/Альгиз)
            ctx.lineWidth = size / 5;
            ctx.beginPath();
            ctx.moveTo(centerX - size/3, centerY + size/2); ctx.lineTo(centerX, centerY - size/4);
            ctx.lineTo(centerX + size/3, centerY + size/2); ctx.moveTo(centerX, centerY - size/4);
            ctx.lineTo(centerX, centerY - size/2); ctx.stroke();
        }
        else if (style.emblem === 'eagle') {
            // Спрощений силует двоголового орла
            ctx.beginPath();
            ctx.arc(centerX - size*0.15, centerY - size*0.2, size*0.1, 0, Math.PI*2); // Ліва голова
            ctx.arc(centerX + size*0.15, centerY - size*0.2, size*0.1, 0, Math.PI*2); // Права голова
            ctx.fill();
            ctx.fillRect(centerX - size*0.3, centerY - size*0.1, size*0.6, size*0.2); // Крила
            ctx.beginPath(); ctx.moveTo(centerX, centerY - size*0.1); ctx.lineTo(centerX - size*0.2, centerY + size*0.3); ctx.lineTo(centerX + size*0.2, centerY + size*0.3); ctx.closePath(); ctx.fill(); // Хвіст
        }
        else if (style.emblem === 'lion') {
            // Геральдичний лев (грізний силует)
            ctx.fillRect(centerX - size*0.1, centerY - size*0.3, size*0.2, size*0.5); // Тіло
            ctx.fillRect(centerX - size*0.1, centerY - size*0.3, size*0.3, size*0.15); // Грива/Голова
            ctx.fillRect(centerX - size*0.2, centerY + size*0.1, size*0.1, size*0.2); // Задня лапа
            ctx.fillRect(centerX + size*0.1, centerY + size*0.1, size*0.1, size*0.2); // Передня лапа
            ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(centerX - size*0.1, centerY - size*0.1); ctx.quadraticCurveTo(centerX - size*0.4, centerY - size*0.4, centerX - size*0.3, centerY - size*0.2); ctx.stroke(); // Хвіст лінією
        }
        else if (style.emblem === 'gear') {
            // Кібер-шестерня
            ctx.lineWidth = size * 0.15;
            ctx.beginPath(); ctx.arc(centerX, centerY, size*0.2, 0, Math.PI*2); ctx.stroke(); // Кільце
            ctx.lineWidth = 4;
            for(let a=0; a<Math.PI*2; a+=Math.PI/4) {
                ctx.beginPath(); ctx.moveTo(centerX + Math.cos(a)*size*0.15, centerY + Math.sin(a)*size*0.15); ctx.lineTo(centerX + Math.cos(a)*size*0.35, centerY + Math.sin(a)*size*0.35); ctx.stroke(); // Зубці
            }
        }
        else if (style.emblem === 'tree') {
            // Древо нації
            ctx.fillRect(centerX - 2, centerY, 4, size * 0.35); // Стовбур
            ctx.beginPath();
            ctx.arc(centerX, centerY - size*0.1, size*0.2, 0, Math.PI*2); // Крона
            ctx.arc(centerX - size*0.12, centerY + size*0.05, size*0.15, 0, Math.PI*2);
            ctx.arc(centerX + size*0.12, centerY + size*0.05, size*0.15, 0, Math.PI*2);
            ctx.fill();
        }
        else if (style.emblem === 'hammer') {
            // Кузнечний молот
            ctx.save();
            ctx.translate(centerX, centerY); ctx.rotate(-Math.PI/4); // Нахиляємо молот по-бойовому
            ctx.fillRect(-2, -size*0.3, 4, size*0.6); // Руків'я
            ctx.fillRect(-size*0.25, -size*0.35, size*0.5, size*0.15); // Бойок молота
            ctx.restore();
        }
        else if (style.emblem === 'infinity') {
            // Знак нескінченності
            ctx.lineWidth = 3; ctx.strokeStyle = style.emblemColor;
            ctx.beginPath();
            ctx.arc(centerX - size*0.15, centerY, size*0.15, -Math.PI/4, (Math.PI * 5)/4);
            ctx.arc(centerX + size*0.15, centerY, size*0.15, (Math.PI * 3)/4, (Math.PI * 9)/4);
            ctx.closePath(); ctx.stroke();
        }


    }

        // --- ИСПРАВЛЕНО: МАКСИМАЛЬНО ВИДИМЫЕ ЗНАЧКИ КЛАССОВ ВОЙСК В УГЛАХ ---
    // Сначала настраиваем параметры для черной контрастной подложки-обводки
    ctx.strokeStyle = "rgba(0, 0, 0, 1)"; // Жирный черный контур
    ctx.lineWidth = 3.5;                 // Толщина обводки
    ctx.lineJoin = "round";              // Сглаживаем углы, чтобы не было артефактов
    ctx.lineCap = "round";

    let cx, cy;
    if (isLeftCountry) { // Используем переданный нами ранее флаг страны
        cx = x + w - 12;
        cy = y + 12;
    } else { 
        cx = x + 12;
        cy = y + 12;
    }

    // --- ПЕРВЫЙ ПРОХОД: Рисуем черную толстую подложку ---
    if (troop.type === 'tank') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx, cy + 5); ctx.lineTo(cx - 8, cy);
        ctx.closePath();
        ctx.stroke();
    } 
    else if (troop.type === 'recon') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy + 4); ctx.lineTo(cx - 6, cy + 4);
        ctx.closePath();
        ctx.stroke();
    } 
    else {
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy);
        ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5);
        ctx.stroke();
    }

    // --- ВТОРОЙ ПРОХОД: Поверх черной обводки накладываем яркий белый значок ---
    ctx.strokeStyle = "rgba(255, 255, 255, 1)"; // Чистый ярко-белый цвет
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 1.5;                         // Обычная толщина линии значка

    if (troop.type === 'tank') {
        // Заливаем ромб белым цветом, чтобы он выделялся еще сильнее
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx, cy + 5); ctx.lineTo(cx - 8, cy);
        ctx.closePath();
        ctx.fill(); 
        ctx.stroke();
    } 
    else if (troop.type === 'recon') {
        // Заливаем стрелочку разведки белым цветом
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy + 4); ctx.lineTo(cx - 6, cy + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } 
    else {
        // Рисуем аккуратный белый крестик пехоты
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy);
        ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5);
        ctx.stroke();
    }



    ctx.restore();
}

btnHeatmap.addEventListener('click', () => {
    showHeatmap = !showHeatmap;
    btnHeatmap.textContent = `Хитмап: ${showHeatmap ? 'ВКЛ' : 'ВЫКЛ'}`;
    btnHeatmap.classList.toggle('active', showHeatmap); // подсветит кнопку желтым, если включена
    draw(); // мгновенно обновляем экран
});


// Постоянно обновляем экран для плавной анимации водной ряби
function animate() {
    draw();
    requestAnimationFrame(animate);
}
animate(); // Запускаем цикл анимации

// --- ЛОГИКА РЕЖИМА ПЕРЕМИРИЯ ---

btnPeace.addEventListener('click', () => {
    if (gameState !== 'battle') return;

    // 1. Полностью останавливаем симуляцию и таймеры
    if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
    }
    if (reinforcementInterval) {
        clearInterval(reinforcementInterval);
        reinforcementInterval = null;
    }

    btnAuto.classList.remove('active');
    btnAuto.textContent = "Запустить симуляцию";
    btnAuto.disabled = true; // Отключаем симуляцию на время перерисовки
    btnSpeed.style.display = "none";
    btnPeace.style.display = "none";

    // 2. Создание демилитаризованной зоны (удаляем войска у фронта)
    const dmzDistance = 75; // Расстояние от границы в пикселях, на котором войска исчезают

    // Фильтруем левые войска (убираем те, что слишком близко справа от своей передней линии у границы)
    troopsLeft = troopsLeft.filter(t => {
        let borderX = borderPoints[Math.floor(t.y + t.h / 2)];
        // Если расстояние от правого края отряда до границы меньше dmzDistance — удаляем
        return (borderX - (t.x + t.w)) > dmzDistance;
    });

    // Фильтруем правые войска
    troopsRight = troopsRight.filter(t => {
        let borderX = borderPoints[Math.floor(t.y + t.h / 2)];
        // Если расстояние от левого края отряда до границы меньше dmzDistance — удаляем
        return (t.x - borderX) > dmzDistance;
    });

    // 3. Включаем режим рисования новой границы
    gameState = 'drawing';
    statusText.textContent = "Режим перемирия: Нарисуйте новую линию границы сверху вниз";
    statusText.style.color = "#cca700";

    // Показываем кнопку утверждения
    btnConfirmBorder.style.display = "inline-block";
    draw();
});

btnConfirmBorder.addEventListener('click', () => {
    if (gameState !== 'drawing') return;

    // Сохраняем новую копию прорисованной линии
    originalBorderPoints = [...borderPoints];

    // Переводим игру обратно в режим готовности
    gameState = 'ready';
    statusText.textContent = "Новые границы утверждены! Нажмите 'Запустить симуляцию' для возобновления боя.";
    statusText.style.color = "#fff";

    // Прячем кнопку утверждения и снова активируем кнопку симуляции
    btnConfirmBorder.style.display = "none";
    btnAuto.disabled = false;

    // Привязываем выжившие войска к новой линии границы, если они оказались слишком близко
    const padding = 8;
    
    troopsLeft.forEach(t => {
        let minBorderX = WIDTH;
        for (let y = Math.floor(t.y); y < Math.floor(t.y + t.h); y++) {
            if (y >= 0 && y < HEIGHT && borderPoints[y] < minBorderX) minBorderX = borderPoints[y];
        }
        let expectedX = minBorderX - t.w - padding;
        if (t.x > expectedX) t.x = expectedX; // Отодвигаем выживших назад, если новая граница их зажала
    });

    troopsRight.forEach(r => {
        let maxBorderX = 0;
        for (let y = Math.floor(r.y); y < Math.floor(r.y + r.h); y++) {
            if (y >= 0 && y < HEIGHT && borderPoints[y] > maxBorderX) maxBorderX = borderPoints[y];
        }
        let expectedX = maxBorderX + padding;
        if (r.x < expectedX) r.x = expectedX;
    });

    draw();
});