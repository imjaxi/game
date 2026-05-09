(function() {
    const canvas = document.getElementById('gc');
    const ctx = canvas.getContext('2d');
    const wrap = document.getElementById('canvas-wrap');
    const overlay = document.getElementById('overlay');
    const pauseBtn = document.getElementById('pause-btn');
    const scoreEl = document.getElementById('score-val');
    const missedEl = document.getElementById('missed-val');
    const speedEl = document.getElementById('speed-val');
    const dots = [0,1,2,3,4].map(i => document.getElementById('d'+i));

    // --- CONFIGURARE IMAGINE ---
    const teckelImg = new Image();
    teckelImg.src = 'teckel.png'; 
    // --- CONFIGURARE AUDIO ---
    const wofSound = new Audio('wof.mp3'); // Asigură-te că fișierul se numește exact așa
    let imgLoaded = false;
    teckelImg.onload = () => { imgLoaded = true; };

    let W, H, dpr;
    function resize() {
        const rect = wrap.getBoundingClientRect();
        W = rect.width; H = rect.height;
        dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const BUCKET_W = 78, BUCKET_H = 44;
    let bucketX = 280;
    let score = 0, missed = 0, speedMult = 1.0, lastSpeedAt = 0;
    let objects = [], running = false, paused = false;
    let frameId, spawnTimer = 0, spawnInterval = 100;
    let mouseX = 280;
    const MAX_MISSED = 5;

    function getRelX(e) {
        const rect = wrap.getBoundingClientRect();
        if (e.touches) return e.touches[0].clientX - rect.left;
        return e.clientX - rect.left;
    }

    wrap.addEventListener('mousemove', e => { if (!paused) mouseX = getRelX(e); });
    wrap.addEventListener('touchmove', e => { e.preventDefault(); if (!paused) mouseX = getRelX(e); }, { passive: false });

    function updateDots() { dots.forEach((d, i) => d.classList.toggle('filled', i < missed)); }

    function spawnObject() {
        const size = 25 + Math.random() * 10;
        const isTeckel = Math.random() < 0.35;
        objects.push({
            x: size + Math.random() * (W - size * 2),
            y: -size, 
            size, 
            speed: (1.8 + Math.random()) * speedMult,
            type: isTeckel ? 'teckel' : 'heart',
            color: '#e85d8a'
        });
    }

    function drawHeart(x, y, size, color) {
        ctx.save(); ctx.fillStyle = color; ctx.beginPath();
        const s = size / 14;
        ctx.moveTo(x, y+s*5);
        ctx.bezierCurveTo(x, y+s*2, x-s*6, y-s*2, x-s*9, y+s*2);
        ctx.bezierCurveTo(x-s*12, y+s*6, x-s*9, y+s*10, x, y+s*14);
        ctx.bezierCurveTo(x+s*9, y+s*10, x+s*12, y+s*6, x+s*9, y+s*2);
        ctx.bezierCurveTo(x+s*6, y-s*2, x, y+s*2, x, y+s*5);
        ctx.fill(); ctx.restore();
    }

    function drawTeckel(x, y, size) {
        if (!imgLoaded) {
            // Desenăm un cerc maro dacă imaginea nu s-a încărcat încă (pentru a evita eroarea)
            ctx.fillStyle = '#8B4513';
            ctx.beginPath(); ctx.arc(x, y, size/2, 0, Math.PI*2); ctx.fill();
            return;
        }
        ctx.save();
        ctx.drawImage(teckelImg, x - size, y - size/0.5, size * 3, size);
        ctx.restore();
    }

    function drawBucket(x, y) {
        ctx.save();
        ctx.fillStyle = '#e85d8a';
        // Folosim rect simplu dacă roundRect face probleme
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - BUCKET_W/2, y, BUCKET_W, BUCKET_H, 8);
        else ctx.rect(x - BUCKET_W/2, y, BUCKET_W, BUCKET_H);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🩷', x, y + BUCKET_H/1.5 + 4);
        ctx.restore();
    }

    function gameLoop() {
        if (paused) {
            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)"; // Fundal semitransparent
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "#e85d8a";
            ctx.font = "bold 26px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Te iubesc cel mai mult 🩷", W / 2, H / 2);
            ctx.restore();
            return; // Oprește restul codului când e pauză
        }
        if (!running) return;
        ctx.clearRect(0, 0, W, H);
        const bucketTop = H - BUCKET_H - 20;

        bucketX += (mouseX - bucketX) * 0.2;
        bucketX = Math.max(BUCKET_W/2, Math.min(W - BUCKET_W/2, bucketX));

        if (++spawnTimer > spawnInterval) {
            spawnTimer = 0;
            spawnObject();
        }

        for (let i = objects.length - 1; i >= 0; i--) {
            let o = objects[i];
            o.y += o.speed;

            if (o.type === 'heart') drawHeart(o.x, o.y, o.size, o.color);
            else drawTeckel(o.x, o.y, o.size);

           // Verificare coliziune
            if (o.y + o.size/2 > bucketTop && 
                o.y - o.size/2 < bucketTop + BUCKET_H &&
                o.x > bucketX - BUCKET_W/2 && 
                o.x < bucketX + BUCKET_W/2) {
                
                // --- ADAUGĂ ACEST IF ---
                if (o.type === 'teckel') {
                    wofSound.currentTime = 0; // Resetează sunetul (în caz că prinzi 2 repede)
                    wofSound.play().catch(e => console.log("Sunetul nu a putut fi redat: ", e));
                }
                // -----------------------

                score++;
                scoreEl.textContent = score;
                objects.splice(i, 1);

                if (Math.floor(score / 10) > lastSpeedAt) {
                    lastSpeedAt = Math.floor(score / 10);
                    speedMult += 0.15;
                    speedEl.textContent = speedMult.toFixed(1) + 'x';
                }
                continue;
            }

            if (o.y - o.size > H) {
                missed++;
                missedEl.textContent = missed + ' / ' + MAX_MISSED;
                updateDots();
                objects.splice(i, 1);
                if (missed >= MAX_MISSED) {
                    endGame();
                    return; // Ieșim din loop imediat
                }
            }
        }

        drawBucket(bucketX, bucketTop);
        frameId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
        score = 0; missed = 0; speedMult = 1.0; lastSpeedAt = 0;
        objects = []; running = true; paused = false;
        overlay.style.display = 'none';
        pauseBtn.style.display = 'flex';
        scoreEl.textContent = '0';
        missedEl.textContent = '0 / 5';
        speedEl.textContent = '1.0x';
        updateDots();
        if(frameId) cancelAnimationFrame(frameId);
        gameLoop();
    }

    function endGame() {
        running = false;
        cancelAnimationFrame(frameId);
        const total = score + missed;
        const pct = total > 0 ? Math.round((score / total) * 100) : 0;
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <h2>Mă iubești ${pct}%</h2>
            <p>Ai prins ${score} obiecte!</p>
            <button id="start-btn" onclick="location.reload()">Joacă iar</button>
        `;
    }

    document.getElementById('start-btn').addEventListener('click', startGame);
    pauseBtn.addEventListener('click', () => {
        paused = !paused;
        if (!paused) gameLoop();
    });
})();