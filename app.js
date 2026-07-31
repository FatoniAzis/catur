/**
 * =========================================================
 * CORE ENGINE MODULE - CATUR PRO ARENA MASTER V3 (FIXED)
 * =========================================================
 */

// REGISTRASI STATE GLOBAL SINKRONISASI GAME
let warnaPreferensiAI = 'acak'; 
let modeLagaPilihan = 'pvp';
let timerInterval = null;
let sisaWaktuPutih = 0; 
let sisaWaktuHitam = 0;
let kontrolWaktuAktif = 'unlimited';
let eloRating = parseInt(localStorage.getItem('catur_pro_elo')) || 1500;

let selected = null; 
let giliran = 'putih'; 
let isPromoting = false; 
let gameOver = false; 
let isAITurn = false; 
let isAnimating = false; 
let targetPromosi = null; 
let lastMoveFromSq = null; 
let lastMoveToSq = null; 
let nomorLangkah = 1; 
let playerColor = 'putih'; 

let hakRokade = { putihRaja: true, putihRatu: true, hitamRaja: true, hitamRatu: true };
let riwayatPosisi = {}; 
let historyStack = []; 
let aiTimeout = null;  

let isDragging = false; 
let dragSourceSq = null; 
let dragGhost = null;
let isReplaying = false; 
let replayStates = []; 
let replayIndex = 0; 
let gameMoveSequence = []; 
let epTarget = null; 

let statsPertandingan = { 
    putih: { blunder: 0, brilliant: 0, bagus: 0, totalAkurasi: 0, jumlahLangkah: 0 }, 
    hitam: { blunder: 0, brilliant: 0, bagus: 0, totalAkurasi: 0, jumlahLangkah: 0 } 
};

// CACHING DOM NODES UNTUK OPTIMALISASI AKSES MEMORI
const papan = document.getElementById("papan-catur"); 
const statusBar = document.getElementById("status-bar");
const openingBar = document.getElementById("opening-bar");
const promoModal = document.getElementById("promo-modal"); 
const promoOptions = document.getElementById("promo-options");
const analisisModal = document.getElementById("analisis-modal");
const daftarRiwayat = document.getElementById("daftar-riwayat");
const hiddenModeInput = document.getElementById('hidden-mode-pilihan');

// DATA REPOSITORI STRATEGIS: TURNAMEN PUZZLES FIDE
const daftarPuzzle = [
    {
        nama: "Taktik 1: Back-Rank Mate (Putih Melangkah)",
        turn: "putih",
        setup: [
            ['♜','','','','','','♚',''], ['♟','♟','♟','','','♟','♟','♟'], ['','','','','','','',''], ['','','','','','','',''],
            ['','','','','','','',''], ['','','','','','','',''], ['♙','♙','♙','','','♙','♙','♙'], ['','','','','♖','','♔','']
        ],
        solusi: ["e1e8"],
        pesanSukses: "🎉 Benar! Benteng ke E8 memanfaatkan kelemahan baris belakang lawan (Back-Rank Mate)!"
    },
    {
        nama: "Taktik 2: Smothered Mate Terjebak (Hitam Melangkah)",
        turn: "hitam",
        setup: [
            ['♖','','','','','','','♔'], ['♙','♙','♙','','','♙','♙','♙'], ['','','','','','','',''], ['','','','','','','',''],
            ['','','','','','','',''], ['','','','♞','','','',''], ['','','','','','','',''], ['','','','','','','','']
        ],
        solusi: ["d3f2"],
        pesanSukses: "🎉 Hebat! Kuda Melompat ke F2 mematikan Raja lawan yang terjebak bidaknya sendiri!"
    },
    {
        nama: "Taktik 3: Queen Fork / Garpu Ratu (Putih Melangkah)",
        turn: "putih",
        setup: [
            ['','','','','','','','♚'], ['','','','','','','','♟'], ['','','','','','','',''], ['','','','♕','','','',''],
            ['','','','','','','',''], ['','','♞','','','','',''], ['','','','','','','',''], ['','','','','♔','','','']
        ],
        solusi: ["d5f7"],
        pesanSukses: "🎉 Brilian! Ratu ke F7 melakukan skak sekaligus menggarpu (fork) Kuda lawan!"
    },
    {
        nama: "Taktik 4: Skakmat Dua Benteng (Hitam Melangkah)",
        turn: "hitam",
        setup: [
            ['♚','♜','','','','♜','',''], ['','','','','','','',''], ['','','','','','','',''], ['','','','','','','',''],
            ['','','','','','','',''], ['','','','','','','',''], ['','','','','','','',''], ['♔','♖','','','','♖','','']
        ],
        solusi: ["a1a2"],
        pesanSukses: "🎉 Akurat! Benteng turun ke A2 mematikan dengan dukungan benteng di F2!"
    },
    {
        nama: "Taktik 5: Serangan Fajar (Putih Melangkah)",
        turn: "putih",
        setup: [
            ['♜','♞','♝','♛','♚','♝','♞','♜'], ['♟','♟','','♟','♟','♟','♟','♟'], ['','','','','♘','','',''], ['','','♟','','','','',''],
            ['','','','','','','',''], ['','','','','','','',''], ['♙','♙','♙','♙','♙','♙','♙','♙'], ['♖','♘','♗','♕','♔','♗','♘','♖']
        ],
        solusi: ["e2e4","e7e5","g1f3"],
        pesanSukses: "🎉 Langkah pembukaan klasik! Anda telah memasuki jalur Ruy Lopez!"
    }
];
let indeksPuzzleAktif = 0;

// TEORI PEMBUKAAN DATABASE RESMI
const databaseTeoriOpening = {
    "e2e4": "King's Pawn Opening (Pembukaan Pion Raja)",
    "e2e4,c7c5": "Pertahanan Sisilia (Sicilian Defense) - Tajam & Agresif",
    "e2e4,c7c5,g1f3": "Pertahanan Sisilia: Variasi Kuda Utama",
    "e2e4,e7e5": "Open Game (Permainan Terbuka Simetris)",
    "e2e4,e7e5,g1f3": "Pembukaan Kuda Raja Terbuka",
    "e2e4,e7e5,g1f3,b8c6": "Pembukaan Terbuka Standard Klasik",
    "e2e4,e7e5,g1f3,b8c6,f1b5": "Ruy Lopez (Pembukaan Spanyol)",
    "d2d4": "Queen's Pawn Game (Pembukaan Pion Menteri)",
    "d2d4,d7d5": "Closed Game (Permainan Tertutup Struktural)",
    "d2d4,d7d5,c2c4": "Gambit Menteri (Queen's Gambit)",
    "e2e4,c7c5,g1f3,d7d6": "Sisilia: Variasi Najdorf (Awal)",
    "e2e4,e7e5,g1f3,b8c6,f1b5,a7a6": "Ruy Lopez: Pertahanan Morphy"
};

const openingBook = {
    "e2e4": ["c7c5", "e7e5", "e7e6"], 
    "e2e4,c7c5": ["g1f3", "b1c3"], 
    "e2e4,e7e5": ["g1f3", "f2f4"], 
    "d2d4": ["d7d5", "g8f6"],
    "e2e4,c7c5,g1f3": ["d7d6", "b8c6"]
};

// PIECE-SQUARE TABLES MATRIX EVALUASI MATEMATIS AI ENGINE
const PST_BIDAK = [
    [0,  0,  0,  0,  0,  0,  0,  0], [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10], [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0], [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5], [0,  0,  0,  0,  0,  0,  0,  0]
];
const PST_KUDA = [
    [-50,-40,-30,-30,-30,-30,-40,-50], [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30], [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30], [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40], [-50,-40,-30,-30,-30,-30,-40,-50]
];
const PST_GAJAH = [
    [-20,-10,-10,-10,-10,-10,-10,-20], [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10], [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10], [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10], [-20,-10,-10,-10,-10,-10,-10,-20]
];
const PST_BENTENG = [
    [0,  0,  0,  5,  5,  0,  0,  0], [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5], [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5], [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5], [0,  0,  0,  5,  5,  0,  0,  0]
];
const PST_RATU = [
    [-20,-10,-10, -5, -5,-10,-10,-20], [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10], [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5], [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10], [-20,-10,-10, -5, -5,-10,-10,-20]
];
const PST_RAJA_MID = [
    [20, 30, 10,  0,  0, 10, 30, 20], [20, 20,  0,  0,  0,  0, 20, 20],
    [-10,-20,-20,-20,-20,-20,-20,-10], [-20,-30,-30,-40,-40,-30,-30,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30], [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30], [-30,-40,-40,-50,-50,-40,-40,-30]
];
const PST_RAJA_END = [
    [-50,-30,-30,-30,-30,-30,-30,-50], [-30,-30,  0,  0,  0,  0,-30,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30], [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30], [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-20,-10,  0,  0,-10,-20,-30], [-50,-40,-30,-20,-20,-30,-40,-50]
];

const PIECE_VALUES = {'♙':100,'♟':-100, '♘':320,'♞':-320, '♗':330,'♝':-330, '♖':500,'♜':-500, '♕':900,'♛':-900, '♔':20000,'♚':-20000};
const susunanAwal = [
    ['♜','♞','♝','♛','♚','♝','♞','♜'], ['♟','♟','♟','♟','♟','♟','♟','♟'], ['','','','','','','',''], ['','','','','','','',''],
    ['','','','','','','',''], ['','','','','','','',''], ['♙','♙','♙','♙','♙','♙','♙','♙'], ['♖','♘','♗','♕','♔','♗','♘','♖']
];

// --- FUNGSI BANTU ENGINE ---
function isWhite(p){ return ['♙','♖','♘','♗','♕','♔'].includes(p); }
function isBlack(p){ return ['♟','♜','♞','♝','♛','♚'].includes(p); }

function ambilSnapshotPapanArray() { 
    const bs = []; 
    for(let r=0; r<8; r++) { 
        bs[r] = []; for(let c=0; c<8; c++) { 
            const bTxt = document.querySelector(`[data-r="${r}"][data-c="${c}"] .bidak-text`); 
            bs[r][c] = bTxt ? bTxt.innerText : ''; 
        } 
    } return bs; 
}

function isPathClearVB(board, r1, c1, r2, c2) { 
    const stepR = Math.sign(r2-r1); const stepC = Math.sign(c2-c1); 
    let r = r1 + stepR; let c = c1 + stepC; 
    while(r !== r2 || c !== c2){ if(board[r][c] !== '') return false; r += stepR; c += stepC; } 
    return true; 
}

function checkValidMoveVB(board, p, r1, c1, r2, c2, curEP) {
    const t = board[r2][c2]; const dr = r2-r1; const dc = c2-c1;
    if(t){ if(isWhite(p) && isWhite(t)) return false; if(isBlack(p) && isBlack(t)) return false; }
    if(p==='♙'){ if(dc===0 && dr===-1 && !t) return true; if(r1===6 && dc===0 && dr===-2 && !t && isPathClearVB(board,r1,c1,r2,c2)) return true; if(Math.abs(dc)===1 && dr===-1 && (t || (curEP && r2===curEP.r && c2===curEP.c))) return true; return false; }
    if(p==='♟'){ if(dc===0 && dr===1 && !t) return true; if(r1===1 && dc===0 && dr===2 && !t && isPathClearVB(board,r1,c1,r2,c2)) return true; if(Math.abs(dc)===1 && dr===1 && (t || (curEP && r2===curEP.r && c2===curEP.c))) return true; return false; }
    if(p==='♖'||p==='♜') return (r1===r2 || c1===c2) ? isPathClearVB(board,r1,c1,r2,c2) : false; 
    if(p==='♗'||p==='♝') return Math.abs(dr)===Math.abs(dc) ? isPathClearVB(board,r1,c1,r2,c2) : false;
    if(p==='♘'||p==='♞') return (Math.abs(dr)===2 && Math.abs(dc)===1) || (Math.abs(dr)===1 && Math.abs(dc)===2); 
    if(p==='♕'||p==='♛') return (r1===r2 || c1===c2 || Math.abs(dr)===Math.abs(dc)) ? isPathClearVB(board,r1,c1,r2,c2) : false;
    if(p==='♔'||p==='♚') return Math.abs(dr)<=1 && Math.abs(dc)<=1; return false;
}

function isSquareAttackedVB(board, rTarget, cTarget, attackerColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && ((attackerColor === 'putih' && isWhite(p)) || (attackerColor === 'hitam' && isBlack(p)))) {
                if (checkValidMoveVB(board, p, r, c, rTarget, cTarget, null)) return true;
            }
        }
    }
    return false;
}

function isKingInCheckVB(board, color) { 
    let kr=-1, kc=-1; const kSym = color==='putih' ? '♔' : '♚'; 
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) if(board[r][c] === kSym) { kr=r; kc=c; break; } 
    if(kr===-1) return false; const enemyColor = color==='putih' ? 'hitam' : 'putih'; 
    return isSquareAttackedVB(board, kr, kc, enemyColor);
}

function getValidMovesVB(board, color, curEP, hakRokadeParam) { 
    const moves = []; 
    for(let r1=0; r1<8; r1++){ 
        for(let c1=0; c1<8; c1++){ 
            const p = board[r1][c1]; 
            if(p && ((color==='putih' && isWhite(p)) || (color==='hitam' && isBlack(p)))) { 
                for(let r2=0; r2<8; r2++){ 
                    for(let c2=0; c2<8; c2++){ 
                        if(r1===r2 && c1===c2) continue; 
                        if(checkValidMoveVB(board, p, r1, c1, r2, c2, curEP)) { 
                            const captured = board[r2][c2]; let isEP = false; 
                            if ((p === '♙' || p === '♟') && c1 !== c2 && captured === '') isEP = true;
                            board[r2][c2] = p; board[r1][c1] = ''; let epCapturedPawn = ''; 
                            if (isEP) { epCapturedPawn = board[r1][c2]; board[r1][c2] = ''; }
                            if(!isKingInCheckVB(board, color)) moves.push({r1, c1, r2, c2, p, captured, isEP}); 
                            board[r1][c1] = p; board[r2][c2] = captured; if (isEP) board[r1][c2] = epCapturedPawn;
                        } 
                    } 
                } 
            } 
        } 
    } 
    let hakRokade = hakRokadeParam || { putihRaja: true, putihRatu: true, hitamRaja: true, hitamRatu: true };
    if (color === 'putih' && !isKingInCheckVB(board, 'putih')) {
        if (hakRokade.putihRaja && board[7][4]==='♔' && board[7][7]==='♖' && board[7][5]==='' && board[7][6]==='') {
            if (!isSquareAttackedVB(board, 7, 5, 'hitam') && !isSquareAttackedVB(board, 7, 6, 'hitam')) moves.push({r1:7, c1:4, r2:7, c2:6, p:'♔', captured:'', isCastling:true});
        }
        if (hakRokade.putihRatu && board[7][4]==='♔' && board[7][0]==='♖' && board[7][1]==='' && board[7][2]==='' && board[7][3]==='') {
            if (!isSquareAttackedVB(board, 7, 3, 'hitam') && !isSquareAttackedVB(board, 7, 2, 'hitam')) moves.push({r1:7, c1:4, r2:7, c2:2, p:'♔', captured:'', isCastling:true});
        }
    }
    if (color === 'hitam' && !isKingInCheckVB(board, 'hitam')) {
        if (hakRokade.hitamRaja && board[0][4]==='♚' && board[0][7]==='♜' && board[0][5]==='' && board[0][6]==='') {
            if (!isSquareAttackedVB(board, 0, 5, 'putih') && !isSquareAttackedVB(board, 0, 6, 'putih')) moves.push({r1:0, c1:4, r2:0, c2:6, p:'♚', captured:'', isCastling:true});
        }
        if (hakRokade.hitamRatu && board[0][4]==='♚' && board[0][0]==='♜' && board[0][1]==='' && board[0][2]==='' && board[0][3]==='') {
            if (!isSquareAttackedVB(board, 0, 3, 'putih') && !isSquareAttackedVB(board, 0, 2, 'putih')) moves.push({r1:0, c1:4, r2:0, c2:2, p:'♚', captured:'', isCastling:true});
        }
    }
    return moves.sort((a, b) => (b.captured !== '' ? Math.abs(PIECE_VALUES[b.captured]) : 0) - (a.captured !== '' ? Math.abs(PIECE_VALUES[a.captured]) : 0)); 
}

// --- EVALUASI STATIS DENGAN PST ---
function evaluateVB(board) { 
    let score = 0; 
    const modeVal = hiddenModeInput.value;
    const pMode = modeVal.startsWith("ai-") ? modeVal.replace("ai-", "") : "normal";
    
    let totalPerwira = 0;
    let mobilitasPutih = 0;
    let mobilitasHitam = 0;

    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(board[r][c] !== '' && board[r][c] !== '♙' && board[r][c] !== '♟' && board[r][c] !== '♔' && board[r][c] !== '♚') {
                totalPerwira++;
            }
        }
    }
    const isEndgame = totalPerwira <= 4;

    for(let r=0; r<8; r++){ 
        for(let c=0; c<8; c++){ 
            const p = board[r][c]; 
            if(p) { 
                let val = PIECE_VALUES[p]; 
                const isW = isWhite(p); 
                
                if (pMode === "aggressive" && (p === '♕' || p === '♛')) val *= 1.2; 
                else if (pMode === "defensive" && (p === '♙' || p === '♟')) val *= 1.25; 
                score += val; 

                let table = PST_BIDAK; 
                let rIdx = isW ? r : (7 - r); 
                if (p === '♙' || p === '♟') table = PST_BIDAK;
                else if (p === '♘' || p === '♞') table = PST_KUDA;
                else if (p === '♗' || p === '♝') table = PST_GAJAH;
                else if (p === '♖' || p === '♜') table = PST_BENTENG;
                else if (p === '♕' || p === '♛') table = PST_RATU;
                else if (p === '♔' || p === '♚') table = isEndgame ? PST_RAJA_END : PST_RAJA_MID;
                
                score += isW ? table[rIdx][c] : -table[rIdx][c];
                
                if (isW) mobilitasPutih += 0.5; else mobilitasHitam += 0.5;
            } 
        } 
    } 
    return score + (mobilitasPutih - mobilitasHitam); 
}

// --- MINIMAX ENGINE DENGAN ALPHA-BETA ---
function minimax(board, depth, alpha, beta, isMaximizing, currentEP, hakRokadeParam) {
    if (depth === 0) return evaluateVB(board); 
    const color = isMaximizing ? 'putih' : 'hitam'; 
    const moves = getValidMovesVB(board, color, currentEP, hakRokadeParam);
    
    if (moves.length === 0) { 
        if (isKingInCheckVB(board, color)) return isMaximizing ? -99999 + depth : 99999 - depth; 
        return 0; 
    }
    
    if (isMaximizing) { 
        let maxEval = -Infinity; 
        for (let move of moves) { 
            let backupRookSq = null;
            let rookTargetCol = null;
            let rookSourceCol = null;

            board[move.r2][move.c2] = move.p; 
            board[move.r1][move.c1] = ''; 
            if(move.p==='♙' && move.r2===0) board[move.r2][move.c2] = '♕'; 
            
            let epCapturedPawn = ''; 
            if (move.isEP) { epCapturedPawn = board[move.r1][move.c2]; board[move.r1][move.c2] = ''; }
            
            if (move.isCastling) {
                rookSourceCol = move.c2 > move.c1 ? 7 : 0;
                rookTargetCol = move.c2 > move.c1 ? 5 : 3;
                backupRookSq = board[move.r1][rookSourceCol];
                board[move.r1][rookTargetCol] = backupRookSq;
                board[move.r1][rookSourceCol] = '';
            }

            let nextEP = (move.p === '♙' && move.r1 === 6 && move.r2 === 4) ? {r: 5, c: move.c1} : null;
            let ev = minimax(board, depth - 1, alpha, beta, false, nextEP, hakRokadeParam); 
            
            board[move.r1][move.c1] = move.p; 
            board[move.r2][move.c2] = move.captured; 
            if (move.isEP) board[move.r1][move.c2] = epCapturedPawn;
            if (move.isCastling) {
                board[move.r1][rookSourceCol] = backupRookSq;
                board[move.r1][rookTargetCol] = '';
            }

            maxEval = Math.max(maxEval, ev); 
            alpha = Math.max(alpha, ev); 
            if (beta <= alpha) break; 
        } 
        return maxEval; 
    } else { 
        let minEval = Infinity; 
        for (let move of moves) { 
            let backupRookSq = null;
            let rookTargetCol = null;
            let rookSourceCol = null;

            board[move.r2][move.c2] = move.p; 
            board[move.r1][move.c1] = ''; 
            if(move.p==='♟' && move.r2===7) board[move.r2][move.c2] = '♛'; 
            
            let epCapturedPawn = ''; 
            if (move.isEP) { epCapturedPawn = board[move.r1][move.c2]; board[move.r1][move.c2] = ''; }
            
            if (move.isCastling) {
                rookSourceCol = move.c2 > move.c1 ? 7 : 0;
                rookTargetCol = move.c2 > move.c1 ? 5 : 3;
                backupRookSq = board[move.r1][rookSourceCol];
                board[move.r1][rookTargetCol] = backupRookSq;
                board[move.r1][rookSourceCol] = '';
            }

            let nextEP = (move.p === '♟' && move.r1 === 1 && move.r2 === 3) ? {r: 2, c: move.c1} : null;
            let ev = minimax(board, depth - 1, alpha, beta, true, nextEP, hakRokadeParam); 
            
            board[move.r1][move.c1] = move.p; 
            board[move.r2][move.c2] = move.captured; 
            if (move.isEP) board[move.r1][move.c2] = epCapturedPawn;
            if (move.isCastling) {
                board[move.r1][rookSourceCol] = backupRookSq;
                board[move.r1][rookTargetCol] = '';
            }

            minEval = Math.min(minEval, ev); 
            beta = Math.min(beta, ev); 
            if (beta <= alpha) break; 
        } 
        return minEval; 
    }
}

// --- FUNGSI UTILITY UNTUK AI ---
function dariAlgebraic(sq) { return { r: 8 - parseInt(sq[1]), c: sq.charCodeAt(0) - 97 }; }

function dapatkanLangkahOpening(board, color, currentEP) {
    let historyKey = gameMoveSequence.join(","); let pilihan = openingBook[historyKey];
    if (pilihan && pilihan.length > 0) {
        let langkahDipilih = pilihan[Math.floor(Math.random() * pilihan.length)];
        let from = dariAlgebraic(langkahDipilih.substring(0, 2)); let to = dariAlgebraic(langkahDipilih.substring(2, 4));
        let validMoves = getValidMovesVB(board, color, currentEP, hakRokade);
        for (let m of validMoves) { if (m.r1 === from.r && m.c1 === from.c && m.r2 === to.r && m.c2 === to.c) return m; }
    }
    return null;
}

function getBestMove(board, color, depth) {
    let moves = getValidMovesVB(board, color, epTarget, hakRokade);
    if (moves.length === 0) return null;
    let bestMove = moves[0];
    let bestVal = color === 'putih' ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    
    for (let m of moves) {
        let backupRookSq = null, rookTargetCol = null, rookSourceCol = null;
        board[m.r2][m.c2] = m.p; board[m.r1][m.c1] = '';
        if (m.isCastling) {
            rookSourceCol = m.c2 > m.c1 ? 7 : 0;
            rookTargetCol = m.c2 > m.c1 ? 5 : 3;
            backupRookSq = board[m.r1][rookSourceCol];
            board[m.r1][rookTargetCol] = backupRookSq;
            board[m.r1][rookSourceCol] = '';
        }
        let epCapturedPawn = '';
        if (m.isEP) { epCapturedPawn = board[m.r1][m.c2]; board[m.r1][m.c2] = ''; }
        let nextEP = (m.p === '♙' && m.r1 === 6 && m.r2 === 4) ? {r: 5, c: m.c1} : (m.p === '♟' && m.r1 === 1 && m.r2 === 3) ? {r: 2, c: m.c1} : null;
        let ev = minimax(board, depth - 1, alpha, beta, color === 'hitam', nextEP, hakRokade);
        board[m.r1][m.c1] = m.p; board[m.r2][m.c2] = m.captured;
        if (m.isEP) board[m.r1][m.c2] = epCapturedPawn;
        if (m.isCastling) {
            board[m.r1][rookSourceCol] = backupRookSq;
            board[m.r1][rookTargetCol] = '';
        }
        if (color === 'putih') {
            if (ev > bestVal) { bestVal = ev; bestMove = m; }
            alpha = Math.max(alpha, ev);
        } else {
            if (ev < bestVal) { bestVal = ev; bestMove = m; }
            beta = Math.min(beta, ev);
        }
    }
    return bestMove;
}

function getNotasi(r, c) { return `${String.fromCharCode(97 + c)}${8 - r}`; }

// SYSTEM UI VIEW INTERFACES CONTROL
function gantiTemaVisual(tema) {
    const root = document.documentElement;
    document.body.className = '';
    document.body.classList.add(`${tema}-theme`);
    
    if (tema === 'cyberpunk') {
        root.style.setProperty('--square-white', '#ebecd0'); root.style.setProperty('--square-black', '#739552');
        root.style.setProperty('--bg-game', '#0b0c10'); root.style.setProperty('--accent-neon', '#00f0ff');
    } else if (tema === 'walnut') {
        root.style.setProperty('--square-white', '#f0d9b5'); root.style.setProperty('--square-black', '#b58863');
        root.style.setProperty('--bg-game', '#2b1d13'); root.style.setProperty('--accent-neon', '#ffd700');
    } else if (tema === 'slate') {
        root.style.setProperty('--square-white', '#e8ebef'); root.style.setProperty('--square-black', '#7d8796');
        root.style.setProperty('--bg-game', '#1e293b'); root.style.setProperty('--accent-neon', '#818cf8');
    }
}

function setPilihanWarna(warna) {
    warnaPreferensiAI = warna;
    document.getElementById('btn-color-putih').style.border = "2px solid transparent";
    document.getElementById('btn-color-hitam').style.border = "2px solid transparent";
    document.getElementById('btn-color-acak').style.border = "2px solid transparent";
    document.getElementById('btn-color-' + warna).style.border = "2px solid var(--accent-neon)";
}

function bukaModalGame(mode) { 
    modeLagaPilihan = mode;
    if (mode === 'puzzle') {
        hiddenModeInput.value = 'puzzle';
        indeksPuzzleAktif = Math.floor(Math.random() * daftarPuzzle.length);
        masukKeLayarGame(); return;
    }
    document.getElementById('ai-setup-modal').style.display = 'flex'; 
    const isPvP = mode === 'pvp';
    document.getElementById('modal-title').innerText = isPvP ? "👥 TANDING 2 PEMAIN" : "🤖 TANDING LAWAN AI";
    document.getElementById('section-ai-difficulty').style.display = isPvP ? 'none' : 'block';
    document.getElementById('section-color-selection').style.display = isPvP ? 'none' : 'block';
}
function tutupModalGame() { document.getElementById('ai-setup-modal').style.display = 'none'; }

function konfirmasiMulaiGame() {
    tutupModalGame();
    kontrolWaktuAktif = document.getElementById('modal-time-control').value;
    hiddenModeInput.value = (modeLagaPilihan === 'ai') ? document.getElementById('modal-ai-level').value : 'pvp';
    masukKeLayarGame();
}

function masukKeLayarGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';
    resetGame();
}

function kembaliKeMenu() {
    if(!gameOver && historyStack.length > 0 && hiddenModeInput.value !== 'puzzle' && confirm("Laga sedang berlangsung. Progress Anda akan hilang. Keluar?")) { 
        tutupGameKeMenu(); 
    } else if(gameOver || historyStack.length === 0 || hiddenModeInput.value === 'puzzle') {
        tutupGameKeMenu();
    }
}
function tutupGameKeMenu() {
    clearInterval(timerInterval);
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('profile-elo').innerText = `🏆 ELO: ${eloRating}`;
}

function hitungPerubahanElo(isWin) {
    const mode = hiddenModeInput.value;
    if (mode === 'pvp' || mode === 'puzzle') return;
    let K = 32; let targetElo = 1300; 
    if (mode === 'ai-sedang') targetElo = 1450;
    if (mode === 'ai-normal' || mode === 'ai-aggressive' || mode === 'ai-defensive') targetElo = 1600;
    if (mode === 'ai-ekstra') targetElo = 1800;
    let expectedScore = 1 / (1 + Math.pow(10, (targetElo - eloRating) / 400));
    eloRating = Math.round(eloRating + K * ((isWin ? 1 : 0) - expectedScore));
    localStorage.setItem('catur_pro_elo', eloRating);
}

function updateDetektorPembukaan() {
    let key = gameMoveSequence.join(",");
    if (databaseTeoriOpening[key]) { openingBar.innerText = "Teori: " + databaseTeoriOpening[key]; } 
    else {
        let matchedText = "Jalur Kompetisi (Custom Line)";
        for (let i = gameMoveSequence.length - 1; i > 0; i--) {
            let subKey = gameMoveSequence.slice(0, i).join(",");
            if (databaseTeoriOpening[subKey]) { matchedText = databaseTeoriOpening[subKey] + " (Deviasi)"; break; }
        }
        if(gameMoveSequence.length === 0) matchedText = "Posisi Awal Turnamen";
        openingBar.innerText = matchedText;
    }
}

// MANAGEMENT ENGINE CLOCK TIMERS
function inisialisasiWaktuLaga() {
    clearInterval(timerInterval);
    const boxP = document.getElementById('timer-putih'); const boxH = document.getElementById('timer-hitam');
    if (kontrolWaktuAktif === 'unlimited' || hiddenModeInput.value === 'puzzle') {
        boxP.innerText = "PUTIH: ∞"; boxH.innerText = "HITAM: ∞"; return;
    }
    let durasiMenit = 5;
    if (kontrolWaktuAktif === 'bullet-1') durasiMenit = 1;
    else if (kontrolWaktuAktif === 'blitz-3') durasiMenit = 3;
    else if (kontrolWaktuAktif === 'blitz-5') durasiMenit = 5;
    else if (kontrolWaktuAktif === 'rapid-10') durasiMenit = 10;

    sisaWaktuPutih = durasiMenit * 60 * 1000; sisaWaktuHitam = durasiMenit * 60 * 1000;
    updateDisplayJamCatur();

    timerInterval = setInterval(() => {
        if (gameOver || isReplaying || isPromoting) return;
        if (giliran === 'putih') { sisaWaktuPutih -= 100; if (sisaWaktuPutih <= 0) pemicuKalahWaktu('putih'); } 
        else { sisaWaktuHitam -= 100; if (sisaWaktuHitam <= 0) pemicuKalahWaktu('hitam'); }
        updateDisplayJamCatur();
    }, 100);
}

function updateDisplayJamCatur() {
    if (kontrolWaktuAktif === 'unlimited' || hiddenModeInput.value === 'puzzle') return;
    const formatWaktu = (ms) => {
        let totalDetik = Math.ceil(Math.max(0, ms) / 1000);
        return `${Math.floor(totalDetik / 60).toString().padStart(2, '0')}:${(totalDetik % 60).toString().padStart(2, '0')}`;
    };
    const boxP = document.getElementById('timer-putih'); const boxH = document.getElementById('timer-hitam');
    boxP.innerText = `PUTIH: ${formatWaktu(sisaWaktuPutih)}`; boxH.innerText = `HITAM: ${formatWaktu(sisaWaktuHitam)}`;
    boxP.classList.toggle('timer-aktif', giliran === 'putih'); boxH.classList.toggle('timer-aktif', giliran === 'hitam');
    boxP.classList.toggle('timer-kritis', sisaWaktuPutih < 30000); boxH.classList.toggle('timer-kritis', sisaWaktuHitam < 30000);
}

function pemicuKalahWaktu(kalahPihak) {
    gameOver = true; clearInterval(timerInterval);
    let menangPihak = kalahPihak === 'putih' ? 'HITAM' : 'PUTIH'; playSound('win');
    statusBar.innerHTML = `⏳ TIMEOUT: ${menangPihak} MENANG SECARA WAKTU!`;
    if (hiddenModeInput.value.startsWith('ai')) hitungPerubahanElo(playerColor === menangPihak.toLowerCase());
    setTimeout(tampilkanAnalisis, 1500);
}

// MANAGEMENT AUDIO SYNTHESIZER API
let isMusicPlaying = false; const bgAudio = document.getElementById("bg-audio"); const btnMusikGame = document.getElementById("btn-musik-game");
bgAudio.volume = 0.15; 
function toggleMusik() {
    if (isMusicPlaying) { bgAudio.pause(); btnMusikGame.innerText = "🎵 MUSIK: OFF"; btnMusikGame.classList.remove("btn-musik-on"); } 
    else { bgAudio.play().catch(e => console.log(e)); btnMusikGame.innerText = "🎵 MUSIK: ON"; btnMusikGame.classList.add("btn-musik-on"); }
    isMusicPlaying = !isMusicPlaying;
}

function playSound(type) {
    const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return;
    const ctx = new AudioContext(); const mainGain = ctx.createGain(); mainGain.connect(ctx.destination); const now = ctx.currentTime;
    if (type === 'move' || type === 'capture') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'triangle';
        osc.frequency.setValueAtTime(type === 'move' ? 140 : 160, now); osc.frequency.exponentialRampToValueAtTime(type === 'move' ? 90 : 40, now + 0.05);
        gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain); gain.connect(mainGain); osc.start(now); osc.stop(now + 0.06);
    } else if (type === 'check') {
        [330, 392].forEach(f => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(f, now);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain); gain.connect(mainGain); osc.start(now); osc.stop(now + 0.22);
        });
    } else if (type === 'error') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, now);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain); gain.connect(mainGain); osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'win') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(523, now);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain); gain.connect(mainGain); osc.start(now); osc.stop(now + 0.65);
    }
}

function updateEvalBar() {
    if (hiddenModeInput.value === 'puzzle') {
        document.getElementById('eval-value').innerText = "🧩"; 
        document.getElementById('eval-bar').style.height = "50%"; 
        return;
    }
    let rawScore = evaluateVB(ambilSnapshotPapanArray());
    let displayScore = (Math.abs(rawScore) / 100).toFixed(1);
    let evalTextStr = rawScore >= 0 ? "+" + displayScore : "-" + displayScore;
    
    if (!hasValidMoves('hitam') && isKingInCheck('hitam')) { evalTextStr = "+M"; rawScore = 99999; }
    else if (!hasValidMoves('putih') && isKingInCheck('putih')) { evalTextStr = "-M"; rawScore = -99999; }
    
    document.getElementById('eval-value').innerText = evalTextStr;
    let percent = Math.min(96, Math.max(4, 50 + (rawScore / 30)));
    if (rawScore >= 90000) percent = 100; 
    if (rawScore <= -90000) percent = 0;  
    
    const evalBar = document.getElementById('eval-bar');
    if (window.innerWidth <= 830) {
        evalBar.style.width = percent + "%";
        evalBar.style.height = "100%";
    } else {
        evalBar.style.height = percent + "%";
        evalBar.style.width = "100%";
    }
}

// FUNGSI LEGACY UNTUK KOMPATIBILITAS UI
function isPathClear(r1,c1,r2,c2){ const stepR = Math.sign(r2-r1); const stepC = Math.sign(c2-c1); let r = r1 + stepR; let c = c1 + stepC; while(r !== r2 || c !== c2){ if(document.querySelector(`[data-r="${r}"][data-c="${c}"]`).querySelector('.bidak-text')) return false; r += stepR; c += stepC; } return true; }

function validMove(from,to){ 
    const pEl = from.querySelector('.bidak-text'); if(!pEl) return false; const p = pEl.innerText;
    const tEl = to.querySelector('.bidak-text'); const t = tEl ? tEl.innerText : '';
    const r1 = +from.dataset.r; const c1 = +from.dataset.c; const r2 = +to.dataset.r; const c2 = +to.dataset.c; const dr = r2-r1; const dc = c2-c1; 
    if(t){ if(isWhite(p)&&isWhite(t)) return false; if(isBlack(p)&&isBlack(t)) return false; } 
    if(p==='♙'){ if(dc===0 && dr===-1 && !t) return true; if(r1===6 && dc===0 && dr===-2 && !t && isPathClear(r1,c1,r2,c2)) return true; if(Math.abs(dc)===1 && dr===-1 && (t || (epTarget && r2===epTarget.r && c2===epTarget.c))) return true; return false; } 
    if(p==='♟'){ if(dc===0 && dr===1 && !t) return true; if(r1===1 && dc===0 && dr===2 && !t && isPathClear(r1,c1,r2,c2)) return true; if(Math.abs(dc)===1 && dr===1 && (t || (epTarget && r2===epTarget.r && c2===epTarget.c))) return true; return false; } 
    if(p==='♖'||p==='♜') return (r1===r2 || c1===c2) ? isPathClear(r1,c1,r2,c2) : false; if(p==='♗'||p==='♝') return Math.abs(dr)===Math.abs(dc) ? isPathClear(r1,c1,r2,c2) : false; if(p==='♘'||p==='♞') return (Math.abs(dr)===2 && Math.abs(dc)===1) || (Math.abs(dr)===1 && Math.abs(dc)===2); if(p==='♕'||p==='♛') return (r1===r2 || c1===c2 || Math.abs(dr)===Math.abs(dc)) ? isPathClear(r1,c1,r2,c2) : false; 
    if(p==='♔'||p==='♚'){ 
        if(Math.abs(dr)<=1 && Math.abs(dc)<=1) return true; 
        let isW = p === '♔'; let isK = dc === 2; let rIdx = isW ? 7 : 0;
        if(dr === 0 && r1 === rIdx && c1 === 4 && !isKingInCheck(isW ? 'putih' : 'hitam')) {
            let virtualB = ambilSnapshotPapanArray();
            if(isK && (isW ? hakRokade.putihRaja : hakRokade.hitamRaja) && isPathClear(rIdx,4,rIdx,7)) { if(!isSquareAttackedVB(virtualB, rIdx, 5, isW?'hitam':'putih') && !isSquareAttackedVB(virtualB, rIdx, 6, isW?'hitam':'putih')) return true; }
            if(!isK && dc === -2 && (isW ? hakRokade.putihRatu : hakRokade.hitamRatu) && isPathClear(rIdx,4,rIdx,0)) { if(!isSquareAttackedVB(virtualB, rIdx, 3, isW?'hitam':'putih') && !isSquareAttackedVB(virtualB, rIdx, 2, isW?'hitam':'putih')) return true; }
        }
    }
    return false; 
}

function isSquareAttacked(targetSq, attackerColor) { 
    const board = ambilSnapshotPapanArray();
    const r = +targetSq.dataset.r; const c = +targetSq.dataset.c;
    return isSquareAttackedVB(board, r, c, attackerColor);
}
function isKingInCheck(color) { 
    const board = ambilSnapshotPapanArray();
    return isKingInCheckVB(board, color);
}
function isSafeMove(from, to, color) { 
    const board = ambilSnapshotPapanArray();
    const r1 = +from.dataset.r; const c1 = +from.dataset.c;
    const r2 = +to.dataset.r; const c2 = +to.dataset.c;
    let p = board[r1][c1];
    if (!p) return false;
    let captured = board[r2][c2];
    let isEP = (p === '♙' || p === '♟') && c1 !== c2 && captured === '';
    board[r2][c2] = p;
    board[r1][c1] = '';
    let epPawn = '';
    if (isEP) { epPawn = board[r1][c2]; board[r1][c2] = ''; }
    let safe = !isKingInCheckVB(board, color);
    board[r1][c1] = p;
    board[r2][c2] = captured;
    if (isEP) board[r1][c2] = epPawn;
    return safe;
}
function hasValidMoves(color) { 
    const board = ambilSnapshotPapanArray();
    const moves = getValidMovesVB(board, color, epTarget, hakRokade);
    return moves.length > 0;
}
function updateHighlightCheck(color, inCheck) { 
    document.querySelectorAll('.in-check').forEach(sq => sq.classList.remove('in-check')); 
    if (inCheck) { 
        const kingSymbol = color === 'putih' ? '♔' : '♚'; 
        document.querySelectorAll('.kotak').forEach(sq => { if (sq.querySelector('.bidak-text')?.innerText === kingSymbol) sq.classList.add('in-check'); }); 
    } 
}

function simpanKeMemoriWaktu() { 
    const gameState = {
        board: ambilSnapshotPapanArray(), 
        giliran: giliran, 
        hakRokade: hakRokade, 
        nomorLangkah: nomorLangkah, 
        riwayatHTML: daftarRiwayat.innerHTML, 
        riwayatPosisi: riwayatPosisi, 
        stats: statsPertandingan, 
        moveSeq: gameMoveSequence, 
        epTarget: epTarget, 
        jamP: sisaWaktuPutih, 
        jamH: sisaWaktuHitam,
        mode: hiddenModeInput.value,
        playerColor: playerColor
    };
    
    historyStack.push(JSON.parse(JSON.stringify(gameState))); 
    localStorage.setItem('catur_pro_active_match', JSON.stringify(gameState));
}

function updateStyleStatusBarNormal() {
    if (hiddenModeInput.value === 'puzzle') {
        statusBar.innerText = "🧩 TEKA-TEKI: " + daftarPuzzle[indeksPuzzleAktif].nama; statusBar.style.color = "#0ff"; return;
    }
    statusBar.innerText = "GILIRAN: " + giliran.toUpperCase();
    statusBar.style.color = giliran === 'putih' ? '#ebecd0' : '#00f0ff';
    updateDetektorPembukaan();
}

function undoMove() {
    if (hiddenModeInput.value === 'pvp' || hiddenModeInput.value === 'puzzle') { alert("Fitur Undo dinonaktifkan untuk mode ini."); return; }
    if (isAnimating || historyStack.length === 0) return; if (aiTimeout) clearTimeout(aiTimeout);
    let jumlahPop = (giliran === playerColor && historyStack.length >= 2) ? 2 : 1;
    let masaLalu; for(let i = 0; i < jumlahPop; i++) masaLalu = historyStack.pop();
    for(let r=0; r<8; r++) { 
        for(let c=0; c<8; c++) { 
            const kotak = document.querySelector(`[data-r="${r}"][data-c="${c}"]`); const bTxt = kotak.querySelector('.bidak-text');
            if (masaLalu.board[r][c] === '') { if(bTxt) bTxt.remove(); } 
            else { if(bTxt) bTxt.innerText = masaLalu.board[r][c]; else { const nBidak = document.createElement('span'); nBidak.classList.add('bidak-text'); nBidak.innerText = masaLalu.board[r][c]; kotak.appendChild(nBidak); } }
        } 
    }
    giliran = masaLalu.giliran; hakRokade = masaLalu.hakRokade; nomorLangkah = masaLalu.nomorLangkah; daftarRiwayat.innerHTML = masaLalu.riwayatHTML; riwayatPosisi = masaLalu.riwayatPosisi; statsPertandingan = masaLalu.stats; gameMoveSequence = masaLalu.moveSeq || []; epTarget = masaLalu.epTarget; sisaWaktuPutih = masaLalu.jamP; sisaWaktuHitam = masaLalu.jamH;
    if (selected) selected.classList.remove("terpilih"); selected = null; hapusLangkahValid();
    document.querySelectorAll('.bekas-langkah').forEach(e => e.classList.remove('bekas-langkah'));
    gameOver = false; isAITurn = false; isPromoting = false; promoModal.style.display = "none"; analisisModal.style.display = "none";
    document.querySelector('.chessboard-outer-frame')?.classList.remove('shake-board');
    updateHighlightCheck(giliran, isKingInCheck(giliran)); updateStyleStatusBarNormal(); updateEvalBar(); updateDisplayJamCatur();
}

function tampilkanAnalisis() {
    if (hiddenModeInput.value === 'puzzle') return;
    clearInterval(timerInterval);
    const hitungAkurasi = (pemain) => { let st = statsPertandingan[pemain]; return st.jumlahLangkah === 0 ? 100 : Math.min(100, Math.max(0, Math.round(st.totalAkurasi / st.jumlahLangkah))); };
    document.getElementById("acc-putih").innerText = hitungAkurasi('putih'); document.getElementById("bagus-putih").innerText = statsPertandingan.putih.bagus; document.getElementById("brilliant-putih").innerText = statsPertandingan.putih.brilliant; document.getElementById("blunder-putih").innerText = statsPertandingan.putih.blunder;
    document.getElementById("acc-hitam").innerText = hitungAkurasi('hitam'); document.getElementById("bagus-hitam").innerText = statsPertandingan.hitam.bagus; document.getElementById("brilliant-hitam").innerText = statsPertandingan.hitam.brilliant; document.getElementById("blunder-hitam").innerText = statsPertandingan.hitam.blunder;
    document.querySelector('.analisis-box').style.transform = playerColor === 'hitam' ? "rotate(180deg)" : "rotate(0deg)";
    analisisModal.style.display = "flex";
}
function tutupAnalisis() { analisisModal.style.display = "none"; }

function mulaiReplay() {
    tutupAnalisis(); isReplaying = true;
    document.getElementById('aksi-panel').style.display = 'none'; document.getElementById('replay-panel').style.display = 'flex';
    replayStates = JSON.parse(JSON.stringify(historyStack)); replayStates.push({ board: ambilSnapshotPapanArray(), giliran: giliran, riwayatHTML: daftarRiwayat.innerHTML });
    replayIndex = 0; tampilkanReplayState(replayIndex);
}
function tampilkanReplayState(index) {
    let state = replayStates[index]; 
    for(let r=0; r<8; r++) { 
        for(let c=0; c<8; c++) { 
            const kotak = document.querySelector(`[data-r="${r}"][data-c="${c}"]`); const bTxt = kotak.querySelector('.bidak-text');
            if (state.board[r][c] === '') { if(bTxt) bTxt.remove(); } else { if(bTxt) bTxt.innerText = state.board[r][c]; else { const nBidak = document.createElement('span'); nBidak.classList.add('bidak-text'); nBidak.innerText = state.board[r][c]; kotak.appendChild(nBidak); } }
        } 
    }
    daftarRiwayat.innerHTML = state.riwayatHTML; document.querySelectorAll('.bekas-langkah, .terpilih, .valid-dot, .valid-capture, .in-check').forEach(el => el.classList.remove('bekas-langkah', 'terpilih', 'valid-dot', 'valid-capture', 'in-check'));
    statusBar.innerText = index === 0 ? `POSISI AWAL` : index === replayStates.length - 1 ? `POSISI AKHIR` : `REPLAY: ${index} / ${replayStates.length - 1}`;
}
function replayMaju() { if (replayIndex < replayStates.length - 1) { replayIndex++; tampilkanReplayState(replayIndex); playSound('move'); } }
function replayMundur() { if (replayIndex > 0) { replayIndex--; tampilkanReplayState(replayIndex); playSound('move'); } }
function replayKeAwal() { replayIndex = 0; tampilkanReplayState(replayIndex); playSound('move'); }
function replayKeAkhir() { replayIndex = replayStates.length - 1; tampilkanReplayState(replayIndex); playSound('move'); }
function keluarReplay() { isReplaying = false; document.getElementById('aksi-panel').style.display = 'flex'; document.getElementById('replay-panel').style.display = 'none'; tampilkanReplayState(replayStates.length - 1); updateStyleStatusBarNormal(); tampilkanAnalisis(); }

function menyerah() { 
    gameOver = true; clearInterval(timerInterval); playSound('win'); statusBar.innerHTML = `🏳️ ${giliran.toUpperCase()} MENYERAH!`; 
    if (hiddenModeInput.value.startsWith('ai')) hitungPerubahanElo(giliran !== playerColor);
    setTimeout(tampilkanAnalisis, 1500); 
}
function tawarkanRemis() { if(hiddenModeInput.value === 'pvp') { if(confirm(`Setuju untuk membagi angka / Seri (Remis)?`)) eksekusiRemis("KESEPAKATAN"); } else { alert("🤖 Mesin AI menolak tawaran remis di arena turnamen resmi!"); } }
function eksekusiRemis(alasan) { gameOver = true; clearInterval(timerInterval); statusBar.innerText = `🤝 SERI! (${alasan})`; setTimeout(tampilkanAnalisis, 1500); }
function cekMateriTidakCukup() { let p = []; document.querySelectorAll('.kotak .bidak-text').forEach(b => p.push(b.innerText)); return p.length <= 2; }
function dapatkanSnapshotPosisi() { let snap = ""; document.querySelectorAll('.kotak').forEach(sq => { const b = sq.querySelector('.bidak-text'); snap += b ? b.innerText : "-"; }); return snap + `|${giliran}`; }

function catatRiwayat(bidak, rAsal, cAsal, rTuj, cTuj, isCapture, isCastling) { 
    let teks = isCastling ? (cTuj > cAsal ? `${bidak} O-O` : `${bidak} O-O-O`) : `${bidak} ${getNotasi(rAsal, cAsal)}${isCapture ? '✖' : '➔'}${getNotasi(rTuj, cTuj)}`; 
    if (giliran === 'putih') { const li = document.createElement("li"); li.innerHTML = `<span class="no-langkah">${nomorLangkah}.</span><span class="langkah-putih">${teks}</span>`; daftarRiwayat.appendChild(li); } 
    else { const lastLi = daftarRiwayat.lastElementChild; if (lastLi) lastLi.innerHTML += `<span class="langkah-hitam">${teks}</span>`; nomorLangkah++; } 
    daftarRiwayat.scrollTop = daftarRiwayat.scrollHeight; 
}

function tampilkanLangkahValid(fromSq) { hapusLangkahValid(); document.querySelectorAll('.kotak').forEach(toSq => { if (validMove(fromSq, toSq) && isSafeMove(fromSq, toSq, giliran)) toSq.classList.add(toSq.querySelector('.bidak-text') ? 'valid-capture' : 'valid-dot'); }); }
function hapusLangkahValid() { document.querySelectorAll('.valid-dot, .valid-capture').forEach(sq => sq.classList.remove('valid-dot', 'valid-capture')); }

function animasiGerak(fromSq, toSq, pieceText, isCapture, callback) { 
    const fRect = fromSq.getBoundingClientRect(); const tRect = toSq.getBoundingClientRect(); 
    const ghost = document.createElement('div'); ghost.innerHTML = `<span class="bidak-text">${pieceText}</span>`; ghost.classList.add('ghost-piece'); 
    ghost.style.width = fRect.width + 'px'; ghost.style.height = fRect.height + 'px'; ghost.style.left = fRect.left + 'px'; ghost.style.top = fRect.top + 'px'; 
    document.body.appendChild(ghost); const bTxt = fromSq.querySelector('.bidak-text'); if(bTxt) bTxt.remove(); 
    ghost.getBoundingClientRect(); ghost.style.transform = `translate(${tRect.left - fRect.left}px, ${tRect.top - fRect.top}px)`;
    if(isCapture) { const tBdk = toSq.querySelector('.bidak-text'); if(tBdk) tBdk.remove(); playSound('capture'); toSq.classList.add('flash-capture'); setTimeout(() => toSq.classList.remove('flash-capture'), 250); } else { playSound('move'); }
    setTimeout(() => { ghost.remove(); const checkBdk = toSq.querySelector('.bidak-text'); if(checkBdk) checkBdk.innerText = pieceText; else toSq.innerHTML += `<span class="bidak-text">${pieceText}</span>`; if (callback) callback(); }, 200); 
}

function eksekusiLangkah(from, to) { 
    simpanKeMemoriWaktu(); isAnimating = true; 
    const bidakBergerak = from.querySelector('.bidak-text')?.innerText || ''; const rAsal = +from.dataset.r; const cAsal = +from.dataset.c; const targetRow = +to.dataset.r; const targetCol = +to.dataset.c; 
    let isEP = (bidakBergerak === '♙' || bidakBergerak === '♟') && Math.abs(cAsal - targetCol) === 1 && !to.querySelector('.bidak-text');
    let isCapture = to.querySelector('.bidak-text') !== null || isEP; 
    if (isEP) { const epBdk = document.querySelector(`[data-r="${rAsal}"][data-c="${targetCol}"] .bidak-text`); if(epBdk) epBdk.remove(); }
    
    let isCastling = (bidakBergerak === '♔' || bidakBergerak === '♚') && Math.abs(targetCol - cAsal) === 2; 
    if(bidakBergerak === '♔') { hakRokade.putihRaja = false; hakRokade.putihRatu = false; } if(bidakBergerak === '♚') { hakRokade.hitamRaja = false; hakRokade.hitamRatu = false; }
    if (rAsal === 7 && cAsal === 7) hakRokade.putihRaja = false; if (rAsal === 7 && cAsal === 0) hakRokade.putihRatu = false;
    if (rAsal === 0 && cAsal === 7) hakRokade.hitamRaja = false; if (rAsal === 0 && cAsal === 0) hakRokade.hitamRatu = false;
    
    catatRiwayat(bidakBergerak, rAsal, cAsal, targetRow, targetCol, isCapture, isCastling); 
    
    if (hiddenModeInput.value === 'puzzle') {
        let langkahKey = getNotasi(rAsal, cAsal) + getNotasi(targetRow, targetCol); let puzzleObj = daftarPuzzle[indeksPuzzleAktif];
        if (langkahKey !== puzzleObj.solusi[gameMoveSequence.length]) {
            playSound('error'); statusBar.innerText = "❌ Langkah Salah! Coba cari taktik turnamen yang lebih tajam.";
            setTimeout(undoMove, 800); return;
        }
    }
    epTarget = (bidakBergerak === '♙' && rAsal === 6 && targetRow === 4) ? {r: 5, c: cAsal} : (bidakBergerak === '♟' && rAsal === 1 && targetRow === 3) ? {r: 2, c: cAsal} : null;
    gameMoveSequence.push(getNotasi(rAsal, cAsal) + getNotasi(targetRow, targetCol));
    if (isCastling) { const isKingside = targetCol > cAsal; const rR = targetRow; const rookFromSq = document.querySelector(`[data-r="${rR}"][data-c="${isKingside ? 7 : 0}"]`); const rookToSq = document.querySelector(`[data-r="${rR}"][data-c="${isKingside ? 5 : 3}"]`); animasiGerak(rookFromSq, rookToSq, rookFromSq.querySelector('.bidak-text').innerText, false, null); } 
    animasiGerak(from, to, bidakBergerak, isCapture, () => { 
        if (lastMoveFromSq) lastMoveFromSq.classList.remove('bekas-langkah'); if (lastMoveToSq) lastMoveToSq.classList.remove('bekas-langkah');
        from.classList.add('bekas-langkah'); to.classList.add('bekas-langkah'); lastMoveFromSq = from; lastMoveToSq = to;
        const pPutih = bidakBergerak === '♙' && targetRow === 0; const pHitam = bidakBergerak === '♟' && targetRow === 7; const aiColor = playerColor === 'putih' ? 'hitam' : 'putih'; 
        if (hiddenModeInput.value.startsWith('ai') && giliran === aiColor && (pHitam || pPutih)) { to.querySelector('.bidak-text').innerText = (aiColor === 'putih' ? '♕' : '♛'); isAnimating = false; selesaikanGiliran(); } 
        else if (pPutih || pHitam) { targetPromosi = to; isAnimating = false; tampilkanMenuPromosi(giliran); } 
        else { isAnimating = false; selesaikanGiliran(); } 
    }); 
}

function analisaMove(pemainAktif, isSkakmat) { 
    if (hiddenModeInput.value === 'puzzle') return null; if(historyStack.length < 1) return isSkakmat ? { tipe: 'mate', teks: '#', kelas: 'badge-mate' } : null;
    let evalSebelum = evaluateVB(historyStack[historyStack.length - 1].board); let evalSesudah = evaluateVB(ambilSnapshotPapanArray());
    let delta = pemainAktif === 'putih' ? (evalSesudah - evalSebelum) : (evalSebelum - evalSesudah);
    let hasil = null; let skor = 80;
    if (delta <= -250) { hasil = { tipe: 'blunder', teks: '??', kelas: 'badge-blunder' }; skor = 10; }
    else if (delta >= 150) { hasil = { tipe: 'brilliant', teks: '!!', kelas: 'badge-brilliant' }; skor = 100; }
    else if (delta >= 50) { hasil = { tipe: 'bagus', teks: '!', kelas: 'badge-bagus' }; skor = 90; }
    statsPertandingan[pemainAktif].jumlahLangkah++; statsPertandingan[pemainAktif].totalAkurasi += skor;
    if (hasil) statsPertandingan[pemainAktif][hasil.tipe]++;
    return isSkakmat ? { tipe: 'mate', teks: '#', kelas: 'badge-mate' } : hasil;
}

function selesaikanGiliran() { 
    if (hiddenModeInput.value === 'puzzle' && gameMoveSequence.length === daftarPuzzle[indeksPuzzleAktif].solusi.length) {
        gameOver = true; playSound('win'); statusBar.innerText = daftarPuzzle[indeksPuzzleAktif].pesanSukses; return;
    }
    if (cekMateriTidakCukup()) { eksekusiRemis("MATERI SELESAI"); return; } 
    let pBaruJalan = giliran; giliran = giliran === 'putih' ? 'hitam' : 'putih'; 
    const snap = dapatkanSnapshotPosisi(); riwayatPosisi[snap] = (riwayatPosisi[snap] || 0) + 1; 
    if (riwayatPosisi[snap] >= 3) { eksekusiRemis("REPETISI POSISI (3X)"); return; } 
    const inCheck = isKingInCheck(giliran); const canMove = hasValidMoves(giliran); updateHighlightCheck(giliran, inCheck); 
    if (!canMove && inCheck) playSound('win'); else if (inCheck) playSound('check');
    let analisa = analisaMove(pBaruJalan, !canMove && inCheck); 
    if (analisa) { let el = pBaruJalan === 'putih' ? daftarRiwayat.lastElementChild.querySelector('.langkah-putih') : daftarRiwayat.lastElementChild.querySelector('.langkah-hitam'); if(el) el.innerHTML += `<span class="badge-move ${analisa.kelas}">${analisa.teks}</span>`; } 
    updateEvalBar(); updateDisplayJamCatur();
    if (!canMove) { 
        gameOver = true; clearInterval(timerInterval);
        if (inCheck) { 
            // PERBAIKAN: Menambahkan animasi getar ke outer frame agar rotasi papan Hitam tidak terganggu
            document.querySelector('.chessboard-outer-frame')?.classList.add('shake-board'); 
            statusBar.innerHTML = `🔥 SKAKMAT! ${pBaruJalan.toUpperCase()} MENANG! 🔥`; 
            if (hiddenModeInput.value.startsWith('ai')) hitungPerubahanElo(playerColor === pBaruJalan); 
        } 
        else eksekusiRemis("STALEMATE / PAT"); setTimeout(tampilkanAnalisis, 2000); 
    } else { 
        if (inCheck) statusBar.innerText = `⚠️ SKAK! GILIRAN: ${giliran.toUpperCase()}`; else updateStyleStatusBarNormal(); 
        if (!gameOver && giliran === (playerColor === 'putih' ? 'hitam' : 'putih') && hiddenModeInput.value.startsWith('ai')) { isAITurn = true; jalankanAI(); } else isAITurn = false; 
    } 
}

function eksekusiPromosi(bidak) { const bTxt = targetPromosi.querySelector('.bidak-text'); if(bTxt) bTxt.innerText = bidak; else targetPromosi.innerHTML += `<span class="bidak-text">${bidak}</span>`; promoModal.style.display = "none"; isPromoting = false; targetPromosi = null; selesaikanGiliran(); }
function tampilkanMenuPromosi(warna) { 
    isPromoting = true; promoModal.style.display = "flex"; promoOptions.innerHTML = ""; 
    promoOptions.style.transform = ((hiddenModeInput.value === 'pvp' && warna === 'hitam') || (hiddenModeInput.value !== 'pvp' && playerColor === 'hitam')) ? "rotate(180deg)" : "rotate(0deg)";
    const pilihan = warna === 'putih' ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞']; 
    pilihan.forEach(bidak => { const btn = document.createElement('div'); btn.classList.add('promo-btn'); btn.innerText = bidak; btn.addEventListener('click', () => eksekusiPromosi(bidak)); promoOptions.appendChild(btn); }); 
}

function prosesLangkah(fromSq, toSq) { if(validMove(fromSq, toSq) && isSafeMove(fromSq, toSq, giliran)){ hapusLangkahValid(); eksekusiLangkah(fromSq, toSq); } else { playSound('error'); fromSq.classList.remove("terpilih"); selected=null; hapusLangkahValid(); } }
function onPointerDown(e) { if(isPromoting || gameOver || isAITurn || isAnimating || isReplaying) return; const target = e.currentTarget; const sTxt = target.querySelector('.bidak-text')?.innerText || ''; const isOwn = sTxt !== '' && ((giliran === 'putih' && isWhite(sTxt)) || (giliran === 'hitam' && isBlack(sTxt))); if (isOwn) { dragSourceSq = target; isDragging = true; dragGhost.innerText = sTxt; dragGhost.style.display = 'flex'; positionGhost(e.clientX, e.clientY); target.style.opacity = '0.3'; if (selected) selected.classList.remove("terpilih"); selected = target; selected.classList.add("terpilih"); tampilkanLangkahValid(selected); } else if (selected) { prosesLangkah(selected, target); } }
function onPointerMove(e) { if (!isDragging) return; positionGhost(e.clientX, e.clientY); }
function positionGhost(clientX, clientY) { dragGhost.style.left = (clientX - 22) + 'px'; dragGhost.style.top = (clientY - 22) + 'px'; }
function onPointerUp(e) { if (!isDragging) return; isDragging = false; dragGhost.style.display = 'none'; if (dragSourceSq) dragSourceSq.style.opacity = '1'; let dropTarget = document.elementFromPoint(e.clientX, e.clientY)?.closest('.kotak'); if (dropTarget && dropTarget !== dragSourceSq) prosesLangkah(dragSourceSq, dropTarget); dragSourceSq = null; }

function resetGame() {
    document.querySelectorAll('.kotak').forEach(k => k.remove());
    selected = null; gameOver = false; isAITurn = false; isAnimating = false; isPromoting = false;
    promoModal.style.display = "none"; analisisModal.style.display = "none"; lastMoveFromSq = null; lastMoveToSq = null;
    daftarRiwayat.innerHTML = ''; nomorLangkah = 1; hakRokade = { putihRaja: true, putihRatu: true, hitamRaja: true, hitamRatu: true };
    riwayatPosisi = {}; historyStack = []; gameMoveSequence = []; epTarget = null;
    document.querySelector('.chessboard-outer-frame')?.classList.remove('shake-board'); 
    document.getElementById('replay-panel').style.display = 'none'; 
    
    let modeBermain = hiddenModeInput.value;
    let isPuzzle = modeBermain === 'puzzle';
    let pObj = isPuzzle ? daftarPuzzle[indeksPuzzleAktif] : null;
    
    giliran = isPuzzle ? pObj.turn : 'putih';
    playerColor = isPuzzle ? pObj.turn : (warnaPreferensiAI === 'acak' ? (Math.random() < 0.5 ? 'putih' : 'hitam') : warnaPreferensiAI);
    if(modeBermain === 'pvp') playerColor = 'putih';

    const isFlipped = playerColor === 'hitam';
    papan.style.transform = isFlipped ? "rotate(180deg)" : "rotate(0deg)";
    document.getElementById('aksi-panel').style.display = isPuzzle ? 'none' : 'flex';
    document.getElementById('btn-undo-move').style.display = (isPuzzle || modeBermain==='pvp') ? 'none' : 'inline-block';
    
    for(let r=0; r<8; r++){ 
        for(let c=0; c<8; c++){ 
            const kotak = document.createElement("div"); 
            kotak.classList.add("kotak", (r+c)%2===0 ? "putih" : "hitam"); 
            kotak.dataset.r = r; kotak.dataset.c = c; 
            
            if (isFlipped) {
                kotak.style.transform = "rotate(180deg)";
            }
            
            let pieceSym = isPuzzle ? pObj.setup[r][c] : susunanAwal[r][c];
            if (pieceSym !== '') {
                const bSpn = document.createElement("span"); bSpn.classList.add("bidak-text"); bSpn.innerText = pieceSym; kotak.appendChild(bSpn);
            }
            kotak.addEventListener("pointerdown", onPointerDown); papan.appendChild(kotak); 
        } 
    }
    updateHighlightCheck('putih', false); riwayatPosisi[dapatkanSnapshotPosisi()] = 1;
    updateStyleStatusBarNormal(); updateEvalBar(); inisialisasiWaktuLaga();
    if (modeBermain.startsWith('ai') && playerColor === 'hitam') { isAITurn = true; jalankanAI(); }
}

function jalankanAI() { 
    if(gameOver || isReplaying) return; 
    statusBar.innerText = "🤖 MESIN AI SEDANG BERFIKIR..."; 
    
    aiTimeout = setTimeout(() => { 
        const mode = hiddenModeInput.value; 
        const aiColor = playerColor === 'putih' ? 'hitam' : 'putih'; 
        let vb = ambilSnapshotPapanArray(); 
        let bestMove = dapatkanLangkahOpening(vb, aiColor, epTarget);
        
        if (!bestMove) {
            const moves = getValidMovesVB(vb, aiColor, epTarget, hakRokade); 
            if(moves.length === 0) return;
            
            if (mode === "ai-mudah") { 
                bestMove = moves[Math.floor(Math.random() * moves.length)]; 
            } else { 
                let depth = 2;
                if (mode === 'ai-sedang') depth = 3;
                else if (mode === 'ai-normal' || mode === 'ai-aggressive' || mode === 'ai-defensive') depth = 4;
                else if (mode === 'ai-ekstra') depth = 5;
                bestMove = getBestMove(vb, aiColor, depth);
            }
        } 
        if(bestMove) eksekusiLangkah(document.querySelector(`[data-r="${bestMove.r1}"][data-c="${bestMove.c1}"]`), document.querySelector(`[data-r="${bestMove.r2}"][data-c="${bestMove.c2}"]`)); 
    }, 400); 
}

document.addEventListener("DOMContentLoaded", () => {
    dragGhost = document.getElementById('drag-ghost') || document.createElement('div'); dragGhost.id = 'drag-ghost'; document.body.appendChild(dragGhost);
    document.addEventListener('pointermove', onPointerMove); document.addEventListener('pointerup', onPointerUp);
    document.getElementById('profile-elo').innerText = `🏆 ELO: ${eloRating}`;
});
