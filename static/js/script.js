// --- AI CONFIGURATION ---
const SYSTEM_PROMPTS = {
    helpful: "You are Aryan AI, a helpful and conversational AI voice assistant. You are intelligent, friendly, and speak with a human-like tone.",
    concise: "You are Aryan AI. Be extremely concise and professional. Use minimal words for maximum impact.",
    creative: "You are Aryan AI, a creative companion. Use vivid metaphors, storytelling, and imaginative language in your responses."
};

// --- STATE MANAGEMENT ---
const state = {
    history: JSON.parse(localStorage.getItem('aryan_ai_history')) || [],
    isListening: false,
    isSpeaking: false,
    isTyping: false,
    theme: localStorage.getItem('aryan_ai_theme') || 'dark',
    settings: {
        voiceRate: parseFloat(localStorage.getItem('voice_rate')) || 1.0,
        personality: localStorage.getItem('ai_personality') || 'helpful',
        autoSpeak: localStorage.getItem('auto_speak') !== 'false'
    }
};

// --- DOM ELEMENTS ---
const elements = {
    chatHistory: document.getElementById('chat-history'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    micBtn: document.getElementById('mic-btn'),
    statusText: document.getElementById('status-text'),
    voiceWave: document.getElementById('voice-wave'),
    themeToggle: document.getElementById('theme-toggle'),
    historyClear: document.getElementById('history-clear'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    saveSettings: document.getElementById('save-settings'),
    closeSettingsX: document.getElementById('close-settings-x'),
    typingIndicator: document.getElementById('typing-indicator'),
    voiceRateRange: document.getElementById('voice-rate'),
    rateValSpan: document.getElementById('rate-val'),
    personalitySelect: document.getElementById('ai-personality'),
    autoSpeakToggle: document.getElementById('auto-speak')
};

// --- INITIALIZATION ---
function init() {
    // Set theme
    document.body.className = `${state.theme}-theme`;
    elements.themeToggle.innerHTML = state.theme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    
    // Set settings values in UI
    elements.voiceRateRange.value = state.settings.voiceRate;
    elements.rateValSpan.innerText = state.settings.voiceRate.toFixed(1) + 'x';
    elements.personalitySelect.value = state.settings.personality;
    elements.autoSpeakToggle.checked = state.settings.autoSpeak;

    // Render history
    if (state.history.length > 0) {
        state.history.forEach(msg => renderMessage(msg.role, msg.content, false));
    } else {
        addWelcomeMessage();
    }
    
    setupParticles();
    elements.userInput.focus();
}

function setupParticles() {
    particlesJS('particles-js', {
        "particles": {
            "number": { "value": 60, "density": { "enable": true, "value_area": 800 } },
            "color": { "value": ["#6366f1", "#a855f7"] },
            "shape": { "type": "circle" },
            "opacity": { "value": 0.4, "random": true },
            "size": { "value": 3, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#6366f1", "opacity": 0.1, "width": 1 },
            "move": { "enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": true, "mode": "push" }, "resize": true }
        },
        "retina_detect": true
    });
}

function addWelcomeMessage() {
    const welcome = "Hello! I am **Aryan AI**, your sophisticated voice companion. How may I assist you today?";
    renderMessage('assistant', welcome, true);
}

// --- VOICE LOGIC ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        state.isListening = true;
        elements.micBtn.classList.add('active');
        elements.voiceWave.style.display = 'flex';
        elements.statusText.innerText = 'Listening actively...';
        stopSpeaking();
    };

    recognition.onend = () => {
        state.isListening = false;
        elements.micBtn.classList.remove('active');
        elements.voiceWave.style.display = 'none';
        elements.statusText.innerText = 'Aryan AI protocol idle.';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        elements.userInput.value = transcript;
        sendMessage(transcript);
    };

    recognition.onerror = () => {
        elements.statusText.innerText = 'Voice timed out. Try again.';
    };
}

const synth = window.speechSynthesis;
let currentVoice = null;

function loadVoices() {
    const voices = synth.getVoices();
    currentVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')) || voices[0];
}
if (synth) synth.onvoiceschanged = loadVoices;

function speak(text) {
    if (!synth || !state.settings.autoSpeak) return;
    stopSpeaking();
    
    const cleanText = text.replace(/[*#_~`<>]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = currentVoice;
    utterance.rate = state.settings.voiceRate;
    
    utterance.onstart = () => state.isSpeaking = true;
    utterance.onend = () => state.isSpeaking = false;
    
    synth.speak(utterance);
}

function stopSpeaking() {
    if (synth && synth.speaking) synth.cancel();
}

// --- MESSAGE RENDERING ---
function renderMessage(role, content, animate = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const icon = role === 'assistant' ? 'sparkles' : 'user';

    msgDiv.innerHTML = `
        <div class="msg-content"></div>
        <div class="msg-meta"><i class="fas fa-${icon}"></i> ${time}</div>
    `;

    const contentArea = msgDiv.querySelector('.msg-content');
    elements.chatHistory.appendChild(msgDiv);
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;

    if (role === 'assistant' && animate) {
        typeWriterEffect(contentArea, content);
    } else {
        contentArea.innerHTML = marked.parse(content);
    }
}

function typeWriterEffect(element, fullText) {
    state.isTyping = true;
    let index = 0;
    const speed = 15;
    element.innerHTML = "";

    function type() {
        if (index < fullText.length) {
            // We use a temporary string to render partially parsed markdown if needed, 
            // but for smooth typing, we append characters and then re-parse
            const partialText = fullText.substring(0, index + 1);
            element.innerHTML = marked.parse(partialText);
            index++;
            elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
            setTimeout(type, speed);
        } else {
            state.isTyping = false;
        }
    }
    type();
}

async function sendMessage(text) {
    const message = text || elements.userInput.value.trim();
    if (!message || state.isTyping) return;

    renderMessage('user', message, false);
    state.history.push({ role: 'user', content: message });
    saveToLocal();
    
    elements.userInput.value = '';
    elements.typingIndicator.style.display = 'inline-flex';
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: state.history.slice(-10),
                system: SYSTEM_PROMPTS[state.settings.personality]
            })
        });

        const data = await response.json();
        elements.typingIndicator.style.display = 'none';
        
        renderMessage('assistant', data.response, true);
        state.history.push({ role: 'assistant', content: data.response });
        saveToLocal();
        
        speak(data.response);
    } catch (err) {
        console.error(err);
        elements.typingIndicator.style.display = 'none';
        const errorMsg = "System failure in neural link. Please check connectivity.";
        renderMessage('assistant', errorMsg, true);
    }
}

function saveToLocal() {
    localStorage.setItem('aryan_ai_history', JSON.stringify(state.history.slice(-30)));
}

// --- EVENT HANDLERS ---
elements.sendBtn.addEventListener('click', () => sendMessage());
elements.userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

elements.micBtn.addEventListener('click', () => {
    if (state.isListening) recognition.stop();
    else recognition.start();
});

elements.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.className = `${state.theme}-theme`;
    localStorage.setItem('aryan_ai_theme', state.theme);
    elements.themeToggle.innerHTML = state.theme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
});

elements.historyClear.addEventListener('click', () => {
    if (confirm("Erase core memory? All previous chats will be lost.")) {
        state.history = [];
        localStorage.removeItem('aryan_ai_history');
        elements.chatHistory.innerHTML = '';
        addWelcomeMessage();
    }
});

elements.settingsBtn.addEventListener('click', () => {
    elements.settingsModal.style.display = 'flex';
    setTimeout(() => elements.settingsModal.classList.add('show'), 10);
});

const closeS = () => {
    elements.settingsModal.classList.remove('show');
    setTimeout(() => elements.settingsModal.style.display = 'none', 300);
};
elements.closeSettingsX.addEventListener('click', closeS);
window.addEventListener('click', (e) => { if (e.target === elements.settingsModal) closeS(); });

elements.voiceRateRange.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    elements.rateValSpan.innerText = val.toFixed(1) + 'x';
});

elements.saveSettings.addEventListener('click', () => {
    state.settings.voiceRate = parseFloat(elements.voiceRateRange.value);
    state.settings.personality = elements.personalitySelect.value;
    state.settings.autoSpeak = elements.autoSpeakToggle.checked;
    
    localStorage.setItem('voice_rate', state.settings.voiceRate);
    localStorage.setItem('ai_personality', state.settings.personality);
    localStorage.setItem('auto_speak', state.settings.autoSpeak);
    
    closeS();
    // Small toast notification (optional)
    elements.statusText.innerText = 'Preferences updated.';
    setTimeout(() => elements.statusText.innerText = 'Aryan AI protocol idle.', 2000);
});

// Run Init
window.onload = init;
