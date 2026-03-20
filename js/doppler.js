const DopplerEffect = (function() {
    const DEFAULT_SOUND_SPEED = 340;
    const MIN_SPEED = 0;
    const MAX_SPEED_RATIO = 0.99;
    
    function calculateObservedFrequency(sourceFreq, soundSpeed, sourceVelocity, observerVelocity, angle) {
        if (sourceFreq <= 0 || soundSpeed <= 0) {
            return sourceFreq;
        }
        
        const maxSourceSpeed = soundSpeed * MAX_SPEED_RATIO;
        const effectiveSourceSpeed = Math.min(Math.abs(sourceVelocity), maxSourceSpeed);
        
        const radialSourceVelocity = effectiveSourceSpeed * Math.cos(angle);
        const radialObserverVelocity = observerVelocity * Math.cos(angle);
        
        const denominator = soundSpeed - radialSourceVelocity;
        
        if (denominator <= 0) {
            return sourceFreq * 10;
        }
        
        const numerator = soundSpeed + radialObserverVelocity;
        const observedFreq = sourceFreq * (numerator / denominator);
        
        return Math.max(20, Math.min(20000, observedFreq));
    }
    
    function calculateFrequencyChangePercent(sourceFreq, observedFreq) {
        if (sourceFreq === 0) return 0;
        return ((observedFreq - sourceFreq) / sourceFreq) * 100;
    }
    
    function calculateRelativeSpeed(sourceVelocity, sourceDirection, observerVelocity, observerDirection, sourcePos, observerPos) {
        const dx = observerPos.x - sourcePos.x;
        const dy = observerPos.y - sourcePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return 0;
        
        const angleToObserver = Math.atan2(dy, dx);
        
        const sourceRadial = sourceVelocity * Math.cos((sourceDirection * Math.PI / 180) - angleToObserver);
        const observerRadial = observerVelocity * Math.cos((observerDirection * Math.PI / 180) - angleToObserver + Math.PI);
        
        return sourceRadial + observerRadial;
    }
    
    function velocityToColor(velocity, maxVelocity) {
        const ratio = Math.abs(velocity) / maxVelocity;
        const hue = velocity >= 0 ? 
            120 - (ratio * 120) : 
            240 + (ratio * 60);
        return `hsl(${hue}, 70%, 50%)`;
    }
    
    function getDirectionLabel(degrees) {
        const normalized = ((degrees % 360) + 360) % 360;
        const directions = ['东', '东北', '北', '西北', '西', '西南', '南', '东南'];
        const index = Math.round(normalized / 45) % 8;
        return directions[index];
    }
    
    function formatFrequency(freq) {
        if (freq >= 1000) {
            return (freq / 1000).toFixed(2) + ' kHz';
        }
        return freq.toFixed(1) + ' Hz';
    }
    
    function formatVelocity(speed, direction) {
        return `${speed.toFixed(1)} m/s @ ${direction}° (${getDirectionLabel(direction)})`;
    }
    
    function formatPercent(value) {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    }
    
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
    
    function radToDeg(radians) {
        return radians * 180 / Math.PI;
    }
    
    function getAngleBetweenPoints(from, to) {
        return Math.atan2(to.y - from.y, to.x - from.x);
    }
    
    return {
        calculateObservedFrequency,
        calculateFrequencyChangePercent,
        calculateRelativeSpeed,
        velocityToColor,
        getDirectionLabel,
        formatFrequency,
        formatVelocity,
        formatPercent,
        clamp,
        degToRad,
        radToDeg,
        getAngleBetweenPoints,
        DEFAULT_SOUND_SPEED,
        MIN_SPEED,
        MAX_SPEED_RATIO
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DopplerEffect;
}
