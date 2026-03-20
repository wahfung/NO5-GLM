const App = (function() {
    let isPlaying = true;
    let updateInterval = null;
    const UPDATE_INTERVAL_MS = 50;
    
    const presets = {
        approaching: {
            name: '声源接近观察者',
            sourceFrequency: 440,
            sourceSpeed: 30,
            sourceDirection: 0,
            observerSpeed: 0,
            observerDirection: 0,
            soundSpeed: 340
        },
        receding: {
            name: '声源远离观察者',
            sourceFrequency: 440,
            sourceSpeed: 30,
            sourceDirection: 180,
            observerSpeed: 0,
            observerDirection: 0,
            soundSpeed: 340
        },
        'both-moving': {
            name: '两者相向运动',
            sourceFrequency: 500,
            sourceSpeed: 20,
            sourceDirection: 0,
            observerSpeed: 20,
            observerDirection: 180,
            soundSpeed: 340
        },
        ambulance: {
            name: '救护车效应',
            sourceFrequency: 800,
            sourceSpeed: 25,
            sourceDirection: 0,
            observerSpeed: 0,
            observerDirection: 0,
            soundSpeed: 340
        },
        'sonic-boom': {
            name: '超音速演示',
            sourceFrequency: 1000,
            sourceSpeed: 300,
            sourceDirection: 0,
            observerSpeed: 0,
            observerDirection: 0,
            soundSpeed: 340
        }
    };
    
    const controls = {
        sourceFrequency: null,
        sourceFrequencyNum: null,
        sourceSpeed: null,
        sourceSpeedNum: null,
        sourceDirection: null,
        sourceDirectionNum: null,
        observerSpeed: null,
        observerSpeedNum: null,
        observerDirection: null,
        observerDirectionNum: null,
        soundSpeed: null,
        soundSpeedNum: null,
        presetSelector: null
    };
    
    const dataDisplays = {
        sourceFreq: null,
        sourceVelocity: null,
        observerVelocity: null,
        observedFreq: null,
        freqChange: null,
        relativeSpeed: null
    };
    
    const buttons = {
        playPause: null,
        reset: null,
        save: null,
        load: null
    };
    
    const modals = {
        save: null,
        load: null
    };
    
    function init() {
        initControls();
        initDataDisplays();
        initButtons();
        initModals();
        initCollapsiblePanels();
        
        Simulation.init();
        WaveformDisplay.init();
        
        startDataUpdate();
        
        setupEventListeners();
        
        updateAllDisplays();
    }
    
    function initControls() {
        controls.sourceFrequency = document.getElementById('source-frequency');
        controls.sourceFrequencyNum = document.getElementById('source-frequency-num');
        controls.sourceSpeed = document.getElementById('source-speed');
        controls.sourceSpeedNum = document.getElementById('source-speed-num');
        controls.sourceDirection = document.getElementById('source-direction');
        controls.sourceDirectionNum = document.getElementById('source-direction-num');
        controls.observerSpeed = document.getElementById('observer-speed');
        controls.observerSpeedNum = document.getElementById('observer-speed-num');
        controls.observerDirection = document.getElementById('observer-direction');
        controls.observerDirectionNum = document.getElementById('observer-direction-num');
        controls.soundSpeed = document.getElementById('sound-speed');
        controls.soundSpeedNum = document.getElementById('sound-speed-num');
        controls.presetSelector = document.getElementById('preset-selector');
    }
    
    function initDataDisplays() {
        dataDisplays.sourceFreq = document.getElementById('data-source-freq');
        dataDisplays.sourceVelocity = document.getElementById('data-source-velocity');
        dataDisplays.observerVelocity = document.getElementById('data-observer-velocity');
        dataDisplays.observedFreq = document.getElementById('data-observed-freq');
        dataDisplays.freqChange = document.getElementById('data-freq-change');
        dataDisplays.relativeSpeed = document.getElementById('data-relative-speed');
    }
    
    function initButtons() {
        buttons.playPause = document.getElementById('btn-play-pause');
        buttons.reset = document.getElementById('btn-reset');
        buttons.save = document.getElementById('btn-save');
        buttons.load = document.getElementById('btn-load');
    }
    
    function initModals() {
        modals.save = document.getElementById('save-modal');
        modals.load = document.getElementById('load-modal');
    }
    
    function initCollapsiblePanels() {
        const clickableTitles = document.querySelectorAll('.panel-title.clickable');
        clickableTitles.forEach(title => {
            title.addEventListener('click', () => {
                const panel = title.closest('.collapsible');
                panel.classList.toggle('collapsed');
            });
        });
    }
    
    function setupEventListeners() {
        setupSliderSync('source-frequency', 'source-frequency-num', 'sourceFrequency');
        setupSliderSync('source-speed', 'source-speed-num', 'sourceSpeed');
        setupSliderSync('source-direction', 'source-direction-num', 'sourceDirection');
        setupSliderSync('observer-speed', 'observer-speed-num', 'observerSpeed');
        setupSliderSync('observer-direction', 'observer-direction-num', 'observerDirection');
        setupSliderSync('sound-speed', 'sound-speed-num', 'soundSpeed');
        
        if (controls.presetSelector) {
            controls.presetSelector.addEventListener('change', handlePresetChange);
        }
        
        if (buttons.playPause) {
            buttons.playPause.addEventListener('click', togglePlayPause);
        }
        
        if (buttons.reset) {
            buttons.reset.addEventListener('click', handleReset);
        }
        
        if (buttons.save) {
            buttons.save.addEventListener('click', showSaveModal);
        }
        
        if (buttons.load) {
            buttons.load.addEventListener('click', showLoadModal);
        }
        
        setupModalEvents();
    }
    
    function setupSliderSync(sliderId, numberId, paramName) {
        const slider = document.getElementById(sliderId);
        const number = document.getElementById(numberId);
        
        if (!slider || !number) return;
        
        slider.addEventListener('input', () => {
            number.value = slider.value;
            updateParameter(paramName, parseFloat(slider.value));
        });
        
        number.addEventListener('input', () => {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            let value = parseFloat(number.value) || 0;
            value = DopplerEffect.clamp(value, min, max);
            slider.value = value;
            number.value = value;
            updateParameter(paramName, value);
        });
        
        number.addEventListener('blur', () => {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            let value = parseFloat(number.value) || 0;
            value = DopplerEffect.clamp(value, min, max);
            slider.value = value;
            number.value = value;
        });
    }
    
    function updateParameter(name, value) {
        const params = {};
        params[name] = value;
        Simulation.setParameters(params);
        updateAllDisplays();
    }
    
    function handlePresetChange(e) {
        const presetKey = e.target.value;
        if (!presetKey || !presets[presetKey]) return;
        
        const preset = presets[presetKey];
        
        setControlValue('source-frequency', 'source-frequency-num', preset.sourceFrequency);
        setControlValue('source-speed', 'source-speed-num', preset.sourceSpeed);
        setControlValue('source-direction', 'source-direction-num', preset.sourceDirection);
        setControlValue('observer-speed', 'observer-speed-num', preset.observerSpeed);
        setControlValue('observer-direction', 'observer-direction-num', preset.observerDirection);
        setControlValue('sound-speed', 'sound-speed-num', preset.soundSpeed);
        
        Simulation.setParameters({
            sourceFrequency: preset.sourceFrequency,
            sourceSpeed: preset.sourceSpeed,
            sourceDirection: preset.sourceDirection,
            observerSpeed: preset.observerSpeed,
            observerDirection: preset.observerDirection,
            soundSpeed: preset.soundSpeed
        });
        
        updateAllDisplays();
    }
    
    function setControlValue(sliderId, numberId, value) {
        const slider = document.getElementById(sliderId);
        const number = document.getElementById(numberId);
        
        if (slider) slider.value = value;
        if (number) number.value = value;
    }
    
    function togglePlayPause() {
        isPlaying = !isPlaying;
        
        const playIcon = buttons.playPause.querySelector('.icon-play');
        const pauseIcon = buttons.playPause.querySelector('.icon-pause');
        
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline';
        } else {
            playIcon.style.display = 'inline';
            pauseIcon.style.display = 'none';
        }
        
        Simulation.setPlaying(isPlaying);
        WaveformDisplay.setPlaying(isPlaying);
    }
    
    function handleReset() {
        Simulation.reset();
        WaveformDisplay.reset();
        
        setControlValue('source-frequency', 'source-frequency-num', 440);
        setControlValue('source-speed', 'source-speed-num', 0);
        setControlValue('source-direction', 'source-direction-num', 0);
        setControlValue('observer-speed', 'observer-speed-num', 0);
        setControlValue('observer-direction', 'observer-direction-num', 0);
        setControlValue('sound-speed', 'sound-speed-num', 340);
        
        if (controls.presetSelector) {
            controls.presetSelector.value = '';
        }
        
        updateAllDisplays();
    }
    
    function startDataUpdate() {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        
        updateInterval = setInterval(updateAllDisplays, UPDATE_INTERVAL_MS);
    }
    
    function updateAllDisplays() {
        const params = Simulation.getParameters();
        
        if (dataDisplays.sourceFreq) {
            dataDisplays.sourceFreq.textContent = DopplerEffect.formatFrequency(params.sourceFrequency);
        }
        
        if (dataDisplays.sourceVelocity) {
            dataDisplays.sourceVelocity.textContent = DopplerEffect.formatVelocity(
                params.sourceSpeed, 
                params.sourceDirection
            );
        }
        
        if (dataDisplays.observerVelocity) {
            dataDisplays.observerVelocity.textContent = DopplerEffect.formatVelocity(
                params.observerSpeed, 
                params.observerDirection
            );
        }
        
        if (dataDisplays.observedFreq) {
            dataDisplays.observedFreq.textContent = DopplerEffect.formatFrequency(params.observedFrequency);
        }
        
        if (dataDisplays.freqChange) {
            const changePercent = DopplerEffect.calculateFrequencyChangePercent(
                params.sourceFrequency, 
                params.observedFrequency
            );
            dataDisplays.freqChange.textContent = DopplerEffect.formatPercent(changePercent);
            dataDisplays.freqChange.style.color = changePercent > 0 ? '#2ecc71' : changePercent < 0 ? '#e74c3c' : '#ecf0f1';
        }
        
        if (dataDisplays.relativeSpeed) {
            const relativeSpeed = DopplerEffect.calculateRelativeSpeed(
                params.sourceSpeed,
                params.sourceDirection,
                params.observerSpeed,
                params.observerDirection,
                params.sourcePosition,
                params.observerPosition
            );
            dataDisplays.relativeSpeed.textContent = relativeSpeed.toFixed(1) + ' m/s';
        }
        
        WaveformDisplay.setFrequencies(params.sourceFrequency, params.observedFrequency);
    }
    
    function setupModalEvents() {
        const confirmSave = document.getElementById('btn-confirm-save');
        const cancelSave = document.getElementById('btn-cancel-save');
        const confirmLoad = document.getElementById('btn-confirm-load');
        const cancelLoad = document.getElementById('btn-cancel-load');
        
        if (confirmSave) {
            confirmSave.addEventListener('click', saveScene);
        }
        
        if (cancelSave) {
            cancelSave.addEventListener('click', () => hideModal('save'));
        }
        
        if (confirmLoad) {
            confirmLoad.addEventListener('click', loadSelectedScene);
        }
        
        if (cancelLoad) {
            cancelLoad.addEventListener('click', () => hideModal('load'));
        }
        
        modals.save?.addEventListener('click', (e) => {
            if (e.target === modals.save) hideModal('save');
        });
        
        modals.load?.addEventListener('click', (e) => {
            if (e.target === modals.load) hideModal('load');
        });
    }
    
    function showSaveModal() {
        if (!modals.save) return;
        
        modals.save.classList.add('active');
        
        const nameInput = document.getElementById('scene-name');
        if (nameInput) {
            nameInput.value = '';
            nameInput.focus();
        }
        
        updateSavedScenesList('saved-scenes-list');
    }
    
    function showLoadModal() {
        if (!modals.load) return;
        
        modals.load.classList.add('active');
        updateLoadScenesList();
    }
    
    function hideModal(type) {
        if (type === 'save' && modals.save) {
            modals.save.classList.remove('active');
        } else if (type === 'load' && modals.load) {
            modals.load.classList.remove('active');
        }
    }
    
    function getSavedScenes() {
        try {
            const saved = localStorage.getItem('doppler-scenes');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }
    
    function saveScene() {
        const nameInput = document.getElementById('scene-name');
        const name = nameInput?.value.trim();
        
        if (!name) {
            alert('请输入场景名称');
            return;
        }
        
        const params = Simulation.getParameters();
        const sceneData = {
            name: name,
            timestamp: Date.now(),
            params: {
                sourceFrequency: params.sourceFrequency,
                sourceSpeed: params.sourceSpeed,
                sourceDirection: params.sourceDirection,
                observerSpeed: params.observerSpeed,
                observerDirection: params.observerDirection,
                soundSpeed: params.soundSpeed
            }
        };
        
        const savedScenes = getSavedScenes();
        savedScenes[name] = sceneData;
        
        try {
            localStorage.setItem('doppler-scenes', JSON.stringify(savedScenes));
            hideModal('save');
        } catch (e) {
            alert('保存失败，请检查浏览器存储空间');
        }
    }
    
    function updateSavedScenesList(listId) {
        const list = document.getElementById(listId);
        if (!list) return;
        
        const savedScenes = getSavedScenes();
        const scenes = Object.values(savedScenes).sort((a, b) => b.timestamp - a.timestamp);
        
        if (scenes.length === 0) {
            list.innerHTML = '<li style="color: var(--text-muted);">暂无保存的场景</li>';
            return;
        }
        
        list.innerHTML = scenes.map(scene => `
            <li data-name="${scene.name}">
                <span>${scene.name}</span>
                <button class="delete-btn" onclick="App.deleteScene('${scene.name}')">删除</button>
            </li>
        `).join('');
    }
    
    function updateLoadScenesList() {
        const list = document.getElementById('load-scenes-list');
        if (!list) return;
        
        const savedScenes = getSavedScenes();
        const scenes = Object.values(savedScenes).sort((a, b) => b.timestamp - a.timestamp);
        
        if (scenes.length === 0) {
            list.innerHTML = '<li style="color: var(--text-muted);">暂无保存的场景</li>';
            return;
        }
        
        list.innerHTML = scenes.map(scene => `
            <li data-name="${scene.name}" onclick="App.selectLoadScene('${scene.name}')">
                ${scene.name}
            </li>
        `).join('');
    }
    
    let selectedLoadScene = null;
    
    function selectLoadScene(name) {
        selectedLoadScene = name;
        
        const list = document.getElementById('load-scenes-list');
        if (list) {
            list.querySelectorAll('li').forEach(li => {
                li.classList.toggle('selected', li.dataset.name === name);
            });
        }
    }
    
    function loadSelectedScene() {
        if (!selectedLoadScene) {
            alert('请选择要加载的场景');
            return;
        }
        
        const savedScenes = getSavedScenes();
        const scene = savedScenes[selectedLoadScene];
        
        if (!scene) {
            alert('场景不存在');
            return;
        }
        
        const params = scene.params;
        
        setControlValue('source-frequency', 'source-frequency-num', params.sourceFrequency);
        setControlValue('source-speed', 'source-speed-num', params.sourceSpeed);
        setControlValue('source-direction', 'source-direction-num', params.sourceDirection);
        setControlValue('observer-speed', 'observer-speed-num', params.observerSpeed);
        setControlValue('observer-direction', 'observer-direction-num', params.observerDirection);
        setControlValue('sound-speed', 'sound-speed-num', params.soundSpeed);
        
        Simulation.setParameters(params);
        updateAllDisplays();
        
        selectedLoadScene = null;
        hideModal('load');
    }
    
    function deleteScene(name) {
        if (!confirm(`确定要删除场景 "${name}" 吗？`)) return;
        
        const savedScenes = getSavedScenes();
        delete savedScenes[name];
        
        try {
            localStorage.setItem('doppler-scenes', JSON.stringify(savedScenes));
            updateSavedScenesList('saved-scenes-list');
        } catch (e) {
            alert('删除失败');
        }
    }
    
    function destroy() {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        Simulation.destroy();
        WaveformDisplay.destroy();
    }
    
    return {
        init,
        destroy,
        deleteScene,
        selectLoadScene
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.addEventListener('beforeunload', () => {
    App.destroy();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
