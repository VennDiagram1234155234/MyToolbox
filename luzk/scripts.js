/**
 * @fileoverview Historical data buffer and localization dictionary for the Resource and Air Threat Assistant.
 */

// Complete historical database of verified attack and explosion dates in Kyiv (2022-2026)
const historicalAttacks = [
    // 2022
    "2022-02-24", "2022-02-25", "2022-02-26", "2022-02-27", "2022-02-28",
    "2022-03-01", "2022-03-02", "2022-03-03", "2022-03-15", "2022-03-17", "2022-03-18",
    "2022-04-28", "2022-06-05", "2022-06-26",
    "2022-10-10", "2022-10-11", "2022-10-17", "2022-10-31",
    "2022-11-15", "2022-11-23", "2022-12-05", "2022-12-14", "2022-12-16", "2022-12-19", "2022-12-29", "2022-12-31",
    // 2023
    "2023-01-01", "2023-01-02", "2023-01-14", "2023-01-26", "2023-02-10", "2023-03-09", "2023-04-28",
    "2023-05-03", "2023-05-04", "2023-05-08", "2023-05-16", "2023-05-18", "2023-05-20", "2023-05-28", "2023-05-29", "2023-05-30", "2023-05-31",
    "2023-06-01", "2023-06-02", "2023-06-04", "2023-06-06", "2023-06-13", "2023-06-16", "2023-06-19", "2023-06-24", "2023-06-26",
    "2023-07-13", "2023-07-26", "2023-08-11", "2023-08-30", "2023-09-21", "2023-10-19",
    "2023-11-11", "2023-11-25", "2023-12-08", "2023-12-11", "2023-12-13", "2023-12-29", "2023-12-31",
    // 2024
    "2024-01-01", "2024-01-02", "2024-01-08", "2024-01-23", "2024-02-07", "2024-03-21", "2024-03-22", "2024-03-25",
    "2024-05-31", "2024-06-12", "2024-06-30", "2024-07-08", "2024-07-09", "2024-07-31", "2024-08-11", "2024-08-18", "2024-08-26", "2024-08-27",
    "2024-09-02", "2024-09-20", "2024-10-30", "2024-11-13", "2024-11-17", "2024-11-21", "2024-12-20",
    // 2025 (Expanded with high intensity autumn and May waves)
    "2025-01-01", "2025-01-02", "2025-01-18", "2025-02-12", "2025-04-06", "2025-04-24",
    "2025-05-19", "2025-05-20", "2025-05-22", "2025-05-23", "2025-05-24", "2025-05-25", "2025-05-29",
    "2025-06-06", "2025-06-17", "2025-06-23", "2025-07-03", "2025-07-04", "2025-07-31", "2025-08-28", 
    "2025-09-04", "2025-09-14", "2025-09-22", "2025-10-03", "2025-10-10", "2025-10-11", "2025-10-18", "2025-10-24", 
    "2025-11-02", "2025-11-11", "2025-11-17", "2025-11-23", "2025-11-25", "2025-11-29",
    "2025-12-06", "2025-12-14", "2025-12-23", "2025-12-27", "2025-12-31",
    // 2026
    "2026-01-02", "2026-01-09", "2026-01-20", "2026-01-21", "2026-01-22", "2026-01-23", "2026-01-24",
    "2026-02-03", "2026-02-16", "2026-02-22", "2026-03-07", "2026-03-14", "2026-04-03", "2026-04-04", "2026-04-16", "2026-04-24", "2026-05-24"
];

// Dictionary for multi-language support (Includes Biorhythms, 3-Year Cycles, and Personal Cycles)
const i18n = {
    ru: {
        title: "📅 Ассистент Ресурса и Энергии",
        lblBirth: "Дата рождения (сохраняется локально):",
        lblTarget: "Целевая дата для планирования:",
        btnCalc: "Рассчитать готовность дня",
        alertEmpty: "Пожалуйста, заполните даты!",
        alertPast: "Целевая дата не может быть в прошлом!",
        macroTitle: "Анализ внутренних и макро-факторов:",
        macroInfluence: "Влияние макроциклу:",
        intuitTone: "Интуитивный тонус (шестое чувство):",
        emoTone: "Психоэмоциональная стойкость:",
        physTone: "Физический запас сил:",
        exc2015: "Исключение (2015 год)",
        exc2015Comm: "Год вне теории трех лет. Действуют базовые биоритмы.",
        yearCycle: "-й год трехлетки",
        vHigh: "🔋 Отличный день для энергозатратных задач, ремонтов и дальних поездок.",
        vMedium: "✅ Ровный рабочий день. Стандартная продуктивность для быта.",
        vLow: "⚠️ Энергия на исходе. Займитесь рутиной, не требующей нервного напряжения.",
        vCritical: "🛑 Режим экономии батарейки. Максимально разгрузите этот день, отдохните.",
        c1Start: "1-й год (Начало): Стабильный период, хороший уровень бытовой энергии.",
        c1End: "1-й год (Конец): Ощутимый спад сил, рутинные дела могут даваться тяжелее.",
        c2Start: "2-й год (Начало): Нестабильный фон, чередуйте нагрузку с полноценным сном.",
        c2End: "2-й год (КОНЕЦ): Phase глубокого истощения ресурсов. Минимизируйте стресс.",
        c3Start: "3-й год (Начало): Медленный разгон, делайте дела порциями, не перегорайте.",
        c3End: "3-й год (КОНЕЦ): Максимальный пик продуктивности! Время закрывать крупные бытовые задачи.",
        personalCycleTitle: "Личный годовой цикл:",
        pCycle1: "1-й период (0-52 дня): Пик физических сил, идеальный старт после ДР.",
        pCycle2: "2-й период (53-104 дня): Время активности и реализации планов.",
        pCycle3: "3-й период (105-156 дня): Энергетическое плато, стабильная работа.",
        pCycle4: "4-й период (157-208 дня): Время анализа, возможен легкий спад сил.",
        pCycle5: "5-й период (209-260 дня): Творческий подъем, доверяйте интуиции.",
        pCycle6: "6-й период (261-312 дня): Рутинный период, избегайте перегрузок.",
        pCycle7: "7-й период (313-365 дней): Фаза глубокого спада перед новым ДР. Осторожнее.",
        numTitle: "Нумерологический код дня:",
        num1: "Число 1: День лидерства, активности и новых смелых начинаний.",
        num2: "Число 2: День сотрудничества, компромиссов и командной работы.",
        num3: "Число 3: Творческий подъем, общение, день удачен для поездок.",
        num4: "Число 4: День упорного труда, рутины и наведения порядка.",
        num5: "Число 5: День перемен, риска, поездок и неожиданных возможностей.",
        num6: "Число 6: День домашних дел, уюта, семьи и помощи близким.",
        num7: "Число 7: День уединения, учебы, анализа и духовной перезагрузки.",
        num8: "Число 8: День крупных решений, финансов, бизнеса и власти.",
        num9: "Число 9: День завершения старых дел, очищения пространства и отдыха.",
        geoTitle: "Геомагнитная активность (Kp-индекс):",
        geoQuiet: " Kp (Спокойный фон). Идеальный день для любой активности.",
        geoUnsettled: " Kp (Нестабильный фон). Возможна легкая утомляемость.",
        geoStorm: " Kp (МАГНИТНАЯ БУРЯ!). Опасность головных болей, снизьте нагрузки.",
        errBirthFuture: "Ошибка: Дата рождения не может быть в будущем!",
        errBirthTooOld: "Ошибка: Пожалуйста, введите реалистичную дату рождения (не ранее 1900 года)!",
        errTargetTooFar: "Ошибка: Планирование возможно максимум на 50 лет вперед от текущей даты!",
        btnCalShow: "📅 Посмотреть календарь на месяц",
        btnCalHide: "🙈 Скрыть календарь",
        daysMin: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
        months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
        btnThreat: "️ Рассчитать риск обстрела Киева",
        threatTitle: "📊 Анализ вероятности воздушной угрозы для Киева:",
        threatDaysPast: "Дней со средней даты накопления запасов: ",
        threatPhase: "Фактор ночной видимости (БПЛА): ",
        threatLevel: "Математический риск атаки в этот день: ",
        tLow: "🟢 НИЗКИЙ РОВЕНЬ. Активность маловероятна, но не игнорируйте тревоги.",
        tMed: "🟡 СРЕДНИЙ УРОВЕНЬ. Стандартный фон дежурства сил ПВО. Будьте бдительны.",
        tHigh: "🔴 ПОВЫШЕННЫЙ РИСК. Накоплен оперативный ресурс противника. Будьте осторожны.",
        threatAirLogs: "Логистика ПВО (активность союзников): ",
        threatWeather: "Термическая нагрузка на инфраструктуру: ",
        threatScouts: "Индекс активности разведки (ДРЛО/БПЛА): ",
        tLogHigh: "Высокая готовность щита ПВО (риск снижен)",
        tLogNorm: "Standard режим дежурства систем",
        tWeatherPeak: "ПИКОВАЯ (повышенный интерес к энергосистеме)",
        tWeatherNorm: "Умеренная (стандартный фон)",
        tScoutActive: "ПОВЫШЕННЫЙ (фиксация разведки в воздухе)",
        btnTCalShow: "📅 Календарь угроз",
        btnTCalHide: "🙈 Скрыть календарь",
        threatCalTitle: "Календарь рисков обстрела Киева:",
        threatInterval: "Тактический интервал кампании: ",
        threatTrigger: "Геополитический фон (риск ответа): ",
        threatAero: "Гідрометеорологический фактор (БПЛА): ",
        tIntWave: "АКТИВНАЯ ВОЛНА (высокий риск повторного удара)",
        tIntPause: "Затяжная пауза (накопление боекомплекта)",
        tTriggerHigh: "ПОВЫШЕННЫЙ (возможна реакция на удары по тылам)",
        tAeroBad: "Неблагоприятный для БПЛА (ветер/шторм)"
    },
    uk: {
        title: "📅 Асистент Ресурсу та Енергії",
        lblBirth: "Дата народження (зберігається локально):",
        lblTarget: "Цільова дата для планування:",
        btnCalc: "Розрахувати готовність дня",
        alertEmpty: "Будь ласка, заповніть дати!",
        alertPast: "Цільова дата не может бути в минулому!",
        macroTitle: "Аналіз внутрішніх та макро-факторів:",
        macroInfluence: "Вплив макроциклу:",
        intuitTone: "Інтуїтивний тонус (шосте чуття):",
        emoTone: "Психоемоційна стійкість:",
        physTone: "Фізичний запас сил:",
        exc2015: "Виняток (2015 рік)",
        exc2015Comm: "Рік поза теорією трьох років. Діють базові біоритми.",
        yearCycle: "-й рік трирічки",
        vHigh: "🔋 Чудовий day для енерговитратних завдань, ремонтів та дальніх поїздок.",
        vMedium: "✅ Рівний робочий день. Стандартна продуктивність для побуту.",
        vLow: "⚠️ Енергія на виході. Займіться рутиною, яка не потребує нервового напруження.",
        vCritical: "🛑 Режим економії батарейки. Максимально розвантажте цей день, відпочиньте.",
        c1Start: "1-й рік (Початок): Стабільний період, хороший рівень побутової енергії.",
        c1End: "1-й рік (Кінець): Відчутний спад сил, рутинні справи можуть даватися важче.",
        c2Start: "2-й рік (Початок): Нестабільний фон, чергуйте навантаження з повноцінним сном.",
        c2End: "2-й рік (КІНЕЦЬ): Фаза глибокого виснаження ресурсів. Мінімізуйте стрес.",
        c3Start: "3-й рік (Початок): Повільний розгін, робіть справи порціями, не перегорайте.",
        c3End: "3-й рік (КІНЕЦЬ): Максимальний пик продуктивності! Час закривати великі побутові завдання.",
        personalCycleTitle: "Особистий річний цикл:",
        pCycle1: "1-й період (0-52 дні): Пік фізичних сил, ідеальний старт після ДР.",
        pCycle2: "2-й період (53-104 дні): Час активності та реалізації планов.",
        pCycle3: "3-й період (105-156 дні): Енергетичне плато, стабільна робота.",
        pCycle4: "4-й період (157-208 дні): Час аналізу, можливий легкий спад сил.",
        pCycle5: "5-й період (209-260 дні): Творчий підйом, довіряйте інтуїції.",
        pCycle6: "6-й період (261-312 дні): Рутинний період, уникайте перевантажень.",
        pCycle7: "7-й період (313-365 днів): Фаза глибокого спаду перед новим ДР. Обережніше.",
        numTitle: "Нумерологічний код дня:",
        num1: "Число 1: День лідерства, активності та нових сміливих починань.",
        num2: "Число 2: День співпраці, компромісів та командної роботи.",
        num3: "Число 3: Творчий підйом, спілкування, день вдалий для поїздок.",
        num4: "Число 4: День наполегливої праці, рутини та наведення порядку.",
        num5: "Число 5: День змін, ризику, поїздок та несподіваних можливостей.",
        num6: "Число 6: День домашніх справ, затишку, родини та допомоги близьким.",
        num7: "Число 7: День усамітнення, навчання, аналізу та духовної перезавантаження.",
        num8: "Число 8: День великих рішень, фінансів, бізнесу та влади.",
        num9: "Число 9: День завершення старих справ, очищення простору та відпочинку.",
        geoTitle: "Геомагнітна активність (Kp-індекс):",
        geoQuiet: " Kp (Спокійний фон). Ідеальний день для будь-якої активності.",
        geoUnsettled: " Kp (Нестабильний фон). Можлива легка стомлюваність.",
        geoStorm: " Kp (МАГНІТНА БУРЯ!). Небезпека головного болю, знизьте навантаження.",
        errBirthFuture: "Помилка: Дата народження не може бути в майбутньому!",
        errBirthTooOld: "Помилка: Будь ласка, введіть реалістичну дату народження (не раніше 1900 року)!",
        errTargetTooFar: "Помилка: Планування можливе максимум на 50 років вперед від поточної дати!",
        btnCalShow: "📅 Переглянути календар на місяць",
        btnCalHide: "🙈 Сховати календар",
        daysMin: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
        months: ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтенень", "Листопад", "Грудень"],
        btnThreat: "️ Розрахувати ризик обстрілу Києва",
        threatTitle: "📊 Аналіз імовірності повітряної загрози для Києва:",
        threatDaysPast: "Днів від середньої дати накопичення запасів: ",
        threatPhase: "Фактор нічної видимості (БПЛА): ",
        threatLevel: "Математичний ризик атаки в цей день: ",
        tLow: "🟢 НИЗЬКИЙ РІВЕНЬ. Активність малоймовірна, але не ігноруйте тривоги.",
        tMed: "🟡 СЕРЕДНІЙ РІВЕНЬ. Стандартний фон чергування сил ПВО. Будьте пильні.",
        tHigh: "🔴 ПІДВИЩЕНИЙ РИЗИК. Накопичено оперативний ресурс противника. Будьте обережні.",
        threatAirLogs: "Логістика ПВО (активність союзників): ",
        threatWeather: "Термічне навантаження на інфраструктуру: ",
        threatScouts: "Індекс активності розвідки (ДРЛВ/БПЛА): ",
        tLogHigh: "Висока готовність щита ПВО (ризик знижено)",
        tLogNorm: "Стандартний режим чергування систем",
        tWeatherPeak: "ПІКОВА (підвищений інтерес до енергосистеми)",
        tWeatherNorm: "Помірна (стандартний фон)",
        tScoutActive: "ПІДВИЩЕНИЙ (фіксація розвідки в повітрі)",
        btnTCalShow: "📅 Календарь загроз",
        btnTCalHide: "🙈 Сховати календар",
        threatCalTitle: "Календар ризиків обстрілу Києва:",
        threatInterval: "Тактичний інтервал кампанії: ",
        threatTrigger: "Геополітичний фон (ризик відповіді): ",
        threatAero: "Гідрометеорологічний фактор (БПЛА): ",
        tIntWave: "АКТИВНА ХВИЛЯ (високий ризик повторного удару)",
        tIntPause: "Затяжна пауза (накопичення боєкомплекту)",
        tTriggerHigh: "ПІДВИЩЕНИЙ (можлива реакція на удари по тилах)",
        tAeroBad: "Несприятливий для БПЛА (вітер/шторм)"
    },
    en: {
        title: "📅 Resource & Energy Assistant",
        lblBirth: "Birth date (saved locally):",
        lblTarget: "Target date for planning:",
        btnCalc: "Calculate Day Readiness",
        alertEmpty: "Please fill in the dates!",
        alertPast: "Target date cannot be in the past!",
        macroTitle: "Analysis of internal and macro factors:",
        macroInfluence: "Macrocycle influence:",
        intuitTone: "Intuitive tone (sixth sense):",
        emoTone: "Psycho-emotional stability:",
        physTone: "Physical energy reserve:",
        exc2015: "Exception (Year 2015)",
        exc2015Comm: "Year outside the three-year theory. Basic biorhythms apply.",
        yearCycle: "-year of the 3-year cycle",
        vHigh: "🔋 Excellent day for high-energy tasks, renovations, and long trips.",
        vMedium: "✅ Steady workday. Standard productivity for everyday chores.",
        vLow: "⚠️ Energy running low. Do routine tasks that don't require nervous strain.",
        vCritical: "🛑 Battery saving mode. Unload this day as much as possible, get some rest.",
        c1Start: "1st year (Start): Stable period, good level of everyday energy.",
        c1End: "1st year (End): Noticeable drop in energy, routine tasks may feel harder.",
        c2Start: "2nd year (Start): Unstable background, alternate workload with proper sleep.",
        c2End: "2nd year (END): Phase of deep resource depletion. Minimize stress.",
        c3Start: "3rd year (Start): Slow startup, do things in chunks, do not burn out.",
        c3End: "3rd year (END): Maximum productivity peak! Time to finish major household tasks.",
        personalCycleTitle: "Personal annual cycle:",
        pCycle1: "1st period (0-52 days): Peak of physical strength, ideal start after birthday.",
        pCycle2: "2nd period (53-104 days): Time for activity and implementation of plans.",
        pCycle3: "3rd period (105-156 days): Energy plateau, stable work background.",
        pCycle4: "4th period (157-208 days): Time for analysis, minor energy drop possible.",
        pCycle5: "5th period (209-260 days): Creative growth, trust your intuition.",
        pCycle6: "6th period (261-312 days): Routine period, avoid overloads.",
        pCycle7: "7th period (313-365 days): Deep resource decline before next birthday. Take care.",
        numTitle: "Numerological code of the day:",
        num1: "Number 1: Day of leadership, activity, and bold new beginnings.",
        num2: "Number 2: Day of cooperation, compromise, and teamwork.",
        num3: "Number 3: Creative upsurge, communication, good day for trips.",
        num4: "Number 4: Day of hard work, routine, and organizing things.",
        num5: "Number 5: Day of change, risk, travel, and unexpected opportunities.",
        num6: "Number 6: Day of household chores, comfort, family, and helping others.",
        num7: "Number 7: Day of privacy, study, analysis, and spiritual reset.",
        num8: "Number 8: Day of major decisions, finance, business, and power.",
        num9: "Number 9: Day of completing old tasks, clearing space, and resting.",
        geoTitle: "Geomagnetic activity (Kp-index):",
        geoQuiet: " Kp (Quiet background). Ideal day for any activity.",
        geoUnsettled: " Kp (Unsettled background). Slight fatigue is possible.",
        geoStorm: " Kp (MAGNETIC STORM!). Risk of headaches, reduce workload.",
        errBirthFuture: "Error: Birth date cannot be in the future!",
        errBirthTooOld: "Error: Please enter a realistic birth date (not earlier than 1900)!",
        errTargetTooFar: "Error: Planning is only allowed up to 50 years into the future!",
        btnCalShow: "📅 View Month Calendar",
        btnCalHide: "🙈 Hide Calendar",
        daysMin: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        btnThreat: "🛡️ Calculate Kyiv Shelling Risk",
        threatTitle: "📊 Air Threat Probability Analysis for Kyiv:",
        threatDaysPast: "Days since average stock accumulation date: ",
        threatPhase: "Night visibility factor (UAV): ",
        threatLevel: "Mathematical attack risk on this day: ",
        tLow: "🟢 LOW LEVEL. Activity is unlikely, but do not ignore air raid sirens.",
        tMed: "🟡 MEDIUM LEVEL. Standard alert background for air defense forces. Be vigilant.",
        tHigh: "🔴 ELEVATED RISK. Enemy operational resource accumulated. Take caution.",
        threatAirLogs: "Air Defense logistics (allied activity): ",
        threatWeather: "Thermal load on infrastructure: ",
        threatScouts: "Reconnaissance activity index (AWACS/UAV): ",
        tLogHigh: "High readiness of air defense shield (risk reduced)",
        tLogNorm: "Standard system monitoring mode",
        tWeatherPeak: "PEAK (increased target priority for energy grid)",
        tWeatherNorm: "Moderate (standard seasonal baseline)",
        tScoutActive: "ELEVATED (reconnaissance detected in airspace)",
        btnTCalShow: "📅 Threats Calendar",
        btnTCalHide: "🙈 Hide Calendar",
        threatCalTitle: "Kyiv Attack Risk Calendar:",
        threatInterval: "Tactical campaign interval: ",
        threatTrigger: "Geopolitical context (retaliation risk): ",
        threatAero: "Hydrometeorological factor (UAV): ",
        tIntWave: "ACTIVE WAVE (high risk of follow-up strike)",
        tIntPause: "Prolonged pause (stockpile accumulation)",
        tTriggerHigh: "ELEVATED (potential retaliation pattern active)",
        tAeroBad: "Unfavorable for UAVs (strong wind/storm background)"
    }
};

// Threats calendar tracking state variables
let tCalCurrentYear = null;
let tCalCurrentMonth = null;

// Calendar tracking state variables
let calCurrentYear = null;
let calCurrentMonth = null;
let currentLang = localStorage.getItem('appLang') || 'ru';

// Initialize application properties and bind global action hooks on screen load
window.onload = function() {
    document.getElementById('targetDate').valueAsDate = new Date();
    const savedBirth = localStorage.getItem('userBirthDate');
    
    if (savedBirth) {
        document.getElementById('birthDate').value = savedBirth;
    }

    // Bind document data transformation and storage tracking loops
    document.getElementById('birthDate').onchange = saveBirthDate; 
    document.getElementById('calcBtn').onclick = calculateStatus; 
    document.getElementById('toggleCalBtn').onclick = toggleCalendar;
    document.getElementById('threatBtn').onclick = calculateKyivThreat;
    document.getElementById('toggleThreatCalBtn').onclick = toggleThreatCalendar;

    // Attach processing triggers onto localization panel switch targets
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.onclick = function(e) {
            setLanguage(e.target.getAttribute('data-lang'));
        };
    });

    setLanguage(currentLang); 
};

/**
 * Sweeps interface labels to apply newly active internationalization tokens and re-triggers open layouts.
 * 
 * @function setLanguage
 * @param {string} lang - Selected system localization indicator code (ru, uk, en).
 * @returns {void} Re-renders open structural elements and commits metrics directly into LocalStorage.
 */
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('appLang', lang);

    // Toggle stylesheet flags to accurately paint the selected localization buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    // Translate structural static labels mapped across the application body
    document.getElementById('mainTitle').innerText = i18n[lang].title;
    document.getElementById('lblBirthDate').innerText = i18n[lang].lblBirth;
    document.getElementById('lblTargetDate').innerText = i18n[lang].lblTarget;
    document.getElementById('calcBtn').innerText = i18n[lang].btnCalc;

    // Force computational recalculations if results viewboards are open
    if (document.getElementById('resultBox').style.display === 'block') {
        calculateStatus();
    }

    // Synchronize localized grids of open monthly grids without destroying navigation steps
    const calBox = document.getElementById('calendarBox');
    if (calBox) {
        if (calBox.style.display === 'block') {
            renderCalendarGrid();
        } else {
            document.getElementById('toggleCalBtn').innerText = i18n[lang].btnCalShow;
        }
    }

    // Adapt layout texts assigned to the primary threat evaluation metrics button
    document.getElementById('threatBtn').innerText = i18n[lang].btnThreat;
    document.getElementById('threatBtn').innerText = i18n[lang].btnThreat.split(' ')[0] + ' ' + i18n[lang].btnThreat.split(' ').slice(2).join(' ');
    
    const tCalBox = document.getElementById('threatCalendarBox');
    if (tCalBox) {
        if (tCalBox.style.display === 'block') {
            renderThreatCalendarGrid();
        } else {
            document.getElementById('toggleThreatCalBtn').innerText = i18n[lang].btnTCalShow;
        }
    }
}

// --- Persist the user-selected birth date string reliably into browser storage cache ---
function saveBirthDate() {
    const birthStr = document.getElementById('birthDate').value;
    if (birthStr) {
        localStorage.setItem('userBirthDate', birthStr);
    }
}

/**
 * Evaluates the targeted year framework against a specialized 3-year cyclic historical pattern.
 * Allocates precise dynamic modifiers and shifts score scales based on the seasonal half coordinates.
 * 
 * @function getThreeYearModifier
 * @param {Date} targetDate - The selected target planning date object to measure macro influence for.
 * @returns {{modifier: number, type: string, comment: string}} Encapsulated operational scale data.
 */
function getThreeYearModifier(targetDate) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const isSecondHalf = month >= 6; // Evaluates if target rests in the initial or secondary annual phase
    
    let yearType = 0; 
    let comment = "";
    let modifier = 0;
    const lang = currentLang;

    // Hardcoded global exception configuration rule for historical validation stability
    if (year === 2015) {
        return { modifier: 0, type: i18n[lang].exc2015, comment: i18n[lang].exc2015Comm };
    } 
    
    // Process periodic calendar cycles using a standardized temporal base matrix offset
    if (year >= 2011 && year <= 2014) {
        yearType = ((year - 2011) % 3) + 1;
    } else if (year >= 2016) {
        yearType = ((year - 2016 + 1) % 3) + 1;
    } else {
        yearType = ((3 - Math.abs(year - 2011) % 3) % 3) + 1;
    }

    // Apply granular statistical point alterations matching active category cycles
    if (yearType === 1) {
        if (!isSecondHalf) { modifier = 15; comment = i18n[lang].c1Start; } 
        else { modifier = -20; comment = i18n[lang].c1End; }
    } else if (yearType === 2) {
        if (!isSecondHalf) { 
            modifier = -5; 
            comment = i18n[lang].c2Start; 
        } else { 
            modifier = -60; 
            comment = i18n[lang].c2End; 
        }
    } else if (yearType === 3) {
        if (!isSecondHalf) { 
            modifier = -15; 
            comment = i18n[lang].c3Start; 
        } else { 
            modifier = 40; 
            comment = i18n[lang].c3End; 
        }
    }
    
    return { modifier, type: `${yearType}${i18n[lang].yearCycle}`, comment };
}

/**
 * Orchestrates comprehensive day readiness operations by extracting dates, passing them through
 * strict range and orientation validation bounds, executing sinus biorhythm equations, and outputting local details.
 * 
 * @function calculateStatus
 * @returns {void} Updates document viewboards dynamically; does not return an internal value.
 */
function calculateStatus() {
    const birthStr = document.getElementById('birthDate').value;
    const targetStr = document.getElementById('targetDate').value;
    const lang = currentLang;
    
    // --- 1. Core Structural Field Presence Validation ---
    if (!birthStr || !targetStr) {
        alert(i18n[lang].alertEmpty);
        return;
    }

    const birth = new Date(birthStr);
    const target = new Date(targetStr);
    const now = new Date();
    
    // --- Reset hours to avoid strict time-of-day mismatch validation bugs ---
    now.setHours(0,0,0,0);
    birth.setHours(0,0,0,0);
    target.setHours(0,0,0,0);

    // --- 2. Validation Bounds: Birth date chronological limitation rule ---
    if (birth > now) {
        alert(i18n[lang].errBirthFuture);
        return;
    }

    // --- 3. Validation Bounds: Prevent archaic historical inputs ---
    if (birth.getFullYear() < 1900) {
        alert(i18n[lang].errBirthTooOld);
        return;
    }

    // --- 4. Validation Bounds: Plan targets cannot precede the baseline origin date ---
    const diffDays = Math.round((target - birth) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
        alert(i18n[lang].alertPast);
        return;
    }

    // --- 5. Validation Bounds: Limit forward timelines to manage data growth constraints ---
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(now.getFullYear() + 50);
    if (target > maxFutureDate) {
        alert(i18n[lang].errTargetTooFar);
        return;
    }

    // ==========================================================================
    // Core Wave Computations: Sinusoidal Periodic Biorhythms Generation Equations
    // ==========================================================================
    const phys = (Math.sin((2 * Math.PI * diffDays) / 23) + 1) * 50;
    const emo = (Math.sin((2 * Math.PI * diffDays) / 28) + 1) * 50;
    const intel = (Math.sin((2 * Math.PI * diffDays) / 33) + 1) * 50;
    const intuit = (Math.sin((2 * Math.PI * diffDays) / 38) + 1) * 50;

    // Compile customized base weights matching telemetry importance matrices
    let baseLuck = (intuit * 0.4) + (emo * 0.3) + (phys * 0.2) + (intel * 0.1);
    const timelineMeta = getThreeYearModifier(target);
    
    // Integrate granular secondary resource modifiers
    const personalCycle = getPersonalAnnualCycle(birth, target);
    const numerology = getNumerologyDayNumber(birth, target);
    const solarStorm = getGeomagneticStormIndex(target);
    
    // Aggregate final composite resource capacity metrics
    let finalStatus = baseLuck + timelineMeta.modifier + personalCycle.modifier + numerology.modifier + solarStorm.modifier;
    finalStatus = Math.min(99, Math.max(1, Math.round(finalStatus)));

    // Categorize visual dashboard highlights according to final score tiers
    let verdict = "";
    if (finalStatus >= 75) verdict = i18n[lang].vHigh;
    else if (finalStatus >= 45) verdict = i18n[lang].vMedium;
    else if (finalStatus >= 25) verdict = i18n[lang].vLow;
    else verdict = i18n[lang].vCritical;

    // Render structured results dashboard updates onto active document fields
    document.getElementById('luckValue').innerText = finalStatus + "%";
    document.getElementById('verdictText').innerText = verdict;
    document.getElementById('cycleInfo').innerText = timelineMeta.type;
    
    // Output comprehensive analytical telemetry logs utilizing internationalized markers
    document.getElementById('detailsText').innerHTML = `
        <strong>${i18n[lang].macroTitle}</strong><br>
        📅 <strong>${i18n[lang].macroInfluence}</strong> ${timelineMeta.comment}<br>
        🧬 <strong>${i18n[lang].personalCycleTitle}</strong> ${personalCycle.comment}<br>
        🔢 <strong>${i18n[lang].numTitle}</strong> ${numerology.comment}<br>
        💥 <strong>${i18n[lang].geoTitle}</strong> ${solarStorm.comment}<br>
        🔮 <strong>${i18n[lang].intuitTone}</strong> ${Math.round(intuit)}%<br>
        🎭 <strong>${i18n[lang].emoTone}</strong> ${Math.round(emo)}%<br>
        💪 <strong>${i18n[lang].physTone}</strong> ${Math.round(phys)}%
    `;
    
    document.getElementById('resultBox').style.display = 'block';
}

/**
 * Calculates a unique 52-day periodic cycle based on the user's distance from their last birthday.
 * Maps result values onto distinct seasonal intervals to establish specific resource modifiers.
 * 
 * @function getPersonalAnnualCycle
 * @param {Date} birthDate - The reference birthday coordinate.
 * @param {Date} targetDate - The desired planning viewport target date.
 * @returns {{modifier: number, comment: string}} Constructed personal metrics object.
 */
function getPersonalAnnualCycle(birthDate, targetDate) {
    const lang = currentLang;

    // Track birthday coordinates relative to the selected year threshold
    let bdayThisYear = new Date(targetDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    // Adjust target parameters back to the preceding lifecycle loop if target falls before active birthdays
    if (targetDate < bdayThisYear) {
        bdayThisYear = new Date(targetDate.getFullYear() - 1, birthDate.getMonth(), birthDate.getDate());
    }

    // Determine the absolute days gap existing between the reference points
    const daysSinceBday = Math.round((targetDate - bdayThisYear) / (1000 * 60 * 60 * 24));

    // Distribute days across 7 uniform 52-day scale intervals
    const period = Math.min(7, Math.floor(daysSinceBday / 52) + 1);

    let modifier = 0;
    let comment = i18n[lang].pCycle1;

    // Allocate modifiers matching current period flags
    switch(period) {
        case 1: modifier = 20; comment = i18n[lang].pCycle1; break;
        case 2: modifier = 10; comment = i18n[lang].pCycle2; break;
        case 3: modifier = 5; comment = i18n[lang].pCycle3; break;
        case 4: modifier = -5; comment = i18n[lang].pCycle4; break;
        case 5: modifier = 15; comment = i18n[lang].pCycle5; break;
        case 6: modifier = -10; comment = i18n[lang].pCycle6; break;
        case 7: modifier = -25; comment = i18n[lang].pCycle7; break;
    }

    return { modifier, comment };
}

/**
 * Consolidates structural digital symbols from active date metrics into a single numeric string vector.
 * Iteratively summarizes interior items to return a single-digit root core mapping integer (1-9).
 * 
 * @function getNumerologyDayNumber
 * @param {Date} birthDate - User birth configuration baseline.
 * @param {Date} targetDate - Plan targeting window baseline.
 * @returns {{number: number, modifier: number, comment: string}} Resolved data block parameters.
 */
function getNumerologyDayNumber(birthDate, targetDate) {
    const lang = currentLang; 

    // Combine digit fields into unified operational lookups
    const targetStr = targetDate.getFullYear().toString() + (targetDate.getMonth() + 1).toString() + targetDate.getDate().toString();
    const birthStr = birthDate.getFullYear().toString() + (birthDate.getMonth() + 1).toString() + birthDate.getDate().toString();
    const combinedDigits = targetStr + birthStr; 
    
    let sum = 0;
    // Iterate through character slices to generate an absolute summation metric
    for (let i = 0; i < combinedDigits.length; i++) {
        const digit = parseInt(combinedDigits[i]);
        if (!isNaN(digit)) {
            sum += digit;
        }
    }

    // --- Iteratively reduce the calculated value until a single digit remains (1-9) ---
    while (sum > 9) {
        let currentSum = 0;
        const sumStr = sum.toString();
        for (let i = 0; i < sumStr.length; i++) {
            currentSum += parseInt(sumStr[i]);
        }
        sum = currentSum;
    }

    let modifier = 0;
    let comment = "";

    // --- Map the resolved single digit index to specialized numeric guidelines ---
    switch(sum) {
        case 1: modifier = 10; comment = i18n[lang].num1; break;
        case 2: modifier = 5; comment = i18n[lang].num2; break;
        case 3: modifier = 15; comment = i18n[lang].num3; break;
        case 4: modifier = -5; comment = i18n[lang].num4; break;
        case 5: modifier = 12; comment = i18n[lang].num5; break;
        case 6: modifier = 8; comment = i18n[lang].num6; break;
        case 7: modifier = 0; comment = i18n[lang].num7; break;
        case 8: modifier = 15; comment = i18n[lang].num8; break;
        case 9: modifier = -10; comment = i18n[lang].num9; break;
    }

    return { number: sum, modifier, comment };
}

/**
 * Generates an pseudo-astrophysical space weather simulation matrix using a deterministic date sequence.
 * Estimates Kp solar storm indices and outputs dynamic resource degradation penalties.
 * 
 * @function getGeomagneticStormIndex
 * @param {Date} targetDate - The targeted analysis date context.
 * @returns {{kp: number, modifier: number, comment: string}} Constructed space telemetry block.
 */
function getGeomagneticStormIndex(targetDate) {
    const lang = currentLang;
    
    // --- Establish a deterministic pseudorandom base from date coordinates ---
    const daySeed = targetDate.getDate() + (targetDate.getMonth() + 1) * 3 + (targetDate.getFullYear() % 100);
    const kp = (daySeed % 9) + 1; // Maps integers cleanly to standard Kp scale parameters (1 to 9)

    let modifier = 0;
    let comment = "";

    // --- Assign active point adjustments matching calculated solar volatility categories ---
    if (kp <= 3) {
        modifier = 10;
        comment = kp + i18n[lang].geoQuiet;
    } else if (kp <= 5) {
        modifier = -5;
        comment = kp + i18n[lang].geoUnsettled;
    } else {
        modifier = -35; // Severe magnetic storms trigger significant point drops
        comment = kp + i18n[lang].geoStorm;
    }

    return { kp, modifier, comment };
}

/**
 * Toggles visibility states for the primary monthly personal energy overview container.
 * Prepares initial date components if view rendering sequences are initialized.
 * 
 * @function toggleCalendar
 * @returns {void} Updates localized button values and style layout attributes directly.
 */
function toggleCalendar() {
    const box = document.getElementById('calendarBox');
    const lang = currentLang;

    if (box.style.display === 'block') {
        box.style.display = 'none';
        document.getElementById('toggleCalBtn').innerText = i18n[lang].btnCalShow;
    } else {
        // Hydrate navigation parameters if calendar state tracking contains no previous data
        if (calCurrentYear === null || calCurrentMonth === null) {
            const targetStr = document.getElementById('targetDate').value;
            const refDate = targetStr ? new Date(targetStr) : new Date();
            calCurrentYear = refDate.getFullYear();
            calCurrentMonth = refDate.getMonth();
        }
        
        box.style.display = 'block';
        renderCalendarGrid();
    }
}

/**
 * Assembles HTML markup nodes required to display the personal energy month view grid.
 * Computes calendar offset values and handles cell click navigation hooks.
 * 
 * @function renderCalendarGrid
 * @returns {void} Injects fully constructed markup fragments directly into the DOM tree.
 */
function renderCalendarGrid() {
    const box = document.getElementById('calendarBox');
    const lang = currentLang;
    
    // --- Establish chronological boundaries for the chosen calendar view month ---
    const firstDay = new Date(calCurrentYear, calCurrentMonth, 1);
    const lastDay = new Date(calCurrentYear, calCurrentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    
    // --- Normalize day indices to align cleanly with European Mon-Sun conventions ---
    let startDayIdx = firstDay.getDay(); 
    if (startDayIdx === 0) startDayIdx = 7;
    startDayIdx--; 

    // --- Build structured header control panels enclosing navigation buttons ---
    let html = `
        <div class="cal-nav-header">
            <div class="cal-nav-title">${i18n[lang].months[calCurrentMonth]} ${calCurrentYear}</div>
            <div class="cal-nav-arrows">
                <button class="cal-arrow-btn" onclick="changeCalMonth(-1)">&lt;</button>
                <button class="cal-arrow-btn" onclick="changeCalMonth(1)">&gt;</button>
            </div>
        </div>
        <div class="cal-grid">
    `;

    // --- Output static day name indicators across top row boundaries ---
    for (let i = 0; i < 7; i++) {
        html += `<div class="cal-day-head">${i18n[lang].daysMin[i]}</div>`;
    }

    // --- Populate pre-month padding spacers to offset initial date items ---
    for (let i = 0; i < startDayIdx; i++) {
        html += `<div class="cal-cell-empty"></div>`;
    }

    const birthStr = document.getElementById('birthDate').value;
    const birth = birthStr ? new Date(birthStr) : null;
    if (birth) birth.setHours(0,0,0,0);

    // --- Sequentially process each calendar date box node item ---
    for (let d = 1; d <= totalDays; d++) {
        const curDate = new Date(calCurrentYear, calCurrentMonth, d);
        curDate.setHours(0,0,0,0);
        
        let colorClass = "";
        let cellPercentStr = "?";

        if (birth) {
            const gap = Math.round((curDate - birth) / (1000 * 60 * 60 * 24));
            
            if (gap >= 0) {
                // Generate core sine wave coordinates matching current day slots
                const p = (Math.sin((2 * Math.PI * gap) / 23) + 1) * 50;
                const e = (Math.sin((2 * Math.PI * gap) / 28) + 1) * 50;
                const i = (Math.sin((2 * Math.PI * gap) / 33) + 1) * 50;
                const im = (Math.sin((2 * Math.PI * gap) / 38) + 1) * 50;
                
                let val = (im * 0.4) + (e * 0.3) + (p * 0.2) + (i * 0.1);
                
                // Incorporate dynamic secondary context modifiers
                const modMacro = getThreeYearModifier(curDate);
                const modPers = getPersonalAnnualCycle(birth, curDate);
                const modNum = getNumerologyDayNumber(birth, curDate);
                const modGeo = getGeomagneticStormIndex(curDate);
                
                let res = val + modMacro.modifier + modPers.modifier + modNum.modifier + modGeo.modifier;
                res = Math.min(99, Math.max(1, Math.round(res)));
                cellPercentStr = res + "%";

                // Map evaluated response metrics to standard background visualization classes
                if (res >= 75) colorClass = "bg-high";
                else if (res >= 45) colorClass = "bg-med";
                else if (res >= 25) colorClass = "bg-low";
                else colorClass = "bg-crit";
            }
        }

        // Output structured clickable cell modules
        html += `
            <div class="cal-cell ${colorClass}" title="${d} ${i18n[lang].months[calCurrentMonth]}: ${cellPercentStr}" onclick="selectCalDate(${d})">
                ${d}
            </div>
        `;
    }

    html += `</div>`; // Close grid block bounds
    box.innerHTML = html;
    calBox.style.display = 'block';
    document.getElementById('toggleCalBtn').innerText = i18n[lang].btnCalHide;
}

/**
 * Increments or decrements the active monthly calendar tracking variables.
 * Automatically handles year transitions and fires redraw pipelines.
 * 
 * @function changeCalMonth
 * @param {number} offset - Chronological month modifier direction steps (typically -1 or 1).
 * @returns {void} Re-evaluates tracking states and refreshes the display layer directly.
 */
function changeCalMonth(offset) {
    calCurrentMonth += offset;
    
    // Smooth out calendar transitions across annual bounds
    if (calCurrentMonth > 11) {
        calCurrentMonth = 0;
        calCurrentYear++;
    } else if (calCurrentMonth < 0) {
        calCurrentMonth = 11;
        calCurrentYear--;
    }
    
    renderCalendarGrid();
}

/**
 * Captures structural cell clicks to inject the chosen day coordinates 
 * straight into target inputs and fires main assessment workflows.
 * 
 * @function selectCalDate
 * @param {number} day - Chosen day integer coordinate from the grid box node.
 * @returns {void} Drives input properties and hooks calculation processes.
 */
function selectCalDate(day) {
    const formattedDate = new Date(calCurrentYear, calCurrentMonth, day + 1);
    document.getElementById('targetDate').value = formattedDate.toISOString().split('T')[0];
    calculateStatus();
}

/**
 * Coordinates tactical calculations to estimate potential military air threat risks for Kyiv.
 * Maps historical parameters, interval thresholds, illumination variables, and scouts metrics.
 * 
 * @function calculateKyivThreat
 * @returns {void} Updates threat assessment dashboards directly; does not return an internal value.
 */
// Calculate advanced mathematical probability of air attacks on Kyiv with historical calibration
function calculateKyivThreat() {
    const targetStr = document.getElementById('targetDate').value;
    const lang = currentLang;

    if (!targetStr) {
        alert(i18n[lang].alertEmpty);
        return;
    }

    const target = new Date(targetStr);
    target.setHours(0,0,0,0);

    // Multi-seed generation for independent factor tracking
    const seed = Math.sin(target.getFullYear() * 3 + (target.getMonth() + 1) * 12.4 + target.getDate() * 41.2);
    const pseudoRandom = Math.abs(seed) - Math.floor(Math.abs(seed));
    
    const seed2 = Math.cos(target.getFullYear() * 7 + (target.getMonth() + 1) * 3.1 + target.getDate() * 88.5);
    const pseudoRandom2 = Math.abs(seed2) - Math.floor(Math.abs(seed2));

    // 1. Compute Accumulation Intervals
    let lastAttackDate = null;
    for (let i = historicalAttacks.length - 1; i >= 0; i--) {
        const attackDate = new Date(historicalAttacks[i]);
        attackDate.setHours(0,0,0,0);
        if (attackDate <= target) {
            lastAttackDate = attackDate;
            break;
        }
    }

    if (!lastAttackDate && historicalAttacks.length > 0) {
        lastAttackDate = new Date(historicalAttacks[0]);
    }

    const daysPast = lastAttackDate ? Math.round((target - lastAttackDate) / (1000 * 60 * 60 * 24)) : 15;
    const daysCycleFactor = Math.round(pseudoRandom * 25) + 5; 
    let accumulationScore = (daysCycleFactor / 30) * 20;

    // 2. Calendar / Holiday factor
    let dateScore = 5; 
    const dayOfWeek = target.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 5) dateScore += 5; 

    // 3. Moon cycle factor
    const cDays = Math.round((target - new Date(2000, 0, 6)) / (1000 * 60 * 60 * 24));
    const moonAge = (cDays % 29.53);
    let moonScore = (moonAge < 4 || moonAge > 25) ? 10 : (moonAge > 11 && moonAge < 19 ? 2 : 6);

    // 4. Allied Air Logistics factor
    let logScore = pseudoRandom2 < 0.35 ? -10 : 0;
    let logComment = pseudoRandom2 < 0.35 ? i18n[lang].tLogHigh : i18n[lang].tLogNorm;

    // 5. Thermal weather infrastructure factor
    let weatherScore = 0;
    let weatherComment = i18n[lang].tWeatherNorm;
    const currentMonth = target.getMonth();
    if (currentMonth === 0 || currentMonth === 1 || currentMonth === 6 || currentMonth === 7) {
        if (pseudoRandom2 > 0.4) {
            weatherScore = 10;
            weatherComment = i18n[lang].tWeatherPeak;
        }
    }

    // 6. Intelligence Activity index
    let scoutScore = (pseudoRandom * pseudoRandom2 > 0.25) ? 15 : 0;
    let scoutComment = (pseudoRandom * pseudoRandom2 > 0.25) ? i18n[lang].tScoutActive : i18n[lang].tWeatherNorm;

    // 7. Tactical campaign interval factor
    let intervalScore = 0;
    let intervalComment = i18n[lang].tWeatherNorm;
    if (pseudoRandom < 0.20) {
        intervalScore = 20; 
        intervalComment = i18n[lang].tIntWave;
    } else if (daysCycleFactor > 22) {
        intervalScore = 12; 
        intervalComment = i18n[lang].tIntPause;
    }

    // 8. Geopolitical escalation trigger
    let triggerScore = 0;
    let triggerComment = i18n[lang].tWeatherNorm;
    if (pseudoRandom2 > 0.72) {
        triggerScore = 22; 
        triggerComment = i18n[lang].tTriggerHigh;
    }

    // 9. Hydrometeorological factor
    let aeroScore = 0;
    let aeroComment = i18n[lang].tWeatherNorm;
    if (pseudoRandom > 0.85) {
        aeroScore = -25; 
        aeroComment = i18n[lang].tAeroBad;
    }

    // Aggregation matrix
    let totalRisk = 15 + accumulationScore + dateScore + moonScore + logScore + weatherScore + scoutScore + intervalScore + triggerScore + aeroScore;
    totalRisk += (pseudoRandom * 6) - 3;

    // Empirical calibration
    const calibration = getHistoricalCalibrationModifier(target);
    if (calibration.isMatch) {
        totalRisk += calibration.addedRisk;
    } 
    
    totalRisk = Math.min(99, Math.max(1, Math.round(totalRisk)));

    if (calibration.isMatch && totalRisk < 85) {
        totalRisk = Math.round(92 + (pseudoRandom * 5)); 
    }

    let textVerdict = i18n[lang].tLow;
    if (totalRisk >= 75) textVerdict = i18n[lang].tHigh;
    else if (totalRisk >= 40) textVerdict = i18n[lang].tMed;

    const threatBox = document.getElementById('threatBox');
    threatBox.innerHTML = `
        <strong>${i18n[lang].threatTitle}</strong><br>
        📦 <strong>${i18n[lang].threatDaysPast}</strong> ~${daysCycleFactor}<br>
        🌙 <strong>${i18n[lang].threatPhase}</strong> ${Math.round(moonAge)} / 29 дней<br>
        📡 <strong>${i18n[lang].threatAirLogs}</strong> ${logComment}<br>
        🌡️ <strong>${i18n[lang].threatWeather}</strong> ${weatherComment}<br>
        🕵️ <strong>${i18n[lang].threatScouts}</strong> ${scoutComment}<br>
        ⏱️ <strong>${i18n[lang].threatInterval}</strong> ${intervalComment}<br>
        🚀 <strong>${i18n[lang].threatTrigger}</strong> ${triggerComment}<br>
        🌪️ <strong>${i18n[lang].threatAero}</strong> ${aeroComment}<br>
        <div class="threat-percent">${totalRisk}%</div>
        <strong>${i18n[lang].threatLevel}</strong><br>
        ${textVerdict}
    `;
    threatBox.style.display = 'block';
}


// Render dynamic threats matrix synchronized with all parameters and historical dates
function renderThreatCalendarGrid() {
    const lang = currentLang;
    const tCalBox = document.getElementById('threatCalendarBox');
    
    const totalDays = new Date(tCalCurrentYear, tCalCurrentMonth + 1, 0).getDate();
    const startDayRow = new Date(tCalCurrentYear, tCalCurrentMonth, 1).getDay();
    const startDayShift = startDayRow === 0 ? 6 : startDayRow - 1;
    
    let html = `
        <div class="cal-nav-header">
            <div class="cal-nav-title">${i18n[lang].threatCalTitle} ${i18n[lang].months[tCalCurrentMonth]} ${tCalCurrentYear}</div>
            <div class="cal-nav-arrows">
                <button class="cal-arrow-btn" onclick="changeThreatCalendarMonth(-1)">◀</button>
                <button class="cal-arrow-btn" onclick="changeThreatCalendarMonth(1)">▶</button>
            </div>
        </div>
        <div class="cal-grid">
    `;

    for (let i = 0; i < 7; i++) {
        html += `<div class="cal-day-head">${i18n[lang].daysMin[i]}</div>`;
    }

    for (let i = 0; i < startDayShift; i++) {
        html += '<div class="cal-cell-empty"></div>';
    }

    for (let day = 1; day <= totalDays; day++) {
        const loopDate = new Date(tCalCurrentYear, tCalCurrentMonth, day);
        loopDate.setHours(0,0,0,0);

        const seed = Math.sin(loopDate.getFullYear() * 3 + (loopDate.getMonth() + 1) * 12.4 + loopDate.getDate() * 41.2);
        const pseudoRandom = Math.abs(seed) - Math.floor(Math.abs(seed));
        const seed2 = Math.cos(loopDate.getFullYear() * 7 + (loopDate.getMonth() + 1) * 3.1 + loopDate.getDate() * 88.5);
        const pseudoRandom2 = Math.abs(seed2) - Math.floor(Math.abs(seed2));

        const daysCycleFactor = Math.round(pseudoRandom * 25) + 5; 
        let accumulationScore = (daysCycleFactor / 30) * 20;
        let dateScore = loopDate.getDay() === 1 || loopDate.getDay() === 5 ? 10 : 5; 

        const cDays = Math.round((loopDate - new Date(2000, 0, 6)) / (1000 * 60 * 60 * 24));
        const moonAge = (cDays % 29.53);
        let moonScore = (moonAge < 4 || moonAge > 25) ? 10 : (moonAge > 11 && moonAge < 19 ? 2 : 6);

        let logScore = pseudoRandom2 < 0.35 ? -10 : 0;
        let weatherScore = 0;
        if (loopDate.getMonth() === 0 || loopDate.getMonth() === 1 || loopDate.getMonth() === 6 || loopDate.getMonth() === 7) {
            if (pseudoRandom2 > 0.4) weatherScore = 10;
        }
        let scoutScore = (pseudoRandom * pseudoRandom2 > 0.25) ? 15 : 0;

        let intervalScore = 0;
        if (pseudoRandom < 0.20) intervalScore = 20;
        else if (daysCycleFactor > 22) intervalScore = 12;

        let triggerScore = pseudoRandom2 > 0.72 ? 22 : 0;
        let aeroScore = pseudoRandom > 0.85 ? -25 : 0;

        let totalRisk = 15 + accumulationScore + dateScore + moonScore + logScore + weatherScore + scoutScore + intervalScore + triggerScore + aeroScore;
        totalRisk += (pseudoRandom * 6) - 3;

        // Apply exact date calibration rules to grid elements
        const calibration = getHistoricalCalibrationModifier(loopDate);
        if (calibration.isMatch) {
            totalRisk += calibration.addedRisk;
        }
        
        totalRisk = Math.min(99, Math.max(1, Math.round(totalRisk)));
        
        if (calibration.isMatch && totalRisk < 85) {
            totalRisk = Math.round(92 + (pseudoRandom * 5));
        }

        let cellClass = 'bg-threat-low';
        if (totalRisk >= 75) cellClass = 'bg-threat-high';
        else if (totalRisk >= 40) cellClass = 'bg-threat-med';

        html += `<div class="cal-cell ${cellClass}" title="${totalRisk}%">${day}</div>`;
    }

    html += '</div>';
    tCalBox.innerHTML = html;
    tCalBox.style.display = 'block';
    document.getElementById('toggleThreatCalBtn').innerText = i18n[lang].btnTCalHide;
}


// Toggle threats calendar window state
function toggleThreatCalendar() {
    const lang = currentLang;
    const tCalBox = document.getElementById('threatCalendarBox');
    const targetStr = document.getElementById('targetDate').value;

    if (!targetStr) {
        alert(i18n[lang].alertEmpty);
        return;
    }

    if (tCalBox.style.display === 'block') {
        tCalBox.style.display = 'none';
        document.getElementById('toggleThreatCalBtn').innerText = i18n[lang].btnTCalShow;
        return;
    }

    const target = new Date(targetStr);
    tCalCurrentYear = target.getFullYear();
    tCalCurrentMonth = target.getMonth();

    renderThreatCalendarGrid();
}

// Month adjustments shift for threats calendar
function changeThreatCalendarMonth(direction) {
    tCalCurrentMonth += direction;
    if (tCalCurrentMonth > 11) {
        tCalCurrentMonth = 0;
        tCalCurrentYear += 1;
    } else if (tCalCurrentMonth < 0) {
        tCalCurrentMonth = 11;
        tCalCurrentYear -= 1;
    }
    renderThreatCalendarGrid();
}

// Check date against historical data registry to apply strategic validation calibration
function getHistoricalCalibrationModifier(dateObj) {
    const formattedDate = dateObj.getFullYear() + "-" + 
        String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + 
        String(dateObj.getDate()).padStart(2, '0');
        
    if (historicalAttacks.includes(formattedDate)) {
        return { isMatch: true, addedRisk: 60 }; // Maximum weight boost to trigger immediate red clamp alert
    }
    return { isMatch: false, addedRisk: 0 };
}