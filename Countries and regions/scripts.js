const COUNTRY_LIBRARY = {
    zombie: { id: "zombie", name: "Zombie horde", color: "#a3e635" },
    orange: { id: "orange", name: "Orange country", color: "#f97316" },
    green: { id: "green", name: "Green country", color: "#16a34a" },
    blue: { id: "blue", name: "Blue country", color: "#3b82f6" },
    cyan1: { id: "cyan1", name: "Cyan union I", color: "#38bdf8" },
    cyan2: { id: "cyan2", name: "Cyan union II", color: "#38bdf8" },
    cyan3: { id: "cyan3", name: "Cyan union III", color: "#38bdf8" },
    cyan: { id: "cyan", name: "Cyan country", color: "#38bdf8" },
    black: { id: "black", name: "Black country", color: "#111827" },
    darkgray: { id: "darkgray", name: "Dark gray country", color: "#4b5563" },
    yellow: { id: "yellow", name: "Yellow country", color: "#facc15" },
    purple: { id: "purple", name: "Purple country", color: "#a855f7" },
    red: { id: "red", name: "Red country", color: "#ef4444" },
    pink: { id: "pink", name: "Pink country", color: "#ec4899" },
    teal: { id: "teal", name: "Teal country", color: "#14b8a6" }
};

const MAP_OUTLINE = [
    [20, 20], [520, 20], [520, 640], [20, 640]
];

function withAlpha(hex, alpha) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function signedDistanceToBisector(point, a, b) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const nx = b.x - a.x;
    const ny = b.y - a.y;
    return (point.x - mx) * nx + (point.y - my) * ny;
}

function clipPolygonByBisector(poly, a, b) {
    if (!poly.length) return [];
    const result = [];
    const eps = 1e-6;
    for (let i = 0; i < poly.length; i += 1) {
    const cur = poly[i];
    const next = poly[(i + 1) % poly.length];
    const d1 = signedDistanceToBisector(cur, a, b);
    const d2 = signedDistanceToBisector(next, a, b);
    const inside1 = d1 <= eps;
    const inside2 = d2 <= eps;
    if (inside1 && inside2) {
        result.push(next);
    } else if (inside1 && !inside2) {
        const t = d1 / (d1 - d2);
        result.push({ x: cur.x + (next.x - cur.x) * t, y: cur.y + (next.y - cur.y) * t });
    } else if (!inside1 && inside2) {
        const t = d1 / (d1 - d2);
        result.push({ x: cur.x + (next.x - cur.x) * t, y: cur.y + (next.y - cur.y) * t });
        result.push(next);
    }
    }
    return result;
}

function dedupePolygon(poly) {
    const out = [];
    for (const p of poly) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(prev.x - p.x, prev.y - p.y) > 0.8) out.push(p);
    }
    if (out.length > 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.8) out.pop();
    }
    return out;
}

function polygonAreaByPoints(pts) {
    if (!pts || pts.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
    }
    return Math.abs(area) / 2;
}

function regularPolygonAround(x, y, radius, sides = 8) {
    const pts = [];
    for (let i = 0; i < sides; i += 1) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
    }
    return pts;
}

function buildVoronoiGeometry(regionData, outline, minCellArea = 300) {
    const outlinePoly = outline.map(([x, y]) => ({ x, y }));
    const siteById = new Map(regionData.map((r) => [r.id, { x: r.x, y: r.y }]));
    const cellById = {};

    for (const region of regionData) {
    let cell = [...outlinePoly];
    const a = siteById.get(region.id);
    for (const other of regionData) {
        if (other.id === region.id) continue;
        const b = siteById.get(other.id);
        cell = clipPolygonByBisector(cell, a, b);
        if (!cell.length) break;
    }
    let deduped = dedupePolygon(cell);
    if (deduped.length < 3 || polygonAreaByPoints(deduped) < minCellArea) {
        deduped = dedupePolygon(regularPolygonAround(a.x, a.y, 24, 10));
    }
    cellById[region.id] = deduped;
    }

    const regionVertices = {};
    const regionShapes = {};
    const vertexKeyToId = new Map();
    let vertexCounter = 0;
    const quant = (n) => Math.round(n * 2) / 2;

    function ensureVertexId(pt) {
    const key = `${quant(pt.x)}|${quant(pt.y)}`;
    if (!vertexKeyToId.has(key)) {
        vertexCounter += 1;
        const id = `V${vertexCounter}`;
        vertexKeyToId.set(key, id);
        regionVertices[id] = [quant(pt.x), quant(pt.y)];
    }
    return vertexKeyToId.get(key);
    }

    for (const region of regionData) {
    const cell = cellById[region.id];
    regionShapes[region.id] = cell.map((pt) => ensureVertexId(pt));
    }

    const edgeToRegions = new Map();
    for (const region of regionData) {
    const verts = regionShapes[region.id];
    for (let i = 0; i < verts.length; i += 1) {
        const a = verts[i];
        const b = verts[(i + 1) % verts.length];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!edgeToRegions.has(key)) edgeToRegions.set(key, []);
        edgeToRegions.get(key).push(region.id);
    }
    }

    const neighbors = Object.fromEntries(regionData.map((r) => [r.id, []]));
    for (const regionIds of edgeToRegions.values()) {
    if (regionIds.length !== 2) continue;
    const [a, b] = regionIds;
    if (!neighbors[a].includes(b)) neighbors[a].push(b);
    if (!neighbors[b].includes(a)) neighbors[b].push(a);
    }

    return { neighbors, regionVertices, regionShapes };
}

const GAME_MAPS = {
    default: {
    id: "default",
    name: "2 countries",
    countryOrder: ["orange", "green"],
    regionData: [
        { id: "o_top", owner: "orange", army: 50, x: 250, y: 162, capital: false },
        { id: "o_cap", owner: "orange", army: 50, x: 286, y: 286, capital: true },
        { id: "o_ne", owner: "orange", army: 20, x: 398, y: 205, capital: false },
        { id: "o_east", owner: "orange", army: 10, x: 422, y: 332, capital: false },
        { id: "g_west", owner: "green", army: 20, x: 150, y: 262, capital: false },
        { id: "g_center", owner: "green", army: 30, x: 238, y: 390, capital: false },
        { id: "g_sw", owner: "green", army: 40, x: 100, y: 481, capital: true },
        { id: "g_se_mid", owner: "green", army: 20, x: 338, y: 438, capital: false },
        { id: "g_south", owner: "green", army: 30, x: 278, y: 548, capital: false }
    ],
    neighbors: {
        o_top: ["o_cap", "o_ne", "g_west"],
        o_cap: ["o_top", "o_ne", "o_east", "g_west", "g_center", "g_se_mid"],
        o_ne: ["o_top", "o_cap", "o_east"],
        o_east: ["o_cap", "o_ne", "g_se_mid"],
        g_west: ["o_top", "o_cap", "g_center", "g_sw"],
        g_center: ["g_west", "o_cap", "g_se_mid", "g_south"],
        g_sw: ["g_west", "g_center", "g_south"],
        g_se_mid: ["g_center", "o_cap", "o_east", "g_south"],
        g_south: ["g_center", "g_sw", "g_se_mid"]
    },
    regionVertices: {
        A: [115, 166], B: [170, 188], C: [205, 218], D: [245, 260], E: [288, 239], F: [328, 168],
        G: [327, 263], H: [362, 270], I: [391, 314], J: [355, 348], K: [340, 350], L: [287, 345],
        M: [245, 318], N: [304, 289], O: [400, 289], P: [454, 289], Q: [392, 383], R: [325, 390],
        S: [305, 434], T: [363, 432], U: [390, 461], V: [246, 434], W: [176, 430], X: [196, 486],
        Y: [171, 551], Z: [115, 395], AA: [115, 320], AB: [190, 310], AC: [50, 397], AD: [35, 307],
        AE: [52, 252], AF: [91, 219], AG: [102, 520], AH: [65, 454], AI: [174, 580], AJ: [260, 606],
        AK: [350, 539], AL: [468, 336], AM: [496, 272], AN: [500, 191], AO: [464, 128], AP: [387, 104],
        AQ: [339, 49], AR: [275, 34], AS: [196, 53], AT: [110, 86], AU: [410, 396]
    },
    regionShapes: {
        o_top: ["A", "B", "C", "D", "E", "F", "AP", "AQ", "AR", "AS", "AT"],
        o_ne: ["F", "AP", "AO", "AN", "AM", "P", "O", "H", "G"],
        o_east: ["H", "O", "P", "AM", "AL", "AU", "Q", "J", "I"],
        o_cap: ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M"],
        g_west: ["AD", "AE", "AF", "A", "B", "C", "D", "M", "AB", "AA", "Z", "AC"],
        g_center: ["Z", "AA", "AB", "M", "L", "K", "J", "R", "S", "V", "W"],
        g_sw: ["AC", "Z", "W", "X", "Y", "AI", "AG", "AH"],
        g_se_mid: ["R", "J", "Q", "AU", "U", "T", "S"],
        g_south: ["W", "V", "S", "T", "U", "AK", "AJ", "AI", "Y", "X"]
    }
    },
    zombie_map: {
    id: "zombie_map",
    name: "zombie apocalypse",
    countryOrder: ["zombie", "blue", "red", "orange", "purple"],
    alliances: {
        "Humans": ["blue", "red", "orange", "purple"]
    },
    regionData: [
        { id: "zombie_center", owner: "zombie", army: 850, x: 270, y: 330, capital: true },
        { id: "human_reg1", owner: "blue", army: 45, x: 120, y: 120, capital: true },
        { id: "human_reg2", owner: "red", army: 60, x: 270, y: 110, capital: false },
        { id: "human_reg3", owner: "orange", army: 35, x: 420, y: 120, capital: true },
        { id: "human_reg4", owner: "purple", army: 55, x: 110, y: 330, capital: false },
        { id: "human_reg5", owner: "blue", army: 40, x: 430, y: 330, capital: false },
        { id: "human_reg6", owner: "red", army: 70, x: 120, y: 540, capital: true },
        { id: "human_reg7", owner: "orange", army: 50, x: 270, y: 550, capital: false },
        { id: "human_reg8", owner: "purple", army: 65, x: 420, y: 540, capital: true },
        { id: "human_reg9", owner: "blue", army: 30, x: 200, y: 220, capital: false },
        { id: "human_reg10", owner: "red", army: 40, x: 340, y: 220, capital: false },
        { id: "human_reg11", owner: "orange", army: 35, x: 200, y: 440, capital: false },
        { id: "human_reg12", owner: "purple", army: 50, x: 340, y: 440, capital: false }
    ],
    neighbors: {
        zombie_center: ["human_reg2", "human_reg4", "human_reg5", "human_reg7", "human_reg9", "human_reg10", "human_reg11", "human_reg12"],
        human_reg1: ["human_reg2", "human_reg4", "human_reg9"],
        human_reg2: ["human_reg1", "human_reg3", "human_reg9", "human_reg10", "zombie_center"],
        human_reg3: ["human_reg2", "human_reg5", "human_reg10"],
        human_reg4: ["human_reg1", "human_reg6", "human_reg9", "human_reg11", "zombie_center"],
        human_reg5: ["human_reg3", "human_reg8", "human_reg10", "human_reg12", "zombie_center"],
        human_reg6: ["human_reg4", "human_reg7", "human_reg11"],
        human_reg7: ["human_reg6", "human_reg8", "human_reg11", "human_reg12", "zombie_center"],
        human_reg8: ["human_reg5", "human_reg7", "human_reg12"],
        human_reg9: ["human_reg1", "human_reg2", "human_reg4", "zombie_center"],
        human_reg10: ["human_reg2", "human_reg3", "human_reg5", "zombie_center"],
        human_reg11: ["human_reg4", "human_reg6", "human_reg7", "zombie_center"],
        human_reg12: ["human_reg5", "human_reg7", "human_reg8", "zombie_center"]
    },
    regionVertices: {
        ZV1: [195, 275], ZV2: [345, 275], ZV3: [345, 385], ZV4: [195, 385],
        H1_1: [20, 20], H1_2: [195, 20], H1_3: [195, 170], H1_4: [20, 170],
        H2_1: [195, 20], H2_2: [345, 20], H2_3: [345, 170], H2_4: [195, 170],
        H3_1: [345, 20], H3_2: [520, 20], H3_3: [520, 170], H3_4: [345, 170],
        H4_1: [20, 170], H4_2: [195, 170], H4_3: [195, 490], H4_4: [20, 490],
        H5_1: [345, 170], H5_2: [520, 170], H5_3: [520, 490], H5_4: [345, 490],
        H6_1: [20, 490], H6_2: [195, 490], H6_3: [195, 640], H6_4: [20, 640],
        H7_1: [195, 490], H7_2: [345, 490], H7_3: [345, 640], H7_4: [195, 640],
        H8_1: [345, 490], H8_2: [520, 490], H8_3: [520, 640], H8_4: [345, 640],
        H9_1: [195, 170], H9_2: [270, 170], H9_3: [270, 275], H9_4: [195, 275],
        H10_1: [270, 170], H10_2: [345, 170], H10_3: [345, 275], H10_4: [270, 275],
        H11_1: [195, 385], H11_2: [270, 385], H11_3: [270, 490], H11_4: [195, 490],
        H12_1: [270, 385], H12_2: [345, 385], H12_3: [345, 490], H12_4: [270, 490]
    },
    regionShapes: {
        zombie_center: ["ZV1", "ZV2", "ZV3", "ZV4"],
        human_reg1: ["H1_1", "H1_2", "H1_3", "H1_4"],
        human_reg2: ["H2_1", "H2_2", "H2_3", "H2_4"],
        human_reg3: ["H3_1", "H3_2", "H3_3", "H3_4"],
        human_reg4: ["H4_1", "H4_2", "H4_3", "H4_4"],
        human_reg5: ["H5_1", "H5_2", "H5_3", "H5_4"],
        human_reg6: ["H6_1", "H6_2", "H6_3", "H6_4"],
        human_reg7: ["H7_1", "H7_2", "H7_3", "H7_4"],
        human_reg8: ["H8_1", "H8_2", "H8_3", "H8_4"],
        human_reg9: ["H9_1", "H9_2", "H9_3", "H9_4"],
        human_reg10: ["H10_1", "H10_2", "H10_3", "H10_4"],
        human_reg11: ["H11_1", "H11_2", "H11_3", "H11_4"],
        human_reg12: ["H12_1", "H12_2", "H12_3", "H12_4"]
    }
    },
    sketch6: {
    id: "sketch6",
    name: "6 countries",
    countryOrder: ["green","blue","purple","black","darkgray","orange","yellow"],
    alliances: {
      "A": ["darkgray","green","blue","yellow","orange"],
      "B": ["purple","black"]
    },
    neighbors: {
      "o_1": ["o_3", "o_4", "k_7", "k_14"],
      "o_3": ["o_1", "o_4", "y_1", "k_7", "k_8", "k_9"],
      "o_4": ["o_1", "o_3", "k_14"],
      "k_6": ["k_10", "k_11", "k_12", "k_15"],
      "k_10": ["k_6", "k_9", "k_11", "k_15", "y_2"],
      "k_11": ["k_6", "k_10", "k_12", "k_15", "y_4"],
      "k_15": ["k_9", "k_10", "k_11"]
    },
    // Координати центрів регіонів, виставлені чітко за твоїм малюнком
    regionData: [
      {"id": "g_1", "owner": "green", "army": 50, "x": 200, "y": 70, "capital": false},
      {"id": "g_2", "owner": "green", "army": 50, "x": 310, "y": 75, "capital": false}, 
      {"id": "g_3", "owner": "green", "army": 50, "x": 255, "y": 130, "capital": false}, 
      {"id": "b_1", "owner": "blue", "army": 20, "x": 330, "y": 175, "capital": false}, 
      {"id": "b_2", "owner": "blue", "army": 40, "x": 420, "y": 170, "capital": false}, 
      {"id": "b_3", "owner": "blue", "army": 30, "x": 245, "y": 240, "capital": false}, 
      {"id": "b_4", "owner": "blue", "army": 30, "x": 322, "y": 240, "capital": true}, 
      {"id": "b_5", "owner": "blue", "army": 30, "x": 440, "y": 270, "capital": false}, 
      {"id": "b_6", "owner": "blue", "army": 20, "x": 185, "y": 285, "capital": false}, 
      {"id": "b_7", "owner": "blue", "army": 30, "x": 280, "y": 290, "capital": false}, 
      {"id": "b_8", "owner": "blue", "army": 40, "x": 380, "y": 290, "capital": false}, 
      {"id": "p_1", "owner": "purple", "army": 150, "x": 485, "y": 215, "capital": false}, 
      {"id": "k_1", "owner": "darkgray", "army": 30, "x": 130, "y": 140, "capital": true}, 
      {"id": "k_2", "owner": "darkgray", "army": 20, "x": 145, "y": 205, "capital": false}, 
      {"id": "k_3", "owner": "black", "army": 40, "x": 185, "y": 380, "capital": false}, 
      {"id": "k_4", "owner": "black", "army": 40, "x": 300, "y": 380, "capital": false}, 
      {"id": "k_5", "owner": "black", "army": 40, "x": 415, "y": 375, "capital": false}, 
      {"id": "k_6", "owner": "black", "army": 50, "x": 415, "y": 435, "capital": true},
      {"id": "k_7", "owner": "black", "army": 40, "x": 225, "y": 480, "capital": false}, 
      {"id": "k_8", "owner": "black", "army": 40, "x": 325, "y": 475, "capital": false}, 
      {"id": "k_12", "owner": "black", "army": 30, "x": 420, "y": 445, "capital": false}, 
      {"id": "k_13", "owner": "darkgray", "army": 20, "x": 105, "y": 275, "capital": false}, 
      {"id": "k_14", "owner": "darkgray", "army": 20, "x": 82, "y": 345, "capital": false}, 
      {"id": "k_16", "owner": "darkgray", "army": 20, "x": 95, "y": 195, "capital": false}, 
      {"id": "k_15", "owner": "black", "army": 40, "x": 410, "y": 490, "capital": false}, 
      {"id": "o_1", "owner": "orange", "army": 30, "x": 135, "y": 485, "capital": false},
      {"id": "o_3", "owner": "orange", "army": 20, "x": 180, "y": 535, "capital": false}, 
      {"id": "o_4", "owner": "orange", "army": 30, "x": 130, "y": 515, "capital": true}, 
      {"id": "k_9", "owner": "black", "army": 30, "x": 285, "y": 510, "capital": false}, 
      {"id": "k_10", "owner": "black", "army": 30, "x": 335, "y": 510, "capital": false}, 
      {"id": "k_11", "owner": "black", "army": 30, "x": 385, "y": 505, "capital": false}, 
      {"id": "y_1", "owner": "yellow", "army": 20, "x": 245, "y": 570, "capital": false}, 
      {"id": "y_2", "owner": "yellow", "army": 10, "x": 325, "y": 575, "capital": false}, 
      {"id": "y_3", "owner": "yellow", "army": 20, "x": 285, "y": 605, "capital": false}, 
      {"id": "y_4", "owner": "yellow", "army": 30, "x": 410, "y": 555, "capital": true}
    ],
    // Розтягуємо межі карти на весь доступний canvas 540x660
    outline: [[270, 20], [360, 30], [440, 60], [490, 110], [510, 170], [520, 240], [500, 320], [470, 400], [490, 450], [470, 520], [420, 580], [350, 620], [270, 640], [190, 630], [130, 590], [70, 550], [40, 490], [30, 420], [40, 350], [30, 280], [40, 210], [60, 140], [100, 80], [180, 40]],
    // Ставимо мінімальну площу, щоб прибрати аварійні кола на межах
    minCellArea: 10
    },

    moldova: {
        id: "moldova",
        name: "Republic of Moldova (12 regions)",
        countryOrder: ["blue", "green", "orange", "red"],
        regionData: [
            { id: "md_briceni", owner: "blue", army: 30, x: 140, y: 70, capital: false },
            { id: "md_balti", owner: "blue", army: 45, x: 210, y: 130, capital: true },
            { id: "md_soroca", owner: "blue", army: 25, x: 280, y: 90, capital: false },

            { id: "md_ungheni", owner: "green", army: 25, x: 160, y: 200, capital: false },
            { id: "md_orhei", owner: "green", army: 35, x: 290, y: 190, capital: true },
            { id: "md_dubasari", owner: "green", army: 20, x: 340, y: 160, capital: false },

            { id: "md_hincesti", owner: "orange", army: 25, x: 210, y: 280, capital: false },
            { id: "md_chisinau", owner: "orange", army: 50, x: 280, y: 260, capital: true },
            { id: "md_tiraspol", owner: "orange", army: 40, x: 360, y: 270, capital: false },

            { id: "md_cahul", owner: "red", army: 30, x: 180, y: 460, capital: false },
            { id: "md_gagauzia", owner: "red", army: 35, x: 240, y: 390, capital: true },
            { id: "md_stefan_voda", owner: "red", army: 25, x: 330, y: 370, capital: false }
        ],
        regionVertices: {
            V1: [80, 60],
            V2: [200, 90],
            V3: [240, 115],
            V4: [260, 120],
            V5: [330, 190],
            V6: [350, 266],
            V7: [340, 340],
            V8: [260, 420],
            V9: [300, 480],
            V10: [100, 480],
            V11: [155, 460],
            V12: [150, 350],
            V13: [150, 240],
            V14: [130, 140],
            V15: [220, 130],
            V16: [270, 230],
            V17: [210, 250],
            V18: [275, 260],
            V19: [200, 360],
            V20: [280, 350],
            V21: [200, 400],
            V22: [340, 480],
            V23: [80, 460],
        },
            regionShapes: {
            md_briceni: ["V1", "V2", "V15", "V14"],
            md_balti: ["V15", "V3", "V16", "V17"],
            md_soroca: ["V3", "V4", "V5", "V16"],
            
            md_ungheni: ["V14", "V15", "V17", "V13"],
            md_orhei: ["V16", "V5", "V6", "V18"],
            md_dubasari: ["V6", "V7", "V18"],
            
            md_hincesti: ["V13", "V17", "V19", "V12"],
            md_chisinau: ["V17", "V16", "V18", "V20", "V19"],
            md_tiraspol: ["V18", "V7", "V20"],
            
            md_cahul: ["V12", "V19", "V21", "V11", "V10", "V23"],
            md_gagauzia: ["V19", "V20", "V8", "V21"],
            md_stefan_voda: ["V20", "V8", "V9", "V22", "V7"]
        },
        neighbors: {
            md_briceni: ["md_balti", "md_ungheni"],
            md_balti: ["md_briceni", "md_soroca", "md_ungheni", "md_chisinau"],
            md_soroca: ["md_balti", "md_orhei"],
            md_ungheni: ["md_briceni", "md_balti", "md_hincesti", "md_chisinau"],
            md_orhei: ["md_soroca", "md_balti", "md_dubasari", "md_chisinau"],
            md_dubasari: ["md_orhei", "md_chisinau", "md_tiraspol"],
            md_hincesti: ["md_ungheni", "md_chisinau", "md_cahul", "md_gagauzia"],
            md_chisinau: ["md_balti", "md_ungheni", "md_orhei", "md_dubasari", "md_hincesti", "md_tiraspol", "md_gagauzia"],
            md_tiraspol: ["md_dubasari", "md_chisinau", "md_stefan_voda", "md_gagauzia"],
            md_cahul: ["md_hincesti", "md_gagauzia"],
            md_gagauzia: ["md_hincesti", "md_chisinau", "md_tiraspol", "md_cahul", "md_stefan_voda"],
            md_stefan_voda: ["md_tiraspol", "md_gagauzia"]
        },
        minCellArea: 80
    },



    sketch7: {
    id: "sketch7",
    name: "7 countries",
    countryOrder: ["green","blue","cyan1","cyan2","cyan3","purple","black","darkgray","orange","yellow","red"],
    alliances: {
        "A": ["green", "darkgray", "blue", "yellow", "orange", "red", "cyan1", "cyan2", "cyan3"],
        "B": ["black", "purple"]
    },
    regionData: [
        {"id": "g_1", "owner": "green", "army": 50, "x": 88, "y": 88, "capital": false},
        {"id": "g_2", "owner": "green", "army": 50, "x": 142, "y": 96, "capital": false}, 
        {"id": "g_3", "owner": "green", "army": 50, "x": 116, "y": 132, "capital": false}, 
        {"id": "b_1", "owner": "blue", "army": 60, "x": 190, "y": 154, "capital": false}, 
        {"id": "b_2", "owner": "blue", "army": 80, "x": 250, "y": 148, "capital": false}, 
        {"id": "b_3", "owner": "blue", "army": 60, "x": 168, "y": 188, "capital": false}, 
        {"id": "b_4", "owner": "blue", "army": 70, "x": 220, "y": 192, "capital": true}, 
        {"id": "b_5", "owner": "blue", "army": 20, "x": 120, "y": 230, "capital": false}, 
        {"id": "b_6", "owner": "cyan1", "army": 30, "x": 418, "y": 236, "capital": true}, 
        {"id": "b_7", "owner": "cyan2", "army": 30, "x": 414, "y": 106, "capital": true}, 
        {"id": "b_8", "owner": "cyan3", "army": 40, "x": 456, "y": 154, "capital": true}, 
        {"id": "p_1", "owner": "purple", "army": 70, "x": 276, "y": 92, "capital": false},
        {"id": "p_2", "owner": "purple", "army": 40, "x": 316, "y": 108, "capital": true}, 
        {"id": "p_3", "owner": "purple", "army": 110, "x": 292, "y": 154, "capital": false}, 
        {"id": "p_4", "owner": "purple", "army": 50, "x": 358, "y": 156, "capital": false}, 
        {"id": "p_5", "owner": "purple", "army": 100, "x": 332, "y": 206, "capital": false}, 
        {"id": "p_6", "owner": "purple", "army": 50, "x": 388, "y": 206, "capital": false}, 
        {"id": "p_7", "owner": "purple", "army": 100, "x": 294, "y": 254, "capital": false}, 
        {"id": "p_8", "owner": "purple", "army": 100, "x": 326, "y": 304, "capital": false}, 
        {"id": "k_1", "owner": "black", "army": 40, "x": 118, "y": 320, "capital": false}, 
        {"id": "k_2", "owner": "black", "army": 40, "x": 182, "y": 320, "capital": false}, 
        {"id": "k_3", "owner": "black", "army": 40, "x": 248, "y": 320, "capital": false}, 
        {"id": "k_4", "owner": "black", "army": 85, "x": 246, "y": 366, "capital": true}, 
        {"id": "k_5", "owner": "black", "army": 40, "x": 170, "y": 412, "capital": false},
        {"id": "k_6", "owner": "black", "army": 40, "x": 240, "y": 414, "capital": false}, 
        {"id": "k_7", "owner": "black", "army": 30, "x": 196, "y": 468, "capital": false}, 
        {"id": "k_8", "owner": "black", "army": 30, "x": 262, "y": 470, "capital": false}, 
        {"id": "k_9", "owner": "black", "army": 65, "x": 320, "y": 468, "capital": false}, 
        {"id": "k_10", "owner": "darkgray", "army": 50, "x": 40, "y": 120, "capital": true}, 
        {"id": "k_11", "owner": "darkgray", "army": 20, "x": 32, "y": 206, "capital": false}, 
        {"id": "k_12", "owner": "darkgray", "army": 20, "x": 30, "y": 168, "capital": false}, 
        {"id": "k_13", "owner": "darkgray", "army": 20, "x": 36, "y": 268, "capital": false}, 
        {"id": "k_14", "owner": "darkgray", "army": 20, "x": 38, "y": 336, "capital": false}, 
        {"id": "o_1", "owner": "orange", "army": 30, "x": 96, "y": 434, "capital": false}, 
        {"id": "o_2", "owner": "orange", "army": 30, "x": 84, "y": 478, "capital": true}, 
        {"id": "o_3", "owner": "orange", "army": 20, "x": 128, "y": 482, "capital": false},
        {"id": "y_1", "owner": "yellow", "army": 20, "x": 182, "y": 536, "capital": false}, 
        {"id": "y_2", "owner": "yellow", "army": 20, "x": 246, "y": 540, "capital": false}, 
        {"id": "r_1", "owner": "yellow", "army": 20, "x": 318, "y": 532, "capital": false}, 
        {"id": "r_3", "owner": "yellow", "army": 20, "x": 408, "y": 556, "capital": true}, 
        {"id": "y_3", "owner": "red", "army": 30, "x": 302, "y": 556, "capital": false}, 
        {"id": "y_4", "owner": "red", "army": 70, "x": 386, "y": 538, "capital": false}, 
        {"id": "r_2", "owner": "red", "army": 50, "x": 352, "y": 510, "capital": false}, 
        {"id": "r_4", "owner": "red", "army": 60, "x": 410, "y": 432, "capital": false}, 
        {"id": "r_5", "owner": "red", "army": 40, "x": 454, "y": 436, "capital": false}, 
        {"id": "r_6", "owner": "red", "army": 50, "x": 456, "y": 478, "capital": true}
    ],
    neighbors: {
        "g_1": ["g_2", "g_3", "k_10"], "g_2": ["g_1", "p_1", "b_1", "g_3"], "g_3": ["g_1", "g_2", "k_12", "k_10", "b_1", "b_3", "b_5"], 
        "b_1": ["g_2", "g_3", "b_3", "p_1", "b_2", "b_4"], "b_2": ["b_1", "b_4", "p_1", "p_3"], "b_3": ["g_3", "b_1", "b_4", "k_2", "b_5"], 
        "b_4": ["b_1", "b_2", "b_3", "p_3", "p_7", "k_3", "k_2"], "b_5": ["g_3", "b_3", "k_2", "k_1", "k_13", "k_11", "k_12"], 
        "b_6": ["p_8", "p_6", "b_8", "r_5", "r_4"], "b_7": ["b_8", "p_4", "p_2"], "b_8": ["b_6", "b_7", "p_6", "p_4"], 
        "p_1": ["g_2", "b_1", "b_2", "p_2", "p_3"], "p_2": ["b_7", "p_1", "p_3", "p_4"], "p_3": ["b_2", "b_4", "p_1", "p_2", "p_4", "p_5", "p_7"], 
        "p_4": ["b_7", "b_8", "p_2", "p_3", "p_6", "p_5"], "p_5": ["p_3", "p_4", "p_6", "p_8", "p_7"], "p_6": ["b_6", "b_8", "p_4", "p_5", "p_8"], 
        "p_7": ["b_4", "p_3", "p_5", "k_3", "p_8"], "p_8": ["b_6", "p_5", "p_6", "p_7", "k_4", "k_3", "r_4", "k_9"], 
        "k_1": ["b_5", "k_5", "o_1", "k_14", "k_13", "k_2"], "k_2": ["b_3", "b_4", "b_5", "k_1", "k_3", "k_4", "k_5"], 
        "k_3": ["b_4", "p_7", "p_8", "k_2", "k_4"], "k_4": ["p_8", "k_2", "k_3", "k_6", "k_5", "k_9"], 
        "k_5": ["k_1", "k_2", "k_4", "o_3", "o_1", "k_6", "k_7"], "k_6": ["k_4", "k_5", "k_9", "k_8", "k_7"], 
        "k_7": ["k_5", "k_6", "y_1", "o_3", "k_8", "y_2"], "k_8": ["k_6", "k_7", "k_9", "y_3", "y_2"], 
        "k_9": ["p_8", "k_4", "k_6", "k_8", "r_4", "r_2", "y_3"], "k_10": ["g_1", "g_3", "k_12"], "k_11": ["b_5", "k_12", "k_13"], 
        "k_12": ["g_3", "b_5", "k_10", "k_11"], "k_13": ["b_5", "k_1", "k_11", "k_14"], "k_14": ["k_1", "k_13", "o_1"], 
        "o_1": ["k_1", "k_5", "k_14", "o_2", "o_3"], "o_2": ["o_1", "o_3"], "o_3": ["k_5", "k_7", "o_1", "o_2", "y_1"], 
        "y_1": ["k_7", "o_3", "y_2"], "y_2": ["k_7", "k_8", "y_1", "y_3", "r_1"], "y_3": ["k_8", "k_9", "y_2", "r_2", "y_4", "r_1"], 
        "y_4": ["y_3", "r_2", "r_4", "r_6", "r_3", "r_1"], "r_1": ["y_2", "y_3", "y_4", "r_3"], "r_2": ["k_9", "y_3", "y_4", "r_4"], 
        "r_3": ["y_4", "r_1"], "r_4": ["b_6", "p_8", "k_9", "y_4", "r_2", "r_5", "r_6"], "r_5": ["b_6", "r_4"], "r_6": ["y_4", "r_4"]
    },
    regionVertices: {
        "V1": [45.5, 76.5], "V2": [92, 52], "V3": [122.5, 40.5], "V4": [113.5, 102.5], "V5": [78, 125], "V6": [182, 18], "V7": [206.5, 15.5], 
        "V8": [209, 89.5], "V9": [156, 133.5], "V10": [100.5, 182.5], "V11": [94, 152], "V12": [150, 152.5], "V13": [119.5, 181], "V14": [194.5, 181], 
        "V15": [214.5, 97.5], "V16": [221, 160.5], "V17": [265.5, 190.5], "V18": [274.5, 125.5], "V19": [189, 252.5], "V20": [182.5, 253], 
        "V21": [272.5, 204.5], "V22": [228.5, 257], "V23": [215, 260], "V24": [150, 275.5], "V25": [89.5, 274.5], "V26": [71.5, 234.5], "V27": [85, 184], 
        "V28": [459.5, 334], "V29": [448, 259.5], "V30": [461.5, 192.5], "V31": [519.5, 228.5], "V32": [530, 248], "V33": [530, 327], "V34": [485, 335], 
        "V35": [510, 96.5], "V36": [447, 154.5], "V37": [435, 107.5], "V38": [450, 22.5], "V39": [486, 24], "V40": [506, 74], "V41": [518, 146], 
        "V42": [447, 160.5], "V43": [280, 8], "V44": [329.5, 16.5], "V45": [287, 122], "V46": [325.5, 142], "V47": [324.5, 170.5], "V48": [280.5, 204.5], 
        "V49": [360, 189], "V50": [360, 257], "V51": [346, 256], "V52": [283.5, 296], "V53": [325.5, 386], "V54": [320, 345], "V55": [410, 447.5], 
        "V56": [150, 362.5], "V57": [120, 379.5], "V58": [87, 373], "V59": [72.5, 301], "V60": [215, 341.5], "V61": [195.5, 368.5], "V62": [309, 398], 
        "V63": [206, 385.5], "V64": [157.5, 452], "V65": [138, 440.5], "V66": [204.5, 430], "V67": [289.5, 427], "V68": [229.5, 450.5], "V69": [210, 563.5], 
        "V70": [164, 563.5], "V71": [228, 563.5], "V72": [292, 499], "V73": [270, 563], "V74": [370, 463], "V75": [321.5, 500], "V76": [22.5, 141.5], 
        "V77": [24, 88], "V78": [21.5, 187.5], "V79": [20.5, 238], "V80": [25.5, 302.5], "V81": [20, 250], "V82": [32, 362], "V83": [39.5, 401], 
        "V84": [107.5, 461], "V85": [48, 444.5], "V86": [90.5, 561], "V87": [42, 486], "V88": [150, 620], "V89": [156, 630], "V90": [207.5, 638.5], 
        "V91": [280.5, 564.5], "V92": [250, 640], "V93": [371, 536], "V94": [326, 563.5], "V95": [400.5, 530], "V96": [405, 530], "V97": [505, 541], 
        "V98": [480, 552], "V99": [480, 590], "V100": [325, 598.5], "V101": [315, 646], "V102": [268, 650], "V103": [388, 650], "V104": [480, 439], 
        "V105": [480, 442], "V106": [490.5, 463.5], "V107": [532, 390]
    },
    regionShapes: {
        "g_1": ["V1", "V2", "V3", "V4", "V5"], "g_2": ["V6", "V7", "V8", "V9", "V4", "V3"], "g_3": ["V10", "V11", "V5", "V4", "V9", "V12", "V13"], 
        "b_1": ["V14", "V12", "V9", "V8", "V15", "V16"], "b_2": ["V17", "V16", "V15", "V18"], "b_3": ["V12", "V14", "V19", "V20", "V13"], 
        "b_4": ["V14", "V16", "V17", "V21", "V22", "V23", "V19"], "b_5": ["V13", "V20", "V24", "V25", "V26", "V27", "V10"], 
        "b_6": ["V28", "V29", "V30", "V31", "V32", "V33", "V34"], "b_7": ["V35", "V36", "V37", "V38", "V39", "V40"], 
        "b_8": ["V35", "V41", "V31", "V30", "V42", "V36"], "p_1": ["V7", "V43", "V44", "V45", "V18", "V15", "V8"], "p_2": ["V46", "V45", "V44", "V38", "V37"], 
        "p_3": ["V18", "V45", "V46", "V47", "V48", "V21", "V17"], "p_4": ["V42", "V49", "V47", "V46", "V37", "V36"], "p_5": ["V47", "V49", "V50", "V51", "V48"], 
        "p_6": ["V42", "V30", "V29", "V50", "V49"], "p_7": ["V52", "V22", "V21", "V48", "V51"], "p_8": ["V53", "V54", "V52", "V51", "V50", "V29", "V28", "V55"], 
        "k_1": ["V56", "V57", "V58", "V59", "V25", "V24"], "k_2": ["V24", "V20", "V19", "V23", "V60", "V61", "V56"], "k_3": ["V52", "V54", "V60", "V23", "V22"], 
        "k_4": ["V62", "V63", "V61", "V60", "V54", "V53"], "k_5": ["V64", "V65", "V57", "V56", "V61", "V63", "V66"], "k_6": ["V63", "V62", "V67", "V68", "V66"], 
        "k_7": ["V69", "V70", "V64", "V66", "V68", "V71"], "k_8": ["V68", "V67", "V72", "V73", "V71"], "k_9": ["V72", "V67", "V62", "V53", "V55", "V74", "V75"], 
        "k_10": ["V76", "V77", "V1", "V5", "V11"], "k_11": ["V78", "V27", "V26", "V79"], "k_12": ["V78", "V76", "V11", "V10", "V27"], 
        "k_13": ["V80", "V81", "V79", "V26", "V25", "V59"], "k_14": ["V82", "V80", "V59", "V58", "V83"], "o_1": ["V84", "V85", "V83", "V58", "V57", "V65"], 
        "o_2": ["V85", "V84", "V86", "V87"], "o_3": ["V88", "V86", "V84", "V65", "V64", "V70"], "y_1": ["V89", "V88", "V70", "V69", "V90"], 
        "y_2": ["V69", "V71", "V73", "V91", "V92", "V90"], "y_3": ["V73", "V72", "V75", "V93", "V94", "V91"], 
        "y_4": ["V94", "V93", "V95", "V96", "V97", "V98", "V99", "V100"], "r_1": ["V91", "V94", "V100", "V101", "V102", "V92"], 
        "r_2": ["V75", "V74", "V95", "V93"], "r_3": ["V100", "V99", "V103", "V101"], "r_4": ["V55", "V28", "V34", "V104", "V105", "V106", "V96", "V95", "V74"], 
        "r_5": ["V33", "V107", "V104", "V34"], "r_6": ["V97", "V96", "V106"]
    }
    },
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateRandomAlliances(countryIds) {
    if (countryIds.length < 4) return {};
    const shuffled = shuffle(countryIds);
    const maxAllianceCount = Math.max(1, Math.floor(countryIds.length / 2));
    const allianceCount = randomInt(1, maxAllianceCount);
    const alliances = {};
    let index = 0;
    for (let i = 0; i < allianceCount; i += 1) {
    const remaining = shuffled.length - index;
    if (remaining < 2) break;
    const size = Math.min(remaining, randomInt(2, 3));
    const members = shuffled.slice(index, index + size);
    index += size;
    if (members.length >= 2) {
        alliances[`U${i + 1}`] = members;
    }
    }
    return alliances;
}

const RANDOM_CYAN_COUNTRY_ID = "cyan";
const RANDOM_CYAN_COUNTRY = { id: "cyan", name: "Cyan", color: "#38bdf8" };
const RANDOM_COLOR_PALETTE = [
    { id: "red", name: "Red", color: "#ef4444" },
    { id: "orange", name: "Orange", color: "#f97316" },
    { id: "yellow", name: "Yellow", color: "#facc15" },
    { id: "lime", name: "Lime", color: "#84cc16" },
    { id: "green", name: "Green", color: "#16a34a" },
    { id: "teal", name: "Teal", color: "#14b8a6" },
    { id: "blue", name: "Blue", color: "#3b82f6" },
    { id: "indigo", name: "Indigo", color: "#6366f1" },
    { id: "purple", name: "Purple", color: "#a855f7" },
    { id: "pink", name: "Pink", color: "#ec4899" },
    { id: "brown", name: "Brown", color: "#a16207" },
    { id: "gold", name: "Gold", color: "#f59e0b" },
    { id: "maroon", name: "Maroon", color: "#7f1d1d" },
    { id: "gray", name: "Gray", color: "#6b7280" },
    { id: "darkgray", name: "Dark gray", color: "#4b5563" },
    { id: "black", name: "Black", color: "#111827" }
];

function generateRandomCountries() {
    const othersPool = RANDOM_COLOR_PALETTE;
    const maxOther = Math.min(9, othersPool.length); // total countries <= 10 incl. cyan
    const totalCountries = randomInt(4, maxOther + 1);
    const otherCount = totalCountries - 1;
    const pickedOthers = shuffle(othersPool).slice(0, otherCount);

    const selected = [
    RANDOM_CYAN_COUNTRY,
    ...pickedOthers.map((c) => ({ id: c.id, name: c.name, color: c.color }))
    ];
    const countryOrder = shuffle(selected.map((c) => c.id));
    const countries = Object.fromEntries(selected.map((c) => [c.id, c]));
    return { countryOrder, countries };
}

function generateRandomMapDefinition(mapId, mapName, withUnions) {
    const { countryOrder: selectedCountryIds, countries } = generateRandomCountries();
    const regionData = [];
    const takenPoints = [];
    const minDistance = 38;
    let regionCounter = 1;

    function pickPoint() {
    for (let attempt = 0; attempt < 600; attempt += 1) {
        const x = Math.floor(Math.random() * (400 - 100 + 1)) + 100;
        const y = Math.floor(Math.random() * (520 - 100 + 1)) + 100;
        const tooClose = takenPoints.some((p) => Math.hypot(p.x - x, p.y - y) < minDistance);
        if (!tooClose) {
        takenPoints.push({ x, y });
        return { x, y };
        }
    }
    const fallback = { x: randomInt(52, 488), y: randomInt(52, 608) };
    takenPoints.push(fallback);
    return fallback;
    }

    for (const countryId of selectedCountryIds) {
    const isCyan = countryId === RANDOM_CYAN_COUNTRY_ID;
    const capitalCount = isCyan ? 3 : 1;
    const regionsForCountry = randomInt(isCyan ? 3 : 2, 7);
    const capitalIndices = new Set(
        shuffle(Array.from({ length: regionsForCountry }, (_, i) => i)).slice(0, capitalCount)
    );
    for (let i = 0; i < regionsForCountry; i += 1) {
        const { x, y } = pickPoint();
        const isCapital = capitalIndices.has(i);
        regionData.push({
        id: `r_${regionCounter}`,
        owner: countryId,
        army: isCapital ? randomInt(40, 60) : randomInt(12, 45),
        x,
        y,
        capital: isCapital
        });
        regionCounter += 1;
    }
    }

    const alliances = withUnions ? generateRandomAlliances(selectedCountryIds) : {};
    return {
    id: mapId,
    name: mapName,
    countryOrder: selectedCountryIds,
    countries,
    alliances,
    regionData,
    outline: MAP_OUTLINE,
    minCellArea: 260
    };
}

GAME_MAPS.random_unions = generateRandomMapDefinition("random_unions", "random (with unions)", true);
GAME_MAPS.random_no_unions = generateRandomMapDefinition("random_no_unions", "random (no unions)", false);
const SKETCH7_V2_FROM_IMAGE = {
        "id": "sketch7_v2",
        "name": "7 countries v2",
        "countryOrder": ["black", "green", "orange", "red", "yellow", "blue", "purple"],
        "alliances": {
            "A": ["black", "green"],
            "B": ["orange", "red", "yellow", "blue", "purple"]
        },
        "outline": [
            [293.2, 32.2], [296.4, 32.2], [299.5, 32.2], [302.7, 32.2], [305.9, 32.2], [309.0, 32.9], [308.0, 34.8], [306.9, 36.7], 
            [306.9, 38.7], [306.9, 40.6], [306.9, 42.5], [306.9, 44.5], [308.0, 46.4], [309.0, 48.3], [309.0, 50.3], [309.0, 52.2], 
            [308.0, 54.1], [305.9, 56.1], [302.7, 58.0], [299.5, 59.9], [298.5, 61.9], [298.5, 63.8], [298.5, 65.7], [298.5, 67.7], 
            [299.5, 69.6], [299.5, 71.5], [298.5, 73.5], [296.4, 75.4], [293.2, 76.7], [290.0, 77.3], [286.9, 78.0], [283.7, 78.6], 
            [280.5, 79.9], [277.4, 81.2], [274.2, 82.5], [271.1, 83.8], [267.9, 85.7], [264.7, 85.7], [261.6, 84.4], [258.4, 83.8], 
            [255.2, 83.1], [252.1, 83.1], [248.9, 83.1], [245.7, 83.1], [242.6, 83.8], [239.4, 84.4], [236.2, 85.1], [233.1, 85.1], 
            [229.9, 85.7], [226.8, 85.7], [224.6, 83.8], [222.5, 81.9], [219.4, 79.9], [216.2, 78.6], [214.1, 76.7], [210.9, 74.8], 
            [208.8, 72.8], [206.7, 70.9], [205.7, 69.0], [206.7, 67.0], [207.8, 65.1], [209.9, 63.2], [210.9, 61.2], [213.0, 59.3], 
            [216.2, 57.4], [219.4, 55.4], [222.5, 54.1], [225.7, 52.2], [228.9, 50.9], [232.0, 49.6], [235.2, 48.3], [238.4, 47.7], 
            [241.5, 46.4], [244.7, 45.1], [247.9, 43.8], [251.0, 43.2], [254.2, 41.9], [257.3, 40.6], [260.5, 39.3], [263.7, 38.7], 
            [266.8, 37.4], [270.0, 36.1], [273.2, 35.4], [276.3, 34.2], [279.5, 33.5], [282.7, 32.9], [285.8, 32.9], [289.0, 32.9], 
            [292.1, 32.9]
        ],
        "regionData": [
            {"id": "v2_01", "owner": "orange", "army": 10, "x": 339, "y": 57, "capital": false},
            {"id": "v2_02", "owner": "orange", "army": 20, "x": 262, "y": 60, "capital": false}, 
            {"id": "v2_03", "owner": "orange", "army": 10, "x": 397, "y": 68, "capital": false}, 
            {"id": "v2_04", "owner": "black", "army": 50, "x": 441, "y": 102, "capital": false}, 
            {"id": "v2_05", "owner": "orange", "army": 30, "x": 310, "y": 108, "capital": true}, 
            {"id": "v2_06", "owner": "black", "army": 40, "x": 380, "y": 123, "capital": false},
            {"id": "v2_07", "owner": "black", "army": 40, "x": 448, "y": 156, "capital": false}, 
            {"id": "v2_08", "owner": "black", "army": 50, "x": 260, "y": 164, "capital": false}, 
            {"id": "v2_09", "owner": "black", "army": 40, "x": 339, "y": 168, "capital": false}, 
            {"id": "v2_10", "owner": "black", "army": 10, "x": 196, "y": 186, "capital": false}, 
            {"id": "v2_11", "owner": "red", "army": 70, "x": 103, "y": 206, "capital": false}, 
            {"id": "v2_12", "owner": "black", "army": 70, "x": 395, "y": 209, "capital": false}, 
            {"id": "v2_13", "owner": "black", "army": 40, "x": 294, "y": 218, "capital": true}, 
            {"id": "v2_14", "owner": "green", "army": 20, "x": 387, "y": 253, "capital": true},
            {"id": "v2_15", "owner": "black", "army": 50, "x": 185, "y": 267, "capital": false}, 
            {"id": "v2_16", "owner": "black", "army": 60, "x": 247, "y": 268, "capital": false}, 
            {"id": "v2_17", "owner": "red", "army": 20, "x": 115, "y": 269, "capital": false}, 
            {"id": "v2_18", "owner": "black", "army": 40, "x": 308, "y": 287, "capital": false}, 
            {"id": "v2_19", "owner": "green", "army": 10, "x": 433, "y": 290, "capital": false}, 
            {"id": "v2_20", "owner": "red", "army": 30, "x": 66, "y": 302, "capital": true}, 
            {"id": "v2_21", "owner": "red", "army": 20, "x": 148, "y": 328, "capital": false}, 
            {"id": "v2_22", "owner": "black", "army": 60, "x": 232, "y": 329, "capital": false},
            {"id": "v2_23", "owner": "black", "army": 50, "x": 346, "y": 332, "capital": false}, 
            {"id": "v2_24", "owner": "blue", "army": 40, "x": 435, "y": 336, "capital": false}, 
            {"id": "v2_25", "owner": "black", "army": 40, "x": 294, "y": 342, "capital": false}, 
            {"id": "v2_26", "owner": "yellow", "army": 40, "x": 156, "y": 368, "capital": false}, 
            {"id": "v2_27", "owner": "blue", "army": 30, "x": 441, "y": 378, "capital": false}, 
            {"id": "v2_28", "owner": "yellow", "army": 40, "x": 242, "y": 385, "capital": true}, 
            {"id": "v2_29", "owner": "blue", "army": 40, "x": 337, "y": 386, "capital": false}, 
            {"id": "v2_30", "owner": "yellow", "army": 20, "x": 114, "y": 403, "capital": false}, 
            {"id": "v2_31", "owner": "yellow", "army": 40, "x": 177, "y": 414, "capital": false},
            {"id": "v2_32", "owner": "blue", "army": 50, "x": 395, "y": 421, "capital": true}, 
            {"id": "v2_33", "owner": "blue", "army": 20, "x": 476, "y": 422, "capital": false}, 
            {"id": "v2_34", "owner": "blue", "army": 30, "x": 296, "y": 440, "capital": false}, 
            {"id": "v2_35", "owner": "yellow", "army": 20, "x": 94, "y": 461, "capital": false}, 
            {"id": "v2_36", "owner": "yellow", "army": 30, "x": 241, "y": 465, "capital": false}, 
            {"id": "v2_37", "owner": "blue", "army": 20, "x": 454, "y": 468, "capital": false}, 
            {"id": "v2_38", "owner": "yellow", "army": 10, "x": 172, "y": 470, "capital": false},
            {"id": "v2_39", "owner": "blue", "army": 20, "x": 355, "y": 477, "capital": false}, 
            {"id": "v2_40", "owner": "blue", "army": 20, "x": 229, "y": 513, "capital": false}, 
            {"id": "v2_41", "owner": "blue", "army": 20, "x": 310, "y": 530, "capital": false}, 
            {"id": "v2_42", "owner": "blue", "army": 30, "x": 237, "y": 558, "capital": false}
        ],
        "neighbors": {
            "v2_01": [], "v2_02": [], "v2_03": [], "v2_04": [], "v2_05": [], "v2_06": [], "v2_07": [], "v2_08": [], 
            "v2_09": [], "v2_10": [], "v2_11": [], "v2_12": [], "v2_13": [], "v2_14": [], "v2_15": [], "v2_16": [], 
            "v2_17": [], "v2_18": [], "v2_19": [], "v2_20": [], "v2_21": [], "v2_22": [], "v2_23": [], "v2_24": [], 
            "v2_25": [], "v2_26": [], "v2_27": [], "v2_28": [], "v2_29": [], "v2_30": [], "v2_31": [], "v2_32": [], 
            "v2_33": [], "v2_34": [], "v2_35": [], "v2_36": [], "v2_37": [], "v2_38": [], "v2_39": [], "v2_40": [], 
            "v2_41": [], "v2_42": []
        },
        "regionVertices": {
            "V1": [319.6, 32.9], "V2": [329.1, 33.5], "V3": [338.6, 34.8], "V4": [348.0, 35.4], "V5": [357.5, 36.7], "V6": [367.0, 37.4], 
            "V7": [370.2, 41.9], "V8": [371.2, 47.7], "V9": [370.2, 53.5], "V10": [367.0, 59.3], "V11": [361.8, 65.1], "V12": [355.4, 70.9], 
            "V13": [350.2, 76.7], "V14": [342.8, 81.2], "V15": [333.3, 81.2], "V16": [323.8, 79.9], "V17": [314.3, 76.7], "V18": [308.0, 72.2], 
            "V19": [306.9, 66.4], "V20": [312.2, 60.6], "V21": [317.5, 54.8], "V22": [317.5, 49.0], "V23": [316.4, 43.2], "V24": [316.4, 37.4], 
            "V25": [293.2, 32.2], "V26": [305.9, 32.2], "V27": [306.9, 38.7], "V28": [308.0, 46.4], "V29": [308.0, 54.1], "V30": [298.5, 61.9], 
            "V31": [299.5, 69.6], "V32": [293.2, 76.7], "V33": [280.5, 79.9], "V34": [267.9, 85.7], "V35": [255.2, 83.1], "V36": [242.6, 83.8], 
            "V37": [229.9, 85.7], "V38": [219.4, 79.9], "V39": [208.8, 72.8], "V40": [207.8, 65.1], "V41": [216.2, 57.4], "V42": [228.9, 50.9], 
            "V43": [241.5, 46.4], "V44": [254.2, 41.9], "V45": [266.8, 37.4], "V46": [279.5, 33.5], "V47": [292.1, 32.9], "V48": [378.6, 38.7], 
            "V49": [390.2, 39.3], "V50": [401.8, 41.2], "V51": [413.4, 43.2], "V52": [424.0, 48.3], "V53": [429.3, 55.4], "V54": [430.3, 62.5], 
            "V55": [428.2, 69.6], "V56": [422.9, 76.7], "V57": [417.7, 83.8], "V58": [407.1, 87.7], "V59": [399.7, 94.7], "V60": [389.2, 92.8], 
            "V61": [377.6, 90.9], "V62": [366.0, 90.2], "V63": [359.6, 87.7], "V64": [360.7, 80.6], "V65": [364.9, 73.5], "V66": [372.3, 66.4], 
            "V67": [377.6, 59.3], "V68": [379.7, 52.2], "V69": [379.7, 45.1], "V70": [440.9, 70.3], "V71": [446.1, 76.1], "V72": [452.5, 81.9], 
            "V73": [458.8, 87.7], "V74": [467.2, 93.5], "V75": [476.7, 97.3], "V76": [475.7, 103.1], "V77": [472.5, 108.9], "V78": [468.3, 114.7], 
            "V79": [459.8, 119.2], "V80": [450.4, 119.9], "V81": [440.9, 122.5], "V82": [431.4, 125.7], "V83": [422.9, 123.1], "V84": [416.6, 117.3], 
            "V85": [410.3, 111.5], "V86": [406.1, 105.7], "V87": [409.2, 100.5], "V88": [413.4, 94.7], "V89": [422.9, 92.2], "V90": [430.3, 86.4],
            "V91": [434.5, 80.6], "V92": [438.8, 74.8], "V93": [302.7, 79.9], "V94": [314.3, 83.8], "V95": [325.9, 86.4], "V96": [337.5, 87.0], 
            "V97": [349.1, 85.7], "V98": [351.2, 92.2], "V99": [348.0, 99.3], "V100": [344.9, 106.3], "V101": [343.8, 113.4], "V102": [344.9, 120.5], 
            "V103": [341.7, 127.6], "V104": [331.2, 132.8], "V105": [319.6, 133.4], "V106": [308.0, 134.7], "V107": [296.4, 135.4], "V108": [285.8, 129.6], 
            "V109": [276.3, 122.5], "V110": [268.9, 117.3], "V111": [273.2, 110.2], "V112": [271.1, 103.1], "V113": [270.0, 96.0], "V114": [275.3, 89.6], 
            "V115": [286.9, 84.4], "V116": [298.5, 81.9], "V117": [368.1, 97.3], "V118": [377.6, 98.6], "V119": [387.1, 101.2], "V120": [396.6, 102.5],
            "V121": [397.6, 108.3], "V122": [400.8, 114.1], "V123": [407.1, 119.9], "V124": [413.4, 125.7], "V125": [415.5, 130.8], "V126": [406.1, 134.1], 
            "V127": [397.6, 139.2], "V128": [391.3, 143.7], "V129": [392.3, 149.5], "V130": [387.1, 149.5], "V131": [377.6, 148.2], "V132": [368.1, 147.0], 
            "V133": [359.6, 142.4], "V134": [352.3, 136.6], "V135": [354.4, 130.8], "V136": [355.4, 125.0], "V137": [356.5, 119.2], "V138": [355.4, 113.4], 
            "V139": [357.5, 107.6], "V140": [360.7, 101.8], "V141": [486.2, 101.8], "V142": [492.5, 112.1], "V143": [494.6, 122.5], "V144": [492.5, 132.8], 
            "V145": [484.1, 143.1], "V146": [476.7, 153.4], "V147": [475.7, 163.7], "V148": [474.6, 174.0], "V149": [471.4, 184.3], "V150": [465.1, 194.6], 
            "V151": [450.4, 193.4], "V152": [433.5, 190.8], "V153": [416.6, 187.6], "V154": [401.8, 177.2], "V155": [398.7, 166.9], "V156": [399.7, 156.6], 
            "V157": [400.8, 146.3], "V158": [415.5, 137.9], "V159": [432.4, 132.1], "V160": [449.3, 126.3], "V161": [466.2, 123.8], "V162": [478.8, 114.7], 
            "V163": [484.1, 104.4], "V164": [260.5, 125.7], "V165": [272.1, 131.5], "V166": [281.6, 139.2], "V167": [293.2, 143.7], "V168": [297.4, 151.5], 
            "V169": [300.6, 159.2], "V170": [297.4, 166.9], "V171": [294.3, 174.0], "V172": [281.6, 176.6], "V173": [268.9, 183.7], "V174": [259.5, 191.4], 
            "V175": [252.1, 199.2], "V176": [243.6, 202.4], "V177": [231.0, 196.6], "V178": [227.8, 188.8], "V179": [226.8, 181.1], "V180": [231.0, 173.4], 
            "V181": [235.2, 165.6], "V182": [235.2, 157.9], "V183": [232.0, 150.2], "V184": [233.1, 142.4], "V185": [245.7, 140.5], "V186": [248.9, 132.8], 
            "V187": [259.5, 126.3], "V188": [341.7, 138.6], "V189": [351.2, 146.3], "V190": [362.8, 152.1], "V191": [375.5, 153.4], "V192": [387.1, 157.3], 
            "V193": [390.2, 163.7], "V194": [387.1, 171.4], "V195": [375.5, 177.9], "V196": [362.8, 181.1], "V197": [350.2, 185.0], "V198": [339.6, 192.7], 
            "V199": [336.4, 200.4], "V200": [327.0, 202.4], "V201": [315.4, 197.2], "V202": [311.1, 189.5], "V203": [305.9, 181.8], "V204": [304.8, 174.0], 
            "V205": [306.9, 166.3], "V206": [310.1, 158.6], "V207": [306.9, 150.8], "V208": [302.7, 143.1], "V209": [313.2, 141.8], "V210": [325.9, 140.5], 
            "V211": [338.6, 139.2], "V212": [217.3, 143.1], "V213": [222.5, 150.8], "V214": [226.8, 160.5], "V215": [222.5, 170.2], "V216": [218.3, 179.8], 
            "V217": [218.3, 189.5], "V218": [221.5, 199.2], "V219": [237.3, 206.9], "V220": [229.9, 212.1], "V221": [214.1, 217.2], "V222": [200.4, 224.9], 
            "V223": [184.6, 225.6], "V224": [168.8, 224.9], "V225": [166.6, 218.5], "V226": [173.0, 208.8], "V227": [169.8, 199.2], "V228": [154.0, 190.8], 
            "V229": [156.1, 181.8], "V230": [169.8, 172.1], "V231": [180.4, 163.1], "V232": [186.7, 153.4], "V233": [197.2, 145.0], "V234": [213.0, 143.7], 
            "V235": [58.0, 177.2], "V236": [71.7, 180.5], "V237": [85.4, 183.7], "V238": [99.1, 186.9], "V239": [112.9, 190.1], "V240": [126.6, 193.4], 
            "V241": [140.3, 194.0], "V242": [154.0, 201.1], "V243": [160.3, 208.8], "V244": [154.0, 217.2], "V245": [147.7, 225.6], "V246": [145.5, 234.0], 
            "V247": [141.3, 239.1], "V248": [127.6, 236.5], "V249": [113.9, 232.0], "V250": [100.2, 228.2], "V251": [89.6, 220.4], "V252": [75.9, 215.9], 
            "V253": [62.2, 212.7], "V254": [51.7, 206.9], "V255": [51.7, 198.5], "V256": [40.1, 191.4], "V257": [45.4, 183.0], "V258": [390.2, 178.5], 
            "V259": [401.8, 186.3], "V260": [414.5, 193.4], "V261": [428.2, 195.9], "V262": [441.9, 197.9], "V263": [455.6, 201.1], "V264": [452.5, 208.8], 
            "V265": [445.1, 217.2], "V266": [444.0, 225.6], "V267": [435.6, 227.5], "V268": [421.9, 227.5], "V269": [408.2, 228.2], "V270": [394.5, 229.5], 
            "V271": [380.7, 230.7], "V272": [367.0, 230.7], "V273": [353.3, 230.1], "V274": [345.9, 226.9], "V275": [347.0, 218.5], "V276": [347.0, 210.1], 
            "V277": [344.9, 201.7], "V278": [351.2, 193.4], "V279": [364.9, 186.9], "V280": [378.6, 183.0], "V281": [291.1, 180.5], "V282": [299.5, 187.6], 
            "V283": [305.9, 196.6], "V284": [313.2, 205.0], "V285": [328.0, 207.5], "V286": [338.6, 212.7], "V287": [338.6, 221.7], "V288": [335.4, 230.7], 
            "V289": [325.9, 239.1], "V290": [321.7, 248.1], "V291": [309.0, 249.4], "V292": [294.3, 249.4], "V293": [283.7, 248.1], "V294": [279.5, 239.1], 
            "V295": [270.0, 230.1], "V296": [255.2, 228.2], "V297": [245.7, 224.3], "V298": [247.9, 215.9], "V299": [243.6, 215.3], "V300": [255.2, 208.8], 
            "V301": [262.6, 199.8], "V302": [272.1, 190.8], "V303": [285.8, 182.4], "V304": [445.1, 232.0], "V305": [444.0, 239.8], "V306": [444.0, 247.5], 
            "V307": [444.0, 255.2], "V308": [433.5, 261.0], "V309": [420.8, 266.2], "V310": [409.2, 266.8], "V311": [396.6, 267.5], "V312": [383.9, 270.1], 
            "V313": [371.2, 275.2], "V314": [358.6, 275.2], "V315": [345.9, 270.1], "V316": [333.3, 263.6], "V317": [330.1, 255.9], "V318": [335.4, 248.1], 
            "V319": [339.6, 240.4], "V320": [352.3, 237.2], "V321": [364.9, 237.8], "V322": [377.6, 238.5], "V323": [390.2, 237.8], "V324": [402.9, 236.5], 
            "V325": [415.5, 235.3], "V326": [428.2, 234.6], "V327": [440.9, 235.3], "V328": [159.3, 229.5], "V329": [174.0, 230.1], "V330": [188.8, 230.7], 
            "V331": [203.6, 230.7], "V332": [215.2, 235.9], "V333": [219.4, 244.9], "V334": [214.1, 253.9], "V335": [216.2, 263.0], "V336": [215.2, 272.0], 
            "V337": [214.1, 281.0], "V338": [215.2, 290.0], "V339": [215.2, 299.1], "V340": [210.9, 304.9], "V341": [196.2, 304.9], "V342": [182.5, 301.6], 
            "V343": [167.7, 298.4], "V344": [157.1, 291.3], "V345": [148.7, 282.3], "V346": [139.2, 273.3], "V347": [146.6, 264.3], "V348": [151.9, 255.2], 
            "V349": [157.1, 246.2], "V350": [157.1, 237.2], "V351": [242.6, 232.7], "V352": [256.3, 233.3], "V353": [267.9, 238.5], "V354": [274.2, 246.9], 
            "V355": [273.2, 253.3], "V356": [273.2, 261.7], "V357": [272.1, 270.1], "V358": [265.8, 278.4], "V359": [264.7, 286.8], "V360": [262.6, 295.2], 
            "V361": [256.3, 303.6], "V362": [245.7, 306.8], "V363": [232.0, 305.5], "V364": [224.6, 300.4], "V365": [223.6, 292.0], "V366": [223.6, 283.6], 
            "V367": [223.6, 275.2], "V368": [225.7, 266.8], "V369": [223.6, 258.5], "V370": [226.8, 250.1], "V371": [226.8, 241.7], "V372": [225.7, 234.0], 
            "V373": [239.4, 233.3], "V374": [98.1, 234.0], "V375": [110.7, 237.8], "V376": [123.4, 241.7], "V377": [136.1, 244.3], "V378": [143.4, 248.1], 
            "V379": [138.2, 255.9], "V380": [132.9, 263.6], "V381": [126.6, 271.3], "V382": [127.6, 279.1], "V383": [138.2, 286.8], "V384": [145.5, 294.6], 
            "V385": [141.3, 301.0], "V386": [128.7, 304.2], "V387": [116.0, 307.4], "V388": [105.5, 304.2], "V389": [105.5, 296.5], "V390": [104.4, 288.8], 
            "V391": [100.2, 281.0], "V392": [98.1, 273.3], "V393": [92.8, 265.5], "V394": [80.2, 259.7], "V395": [78.0, 253.9], "V396": [89.6, 246.2], 
            "V397": [96.0, 238.5], "V398": [295.3, 254.6], "V399": [308.0, 254.6], "V400": [317.5, 257.8], "V401": [319.6, 265.5], "V402": [331.2, 273.3], 
            "V403": [343.8, 278.4], "V404": [356.5, 282.9], "V405": [358.6, 290.7], "V406": [359.6, 298.4], "V407": [347.0, 302.9], "V408": [334.3, 306.2], 
            "V409": [321.7, 307.4], "V410": [309.0, 308.1], "V411": [296.4, 310.7], "V412": [283.7, 317.1], "V413": [275.3, 312.6], "V414": [265.8, 305.5], 
            "V415": [271.1, 297.8], "V416": [273.2, 290.0], "V417": [274.2, 282.3], "V418": [279.5, 274.6], "V419": [282.7, 266.8], "V420": [281.6, 259.1], 
            "V421": [291.1, 255.2], "V422": [446.1, 262.3], "V423": [456.7, 270.1], "V424": [470.4, 273.3], "V425": [482.0, 279.1], "V426": [488.3, 287.5], 
            "V427": [492.5, 295.8], "V428": [495.7, 304.2], "V429": [491.5, 309.4], "V430": [477.8, 306.8], "V431": [464.1, 304.2], "V432": [450.4, 305.5], 
            "V433": [436.6, 308.7], "V434": [422.9, 309.4], "V435": [409.2, 309.4], "V436": [396.6, 306.2], "V437": [382.9, 302.3], "V438": [371.2, 296.5], 
            "V439": [370.2, 288.1], "V440": [377.6, 279.7], "V441": [391.3, 274.6], "V442": [405.0, 272.6], "V443": [418.7, 273.3], "V444": [431.4, 269.4], 
            "V445": [445.1, 263.0], "V446": [66.4, 261.0], "V447": [79.1, 266.2], "V448": [88.6, 273.3], "V449": [90.7, 281.0], "V450": [94.9, 288.8],
            "V451": [97.0, 296.5], "V452": [97.0, 304.2], "V453": [103.4, 312.0], "V454": [104.4, 319.7], "V455": [103.4, 327.4], "V456": [94.9, 335.2], 
            "V457": [82.3, 335.2], "V458": [69.6, 333.9], "V459": [57.0, 330.0], "V460": [46.4, 322.9], "V461": [36.9, 315.2], "V462": [25.3, 310.0], 
            "V463": [14.8, 306.8], "V464": [22.1, 299.1], "V465": [29.5, 291.3], "V466": [34.8, 283.6], "V467": [45.4, 275.9], "V468": [57.0, 268.8], 
            "V469": [154.0, 302.9], "V470": [165.6, 306.8], "V471": [177.2, 308.7], "V472": [186.7, 313.9], "V473": [188.8, 321.0], "V474": [192.0, 328.1], 
            "V475": [194.1, 335.2], "V476": [189.8, 339.0], "V477": [178.2, 342.2], "V478": [166.6, 344.8], "V479": [155.0, 344.8], "V480": [143.4, 345.5], 
            "V481": [131.8, 347.4], "V482": [120.2, 350.0], "V483": [108.6, 353.2], "V484": [100.2, 346.1], "V485": [101.2, 339.7], "V486": [109.7, 333.2], 
            "V487": [112.9, 326.1], "V488": [112.9, 319.0], "V489": [119.2, 313.2], "V490": [130.8, 310.0], "V491": [142.4, 306.8], "V492": [201.4, 310.0], 
            "V493": [212.0, 310.0], "V494": [221.5, 311.3], "V495": [232.0, 311.3], "V496": [242.6, 312.0], "V497": [253.1, 312.0], "V498": [263.7, 313.2], 
            "V499": [270.0, 319.7], "V500": [267.9, 326.1], "V501": [263.7, 332.6], "V502": [260.5, 339.0], "V503": [255.2, 345.5], "V504": [248.9, 351.9], 
            "V505": [243.6, 354.5], "V506": [233.1, 353.2], "V507": [222.5, 352.6], "V508": [213.0, 347.4], "V509": [205.7, 342.2], "V510": [206.7, 335.8], 
            "V511": [205.7, 329.4], "V512": [202.5, 322.9], "V513": [200.4, 316.5], "V514": [200.4, 310.7], "V515": [362.8, 304.2], "V516": [373.4, 308.1], 
            "V517": [374.4, 314.5], "V518": [373.4, 321.0], "V519": [371.2, 327.4], "V520": [371.2, 333.9], "V521": [370.2, 340.3], "V522": [367.0, 346.8], 
            "V523": [359.6, 352.6], "V524": [349.1, 355.1], "V525": [338.6, 355.8], "V526": [328.0, 357.1], "V527": [325.9, 350.6], "V528": [324.8, 344.2], 
            "V529": [323.8, 337.7], "V530": [322.7, 331.3], "V531": [320.6, 324.8], "V532": [318.5, 318.4], "V533": [319.6, 312.6], "V534": [330.1, 312.0], 
            "V535": [340.7, 310.7], "V536": [351.2, 308.1], "V537": [361.8, 304.9], "V538": [462.0, 311.3], "V539": [478.8, 315.8], "V540": [491.5, 319.0], 
            "V541": [488.3, 329.4], "V542": [488.3, 339.7], "V543": [487.3, 350.0], "V544": [483.0, 360.3], "V545": [470.4, 363.5], "V546": [465.1, 354.5], 
            "V547": [460.9, 344.2], "V548": [444.0, 345.5], "V549": [429.3, 355.1], "V550": [412.4, 358.4], "V551": [400.8, 368.7], "V552": [389.2, 358.4], 
            "V553": [379.7, 348.7], "V554": [382.9, 338.4], "V555": [383.9, 328.1], "V556": [386.0, 317.8], "V557": [395.5, 313.2], "V558": [411.3, 316.5], 
            "V559": [428.2, 316.5], "V560": [445.1, 314.5], "V561": [306.9, 313.9], "V562": [310.1, 318.4], "V563": [311.1, 324.2], "V564": [312.2, 330.0], 
            "V565": [314.3, 335.8], "V566": [315.4, 341.6], "V567": [316.4, 347.4], "V568": [317.5, 353.2], "V569": [319.6, 359.0], "V570": [310.1, 360.3], 
            "V571": [300.6, 362.2], "V572": [291.1, 364.2], "V573": [281.6, 364.2], "V574": [272.1, 363.5], "V575": [262.6, 359.0], "V576": [257.3, 355.1], 
            "V577": [263.7, 349.3], "V578": [267.9, 343.5], "V579": [270.0, 337.7], "V580": [274.2, 331.9], "V581": [279.5, 326.8], "V582": [287.9, 322.3], 
            "V583": [297.4, 318.4], "V584": [192.0, 346.8], "V585": [197.2, 351.9], "V586": [194.1, 358.4], "V587": [192.0, 364.8], "V588": [189.8, 371.2], 
            "V589": [186.7, 377.7], "V590": [183.5, 384.1], "V591": [176.1, 390.6], "V592": [165.6, 389.9], "V593": [156.1, 383.5], "V594": [145.5, 380.9], 
            "V595": [135.0, 380.9], "V596": [124.5, 380.9], "V597": [113.9, 380.3], "V598": [108.6, 377.1], "V599": [111.8, 370.6], "V600": [112.9, 364.2],
            "V601": [118.1, 359.6], "V602": [128.7, 356.4], "V603": [139.2, 353.8], "V604": [149.8, 352.6], "V605": [160.3, 351.9], "V606": [170.9, 351.9], 
            "V607": [181.4, 350.0], "V608": [453.5, 348.0], "V609": [456.7, 354.5], "V610": [456.7, 360.9], "V611": [460.9, 367.4], "V612": [471.4, 369.3], 
            "V613": [477.8, 371.2], "V614": [477.8, 377.7], "V615": [478.8, 384.1], "V616": [480.9, 390.6], "V617": [472.5, 393.2], "V618": [462.0, 393.8], 
            "V619": [451.4, 395.1], "V620": [440.9, 397.0], "V621": [430.3, 394.5], "V622": [419.8, 393.2], "V623": [409.2, 389.9], "V624": [398.7, 384.8], 
            "V625": [400.8, 379.0], "V626": [407.1, 373.8], "V627": [413.4, 367.4], "V628": [421.9, 361.6], "V629": [432.4, 360.3], "V630": [441.9, 355.8], 
            "V631": [451.4, 349.3], "V632": [205.7, 354.5], "V633": [219.4, 360.3], "V634": [233.1, 360.3], "V635": [246.8, 363.5], "V636": [260.5, 368.7], 
            "V637": [274.2, 371.9], "V638": [283.7, 374.5], "V639": [282.7, 382.9], "V640": [281.6, 391.2], "V641": [277.4, 399.6], "V642": [267.9, 408.0], 
            "V643": [254.2, 409.9], "V644": [240.5, 413.1], "V645": [227.8, 419.6], "V646": [226.8, 411.9], "V647": [225.7, 403.5], "V648": [225.7, 395.1], 
            "V649": [220.4, 386.7], "V650": [206.7, 382.9], "V651": [196.2, 379.0], "V652": [199.3, 370.6], "V653": [202.5, 362.2], "V654": [371.2, 357.1], 
            "V655": [383.9, 363.5], "V656": [391.3, 371.2], "V657": [387.1, 378.3], "V658": [378.6, 386.1], "V659": [367.0, 392.5], "V660": [355.4, 399.6], 
            "V661": [348.0, 407.3], "V662": [340.7, 415.1], "V663": [328.0, 413.8], "V664": [315.4, 412.5], "V665": [302.7, 409.9], "V666": [290.0, 407.3], 
            "V667": [291.1, 400.9], "V668": [293.2, 393.2], "V669": [294.3, 385.4], "V670": [295.3, 377.7], "V671": [299.5, 371.2], "V672": [312.2, 368.0], 
            "V673": [324.8, 365.4], "V674": [337.5, 363.5], "V675": [350.2, 362.2], "V676": [362.8, 360.3], "V677": [104.4, 384.8], "V678": [112.9, 385.4], 
            "V679": [121.3, 386.1], "V680": [129.7, 386.1], "V681": [138.2, 386.1], "V682": [142.4, 388.7], "V683": [140.3, 393.8], "V684": [138.2, 399.0], 
            "V685": [136.1, 404.1], "V686": [131.8, 409.3], "V687": [127.6, 414.4], "V688": [124.5, 419.6], "V689": [122.3, 424.7], "V690": [116.0, 424.7], 
            "V691": [107.6, 422.8], "V692": [99.1, 420.9], "V693": [90.7, 418.9], "V694": [90.7, 414.4], "V695": [91.8, 409.3], "V696": [91.8, 404.1], 
            "V697": [92.8, 399.0], "V698": [96.0, 393.8], "V699": [100.2, 388.7], "V700": [193.0, 386.1], "V701": [204.6, 388.7], "V702": [215.2, 393.2], 
            "V703": [217.3, 400.3], "V704": [217.3, 407.3], "V705": [218.3, 414.4], "V706": [218.3, 421.5], "V707": [207.8, 426.0], "V708": [196.2, 431.2], 
            "V709": [184.6, 433.1], "V710": [173.0, 435.1], "V711": [161.4, 437.6], "V712": [149.8, 441.5], "V713": [142.4, 435.1], "V714": [130.8, 428.6], 
            "V715": [132.9, 421.5], "V716": [138.2, 414.4], "V717": [143.4, 407.3], "V718": [147.7, 400.3], "V719": [149.8, 393.2], "V720": [154.0, 391.2], 
            "V721": [165.6, 397.0], "V722": [177.2, 397.0], "V723": [188.8, 391.2], "V724": [388.1, 388.0], "V725": [400.8, 393.8], "V726": [413.4, 397.7], 
            "V727": [426.1, 399.6], "V728": [436.6, 404.8], "V729": [435.6, 412.5], "V730": [435.6, 420.2], "V731": [438.8, 428.0], "V732": [443.0, 435.1], 
            "V733": [433.5, 438.3], "V734": [420.8, 442.1], "V735": [408.2, 446.0], "V736": [395.5, 449.2], "V737": [382.9, 447.9], "V738": [370.2, 446.7], 
            "V739": [357.5, 445.4], "V740": [354.4, 438.9], "V741": [353.3, 431.2], "V742": [350.2, 423.5], "V743": [351.2, 415.7], "V744": [358.6, 408.0], 
            "V745": [367.0, 400.3], "V746": [379.7, 394.5], "V747": [476.7, 397.7], "V748": [483.0, 400.3], "V749": [488.3, 406.1], "V750": [494.6, 411.9],
            "V751": [502.0, 417.7], "V752": [508.4, 423.5], "V753": [509.4, 429.3], "V754": [507.3, 435.1], "V755": [503.1, 440.9], "V756": [499.9, 446.0], 
            "V757": [490.4, 442.8], "V758": [480.9, 442.1], "V759": [471.4, 441.5], "V760": [462.0, 440.2], "V761": [454.6, 436.3], "V762": [450.4, 430.5], 
            "V763": [446.1, 424.7], "V764": [445.1, 418.9], "V765": [445.1, 413.1], "V766": [446.1, 407.3], "V767": [446.1, 402.2], "V768": [455.6, 400.3], 
            "V769": [465.1, 399.6], "V770": [474.6, 398.3], "V771": [281.6, 411.2], "V772": [294.3, 414.4], "V773": [306.9, 417.0], "V774": [319.6, 418.9], 
            "V775": [332.2, 419.6], "V776": [341.7, 425.4], "V777": [344.9, 433.1], "V778": [345.9, 440.9], "V779": [344.9, 448.6], "V780": [333.3, 455.7], 
            "V781": [324.8, 463.4], "V782": [316.4, 470.5], "V783": [303.8, 470.5], "V784": [291.1, 468.6], "V785": [278.4, 464.1], "V786": [267.9, 456.3], 
            "V787": [255.2, 449.9], "V788": [248.9, 442.1], "V789": [246.8, 434.4], "V790": [244.7, 426.7], "V791": [248.9, 419.6], "V792": [261.6, 417.0], 
            "V793": [274.2, 415.1], "V794": [85.4, 423.5], "V795": [99.1, 427.3], "V796": [112.9, 430.5], "V797": [126.6, 433.8], "V798": [138.2, 442.1], 
            "V799": [139.2, 449.9], "V800": [132.9, 458.3], "V801": [126.6, 466.6], "V802": [122.3, 475.0], "V803": [121.3, 483.4], "V804": [120.2, 491.1], 
            "V805": [106.5, 493.7], "V806": [92.8, 498.2], "V807": [79.1, 502.1], "V808": [70.7, 500.2], "V809": [70.7, 491.8], "V810": [67.5, 483.4], 
            "V811": [61.2, 475.0], "V812": [54.8, 466.6], "V813": [54.8, 458.3], "V814": [57.0, 449.9], "V815": [60.1, 441.5], "V816": [68.6, 433.1], 
            "V817": [82.3, 425.4], "V818": [231.0, 424.7], "V819": [233.1, 431.8], "V820": [236.2, 439.6], "V821": [238.4, 447.3], "V822": [244.7, 455.0], 
            "V823": [257.3, 461.5], "V824": [267.9, 468.6], "V825": [280.5, 474.4], "V826": [292.1, 478.9], "V827": [287.9, 486.6], "V828": [275.3, 491.1], 
            "V829": [262.6, 491.1], "V830": [250.0, 487.9], "V831": [237.3, 486.0], "V832": [224.6, 485.3], "V833": [219.4, 480.2], "V834": [217.3, 472.4], 
            "V835": [215.2, 464.7], "V836": [214.1, 457.0], "V837": [210.9, 449.2], "V838": [205.7, 441.5], "V839": [205.7, 434.4], "V840": [218.3, 429.3], 
            "V841": [447.2, 442.1], "V842": [459.8, 446.0], "V843": [472.5, 447.3], "V844": [485.2, 447.9], "V845": [496.8, 453.1], "V846": [495.7, 460.8], 
            "V847": [494.6, 468.6], "V848": [492.5, 476.3], "V849": [490.4, 484.0], "V850": [488.3, 491.8], "V851": [479.9, 497.6], "V852": [467.2, 500.8], 
            "V853": [458.8, 495.0], "V854": [449.3, 487.9], "V855": [436.6, 483.4], "V856": [424.0, 481.5], "V857": [416.6, 476.3], "V858": [406.1, 469.9], 
            "V859": [402.9, 462.1], "V860": [399.7, 454.4], "V861": [412.4, 451.2], "V862": [425.0, 447.9], "V863": [437.7, 443.4], "V864": [187.7, 438.3], 
            "V865": [195.1, 442.1], "V866": [200.4, 449.2], "V867": [204.6, 456.3], "V868": [206.7, 463.4], "V869": [207.8, 470.5], "V870": [209.9, 477.6], 
            "V871": [212.0, 484.7], "V872": [204.6, 487.9], "V873": [193.0, 491.8], "V874": [181.4, 496.9], "V875": [169.8, 495.0], "V876": [158.2, 493.1], 
            "V877": [146.6, 492.4], "V878": [135.0, 491.1], "V879": [129.7, 486.6], "V880": [130.8, 479.5], "V881": [133.9, 472.4], "V882": [138.2, 465.4], 
            "V883": [143.4, 458.3], "V884": [147.7, 451.2], "V885": [158.2, 445.4], "V886": [169.8, 441.5], "V887": [181.4, 439.6], "V888": [354.4, 450.5], 
            "V889": [367.0, 451.8], "V890": [379.7, 453.1], "V891": [390.2, 457.0], "V892": [394.5, 464.7], "V893": [397.6, 472.4], "V894": [407.1, 479.5], 
            "V895": [398.7, 481.5], "V896": [386.0, 484.7], "V897": [373.4, 489.2], "V898": [360.7, 495.6], "V899": [353.3, 503.4], "V900": [349.1, 511.1], 
            "V901": [340.7, 505.3], "V902": [331.2, 497.6], "V903": [319.6, 491.1], "V904": [306.9, 489.2], "V905": [303.8, 484.0], "V906": [303.8, 476.3], 
            "V907": [315.4, 475.7], "V908": [328.0, 472.4], "V909": [335.4, 464.7], "V910": [343.8, 457.0], "V911": [222.5, 492.4], "V912": [234.1, 493.1], 
            "V913": [245.7, 495.6], "V914": [257.3, 498.2], "V915": [268.9, 500.2], "V916": [267.9, 506.6], "V917": [267.9, 513.7], "V918": [268.9, 520.8], 
            "V919": [270.0, 527.9], "V920": [263.7, 531.1], "V921": [252.1, 530.4], "V922": [240.5, 529.8], "V923": [228.9, 529.2], "V924": [217.3, 529.8], 
            "V925": [205.7, 530.4], "V926": [194.1, 533.0], "V927": [192.0, 528.5], "V928": [192.0, 521.4], "V929": [189.8, 514.3], "V930": [186.7, 507.2], 
            "V931": [193.0, 501.4], "V932": [204.6, 496.9], "V933": [216.2, 493.7], "V934": [293.2, 493.7], "V935": [306.9, 495.0], "V936": [320.6, 498.9], 
            "V937": [330.1, 507.2], "V938": [340.7, 515.6], "V939": [344.9, 523.4], "V940": [342.8, 531.7], "V941": [339.6, 540.1], "V942": [336.4, 548.5], 
            "V943": [333.3, 556.9], "V944": [328.0, 565.3], "V945": [315.4, 571.7], "V946": [302.7, 575.6], "V947": [295.3, 567.2], "V948": [295.3, 558.8], 
            "V949": [300.6, 550.4], "V950": [297.4, 542.1], "V951": [283.7, 537.5], "V952": [277.4, 530.4], "V953": [278.4, 522.1], "V954": [275.3, 513.7], 
            "V955": [277.4, 505.3], "V956": [281.6, 498.2], "V957": [223.6, 534.3], "V958": [237.3, 535.0], "V959": [251.0, 536.2], "V960": [264.7, 538.2], 
            "V961": [278.4, 542.7], "V962": [292.1, 547.9], "V963": [286.9, 556.2], "V964": [284.8, 564.6], "V965": [289.0, 573.0], "V966": [293.2, 581.4], 
            "V967": [279.5, 584.6], "V968": [265.8, 580.1], "V969": [252.1, 576.2], "V970": [238.4, 574.3], "V971": [224.6, 574.3], "V972": [210.9, 574.3], 
            "V973": [197.2, 574.9], "V974": [183.5, 567.8], "V975": [176.1, 559.5], "V976": [181.4, 551.1], "V977": [187.7, 542.7], "V978": [197.2, 538.2], 
            "V979": [210.9, 535.6]
        },
        "regionShapes": {
            "v2_01": ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20", "V21", 
                "V22", "V23", "V24"],
            "v2_02": ["V25", "V26", "V27", "V28", "V29", "V30", "V31", "V32", "V33", "V34", "V35", "V36", "V37", "V38", "V39", "V40", "V41", "V42", "V43", "V44", 
                "V45", "V46", "V47"],
            "v2_03": ["V48", "V49", "V50", "V51", "V52", "V53", "V54", "V55", "V56", "V57", "V58", "V59", "V60", "V61", "V62", "V63", "V64", "V65", "V66", "V67", 
                "V68", "V69"],
            "v2_04": ["V70", "V71", "V72", "V73", "V74", "V75", "V76", "V77", "V78", "V79", "V80", "V81", "V82", "V83", "V84", "V85", "V86", "V87", "V88", "V89", 
                "V90", "V91", "V92"],
            "v2_05": ["V93", "V94", "V95", "V96", "V97", "V98", "V99", "V100", "V101", "V102", "V103", "V104", "V105", "V106", "V107", "V108", "V109", "V110", 
                "V111", "V112", "V113", "V114", "V115", "V116"],
            "v2_06": ["V117", "V118", "V119", "V120", "V121", "V122", "V123", "V124", "V125", "V126", "V127", "V128", "V129", "V130", "V131", "V132", "V133", 
                "V134", "V135", "V136", "V137", "V138", "V139", "V140"],
            "v2_07": ["V141", "V142", "V143", "V144", "V145", "V146", "V147", "V148", "V149", "V150", "V151", "V152", "V153", "V154", "V155", "V156", "V157", 
                "V158", "V159", "V160", "V161", "V162", "V163"],
            "v2_08": ["V164", "V165", "V166", "V167", "V168", "V169", "V170", "V171", "V172", "V173", "V174", "V175", "V176", "V177", "V178", "V179", "V180", 
                "V181", "V182", "V183", "V184", "V185", "V186", "V187"],
            "v2_09": ["V188", "V189", "V190", "V191", "V192", "V193", "V194", "V195", "V196", "V197", "V198", "V199", "V200", "V201", "V202", "V203", "V204", 
                "V205", "V206", "V207", "V208", "V209", "V210", "V211"],
            "v2_10": ["V212", "V213", "V214", "V215", "V216", "V217", "V218", "V219", "V220", "V221", "V222", "V223", "V224", "V225", "V226", "V227", "V228", 
                "V229", "V230", "V231", "V232", "V233", "V234"],
            "v2_11": ["V235", "V236", "V237", "V238", "V239", "V240", "V241", "V242", "V243", "V244", "V245", "V246", "V247", "V248", "V249", "V250", "V251", 
                "V252", "V253", "V254", "V255", "V256", "V257"],
            "v2_12": ["V258", "V259", "V260", "V261", "V262", "V263", "V264", "V265", "V266", "V267", "V268", "V269", "V270", "V271", "V272", "V273", "V274", 
                "V275", "V276", "V277", "V278", "V279", "V280"],
            "v2_13": ["V281", "V282", "V283", "V284", "V285", "V286", "V287", "V288", "V289", "V290", "V291", "V292", "V293", "V294", "V295", "V296", "V297", 
                "V298", "V299", "V300", "V301", "V302", "V303"],
            "v2_14": ["V304", "V305", "V306", "V307", "V308", "V309", "V310", "V311", "V312", "V313", "V314", "V315", "V316", "V317", "V318", "V319", "V320", 
                "V321", "V322", "V323", "V324", "V325", "V326", "V327"],
            "v2_15": ["V328", "V329", "V330", "V331", "V332", "V333", "V334", "V335", "V336", "V337", "V338", "V339", "V340", "V341", "V342", "V343", "V344", 
                "V345", "V346", "V347", "V348", "V349", "V350"],
            "v2_16": ["V351", "V352", "V353", "V354", "V355", "V356", "V357", "V358", "V359", "V360", "V361", "V362", "V363", "V364", "V365", "V366", "V367", 
                "V368", "V369", "V370", "V371", "V372", "V373"], 
            "v2_17": ["V374", "V375", "V376", "V377", "V378", "V379", "V380", "V381", "V382", "V383", "V384", "V385", "V386", "V387", "V388", "V389", "V390", 
                "V391", "V392", "V393", "V394", "V395", "V396", "V397"], 
            "v2_18": ["V398", "V399", "V400", "V401", "V402", "V403", "V404", "V405", "V406", "V407", "V408", "V409", "V410", "V411", "V412", "V413", "V414", 
                "V415", "V416", "V417", "V418", "V419", "V420", "V421"],
            "v2_19": ["V422", "V423", "V424", "V425", "V426", "V427", "V428", "V429", "V430", "V431", "V432", "V433", "V434", "V435", "V436", "V437", "V438", 
                "V439", "V440", "V441", "V442", "V443", "V444", "V445"], 
            "v2_20": ["V446", "V447", "V448", "V449", "V450", "V451", "V452", "V453", "V454", "V455", "V456", "V457", "V458", "V459", "V460", "V461", "V462", 
                "V463", "V464", "V465", "V466", "V467", "V468", "V446"], 
            "v2_21": ["V469", "V470", "V471", "V472", "V473", "V474", "V475", "V476", "V477", "V478", "V479", "V480", "V481", "V482", "V483", "V484", "V485", 
                "V486", "V487", "V488", "V489", "V490", "V491", "V469"],
            "v2_22": ["V492", "V493", "V494", "V495", "V496", "V497", "V498", "V499", "V500", "V501", "V502", "V503", "V504", "V505", "V506", "V507", "V508", 
                "V509", "V510", "V511", "V512", "V513", "V514"], 
            "v2_23": ["V515", "V516", "V517", "V518", "V519", "V520", "V521", "V522", "V523", "V524", "V525", "V526", "V527", "V528", "V529", "V530", "V531", 
                "V532", "V533", "V534", "V535", "V536", "V537"], 
            "v2_24": ["V538", "V539", "V540", "V541", "V542", "V543", "V544", "V545", "V546", "V547", "V548", "V549", "V550", "V551", "V552", "V553", "V554", 
                "V555", "V556", "V557", "V558", "V559", "V560", "V538"], 
            "v2_25": ["V561", "V562", "V563", "V564", "V565", "V566", "V567", "V568", "V569", "V570", "V571", "V572", "V573", "V574", "V575", "V576", "V577", 
                "V578", "V579", "V580", "V581", "V582", "V583", "V561"],
            "v2_26": ["V584", "V585", "V586", "V587", "V588", "V589", "V590", "V591", "V592", "V593", "V594", "V595", "V596", "V597", "V598", "V599", "V600", 
                "V601", "V602", "V603", "V604", "V605", "V606", "V607", "V584"], 
            "v2_27": ["V608", "V609", "V610", "V611", "V612", "V613", "V614", "V615", "V616", "V617", "V618", "V619", "V620", "V621", "V622", "V623", "V624", 
                "V625", "V626", "V627", "V628", "V629", "V630", "V631"], 
            "v2_28": ["V632", "V633", "V634", "V635", "V636", "V637", "V638", "V639", "V640", "V641", "V642", "V643", "V644", "V645", "V646", "V647", "V648", 
                "V649", "V650", "V651", "V652", "V653"], 
            "v2_29": ["V654", "V655", "V656", "V657", "V658", "V659", "V660", "V661", "V662", "V663", "V664", "V665", "V666", "V667", "V668", "V669", "V670", 
                "V671", "V672", "V673", "V674", "V675", "V676"], 
            "v2_30": ["V677", "V678", "V679", "V680", "V681", "V682", "V683", "V684", "V685", "V686", "V687", "V688", "V689", "V690", "V691", "V692", "V693", 
                "V694", "V695", "V696", "V697", "V698", "V699"],
            "v2_31": ["V700", "V701", "V702", "V703", "V704", "V705", "V706", "V707", "V708", "V709", "V710", "V711", "V712", "V713", "V714", "V715", "V716", 
                "V717", "V718", "V719", "V720", "V721", "V722", "V723"], 
            "v2_32": ["V724", "V725", "V726", "V727", "V728", "V729", "V730", "V731", "V732", "V733", "V734", "V735", "V736", "V737", "V738", "V739", "V740", 
                "V741", "V742", "V743", "V744", "V745", "V746"], 
            "v2_33": ["V747", "V748", "V749", "V750", "V751", "V752", "V753", "V754", "V755", "V756", "V757", "V758", "V759", "V760", "V761", "V762", "V763", 
                "V764", "V765", "V766", "V767", "V768", "V769", "V770"], 
            "v2_34": ["V771", "V772", "V773", "V774", "V775", "V776", "V777", "V778", "V779", "V780", "V781", "V782", "V783", "V784", "V785", "V786", "V787", 
                "V788", "V789", "V790", "V791", "V792", "V793"],
            "v2_35": ["V794", "V795", "V796", "V797", "V798", "V799", "V800", "V801", "V802", "V803", "V804", "V805", "V806", "V807", "V808", "V809", "V810", 
                "V811", "V812", "V813", "V814", "V815", "V816", "V817"], 
            "v2_36": ["V818", "V819", "V820", "V821", "V822", "V823", "V824", "V825", "V826", "V827", "V828", "V829", "V830", "V831", "V832", "V833", "V834", 
                "V835", "V836", "V837", "V838", "V839", "V840", "V818"], 
            "v2_37": ["V841", "V842", "V843", "V844", "V845", "V846", "V847", "V848", "V849", "V850", "V851", "V852", "V853", "V854", "V855", "V856", "V857", 
                "V858", "V859", "V860", "V861", "V862", "V863"], 
            "v2_38": ["V864", "V865", "V866", "V867", "V868", "V869", "V870", "V871", "V872", "V873", "V874", "V875", "V876", "V877", "V878", "V879", "V880", 
                "V881", "V882", "V883", "V884", "V885", "V886", "V887"],
            "v2_39": ["V888", "V889", "V890", "V891", "V892", "V893", "V894", "V895", "V896", "V897", "V898", "V899", "V900", "V901", "V902", "V903", "V904", 
                "V905", "V906", "V907", "V908", "V909", "V910"], 
            "v2_40": ["V911", "V912", "V913", "V914", "V915", "V916", "V917", "V918", "V919", "V920", "V921", "V922", "V923", "V924", "V925", "V926", "V927", 
                "V928", "V929", "V930", "V931", "V932", "V933"], 
            "v2_41": ["V934", "V935", "V936", "V937", "V938", "V939", "V940", "V941", "V942", "V943", "V944", "V945", "V946", "V947", "V948", "V949", "V950", 
                "V951", "V952", "V953", "V954", "V955", "V956"], 
            "v2_42": ["V957", "V958", "V959", "V960", "V961", "V962", "V963", "V964", "V965", "V966", "V967", "V968", "V969", "V970", "V971", "V972", "V973", 
                "V974", "V975", "V976", "V977", "V978", "V979"]
        }
};

const sketch7V2 = structuredClone(SKETCH7_V2_FROM_IMAGE);
// Outer border traced from the hand-drawn source map (irregular world boundary).
sketch7V2.outline = [[12.0,324.6],[14.9,318.8],[21.4,308.7],[26.5,297.8],[31.5,290.6],[39.5,281.9],[46.7,273.9],[52.5,266.7],[59.8,260.2],[67.0,250.0],[38.0,219.7],[27.2,197.2],[30.1,187.1],[37.3,179.9],[49.6,174.8],[70.6,180.6],[90.9,188.5],[106.8,186.4],[113.3,177.7],[120.5,170.5],[127.8,160.3],[133.6,145.1],[141.5,138.6],[149.5,137.2],[149.5,44.6],[163.9,32.3],[181.3,22.1],[198.0,13.4],[217.5,12.0],[235.6,12.7],[246.4,14.2],[271.0,18.5],[289.1,21.4],[300.0,25.0],[313.0,39.5],[322.4,60.5],[333.3,77.1],[348.5,88.7],[355.0,102.4],[357.9,124.2],[345.6,161.1],[344.8,180.6],[340.5,200.1],[327.5,225.4],[323.1,239.9],[323.8,250.0],[323.1,260.2],[325.3,271.8],[328.9,279.0],[340.5,283.3],[347.7,289.8],[352.1,297.1],[355.0,305.8],[357.1,314.4],[358.6,322.4],[358.6,334.0],[357.9,339.0],[355.0,349.9],[353.5,360.8],[354.2,370.2],[353.5,378.1],[351.3,388.2],[348.5,397.7],[346.3,407.1],[348.5,419.4],[352.8,433.8],[368.7,459.9],[367.3,475.1],[362.2,487.4],[358.6,502.6],[357.1,521.4],[353.5,541.6],[348.5,548.9],[333.3,554.7],[307.9,535.8],[291.3,531.5],[275.4,538.7],[263.8,548.9],[255.8,572.0],[247.9,609.7],[234.1,632.1],[217.5,643.7],[206.6,648.0],[190.0,644.4],[170.5,637.1],[146.6,637.9],[137.2,634.3],[123.4,618.3],[127.0,551.8],[109.0,544.5],[94.5,543.1],[73.5,553.2],[53.2,557.6],[50.3,547.4],[46.7,526.4],[40.2,512.7],[40.2,493.2],[46.7,469.3],[65.5,438.9],[67.0,425.1],[74.2,410.0],[78.6,397.7],[77.8,386.1],[72.1,379.6],[68.4,372.3],[56.9,367.3],[43.1,361.5],[35.9,353.5],[30.1,344.8],[13.4,336.2]];
fitRegionSitesToOutline(sketch7V2, 16);
delete sketch7V2.regionVertices;
delete sketch7V2.regionShapes;
delete sketch7V2.neighbors;
sketch7V2.minCellArea = 80;
GAME_MAPS.sketch7_v2 = sketch7V2;

function rebuildNeighborsFromShapes(mapDef) {
    if (!mapDef?.regionShapes) return;
    const edgeOwners = new Map();
    const rebuilt = Object.fromEntries((mapDef.regionData || []).map((r) => [r.id, new Set()]));

    for (const region of mapDef.regionData || []) {
    const vertices = mapDef.regionShapes[region.id];
    if (!vertices || vertices.length < 2) continue;
    for (let i = 0; i < vertices.length; i += 1) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!edgeOwners.has(key)) edgeOwners.set(key, []);
        edgeOwners.get(key).push(region.id);
    }
    }

    for (const regionIds of edgeOwners.values()) {
    if (regionIds.length < 2) continue;
    const unique = [...new Set(regionIds)];
    for (let i = 0; i < unique.length; i += 1) {
        for (let j = i + 1; j < unique.length; j += 1) {
        rebuilt[unique[i]]?.add(unique[j]);
        rebuilt[unique[j]]?.add(unique[i]);
        }
    }
    }

    // Safety net: every region must have at least one neighbor.
    for (const region of mapDef.regionData || []) {
    const list = rebuilt[region.id];
    if (!list || list.size > 0) continue;
    let nearest = null;
    let best = Infinity;
    for (const other of mapDef.regionData || []) {
        if (other.id === region.id) continue;
        const dx = region.x - other.x;
        const dy = region.y - other.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
        best = d2;
        nearest = other.id;
        }
    }
    if (nearest) {
        rebuilt[region.id].add(nearest);
        rebuilt[nearest]?.add(region.id);
    }
    }

    mapDef.neighbors = Object.fromEntries(
    Object.entries(rebuilt).map(([id, set]) => [id, [...set]])
    );
}

function fitRegionSitesToOutline(mapDef, padding = 14) {
    if (!mapDef?.regionData?.length || !mapDef?.outline?.length) return;
    const xs = mapDef.regionData.map((r) => r.x);
    const ys = mapDef.regionData.map((r) => r.y);
    const ox = mapDef.outline.map((p) => p[0]);
    const oy = mapDef.outline.map((p) => p[1]);

    const srcMinX = Math.min(...xs);
    const srcMaxX = Math.max(...xs);
    const srcMinY = Math.min(...ys);
    const srcMaxY = Math.max(...ys);
    const dstMinX = Math.min(...ox) + padding;
    const dstMaxX = Math.max(...ox) - padding;
    const dstMinY = Math.min(...oy) + padding;
    const dstMaxY = Math.max(...oy) - padding;

    const srcW = Math.max(1, srcMaxX - srcMinX);
    const srcH = Math.max(1, srcMaxY - srcMinY);
    const dstW = Math.max(1, dstMaxX - dstMinX);
    const dstH = Math.max(1, dstMaxY - dstMinY);

    for (const region of mapDef.regionData) {
    const nx = (region.x - srcMinX) / srcW;
    const ny = (region.y - srcMinY) / srcH;
    region.x = Math.round(dstMinX + nx * dstW);
    region.y = Math.round(dstMinY + ny * dstH);
    }
}

function ensureNeighborIntegrity(mapDef) {
    if (!mapDef?.regionData?.length) return;
    const byId = new Map(mapDef.regionData.map((r) => [r.id, r]));
    const graph = Object.fromEntries(mapDef.regionData.map((r) => [r.id, new Set()]));

    for (const region of mapDef.regionData) {
    const existing = mapDef.neighbors?.[region.id] || [];
    for (const otherId of existing) {
        if (!byId.has(otherId) || otherId === region.id) continue;
        graph[region.id].add(otherId);
        graph[otherId].add(region.id);
    }
    }

    // Guarantee at least one neighbor per region (nearest fallback).
    for (const region of mapDef.regionData) {
    if (graph[region.id].size > 0) continue;
    let nearest = null;
    let best = Infinity;
    for (const other of mapDef.regionData) {
        if (other.id === region.id) continue;
        const dx = region.x - other.x;
        const dy = region.y - other.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
        best = d2;
        nearest = other.id;
        }
    }
    if (nearest) {
        graph[region.id].add(nearest);
        graph[nearest].add(region.id);
    }
    }

    mapDef.neighbors = Object.fromEntries(
    Object.entries(graph).map(([id, set]) => [id, [...set]])
    );
}


for (const mapDef of Object.values(GAME_MAPS)) {
  if (!mapDef.countries) {
    mapDef.countries = Object.fromEntries(mapDef.countryOrder.map((countryId) => [countryId, COUNTRY_LIBRARY[countryId]]));
  }
  // Добавляем условие: автогенерация НЕ трогает sketch6, у которой вершины уже заложены вручную
  if (mapDef.id !== "sketch6" && (!mapDef.neighbors || !mapDef.regionVertices || !mapDef.regionShapes)) {
    const auto = buildVoronoiGeometry(mapDef.regionData, mapDef.outline, mapDef.minCellArea || 300);
    mapDef.neighbors = auto.neighbors;
    mapDef.regionVertices = auto.regionVertices;
    mapDef.regionShapes = auto.regionShapes;
  }
  ensureNeighborIntegrity(mapDef);
}

let activeMapId = "default";
let currentZombieBaseMapKey = null;
let globalCasualties = {}; 
// Структура будет хранить данные в формате: 
// countryId: { name: "Name", color: "#hex", troops: 0, factories: 0 }



let regions = structuredClone(GAME_MAPS[activeMapId].regionData);
let activeCountries = structuredClone(GAME_MAPS[activeMapId].countries);
let turnOrder = [...GAME_MAPS[activeMapId].countryOrder];
let turnIndex = 0;
let currentPlayer = turnOrder[turnIndex];
let mode = "move";
let atWar = true;
let selectedRegionId = null;
let winner = null;
let isPassPhase = false;
const playersWhoFinishedAtLeastOneTurn = new Set();
const turnsCompletedByCountry = new Map();
let blockedMoveSources = new Set();
let pendingDiplomacyAction = null; // "form" | "break"
let pendingFactoryAction = null; // "build" | "demolish"
let factoriesEnabled = false;
let pendingArtilleryAction = null; // "build" | "scrap"

const mapEl = document.getElementById("map");
const mapBgEl = document.getElementById("mapBg");
const logEl = document.getElementById("log");
const turnText = document.getElementById("turnText");
const modeText = document.getElementById("modeText");
const warText = document.getElementById("warText");
const passOverlayEl = document.getElementById("passOverlay");
const passTitleEl = document.getElementById("passTitle");
const passTextEl = document.getElementById("passText");
const startTurnBtn = document.getElementById("startTurnBtn");
const regionsLayerEl = document.getElementById("regionsLayer");
const boundariesLayerEl = document.getElementById("boundariesLayer");
const reinforcementTokenEl = document.getElementById("reinforcementToken");
const mapSelectEl = document.getElementById("mapSelect");
const formAllianceBtn = document.getElementById("formAllianceBtn");
const breakAllianceBtn = document.getElementById("breakAllianceBtn");
const factoriesToggleBtn = document.getElementById("factoriesToggleBtn");
const buildFactoryBtn = document.getElementById("buildFactoryBtn");
const demolishFactoryBtn = document.getElementById("demolishFactoryBtn");
const zoomRangeEl = document.getElementById("zoomRange");
const zoomTextEl = document.getElementById("zoomText");
const unitsOverlayEl = document.getElementById("unitsOverlay");
const unitsPromptTitleEl = document.getElementById("unitsPromptTitle");
const unitsPromptMetaEl = document.getElementById("unitsPromptMeta");
const unitsPromptDisplayEl = document.getElementById("unitsPromptDisplay");
const unitsBackBtnEl = document.getElementById("unitsBackBtn");
const unitsClearBtnEl = document.getElementById("unitsClearBtn");
const unitsCancelBtnEl = document.getElementById("unitsCancelBtn");
const unitsOkBtnEl = document.getElementById("unitsOkBtn");
const artilleryAttackModeBtn = document.getElementById("artilleryAttackModeBtn");
const buildArtilleryBtn = document.getElementById("buildArtilleryBtn");
const scrapArtilleryBtn = document.getElementById("scrapArtilleryBtn");
// Финальная рабочая логика ползунка
const zombieSliderContainer = document.getElementById("zombieSliderContainer");
const zombieCountRange = document.getElementById("zombieCountRange");
const zombieCountText = document.getElementById("zombieCountText");

if (zombieCountRange && zombieCountText) {
    // 1. При перетаскивании просто меняем цифру на экране (100...20000)
    zombieCountRange.addEventListener("input", (e) => {
        zombieCountText.textContent = e.target.value;
    });

    // 2. В момент, когда игрок ОТПУСТИЛ ползунок — мгновенно перерисовываем карту с новым числом войск!
    zombieCountRange.addEventListener("change", () => {
        if (activeMapId === "zombie_map") {
            addLog(`🧟 Задан новый размер орды: ${zombieCountRange.value}. Перезапуск сценария...`);
            loadMap("zombie_map");
        }
    });
}

// Переключение видимости отдельного контейнера ползунка при смене карт
if (mapSelectEl) {
    mapSelectEl.addEventListener("change", (e) => {
        if (zombieSliderContainer) {
            zombieSliderContainer.style.display = e.target.value === "zombie_map" ? "block" : "none";
        }
    });
}

let pendingReinforcement = null;
let reinforcementDrag = false;
let mapScale = 1;
let activeAlliances = {};
let reinforcementPointerId = null;

function initMapSelect() {
    mapSelectEl.innerHTML = "";
    for (const mapDef of Object.values(GAME_MAPS)) {
    const option = document.createElement("option");
    option.value = mapDef.id;
    option.textContent = mapDef.name;
    mapSelectEl.appendChild(option);
    }
}

function addLog(message) {
    const p = document.createElement("p");
    p.textContent = message;
    logEl.prepend(p);
}

function showUnitsPrompt(question, maxValue) {
    return new Promise((resolve) => {
    let currentValue = "";
    unitsPromptTitleEl.textContent = question;
    unitsPromptMetaEl.textContent = `Enter number from 1 to ${maxValue}`;
    unitsPromptDisplayEl.textContent = currentValue;
    unitsOverlayEl.classList.add("show");

    function refresh() {
        unitsPromptDisplayEl.textContent = currentValue;
    }

    function appendDigit(d) {
        if (currentValue.length < 6) currentValue += d;
        const numeric = Number(currentValue || "0");
        if (numeric > maxValue) currentValue = String(maxValue);
        refresh();
    }

    function onDigitClick(event) {
        const digit = event.target.getAttribute("data-digit");
        if (digit == null) return;
        appendDigit(digit);
    }

    function onBack() {
        if (!currentValue.length) return;
        currentValue = currentValue.slice(0, -1);
        refresh();
    }

    function onClear() {
        currentValue = "";
        refresh();
    }

    function close(result) {
        unitsOverlayEl.classList.remove("show");
        for (const btn of unitsOverlayEl.querySelectorAll("[data-digit]")) {
        btn.removeEventListener("click", onDigitClick);
        }
        unitsBackBtnEl.removeEventListener("click", onBack);
        unitsClearBtnEl.removeEventListener("click", onClear);
        unitsCancelBtnEl.removeEventListener("click", onCancel);
        unitsOkBtnEl.removeEventListener("click", onOk);
        resolve(result);
    }

    function onCancel() {
        close(null);
    }

    function onOk() {
        const num = Number(currentValue);
        if (!Number.isInteger(num) || num < 1 || num > maxValue) return;
        close(num);
    }

    for (const btn of unitsOverlayEl.querySelectorAll("[data-digit]")) {
        btn.addEventListener("click", onDigitClick);
    }
    unitsBackBtnEl.addEventListener("click", onBack);
    unitsClearBtnEl.addEventListener("click", onClear);
    unitsCancelBtnEl.addEventListener("click", onCancel);
    unitsOkBtnEl.addEventListener("click", onOk);
    });
}

function applyMapScale(scale) {
    mapScale = scale;
    mapEl.style.zoom = `${mapScale}`;
    zoomTextEl.textContent = `${Math.round(mapScale * 100)}%`;
}

function getRegion(id) {
    return regions.find((r) => r.id === id);
}

function getCountry(countryId) {
    return activeCountries[countryId];
}

function getAlivePlayers() {
    return new Set(regions.map((r) => r.owner));
}

function getAllianceOf(countryId) {
    for (const [allianceId, members] of Object.entries(activeAlliances || {})) {
    if (members.includes(countryId)) return allianceId;
    }
    return null;
}

function areAllies(countryA, countryB) {
    if (countryA === countryB) return true;
    const a = getAllianceOf(countryA);
    const b = getAllianceOf(countryB);
    return Boolean(a && b && a === b);
}

function generateNextAllianceId() {
    let i = 1;
    // Keep IDs deterministic-looking: U1, U2, ...
    while (activeAlliances && activeAlliances[`U${i}`]) i += 1;
    return `U${i}`;
}

function formAlliance(countryA, countryB) {
    if (countryA === countryB) return;
    if (!activeAlliances) activeAlliances = {};

    const aId = getAllianceOf(countryA);
    const bId = getAllianceOf(countryB);
    if (aId && aId === bId) return; // already in the same alliance

    if (!aId && !bId) {
    const newId = generateNextAllianceId();
    activeAlliances[newId] = [countryA, countryB];
    return;
    }

    if (aId && !bId) {
    if (!activeAlliances[aId].includes(countryB)) activeAlliances[aId].push(countryB);
    return;
    }

    if (!aId && bId) {
    if (!activeAlliances[bId].includes(countryA)) activeAlliances[bId].push(countryA);
    return;
    }

    // Merge two alliances into one.
    if (aId && bId && aId !== bId) {
    const merged = Array.from(new Set([...(activeAlliances[aId] || []), ...(activeAlliances[bId] || [])]));
    delete activeAlliances[bId];
    activeAlliances[aId] = merged;
    }
}

function breakAlliance(countryA, countryB) {
    if (countryA === countryB) return;
    if (!activeAlliances) return;

    const aId = getAllianceOf(countryA);
    const bId = getAllianceOf(countryB);
    if (!aId || !bId || aId !== bId) return; // not allied

    // Remove only the target member from the alliance.
    activeAlliances[aId] = (activeAlliances[aId] || []).filter((c) => c !== countryB);
    if (activeAlliances[aId].length < 2) delete activeAlliances[aId];
}

function switchPlayer() {
    // АВТО-СБРОС: При передаче хода принудительно выключаем бесконечный снос/стройку фабрик
    pendingFactoryAction = null;
    pendingArtilleryAction = null;
    selectedRegionId = null;

    const alive = getAlivePlayers();
    if (!alive.size) return;
    for (let step = 1; step <= turnOrder.length; step += 1) {
    const idx = (turnIndex + step) % turnOrder.length;
    const candidate = turnOrder[idx];
    if (alive.has(candidate)) {
        turnIndex = idx;
        currentPlayer = candidate;
        return;
    }
    }
}

let neighbors = structuredClone(GAME_MAPS[activeMapId].neighbors);
let regionVertices = structuredClone(GAME_MAPS[activeMapId].regionVertices);
let regionShapes = structuredClone(GAME_MAPS[activeMapId].regionShapes);

function verticesToPoints(vertexIds) {
    return vertexIds.map((id) => regionVertices[id].join(",")).join(" ");
}

function edgeKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function pointInPolygon(x, y, vertexIds) {
    const pts = vertexIds.map((id) => regionVertices[id]);
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0];
    const yi = pts[i][1];
    const xj = pts[j][0];
    const yj = pts[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
    }
    return inside;
}

function getRegionIdAtClientPoint(clientX, clientY) {
    reinforcementTokenEl.style.visibility = "hidden";
    const el = document.elementFromPoint(clientX, clientY);
    reinforcementTokenEl.style.visibility = "visible";
    if (!el) return null;
    if (el.classList && el.classList.contains("region-shape")) {
    return el.getAttribute("data-region-id");
    }
    if (el.classList && el.classList.contains("region-btn")) {
    return el.getAttribute("data-region-id");
    }
    return null;
}

function placeReinforcementTokenFromClient(clientX, clientY) {
    const rect = mapEl.getBoundingClientRect();
    const x = Math.max(30, Math.min(rect.width - 30, clientX - rect.left));
    const y = Math.max(30, Math.min(rect.height - 30, clientY - rect.top));
    reinforcementTokenEl.style.left = `${x}px`;
    reinforcementTokenEl.style.top = `${y}px`;
}

function polygonCentroid(vertexIds) {
    const pts = vertexIds.map((id) => regionVertices[id]);
    let twiceArea = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const cross = x1 * y2 - x2 * y1;
    twiceArea += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
    }

    if (twiceArea === 0) {
    const sx = pts.reduce((sum, p) => sum + p[0], 0);
    const sy = pts.reduce((sum, p) => sum + p[1], 0);
    return { x: sx / pts.length, y: sy / pts.length };
    }

    return {
    x: cx / (3 * twiceArea),
    y: cy / (3 * twiceArea)
    };
}

function findSafePointInsideRegion(vertexIds, seedX, seedY) {
    if (pointInPolygon(seedX, seedY, vertexIds)) return { x: seedX, y: seedY };
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    for (let radius = 6; radius <= 60; radius += 6) {
    for (const angle of angles) {
        const rad = (angle * Math.PI) / 180;
        const x = seedX + Math.cos(rad) * radius;
        const y = seedY + Math.sin(rad) * radius;
        if (pointInPolygon(x, y, vertexIds)) return { x, y };
    }
    }
    const pts = vertexIds.map((id) => regionVertices[id]);
    const sx = pts.reduce((sum, p) => sum + p[0], 0);
    const sy = pts.reduce((sum, p) => sum + p[1], 0);
    return { x: sx / pts.length, y: sy / pts.length };
}

function renderStatus() {
    turnText.textContent = getCountry(currentPlayer).name;
    modeText.textContent = mode === "move" ? "Movement" : "Attack";
    warText.textContent = atWar ? "War" : "Peace";

    // Финальная и полная логика разблокировки абсолютно всех кнопок панели
    if (selectedRegionId) {
        const clicked = getRegion(selectedRegionId);
        const completedTurns = turnsCompletedByCountry.get(currentPlayer) || 0;

        if (currentPlayer === "zombie") {
            // ЗОМБИ: Строить фабрики и артиллерию нельзя вообще по правилам игры
            if (buildFactoryBtn) buildFactoryBtn.disabled = true;
            if (buildArtilleryBtn) buildArtilleryBtn.disabled = true;
            if (scrapArtilleryBtn) scrapArtilleryBtn.disabled = true;

            // ИСПРАВЛЕНО: Кнопка сноса для зомби ВСЕГДА активна, если выбран регион!
            // Это позволит кликнуть по ней повторно и выйти из режима сноса, даже если фабрик уже нет.
            if (demolishFactoryBtn) demolishFactoryBtn.disabled = false;
            
        } else {
            // ЛЮДИ: Проверка главного тумблера режима фабрик (FACTORIES: ON/OFF)
            if (!factoriesEnabled) {
                if (buildFactoryBtn) buildFactoryBtn.disabled = true;
                if (demolishFactoryBtn) demolishFactoryBtn.disabled = true;
                if (buildArtilleryBtn) buildArtilleryBtn.disabled = false;
                if (scrapArtilleryBtn) scrapArtilleryBtn.disabled = false;
            } else {
                // Если режим фабрик ВКЛЮЧЕН (FACTORIES: ON):
                
                // ИСПРАВЛЕНО: Кнопки фабрик Людей ВСЕГДА активны для клика, пока выбран регион!
                if (buildFactoryBtn) buildFactoryBtn.disabled = false;
                if (demolishFactoryBtn) demolishFactoryBtn.disabled = false;

                // ИСПРАВЛЕНО: Кнопки артиллерии Людей ВСЕГДА активны для клика, пока выбран регион!
                if (buildArtilleryBtn) buildArtilleryBtn.disabled = false;
                if (scrapArtilleryBtn) scrapArtilleryBtn.disabled = false;

            }
        }
    } else {
        // Если никакой регион на карте не выбран — абсолютно вся панель действий уходит в блок
        if (buildFactoryBtn) buildFactoryBtn.disabled = true;
        if (demolishFactoryBtn) demolishFactoryBtn.disabled = true;
        if (buildArtilleryBtn) buildArtilleryBtn.disabled = true;
        if (scrapArtilleryBtn) scrapArtilleryBtn.disabled = true;
    }

    // Динамическая генерация списков потерь по фракциям (ваш оригинальный рабочий код логов)
    const container = document.getElementById("casualtyStatsContainer");
    if (container) {
        container.innerHTML = ""; 
        Object.keys(globalCasualties).forEach(countryId => {
            const data = globalCasualties[countryId];
            const countryRow = document.createElement("div");
            countryRow.style.padding = "4px 0";
            countryRow.style.borderBottom = "1px solid #374151";
            countryRow.innerHTML = `
                <span style="color: ${data.color}; font-weight: bold;">■ ${data.name}:</span> 
                <span>💀 ${data.troops} troops</span> | 
                <span>⚙ ${data.factories} fac. destroyed</span>
            `;
            container.appendChild(countryRow);
        });
    }
}


function clearFactoriesOnCurrentMap() {
    for (const region of regions) region.factories = 0;
}

function populateRandomFactoriesOnCurrentMap() {
    const regionById = new Map(regions.map((r) => [r.id, r]));
    const regionsByOwner = new Map();
    for (const region of regions) {
    if (!regionsByOwner.has(region.owner)) regionsByOwner.set(region.owner, []);
    regionsByOwner.get(region.owner).push(region);
    }

    clearFactoriesOnCurrentMap();

    const owners = [...regionsByOwner.keys()];
    if (!owners.length) return;

    // Ensure factories appear for multiple players.
    const targetRegionCount = randomInt(
    owners.length,
    Math.min(regions.length, owners.length * 2)
    );

    const pickedRegionIds = new Set();
    for (const owner of owners) {
    const candidates = regionsByOwner.get(owner) || [];
    if (!candidates.length) continue;
    const r = candidates[randomInt(0, candidates.length - 1)];
    pickedRegionIds.add(r.id);
    }

    let safety = 0;
    while (pickedRegionIds.size < targetRegionCount && safety < 5000) {
    safety += 1;
    const owner = owners[randomInt(0, owners.length - 1)];
    const candidates = regionsByOwner.get(owner) || [];
    if (!candidates.length) continue;
    const r = candidates[randomInt(0, candidates.length - 1)];
    pickedRegionIds.add(r.id);
    }

    for (const regionId of pickedRegionIds) {
    const region = regionById.get(regionId);
    if (!region) continue;
    // Start with a random number of factories (still capped by 10).
    region.factories = randomInt(1, 10);
    }
}

function loadMap(mapId) {
    // Блокировка и считывание ползунка для зомби-режима
    if (mapId === "zombie_map") {
        if (zombieSliderContainer && zombieCountRange) {
            zombieSliderContainer.style.display = "block";
            zombieCountRange.disabled = false;
        }

        const allMapKeys = Object.keys(GAME_MAPS);
        const validBases = allMapKeys.filter(key => 
            key !== "zombie_map" && 
            key !== "random_unions" && 
            key !== "random_no_unions" && 
            GAME_MAPS[key]
        );
        
        // Если базовая карта еще не выбрана для этой сессии — выбираем её случайно
        if (!currentZombieBaseMapKey || !validBases.includes(currentZombieBaseMapKey)) {
            currentZombieBaseMapKey = validBases.length > 0 
                ? validBases[Math.floor(Math.random() * validBases.length)] 
                : "default";
        }
        
        // Используем жестко зафиксированную карту-основу
        const baseMap = GAME_MAPS[currentZombieBaseMapKey];

        
        // Безопасное клонирование базовой карты
        const zombieCopy = {
            id: "zombie_map",
            name: `zombie apocalypse (${baseMap.name || chosenBaseKey})`,
            countryOrder: [],
            alliances: {},
            regionData: baseMap.regionData ? baseMap.regionData.map(r => ({ ...r })) : [],
            neighbors: baseMap.neighbors ? structuredClone(baseMap.neighbors) : {},
            regionVertices: baseMap.regionVertices ? structuredClone(baseMap.regionVertices) : {},
            regionShapes: baseMap.regionShapes ? structuredClone(baseMap.regionShapes) : {}
        };
        
        if (baseMap.outline) zombieCopy.outline = [...baseMap.outline];
        if (baseMap.minCellArea) zombieCopy.minCellArea = baseMap.minCellArea;

        const humanCountries = baseMap.countryOrder.filter(c => c !== "zombie");
        zombieCopy.countryOrder = ["zombie", ...humanCountries];
        zombieCopy.alliances = { "Humans": [...humanCountries] };

        // Внедрение стартового количества зомби из ползунка
        if (zombieCopy.regionData && zombieCopy.regionData.length > 0) {
            const randomIndex = Math.floor(Math.random() * zombieCopy.regionData.length);
            const targetRegion = zombieCopy.regionData[randomIndex];
            targetRegion.owner = "zombie";
            
            // Если ползунок существует, берем его значение, иначе дефолтные 1000
            const sliderEl = document.getElementById("zombieCountRange");
            targetRegion.army = sliderEl ? parseInt(sliderEl.value, 10) : 1000;
            targetRegion.capital = true; 
        }

        GAME_MAPS.zombie_map = zombieCopy;
    } else {
        // Если выбрана любая другая карта — скрываем ползунок через глобальную переменную
        const sliderCont = document.getElementById("zombieSliderContainer");
        if (sliderCont) {
            sliderCont.style.display = "none";
        }
    }


    const mapDef = GAME_MAPS[mapId];

    if (!mapDef) return;
    if (!mapDef.countries) {
    mapDef.countries = Object.fromEntries(mapDef.countryOrder.map((countryId) => [countryId, COUNTRY_LIBRARY[countryId]]));
    }
    if (!mapDef.neighbors || !mapDef.regionVertices || !mapDef.regionShapes) {
    const auto = buildVoronoiGeometry(mapDef.regionData, mapDef.outline || MAP_OUTLINE, mapDef.minCellArea || 300);
    mapDef.neighbors = auto.neighbors;
    mapDef.regionVertices = auto.regionVertices;
    mapDef.regionShapes = auto.regionShapes;
    }
    ensureNeighborIntegrity(mapDef);

    activeMapId = mapId;
    mapSelectEl.value = mapId;
    activeCountries = structuredClone(mapDef.countries);
    turnOrder = [...mapDef.countryOrder];
    activeAlliances = structuredClone(mapDef.alliances || {});
    turnIndex = 0;
    neighbors = structuredClone(mapDef.neighbors);
    regionVertices = structuredClone(mapDef.regionVertices);
    regionShapes = structuredClone(mapDef.regionShapes);
    regions = structuredClone(mapDef.regionData);
    for (const region of regions) {
        region.factories = region.factories || 0;
        region.artillery = region.artillery || 0;
    }
    if (factoriesEnabled) populateRandomFactoriesOnCurrentMap();
    else clearFactoriesOnCurrentMap();

    const alive = getAlivePlayers();
    while (turnIndex < turnOrder.length && !alive.has(turnOrder[turnIndex])) {
    turnIndex += 1;
    }
    currentPlayer = turnOrder[turnIndex] || turnOrder[0];
    mode = "move";
    atWar = true;
    selectedRegionId = null;
    winner = null;
    isPassPhase = false;
    
        // Создаем персональные счетчики под каждую страну на этой карте
    globalCasualties = {};
    if (mapDef && mapDef.countryOrder) {
        mapDef.countryOrder.forEach(countryId => {
            const countryInfo = COUNTRY_LIBRARY[countryId] || { name: countryId, color: "#ffffff" };
            globalCasualties[countryId] = {
                name: countryInfo.name,
                color: countryInfo.color,
                troops: 0,
                factories: 0
            };
        });
    }

    
    if (buildArtilleryBtn && scrapArtilleryBtn) {
        buildArtilleryBtn.disabled = true;
        scrapArtilleryBtn.disabled = true;
    }

    playersWhoFinishedAtLeastOneTurn.clear();
    turnsCompletedByCountry.clear();
    blockedMoveSources = new Set();
    pendingReinforcement = null;
    reinforcementDrag = false;
    reinforcementTokenEl.style.display = "none";
    reinforcementTokenEl.classList.remove("dragging");
    passOverlayEl.classList.remove("show");
    logEl.innerHTML = "";
    mapBgEl.style.display = "none";
    mapBgEl.style.opacity = "0";
    addLog(`Map loaded: ${mapDef.name}.`);
    addLog("Game started. Choose mode then a region.");

    const playerSelectEl = document.getElementById("playerCountrySelect");
    if (playerSelectEl) {
    // Зберігаємо поточний вибір користувача, щоб він не скидався, якщо карта просто перемальовується
    const previousSelection = playerSelectEl.value;
    
    playerSelectEl.innerHTML = "";
    
    // Беремо країни, які є живими на цій карті
    turnOrder.forEach(countryId => {
        const countryData = COUNTRY_LIBRARY[countryId];
        if (countryData) {
        const option = document.createElement("option");
        option.value = countryId;
        option.textContent = countryData.name;
        playerSelectEl.appendChild(option);
        }
    });

    // Якщо раніше вже було обрано країну, яка є на цій карті, залишаємо її
    if (previousSelection && turnOrder.includes(previousSelection)) {
        playerSelectEl.value = previousSelection;
    }
    }

    // Слухач події: якщо гравець змінює країну у списку, карта миттєво перезапускається за неї
    if (playerSelectEl && !playerSelectEl.dataset.listenerAttached) {
    playerSelectEl.addEventListener("change", () => {
        addLog(`🎮 Ви змінили фракцію. Перезапуск карти...`);
        loadMap(activeMapId); // Перезавантажуємо поточну карту з новими налаштуваннями
    });
    playerSelectEl.dataset.listenerAttached = "true";
    }
    render();

    const aiEnabled = document.getElementById("aiToggle")?.checked;
    const selectedHumanPlayer = document.getElementById("playerCountrySelect")?.value;

    if (aiEnabled && selectedHumanPlayer && currentPlayer !== selectedHumanPlayer) {
    setTimeout(() => {
        makeAiTurn(currentPlayer);
    }, 600);
    }
}

function renderMap() {
    for (const old of mapEl.querySelectorAll(".region-btn")) {
        old.remove();
    }
    for (const old of mapEl.querySelectorAll(".capital-star")) {
        old.remove();
    }
    for (const old of mapEl.querySelectorAll(".factory-icon")) {
        old.remove();
    }
    for (const old of mapEl.querySelectorAll(".artillery-icon")) {
        old.remove();
    }

    regionsLayerEl.innerHTML = "";
    boundariesLayerEl.innerHTML = "";
    const edgeUsage = new Map();
    const regionById = new Map(regions.map((r) => [r.id, r]));

    for (const region of regions) {
        const vertices = regionShapes[region.id];
        if (!vertices || vertices.length < 3) continue;
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", verticesToPoints(vertices));
        polygon.setAttribute("class", `region-shape${selectedRegionId === region.id ? " selected" : ""}`);
        const regionColor = getCountry(region.owner).color;
        polygon.style.fill = withAlpha(regionColor, selectedRegionId === region.id ? 0.7 : 0.6);
        polygon.style.stroke = withAlpha(regionColor, selectedRegionId === region.id ? 0.6 : 0.45);
        polygon.setAttribute("data-region-id", region.id);
        polygon.addEventListener("click", () => onRegionClick(region.id));
        regionsLayerEl.appendChild(polygon);

        for (let i = 0; i < vertices.length; i += 1) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const key = edgeKey(a, b);
            if (!edgeUsage.has(key)) {
                edgeUsage.set(key, { a, b, regionIds: new Set() });
            }
            edgeUsage.get(key).regionIds.add(region.id);
        }
    }

    for (const entry of edgeUsage.values()) {
        const owners = [...entry.regionIds].map((id) => regionById.get(id).owner);
        const distinctOwners = new Set(owners);
        const [x1, y1] = regionVertices[entry.a];
        const [x2, y2] = regionVertices[entry.b];
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", `${x1}`);
        line.setAttribute("y1", `${y1}`);
        line.setAttribute("x2", `${x2}`);
        line.setAttribute("y2", `${y2}`);
        if (entry.regionIds.size === 1 || distinctOwners.size > 1) {
            line.setAttribute("class", "country-border");
        } else {
            line.setAttribute("class", "internal-boundary");
        }
        boundariesLayerEl.appendChild(line);
    }

    // Dev tool ------------------------------------------------------------------------------------------
    /*const vertexLabelsLayerEl = document.getElementById("vertexLabelsLayer");
    if (vertexLabelsLayerEl) {
    vertexLabelsLayerEl.innerHTML = "";
    for (const [vertexId, [vx, vy]] of Object.entries(regionVertices)) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", `${vx}`);
        text.setAttribute("y", `${vy}`);
        text.setAttribute("class", "vertex-label");
        text.textContent = vertexId;
        vertexLabelsLayerEl.appendChild(text);
    }
    }*/
    // End of Dev tool ------------------------------------------------------------------------------------------

    for (const region of regions) {


        if (!regionShapes[region.id] || regionShapes[region.id].length < 3) continue;
        const btn = document.createElement("button");
        btn.className = "region-btn";
        if (region.capital) btn.classList.add("capital");
        if (selectedRegionId === region.id) btn.classList.add("selected");
        btn.style.background = getCountry(region.owner).color;
        const center = polygonCentroid(regionShapes[region.id]);
        const safeCenter = findSafePointInsideRegion(regionShapes[region.id], center.x, center.y);
        btn.style.left = `${safeCenter.x}px`;
        btn.style.top = `${safeCenter.y}px`;
        btn.textContent = region.army;
        btn.title = `${region.id} (${getCountry(region.owner).name})`;
        btn.setAttribute("data-region-id", region.id);
        btn.addEventListener("click", () => onRegionClick(region.id));
        mapEl.appendChild(btn);

        if (region.capital) {
            const offsets = [
                [34, -22],
                [-34, -22],
                [34, 22],
                [-34, 22],
                [0, -38],
                [0, 38]
            ];
            let sx = safeCenter.x;
            let sy = safeCenter.y;
            for (const [dx, dy] of offsets) {
                const tx = center.x + dx;
                const ty = center.y + dy;
                if (pointInPolygon(tx, ty, regionShapes[region.id])) {
                    sx = tx;
                    sy = ty;
                    break;
                }
            }
            const safeStar = findSafePointInsideRegion(regionShapes[region.id], sx, sy);
            const star = document.createElement("div");
            star.className = "capital-star";
            star.textContent = "★";
            star.style.left = `${safeStar.x}px`;
            star.style.top = `${safeStar.y}px`;
            mapEl.appendChild(star);
        }

        if (region.factories > 0) {
            const factoryOffsets = [
                [18, -18],
                [-18, -18],
                [18, 18],
                [-18, 18],
                [0, -26],
                [0, 26]
                ];
            let fx = safeCenter.x;
            let fy = safeCenter.y;
            for (const [dx, dy] of factoryOffsets) {
                const tx = center.x + dx;
                const ty = center.y + dy;
                if (pointInPolygon(tx, ty, regionShapes[region.id])) {
                    fx = tx;
                    fy = ty;
                    break;
                }
            }
            const safeFactory = findSafePointInsideRegion(regionShapes[region.id], fx, fy);
            const icon = document.createElement("div");
            icon.className = "factory-icon";
            icon.style.left = `${safeFactory.x}px`;
            icon.style.top = `${safeFactory.y}px`;
            icon.innerHTML = `<div class="factory-gear">⚙</div><div class="factory-count">${region.factories}</div>`;
            mapEl.appendChild(icon);
        }

        // Отображение артиллерии (внутри цикла region of regions)
        if (region.artillery > 0) {
            const artilleryOffsets = [[-20, 18], [20, -18], [-20, -18]];
            let ax = safeCenter.x;
            let ay = safeCenter.y;
            for (const [dx, dy] of artilleryOffsets) {
                const tx = center.x + dx;
                const ty = center.y + dy;
                if (pointInPolygon(tx, ty, regionShapes[region.id])) {
                    ax = tx; ay = ty;
                    break;
                }
            }
            const safeArtillery = findSafePointInsideRegion(regionShapes[region.id], ax, ay);
            const artIcon = document.createElement("div");
            artIcon.className = "artillery-icon";
            artIcon.style.left = `${safeArtillery.x}px`;
            artIcon.style.top = `${safeArtillery.y}px`;
            artIcon.innerHTML = `<span>🏹</span><span class="artillery-count">${region.artillery}</span>`;
            mapEl.appendChild(artIcon);
        }

    }
}

function checkWinner() {
    /*if (activeAlliances && Object.keys(activeAlliances).length) {
    const alive = getAlivePlayers();
    const aliveAllianceIds = new Set(
        [...alive].map((countryId) => getAllianceOf(countryId)).filter(Boolean)
    );
    if (aliveAllianceIds.size === 1) {
        const allianceId = [...aliveAllianceIds][0];
        winner = allianceId;
        addLog(`Union ${allianceId} won! All rival countries have been eliminated.`);
        alert(`Union ${allianceId} won!`);
        return;
    }
    }*/
    if (activeAlliances && Object.keys(activeAlliances).length) {
    const alive = getAlivePlayers();
    
    // ИСКЛЮЧЕНИЕ ДЛЯ ЗОМБИ: Если мы на зомби-карте и зомби еще живы,
    // мы не даем людям победить автоматически.
    if (activeMapId === "zombie_map" && alive.has("zombie")) {
        // Пропускаем проверку победы альянса и идем дальше
    } else {
        const aliveAllianceIds = new Set(
        [...alive].map((countryId) => getAllianceOf(countryId)).filter(Boolean)
        );
        if (aliveAllianceIds.size === 1) {
        const allianceId = [...aliveAllianceIds][0];
        winner = allianceId;
        addLog(`Union ${allianceId} won! All rival countries have been eliminated.`);
        alert(`Union ${allianceId} won!`);
        return;
        }
    }
    }
    const owners = new Set(regions.map((r) => r.owner));
    if (owners.size === 1) {
    winner = [...owners][0];
    addLog(`Victory: ${getCountry(winner).name}! All regions have been captured.`);
    alert(`${getCountry(winner).name} won!`);
    }
}

async function doMove(from, to) {
    if (from.owner !== currentPlayer) return;
    if (!areAllies(from.owner, to.owner)) {
    addLog("You can only move troops to a region in your own country or an ally's country.");
    return;
    }
    if (from.id === to.id) return;
    if (!neighbors[from.id]?.includes(to.id)) {
    addLog("You can only move to an adjacent region.");
    return;
    }
    if (blockedMoveSources.has(from.id)) {
    addLog("You cannot move from this region on this turn (it has already received troops).");
    return;
    }
    if (from.army <= 1) {
    addLog("You cannot move the army: there is only 1 unit in the region.");
    return;
    }
    const maxMove = from.army - 1;
    const m = await showUnitsPrompt("How many units should be moved?", maxMove);
    if (m == null) return;
    if (!Number.isInteger(m) || m < 1 || m > maxMove) {
    addLog("Invalid movement number.");
    return;
    }

    from.army -= m;
    to.army += m;
    blockedMoveSources.add(to.id);
    addLog(`${getCountry(currentPlayer).name}: moving ${m} units from ${from.id} to ${to.id}.`);
}

async function doAttack(from, to) {
    if (!atWar) {
        addLog("Attacks are prohibited: a truce is in effect.");
        return;
    }
    if (from.owner !== currentPlayer || to.owner === currentPlayer) return;
    if (areAllies(from.owner, to.owner)) {
        addLog("You cannot attack an ally's region.");
        return;
    }
    if (!neighbors[from.id]?.includes(to.id)) {
        addLog("An attack can only be launched against an adjacent enemy region.");
        return;
    }
    if (blockedMoveSources.has(from.id)) {
        addLog("You cannot attack from this region this turn (it has already received troops).");
        return;
    }
    if (from.army <= 1) {
        addLog("An attack is not possible: there is only 1 unit in the attacking region.");
        return;
    }
        const maxAttack = from.army - 1;
        const attackUnits = await showUnitsPrompt("How many units should I send into battle?", maxAttack);
        if (attackUnits == null) return;
        if (!Number.isInteger(attackUnits) || attackUnits < 1 || attackUnits > maxAttack) {
        addLog("Invalid number of attacking units.");
        return;
    }

    if (attackUnits > to.army) {
        const defenderArmy = to.army; // Изначальный гарнизон врага
        const survivors = attackUnits - defenderArmy;
        from.army -= attackUnits;

        // Фиксируем потери:
        if (globalCasualties[to.owner]) {
            globalCasualties[to.owner].troops += defenderArmy; // Защитник потерял абсолютно всех солдат
        }
        if (globalCasualties[from.owner]) {
            globalCasualties[from.owner].troops += defenderArmy; // Нападающий потерял ровно столько же, сколько было у защитника
        }

        if (to.factories && to.factories > 0) {
            to.factories -= 1;
            if (globalCasualties[to.owner]) {
                globalCasualties[to.owner].factories += 1; // Фабрика уничтожена у защитника
            }
            addLog(`Infrastructure damaged! Number of factories in the region ${to.id} decreased by 1. Remaining: ${to.factories}`);
        }

        // ЛОГИКА 3: Конвертируем оставшуюся артиллерию региона в пехоту (1 к 1)
        const capturedArtillery = to.artillery || 0;
        to.artillery = 0; // Вся артиллерия в регионе уничтожается/захватывается

        to.owner = currentPlayer;
        // К выжившим штурмующим (survivors) добавляются переплавленные в юнитов пушки
        to.army = survivors + capturedArtillery; 
        
        blockedMoveSources.add(to.id);

        let trophyLog = capturedArtillery > 0 ? ` ${capturedArtillery} enemy artillery converted into your units.` : "";
        addLog(`${getCountry(currentPlayer).name} captures ${to.id}. Sent into battle ${attackUnits}, survived ${survivors}.${trophyLog}`);
        
    } else {
        from.army -= attackUnits;
        to.army -= attackUnits;

        // В случае ничьей или поражения штурма обе стороны теряли ровно по количеству attackUnits
        if (globalCasualties[from.owner]) globalCasualties[from.owner].troops += attackUnits;
        if (globalCasualties[to.owner]) globalCasualties[to.owner].troops += attackUnits;

        addLog(`${getCountry(currentPlayer).name} attacks ${to.id} from ${from.id}: both sides lost ${attackUnits}.`);
    }

}

async function allocatePendingReinforcement(targetRegion) {
    if (!pendingReinforcement) return;
    const remaining = pendingReinforcement.remainingUnits;
    if (!Number.isInteger(remaining) || remaining <= 0) return;
    if (targetRegion.owner !== currentPlayer) return;

    const unitsToPlace = await showUnitsPrompt(
    "How many reinforcement units should be placed here?",
    remaining
    );
    if (unitsToPlace == null) return;

    targetRegion.army += unitsToPlace;
    pendingReinforcement.remainingUnits -= unitsToPlace;

    addLog(`${getCountry(currentPlayer).name}: placed ${unitsToPlace} reinforcement units into ${targetRegion.id}.`);

    if (pendingReinforcement.remainingUnits <= 0) {
    pendingReinforcement = null;
    reinforcementTokenEl.style.display = "none";
    reinforcementTokenEl.classList.remove("dragging");
    reinforcementDrag = false;
    reinforcementPointerId = null;
    } else {
    reinforcementTokenEl.textContent = `+${pendingReinforcement.remainingUnits}`;
    reinforcementTokenEl.style.display = "flex";
    }

    render();
}

async function onRegionClick(id) {
    if (zombieCountRange) zombieCountRange.disabled = true;
    if (winner || isPassPhase) return;

    const clicked = getRegion(id);
    if (pendingReinforcement) {
        if (clicked.owner !== currentPlayer) {
            addLog("Reinforcements can only be deployed to your region.");
            return;
        }
        await allocatePendingReinforcement(clicked);
        return;
    }

    if (pendingDiplomacyAction) {
        if (clicked.owner === currentPlayer) {
            addLog("You cannot make or break an alliance with your own country.");
            return;
        }

        if (pendingDiplomacyAction === "form") {
            formAlliance(currentPlayer, clicked.owner);
            addLog(`${getCountry(currentPlayer).name} formed an alliance with ${getCountry(clicked.owner).name}.`);
        } else if (pendingDiplomacyAction === "break") {
            breakAlliance(currentPlayer, clicked.owner);
            addLog(`${getCountry(currentPlayer).name} broke alliance with ${getCountry(clicked.owner).name}.`);
        }

        pendingDiplomacyAction = null;
        selectedRegionId = null;
        checkWinner();
        render();
        return;
    }

    if (pendingFactoryAction) {
        if (clicked.owner !== currentPlayer) {
            addLog("Factories can only be managed in your own regions.");
            return;
        }

        if (pendingFactoryAction === "build") {
            const completedTurns = turnsCompletedByCountry.get(currentPlayer) || 0;
            if (!factoriesEnabled) {
                addLog("Factories mode is disabled.");
                return;
            }
            if (completedTurns < 1) {
                addLog("You can build factories starting from your 2nd turn.");
                return;
            }
            const maxBuild = Math.min(clicked.army, 10 - (clicked.factories || 0));
            if (maxBuild < 1) {
                addLog("You cannot build more factories in this region.");
                return;
            }
            const toBuild = await showUnitsPrompt("How many factories should be built?", maxBuild);
            if (toBuild == null) return;
            clicked.army -= toBuild;
            clicked.factories = (clicked.factories || 0) + toBuild;
            addLog(`${getCountry(currentPlayer).name} built ${toBuild} factories in ${clicked.id}.`);
        }

        if (pendingFactoryAction === "demolish") {
            if (!factoriesEnabled) {
                addLog("Factories mode is disabled.");
                return;
            }
            const maxDemolish = clicked.factories || 0;
            if (maxDemolish < 1) {
                addLog("There are no factories to demolish in this region.");
                return;
            }
            const toDemolish = await showUnitsPrompt("How many factories should be demolished?", maxDemolish);
            if (toDemolish == null) return;
            clicked.factories = (clicked.factories || 0) - toDemolish;
            clicked.army += toDemolish;
            addLog(`${getCountry(currentPlayer).name} demolished ${toDemolish} factories in ${clicked.id}.`);
        }

        // ИСПРАВЛЕНО: Строки сброса режимов удалены из этого блока!
        // Теперь выбранный регион и режим стройки остаются активными в памяти.
        render();
        return;
    }

        // === НОВЫЙ БЛОК: Бесконечный режим управления артиллерией ===
    if (pendingArtilleryAction) {
        if (clicked.owner !== currentPlayer) {
            addLog("Artillery can only be managed in your own regions.");
            return;
        }

        if (pendingArtilleryAction === "build") {
            const completedTurns = turnsCompletedByCountry.get(currentPlayer) || 0;
            if (completedTurns < 1) {
                addLog("You can build artillery starting from your 2nd turn.");
                return;
            }
            if ((clicked.factories || 0) < 2 || clicked.army < 2) {
                addLog("You need at least 2 factories and 2 infantry units to build artillery.");
                return;
            }
            
            // ИСПРАВЛЕНО: Теперь считаем лимит и по пехоте (по 2 на пушку), и по фабрикам (минус 1 фабрика должна остаться для контроля региона)
            const maxByArmy = Math.floor(clicked.army / 2);
            const maxByFactories = clicked.factories - 1; // Оставляем минимум 1 фабрику в регионе, чтобы не уйти в минус
            const maxArtilleryCanBuild = Math.min(maxByArmy, maxByFactories);

            if (maxArtilleryCanBuild < 1) {
                addLog("Not enough resources! Remember: 1 artillery costs 2 troops AND 1 factory.");
                return;
            }

            const toBuildArt = await showUnitsPrompt("How many artillery units should be built? (Cost: 2 troops + 1 factory each)", maxArtilleryCanBuild);
            if (toBuildArt == null) return;
            
            // Списываем ресурсы за каждую построенную пушку
            clicked.army -= (toBuildArt * 2);      // Снимаем по 2 пехотинца
            clicked.factories -= toBuildArt;       // СНИМАЕМ по 1 фабрике!
            clicked.artillery = (clicked.artillery || 0) + toBuildArt;
            
            addLog(`${getCountry(currentPlayer).name} built ${toBuildArt} artillery in ${clicked.id} (Spent: ${toBuildArt * 2} troops, ${toBuildArt} fac.).`);
        }


        if (pendingArtilleryAction === "scrap") {
            const maxScrap = clicked.artillery || 0;
            if (maxScrap < 1) {
                addLog("There is no artillery to delete in this region.");
                return;
            }
            const toScrapArt = await showUnitsPrompt("How many artillery units should be deleted?", maxScrap);
            if (toScrapArt == null) return;

            clicked.artillery = (clicked.artillery || 0) - toScrapArt;
            clicked.army += toScrapArt; // Удаление пушки возвращает 1 юнита в армию
            addLog(`${getCountry(currentPlayer).name} deleted ${toScrapArt} artillery in ${clicked.id}.`);
        }

        // Мы НЕ сбрасываем selectedRegionId и pendingArtilleryAction! 
        // Регион и режим остаются активными для непрерывных кликов.
        render();
        return;
    }

    if (!selectedRegionId) {
        if (clicked.owner !== currentPlayer) {
            addLog("First, select your country's region.");
            return;
        }
        selectedRegionId = id;
        
        // Динамически разблокируем кнопки действий для выбранного региона
        const completedTurns = turnsCompletedByCountry.get(currentPlayer) || 0;
        
        // Кнопка постройки активна, если это минимум 2-й ход, и в регионе есть 2+ фабрики и 2+ юнита
        buildArtilleryBtn.disabled = (completedTurns < 1) || (clicked.factories < 2) || (clicked.army < 2);
        
        // Кнопка удаления активна, если в регионе есть хотя бы 1 единица артиллерии
        scrapArtilleryBtn.disabled = !clicked.artillery || (clicked.artillery < 1);
        
        render();
        return;
    }

    const selected = getRegion(selectedRegionId);
    if (mode === "move") { 
        await doMove(selected, clicked); 
    } else if (mode === "attack") { 
        await doAttack(selected, clicked); 
    } else if (mode === "artillery") {
        await doArtilleryAttack(selected, clicked);
    }

    selectedRegionId = null;
    checkWinner();
    render();
}


function render() {
    renderStatus();
    renderMap();
}

function showPassOverlay() {
    isPassPhase = true;
    passTitleEl.textContent = "Pass the move";
    passTextEl.textContent = `Now moves: ${getCountry(currentPlayer).name}. Please hand the device to the player from that country.`;
    passOverlayEl.classList.add("show");
}

function hidePassOverlay() {
    // Додайте ці рядки туди, де оновлюється доступність кнопок у вашому коді (наприклад, в renderStatus чи hidePassOverlay)
    buildArtilleryBtn.disabled = isPassPhase || Boolean(pendingReinforcement);
    scrapArtilleryBtn.disabled = isPassPhase || Boolean(pendingReinforcement);

    isPassPhase = false;
    passOverlayEl.classList.remove("show");
    applyReinforcementForCurrentPlayer();
    render();
}

function applyReinforcementForCurrentPlayer() {
    if (!playersWhoFinishedAtLeastOneTurn.has(currentPlayer)) return;
    const owned = regions.filter((r) => r.owner === currentPlayer);
    if (!owned.length) return;

    const normalReinforcements = owned.reduce((sum, region) => sum + (region.capital ? 2 : 1), 0);
    const completedTurns = turnsCompletedByCountry.get(currentPlayer) || 0;

    // Factories produce extra units starting from the player's 2nd turn
    // (after completing at least one full turn).
    const factoryBonusUnits =
    factoriesEnabled && completedTurns >= 1 ? owned.reduce((sum, region) => sum + (region.factories || 0), 0) : 0;

    const total = normalReinforcements + factoryBonusUnits;
    if (total <= 0) return;

    pendingReinforcement = { remainingUnits: total };
    reinforcementTokenEl.textContent = `+${total}`;
    reinforcementTokenEl.style.display = "flex";
    reinforcementTokenEl.style.left = "270px";
    reinforcementTokenEl.style.top = "330px";

    addLog(
    `${getCountry(currentPlayer).name}: distribute +${total} reinforcement units across your regions (you can split them).`
    );
}

async function doArtilleryAttack(from, to) {
    if (!atWar) { addLog("Attacks are prohibited: a truce is in effect."); return; }
    if (from.owner !== currentPlayer || to.owner === currentPlayer) return;
    if (areAllies(from.owner, to.owner)) { addLog("You cannot target an ally."); return; }
    if (!neighbors[from.id]?.includes(to.id)) { addLog("Artillery can only fire at adjacent regions."); return; }
    if (from.artillery < 1) { addLog("No artillery available in this region."); return; }

    if (blockedMoveSources.has(from.id)) {
        addLog("This artillery has already fired or received troops in this turn.");
        return;
    }

    // ЛОГИКА 2: Расчет урона. Базовый рандом 1-40%, но умножается на количество артиллерии в регионе
    const baseRandom = Math.floor(Math.random() * 40) + 1; // 1-40%
    const totalMultiplier = from.artillery; // Сколько пушек стреляет
    
    // Итоговый процент урона (можно ограничить максимум 90%, чтобы не уничтожать всю армию за раз, если пушек много)
    const finalPercent = Math.min(90, baseRandom * totalMultiplier);
    const lostUnits = Math.max(1, Math.floor(to.army * (finalPercent / 100)));
    
    // Защитник теряет юнитов от обстрела
    to.army = Math.max(1, to.army - lostUnits);
    if (globalCasualties[to.owner]) {
        globalCasualties[to.owner].troops += lostUnits; // Записываем потери защищающейся фракции
    }

    let infrastructureLog = "";
    // ЛОГИКА 1: Уничтожение 1 фабрики в атакуемом регионе, если они там есть
    if (to.factories && to.factories > 0) {
        to.factories -= 1;
        if (globalCasualties[to.owner]) {
            globalCasualties[to.owner].factories += 1; // Записываем уничтоженную фабрику владельцу региона
        }
        infrastructureLog = ` Infrastructure damaged! 1 factory destroyed in ${to.id}.`;
    }

    blockedMoveSources.add(from.id); 

    addLog(`💥 Artillery Strike! ${from.artillery} Artillery in ${from.id} fired at ${to.id}. Enemy lost ${lostUnits} units (-${finalPercent}%).${infrastructureLog}`);
}

// === СЛУШАТЕЛИ КНОПОК АРТИЛЛЕРИИ И ФАБРИК (ВЗАИМНЫЙ СБРОС СТРОЙКИ) ===

if (buildFactoryBtn) {
    buildFactoryBtn.addEventListener("click", () => {
        pendingArtilleryAction = null; // Выключаем артиллерию, если она была активна
        if (pendingFactoryAction === "build") {
            pendingFactoryAction = null;
            selectedRegionId = null;
            addLog("Режим строительства фабрик отключен.");
        } else {
            pendingFactoryAction = "build";
            addLog("🔧 Режим строительства включен. Кликайте по регионам.");
        }
        render();
    });
}

if (demolishFactoryBtn) {
    demolishFactoryBtn.addEventListener("click", () => {
        pendingArtilleryAction = null; // Выключаем артиллерию
        if (pendingFactoryAction === "demolish") {
            pendingFactoryAction = null;
            selectedRegionId = null;
            addLog("Режим сноса фабрик отключен.");
        } else {
            pendingFactoryAction = "demolish";
            addLog("🔨 Режим сноса включен. Кликайте по регионам.");
        }
        render();
    });
}

if (buildArtilleryBtn) {
    buildArtilleryBtn.addEventListener("click", () => {
        pendingFactoryAction = null; // Выключаем фабрики, чтобы режимы не конфликтовали
        if (pendingArtilleryAction === "build") {
            pendingArtilleryAction = null; // Повторный клик — выключаем режим
            selectedRegionId = null;
            addLog("Режим постройки артиллерии отключен.");
        } else {
            pendingArtilleryAction = "build"; // Включаем режим
            addLog("🏹 Режим постройки артиллерии включен. Кликайте по регионам.");
        }
        render();
    });
}

if (scrapArtilleryBtn) {
    scrapArtilleryBtn.addEventListener("click", () => {
        pendingFactoryAction = null; // Выключаем фабрики
        if (pendingArtilleryAction === "scrap") {
            pendingArtilleryAction = null; // Повторный клик — выключаем режим
            selectedRegionId = null;
            addLog("Режим удаления артиллерии отключен.");
        } else {
            pendingArtilleryAction = "scrap"; // Включаем режим
            addLog("❌ Режим удаления артиллерии включен. Кликайте по регионам.");
        }
        render();
    });
}


document.getElementById("moveModeBtn").addEventListener("click", () => {
    if (isPassPhase || pendingReinforcement || pendingDiplomacyAction || pendingFactoryAction) return;
    mode = "move";
    selectedRegionId = null;
    addLog("The movement mode has been selected.");
    render();
});

document.getElementById("attackModeBtn").addEventListener("click", () => {
    if (isPassPhase || pendingReinforcement || pendingDiplomacyAction || pendingFactoryAction) return;
    mode = "attack";
    selectedRegionId = null;
    addLog("Attack mode has been selected.");
    render();
});

document.getElementById("truceBtn").addEventListener("click", () => {
    if (isPassPhase || pendingReinforcement || pendingDiplomacyAction || pendingFactoryAction) return;
    atWar = false;
    addLog(`${getCountry(currentPlayer).name} concluded a truce.`);
    render();
});

document.getElementById("warBtn").addEventListener("click", () => {
    if (isPassPhase || pendingReinforcement || pendingDiplomacyAction || pendingFactoryAction) return;
    atWar = true;
    addLog(`${getCountry(currentPlayer).name} declared war.`);
    render();
});

formAllianceBtn.addEventListener("click", () => {
    if (winner || isPassPhase || pendingReinforcement || pendingFactoryAction) return;
    pendingDiplomacyAction = "form";
    pendingFactoryAction = null;
    selectedRegionId = null;
    addLog("Alliance: click a region from another country to form an alliance.");
});

breakAllianceBtn.addEventListener("click", () => {
    if (winner || isPassPhase || pendingReinforcement || pendingFactoryAction) return;
    pendingDiplomacyAction = "break";
    pendingFactoryAction = null;
    selectedRegionId = null;
    addLog("Alliance: click a region from another country to break an alliance.");
});

factoriesToggleBtn.addEventListener("click", () => {
    if (winner || isPassPhase || pendingReinforcement) return;
    if (pendingDiplomacyAction) pendingDiplomacyAction = null;
    if (pendingFactoryAction) pendingFactoryAction = null;

    factoriesEnabled = !factoriesEnabled;
    factoriesToggleBtn.textContent = `Factories: ${factoriesEnabled ? "on" : "off"}`;
    buildFactoryBtn.disabled = !factoriesEnabled;
    demolishFactoryBtn.disabled = !factoriesEnabled;

    if (factoriesEnabled) populateRandomFactoriesOnCurrentMap();
    else clearFactoriesOnCurrentMap();

    addLog(`Factories mode is now ${factoriesEnabled ? "on" : "off"}.`);
    render();
});


document.getElementById("endTurnBtn").addEventListener("click", () => {
    if (winner || isPassPhase || pendingReinforcement || pendingDiplomacyAction || pendingFactoryAction) return;
    selectedRegionId = null;
    playersWhoFinishedAtLeastOneTurn.add(currentPlayer);
    turnsCompletedByCountry.set(
    currentPlayer,
    (turnsCompletedByCountry.get(currentPlayer) || 0) + 1
    );
    switchPlayer();
    if (!getAlivePlayers().has(currentPlayer)) {
    checkWinner();
    render();
    return;
    }
    blockedMoveSources = new Set();
    addLog(`Turn passes to ${getCountry(currentPlayer).name}.`);
    render();
    showPassOverlay();
});

startTurnBtn.addEventListener("click", hidePassOverlay);
reinforcementTokenEl.addEventListener("pointerdown", (event) => {
    if (!pendingReinforcement) return;
    reinforcementDrag = true;
    reinforcementPointerId = event.pointerId;
    reinforcementTokenEl.classList.add("dragging");
    reinforcementTokenEl.setPointerCapture(event.pointerId);
    event.preventDefault();
});
document.addEventListener("pointermove", (event) => {
    if (!reinforcementDrag || !pendingReinforcement) return;
    if (reinforcementPointerId !== null && event.pointerId !== reinforcementPointerId) return;
    placeReinforcementTokenFromClient(event.clientX, event.clientY);
    event.preventDefault();
});
document.addEventListener("pointerup", async (event) => {
    if (!reinforcementDrag || !pendingReinforcement) return;
    if (reinforcementPointerId !== null && event.pointerId !== reinforcementPointerId) return;
    reinforcementDrag = false;
    reinforcementPointerId = null;
    reinforcementTokenEl.classList.remove("dragging");
    const regionId = getRegionIdAtClientPoint(event.clientX, event.clientY);
    if (!regionId) {
    addLog("No region selected: place the reinforcement token onto one of your regions.");
    return;
    }
    const target = getRegion(regionId);
    if (!target || target.owner !== currentPlayer) {
    addLog("Reinforcements can only be deployed to your region.");
    return;
    }
    await allocatePendingReinforcement(target);
});
document.addEventListener("pointercancel", () => {
    if (!reinforcementDrag) return;
    reinforcementDrag = false;
    reinforcementPointerId = null;
    reinforcementTokenEl.classList.remove("dragging");
});
document.getElementById("restartBtn").addEventListener("click", () => loadMap(activeMapId));
document.getElementById("loadMapBtn").addEventListener("click", () => {
    currentZombieBaseMapKey = null;
    const mapId = mapSelectEl.value;
    loadMap(mapId);
});
zoomRangeEl.addEventListener("input", () => {
    const nextScale = Number(zoomRangeEl.value) / 100;
    applyMapScale(nextScale);
});

initMapSelect();
applyMapScale(1);
loadMap(activeMapId);

function makeAiTurn(countryId) {
    const aiEnabled = document.getElementById("aiToggle")?.checked;
    if (!aiEnabled) return;

    // === НАЧАЛО АВТО-РАСПРЕДЕЛЕНИЯ ПОДКРЕПЛЕНИЙ ДЛЯ БОТА ===
    // Если у бота есть нераспределенные войска (желтый кружочек активен)
    if (typeof pendingReinforcement === "object" && pendingReinforcement !== null && pendingReinforcement.count > 0) {
    // Находим все регионы этого бота на карте
    const botRegions = regions.filter(r => r.owner === countryId);
    
    if (botRegions.length > 0) {
        // Ищем стратегически важный регион: прифронтовой (граничит с врагами) или с фабриками
        let targetForReinforce = botRegions.find(r => {
        const rNeighbors = neighbors[r.id] || [];
        return rNeighbors.some(nId => {
            const nReg = regions.find(reg => reg.id === nId);
            return nReg && nReg.owner !== countryId && !areAllies(countryId, nReg.owner);
        });
        });

        // Если прифронтовых нет, берем просто первый попавшийся регион бота
        if (!targetForReinforce) targetForReinforce = botRegions[0];

        // Отдаем все бонусные войска в этот регион
        addLog(`🤖 Бот ${getCountry(countryId).name} направив підкріплення (+${pendingReinforcement.count}) у регіон ${targetForReinforce.id}.`);
        targetForReinforce.army += pendingReinforcement.count;
        
        // Сбрасываем фазу подкреплений в движке игры, чтобы убрать желтый токен
        pendingReinforcement = null;
        if (reinforcementTokenEl) reinforcementTokenEl.style.display = "none";
        render();
    }
    }
    // === КОНЕЦ АВТО-РАСПРЕДЕЛЕНИЯ ===

    const difficulty = document.getElementById("aiDifficulty")?.value || "medium";
    addLog(`${getCountry(countryId).name} is planning the move... [${difficulty}]`);

    // 1. Знаходимо всі регіони цього бота, де є хоча б 2 юніти
    const myRegions = regions.filter(r => r.owner === countryId && r.army > 1);
    if (myRegions.length === 0) {
    setTimeout(nextTurn, 400);
    return;
    }

    let bestAction = null;

    // 2. Скануємо карту для пошуку найкращої цілі для атаки
    for (const fromReg of myRegions) {
    const targetIds = neighbors[fromReg.id] || [];
    
    for (const tId of targetIds) {
        const toReg = regions.find(r => r.id === tId);
        
        if (!toReg || toReg.owner === countryId || areAllies(countryId, toReg.owner)) continue;

        const maxAttackUnits = fromReg.army - 1;
        if (maxAttackUnits < 1) continue;

        let score = 0;

        if (difficulty === "easy") {
        score = Math.random() * 100;
        } 
        else if (difficulty === "medium") {
        if (maxAttackUnits > toReg.army) {
            score = 100 + (maxAttackUnits - toReg.army);
        } else {
            score = maxAttackUnits - toReg.army;
        }
        } 
        else if (difficulty === "hard") {
        if (maxAttackUnits > toReg.army) {
            score = 200 + (maxAttackUnits - toReg.army);
            if (toReg.factories) score += toReg.factories * 70;
            if (toReg.capital) score += 120;
        } else {
            score = -100;
        }
        }

        if (!bestAction || score > bestAction.score) {
        bestAction = { from: fromReg, to: toReg, score: score, units: maxAttackUnits };
        }
    }
    }

    // 3. Виконуємо атаку, якщо знайдено раціональну ціль
    if (bestAction && (difficulty === "easy" || bestAction.score > 0)) {
    const { from, to, units } = bestAction;
    
    addLog(`${getCountry(countryId).name} attacks region ${to.id} from region ${from.id} with ${units} units.`);

    if (units > to.army) {
        const survivors = units - to.army;
        from.army -= units;

        if (to.factories && to.factories > 0) {
        to.factories -= 1;
        addLog(`Infrastructure damaged! Number of factories in ${to.id} decreased by 1.`);
        }

        to.owner = countryId;
        to.army = survivors;
        blockedMoveSources.add(to.id);
        addLog(`Region ${to.id} was conquired! Remaining: ${survivors}.`);
    } else {
        from.army -= units;
        to.army -= units;
        addLog(`Bot was defeated near ${to.id}. Both sides lost ${units} units.`);
    }

    render();
    setTimeout(nextTurn, 1000);
    } else {
    addLog(`${getCountry(countryId).name} decided to hold his position and skip the move.`);
    setTimeout(nextTurn, 500);
    }
}

artilleryAttackModeBtn.addEventListener("click", () => {
    if (isPassPhase || pendingReinforcement) return;
    mode = "artillery";
    selectedRegionId = null;
    addLog("Artillery Strike Mode selected. Select your region with artillery, then target.");
    render();
});



