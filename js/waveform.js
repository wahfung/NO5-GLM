const WaveformDisplay = (function() {
    const SOURCE_COLOR = '#e74c3c';
    const OBSERVED_COLOR = '#2ecc71';
    const GRID_COLOR = 'rgba(255, 255, 255, 0.1)';
    const AXIS_COLOR = 'rgba(255, 255, 255, 0.3)';
    const TEXT_COLOR = '#95a5a6';
    
    let sourceCanvas = null;
    let observedCanvas = null;
    let sourceCtx = null;
    let observedCtx = null;
    
    let timeOffset = 0;
    let zoomLevel = 1;
    let syncEnabled = true;
    let animationId = null;
    
    let sourceFrequency = 440;
    let observedFrequency = 440;
    let isPlaying = true;
    
    const TARGET_FPS = 60;
    const FRAME_TIME = 1000 / TARGET_FPS;
    let lastFrameTime = 0;
    
    function init() {
        sourceCanvas = document.getElementById('source-waveform');
        observedCanvas = document.getElementById('observed-waveform');
        
        if (!sourceCanvas || !observedCanvas) {
            console.error('Waveform canvases not found');
            return;
        }
        
        sourceCtx = sourceCanvas.getContext('2d');
        observedCtx = observedCanvas.getContext('2d');
        
        resizeCanvases();
        window.addEventListener('resize', debounce(resizeCanvases, 100));
        
        const zoomSlider = document.getElementById('waveform-zoom');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => {
                zoomLevel = parseFloat(e.target.value);
            });
        }
        
        const syncCheckbox = document.getElementById('waveform-sync');
        if (syncCheckbox) {
            syncCheckbox.addEventListener('change', (e) => {
                syncEnabled = e.target.checked;
            });
        }
        
        startAnimation();
    }
    
    function resizeCanvases() {
        const containers = [
            { canvas: sourceCanvas, ctx: sourceCtx },
            { canvas: observedCanvas, ctx: observedCtx }
        ];
        
        containers.forEach(({ canvas, ctx }) => {
            if (!canvas) return;
            
            const rect = canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            
            ctx.scale(dpr, dpr);
        });
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
    
    function startAnimation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        function animate(currentTime) {
            animationId = requestAnimationFrame(animate);
            
            if (!isPlaying) return;
            
            const deltaTime = currentTime - lastFrameTime;
            if (deltaTime < FRAME_TIME) return;
            
            lastFrameTime = currentTime - (deltaTime % FRAME_TIME);
            
            timeOffset += deltaTime * 0.001;
            
            drawWaveforms();
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    function drawWaveforms() {
        drawWaveform(sourceCtx, sourceCanvas, sourceFrequency, SOURCE_COLOR, '原始波形');
        drawWaveform(observedCtx, observedCanvas, observedFrequency, OBSERVED_COLOR, '接收波形');
    }
    
    function drawWaveform(ctx, canvas, frequency, color, label) {
        if (!ctx || !canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        
        ctx.clearRect(0, 0, width, height);
        
        drawGrid(ctx, width, height);
        drawAxes(ctx, width, height);
        
        const cyclesToShow = 4 * zoomLevel;
        const timeWindow = cyclesToShow / Math.max(frequency, 1);
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const amplitude = height * 0.35;
        const centerY = height / 2;
        
        let startTime = syncEnabled ? timeOffset : timeOffset;
        
        for (let x = 0; x <= width; x++) {
            const t = startTime + (x / width) * timeWindow;
            const y = centerY - amplitude * Math.sin(2 * Math.PI * frequency * t);
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        drawFrequencyLabel(ctx, width, height, frequency, color);
        drawTimeAxis(ctx, width, height, timeWindow);
    }
    
    function drawGrid(ctx, width, height) {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;
        
        const gridSpacingX = width / 10;
        const gridSpacingY = height / 6;
        
        for (let x = gridSpacingX; x < width; x += gridSpacingX) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = gridSpacingY; y < height; y += gridSpacingY) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    function drawAxes(ctx, width, height) {
        ctx.strokeStyle = AXIS_COLOR;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(40, height);
        ctx.stroke();
    }
    
    function drawFrequencyLabel(ctx, width, height, frequency, color) {
        ctx.fillStyle = color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(DopplerEffect.formatFrequency(frequency), width - 10, 20);
    }
    
    function drawTimeAxis(ctx, width, height, timeWindow) {
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        const timeMs = timeWindow * 1000;
        const label = timeMs < 1 ? 
            `${(timeMs * 1000).toFixed(1)}μs` : 
            `${timeMs.toFixed(2)}ms`;
        
        ctx.fillText(label, width / 2, height - 5);
        
        ctx.textAlign = 'left';
        ctx.fillText('0', 45, height - 5);
    }
    
    function setFrequencies(source, observed) {
        sourceFrequency = Math.max(20, Math.min(20000, source));
        observedFrequency = Math.max(20, Math.min(20000, observed));
    }
    
    function setPlaying(playing) {
        isPlaying = playing;
    }
    
    function setZoom(zoom) {
        zoomLevel = Math.max(0.5, Math.min(3, zoom));
    }
    
    function reset() {
        timeOffset = 0;
        zoomLevel = 1;
        const zoomSlider = document.getElementById('waveform-zoom');
        if (zoomSlider) {
            zoomSlider.value = 1;
        }
    }
    
    function destroy() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        window.removeEventListener('resize', resizeCanvases);
    }
    
    return {
        init,
        setFrequencies,
        setPlaying,
        setZoom,
        reset,
        destroy
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveformDisplay;
}
