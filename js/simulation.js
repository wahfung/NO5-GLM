const Simulation = (function() {
    const SOURCE_COLOR = '#e74c3c';
    const OBSERVER_COLOR = '#3498db';
    const WAVE_COLOR_BASE = 'rgba(52, 152, 219, ';
    const WAVEFRONT_COLOR = 'rgba(46, 204, 113, ';
    
    let canvas = null;
    let ctx = null;
    let animationId = null;
    
    let isPlaying = true;
    let lastTime = 0;
    const TARGET_FPS = 60;
    const FRAME_TIME = 1000 / TARGET_FPS;
    
    let state = {
        source: { x: 0, y: 0, vx: 0, vy: 0 },
        observer: { x: 0, y: 0, vx: 0, vy: 0 },
        sourceFrequency: 440,
        sourceSpeed: 0,
        sourceDirection: 0,
        observerSpeed: 0,
        observerDirection: 0,
        soundSpeed: 340,
        observedFrequency: 440,
        waves: [],
        waveTimer: 0,
        waveInterval: 0
    };
    
    let dragState = {
        isDragging: false,
        dragTarget: null,
        offsetX: 0,
        offsetY: 0
    };
    
    let canvasWidth = 0;
    let canvasHeight = 0;
    let scale = 1;
    
    const MAX_WAVES = 50;
    const WAVE_LIFETIME = 3000;
    
    function init() {
        canvas = document.getElementById('simulation-canvas');
        if (!canvas) {
            console.error('Simulation canvas not found');
            return;
        }
        
        ctx = canvas.getContext('2d');
        resizeCanvas();
        
        window.addEventListener('resize', debounce(resizeCanvas, 100));
        
        setupDragHandlers();
        
        resetPositions();
        
        startAnimation();
    }
    
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        ctx.scale(dpr, dpr);
        
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        
        scale = Math.min(canvasWidth, canvasHeight) / 800;
        
        if (state.source.x === 0 && state.source.y === 0) {
            resetPositions();
        }
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function resetPositions() {
        state.source.x = canvasWidth * 0.3;
        state.source.y = canvasHeight * 0.5;
        state.observer.x = canvasWidth * 0.7;
        state.observer.y = canvasHeight * 0.5;
        state.waves = [];
        state.waveTimer = 0;
    }
    
    function setupDragHandlers() {
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
    }
    
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    function handleMouseDown(e) {
        const coords = getCanvasCoords(e);
        checkDragStart(coords);
    }
    
    function handleMouseMove(e) {
        const coords = getCanvasCoords(e);
        
        if (dragState.isDragging) {
            updateDragPosition(coords);
        } else {
            updateCursor(coords);
        }
    }
    
    function handleMouseUp() {
        endDrag();
    }
    
    function handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const coords = getCanvasCoords(e.touches[0]);
            checkDragStart(coords);
        }
    }
    
    function handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && dragState.isDragging) {
            const coords = getCanvasCoords(e.touches[0]);
            updateDragPosition(coords);
        }
    }
    
    function handleTouchEnd() {
        endDrag();
    }
    
    function checkDragStart(coords) {
        const sourceDist = Math.hypot(coords.x - state.source.x, coords.y - state.source.y);
        const observerDist = Math.hypot(coords.x - state.observer.x, coords.y - state.observer.y);
        
        const hitRadius = 25 * scale;
        
        if (sourceDist < hitRadius) {
            startDrag('source', coords);
        } else if (observerDist < hitRadius) {
            startDrag('observer', coords);
        }
    }
    
    function startDrag(target, coords) {
        dragState.isDragging = true;
        dragState.dragTarget = target;
        
        const targetObj = target === 'source' ? state.source : state.observer;
        dragState.offsetX = coords.x - targetObj.x;
        dragState.offsetY = coords.y - targetObj.y;
        
        canvas.style.cursor = 'grabbing';
    }
    
    function updateDragPosition(coords) {
        if (!dragState.dragTarget) return;
        
        const targetObj = dragState.dragTarget === 'source' ? state.source : state.observer;
        
        targetObj.x = DopplerEffect.clamp(coords.x - dragState.offsetX, 20, canvasWidth - 20);
        targetObj.y = DopplerEffect.clamp(coords.y - dragState.offsetY, 20, canvasHeight - 20);
    }
    
    function endDrag() {
        dragState.isDragging = false;
        dragState.dragTarget = null;
        canvas.style.cursor = 'default';
    }
    
    function updateCursor(coords) {
        const sourceDist = Math.hypot(coords.x - state.source.x, coords.y - state.source.y);
        const observerDist = Math.hypot(coords.x - state.observer.x, coords.y - state.observer.y);
        
        const hitRadius = 25 * scale;
        
        if (sourceDist < hitRadius || observerDist < hitRadius) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'default';
        }
    }
    
    function startAnimation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        function animate(currentTime) {
            animationId = requestAnimationFrame(animate);
            
            const deltaTime = currentTime - lastTime;
            if (deltaTime < FRAME_TIME) return;
            
            lastTime = currentTime - (deltaTime % FRAME_TIME);
            
            if (isPlaying) {
                update(deltaTime);
            }
            
            draw();
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    function update(deltaTime) {
        const dt = deltaTime * 0.001;
        
        updatePositions(dt);
        updateWaves(dt);
        calculateObservedFrequency();
    }
    
    function updatePositions(dt) {
        const sourceRad = DopplerEffect.degToRad(state.sourceDirection);
        const observerRad = DopplerEffect.degToRad(state.observerDirection);
        
        state.source.vx = state.sourceSpeed * Math.cos(sourceRad);
        state.source.vy = state.sourceSpeed * Math.sin(sourceRad);
        state.observer.vx = state.observerSpeed * Math.cos(observerRad);
        state.observer.vy = state.observerSpeed * Math.sin(observerRad);
        
        if (!dragState.isDragging || dragState.dragTarget !== 'source') {
            state.source.x += state.source.vx * dt * scale * 2;
            state.source.y += state.source.vy * dt * scale * 2;
            
            if (state.source.x < 30 || state.source.x > canvasWidth - 30) {
                state.source.vx *= -1;
                state.sourceDirection = DopplerEffect.radToDeg(Math.atan2(state.source.vy, state.source.vx));
            }
            if (state.source.y < 30 || state.source.y > canvasHeight - 30) {
                state.source.vy *= -1;
                state.sourceDirection = DopplerEffect.radToDeg(Math.atan2(state.source.vy, state.source.vx));
            }
            
            state.source.x = DopplerEffect.clamp(state.source.x, 30, canvasWidth - 30);
            state.source.y = DopplerEffect.clamp(state.source.y, 30, canvasHeight - 30);
        }
        
        if (!dragState.isDragging || dragState.dragTarget !== 'observer') {
            state.observer.x += state.observer.vx * dt * scale * 2;
            state.observer.y += state.observer.vy * dt * scale * 2;
            
            if (state.observer.x < 30 || state.observer.x > canvasWidth - 30) {
                state.observer.vx *= -1;
                state.observerDirection = DopplerEffect.radToDeg(Math.atan2(state.observer.vy, state.observer.vx));
            }
            if (state.observer.y < 30 || state.observer.y > canvasHeight - 30) {
                state.observer.vy *= -1;
                state.observerDirection = DopplerEffect.radToDeg(Math.atan2(state.observer.vy, state.observer.vx));
            }
            
            state.observer.x = DopplerEffect.clamp(state.observer.x, 30, canvasWidth - 30);
            state.observer.y = DopplerEffect.clamp(state.observer.y, 30, canvasHeight - 30);
        }
    }
    
    function updateWaves(dt) {
        const period = 1 / state.sourceFrequency;
        state.waveInterval = period * 100;
        
        state.waveTimer += dt;
        
        if (state.waveTimer >= state.waveInterval) {
            state.waveTimer = 0;
            
            if (state.waves.length < MAX_WAVES) {
                state.waves.push({
                    x: state.source.x,
                    y: state.source.y,
                    radius: 0,
                    birth: performance.now(),
                    sourceVx: state.source.vx,
                    sourceVy: state.source.vy
                });
            }
        }
        
        const now = performance.now();
        state.waves = state.waves.filter(wave => {
            wave.radius += state.soundSpeed * dt * scale * 0.5;
            return (now - wave.birth) < WAVE_LIFETIME && wave.radius < Math.max(canvasWidth, canvasHeight);
        });
    }
    
    function calculateObservedFrequency() {
        const dx = state.observer.x - state.source.x;
        const dy = state.observer.y - state.source.y;
        const angle = Math.atan2(dy, dx);
        
        state.observedFrequency = DopplerEffect.calculateObservedFrequency(
            state.sourceFrequency,
            state.soundSpeed,
            state.sourceSpeed,
            state.observerSpeed,
            angle
        );
    }
    
    function draw() {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        drawBackground();
        drawWaves();
        drawSource();
        drawObserver();
        drawConnectionLine();
        drawVelocityVectors();
    }
    
    function drawBackground() {
        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        
        const gridSize = 40 * scale;
        
        for (let x = 0; x < canvasWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }
        
        for (let y = 0; y < canvasHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }
    }
    
    function drawWaves() {
        const now = performance.now();
        
        state.waves.forEach((wave, index) => {
            const age = now - wave.birth;
            const alpha = Math.max(0, 1 - age / WAVE_LIFETIME) * 0.4;
            
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            ctx.strokeStyle = WAVE_COLOR_BASE + alpha + ')';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            if (index === state.waves.length - 1) {
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                ctx.strokeStyle = WAVEFRONT_COLOR + (alpha * 1.5) + ')';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        });
    }
    
    function drawSource() {
        const x = state.source.x;
        const y = state.source.y;
        const radius = 20 * scale;
        
        ctx.beginPath();
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = SOURCE_COLOR;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${12 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', x, y);
    }
    
    function drawObserver() {
        const x = state.observer.x;
        const y = state.observer.y;
        const size = 18 * scale;
        
        ctx.beginPath();
        ctx.arc(x, y, size + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y + size * 0.8);
        ctx.lineTo(x - size, y + size * 0.8);
        ctx.closePath();
        ctx.fillStyle = OBSERVER_COLOR;
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${12 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('O', x, y + size * 0.2);
    }
    
    function drawConnectionLine() {
        const dx = state.observer.x - state.source.x;
        const dy = state.observer.y - state.source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(state.source.x, state.source.y);
        ctx.lineTo(state.observer.x, state.observer.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        
        const midX = (state.source.x + state.observer.x) / 2;
        const midY = (state.source.y + state.observer.y) / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${11 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${(distance / scale).toFixed(0)}m`, midX, midY - 10);
    }
    
    function drawVelocityVectors() {
        const arrowScale = 0.3 * scale;
        
        if (state.sourceSpeed > 0) {
            drawArrow(
                state.source.x, state.source.y,
                state.source.x + state.source.vx * arrowScale,
                state.source.y + state.source.vy * arrowScale,
                SOURCE_COLOR
            );
        }
        
        if (state.observerSpeed > 0) {
            drawArrow(
                state.observer.x, state.observer.y,
                state.observer.x + state.observer.vx * arrowScale,
                state.observer.y + state.observer.vy * arrowScale,
                OBSERVER_COLOR
            );
        }
    }
    
    function drawArrow(fromX, fromY, toX, toY, color) {
        const headLen = 10 * scale;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }
    
    function setParameters(params) {
        if (params.sourceFrequency !== undefined) {
            state.sourceFrequency = DopplerEffect.clamp(params.sourceFrequency, 20, 20000);
        }
        if (params.sourceSpeed !== undefined) {
            state.sourceSpeed = DopplerEffect.clamp(params.sourceSpeed, 0, state.soundSpeed * 0.99);
        }
        if (params.sourceDirection !== undefined) {
            state.sourceDirection = params.sourceDirection % 360;
        }
        if (params.observerSpeed !== undefined) {
            state.observerSpeed = DopplerEffect.clamp(params.observerSpeed, 0, state.soundSpeed * 0.99);
        }
        if (params.observerDirection !== undefined) {
            state.observerDirection = params.observerDirection % 360;
        }
        if (params.soundSpeed !== undefined) {
            state.soundSpeed = DopplerEffect.clamp(params.soundSpeed, 200, 400);
        }
    }
    
    function getParameters() {
        return {
            sourceFrequency: state.sourceFrequency,
            sourceSpeed: state.sourceSpeed,
            sourceDirection: state.sourceDirection,
            observerSpeed: state.observerSpeed,
            observerDirection: state.observerDirection,
            soundSpeed: state.soundSpeed,
            observedFrequency: state.observedFrequency,
            sourcePosition: { x: state.source.x, y: state.source.y },
            observerPosition: { x: state.observer.x, y: state.observer.y }
        };
    }
    
    function setPlaying(playing) {
        isPlaying = playing;
    }
    
    function reset() {
        resetPositions();
        state.sourceFrequency = 440;
        state.sourceSpeed = 0;
        state.sourceDirection = 0;
        state.observerSpeed = 0;
        state.observerDirection = 0;
        state.soundSpeed = 340;
        state.observedFrequency = 440;
    }
    
    function destroy() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        window.removeEventListener('resize', resizeCanvas);
    }
    
    return {
        init,
        setParameters,
        getParameters,
        setPlaying,
        reset,
        destroy
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Simulation;
}
