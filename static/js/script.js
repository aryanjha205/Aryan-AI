// --- Initialization & Particles ---
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

// Assistant State
const state = {
    history: [],
    isListening: false,
    theme: 'dark',
    isSpeaking: false,
    isTyping: false,
    voiceRate: 1.0,
    voicePitch: 1.0
};

// DOM Elements
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const micRing = document.getElementById('mic-ring');
const statusText = document.getElementById('status-text');
const themeToggle = document.getElementById('theme-toggle');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const typingIndicator = document.getElementById('typing-indicator');
const voiceRateInput = document.getElementById('voice-rate');

// --- Voice Recognition ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
        state.isListening = true;
        micBtn.classList.add('active');
        statusText.innerText = 'Listening...';
        stopSpeaking(); // Stop AI if it was speaking
    };

    recognition.onend = () => {
        state.isListening = false;
        micBtn.classList.remove('active');
        statusText.innerText = 'Aryan AI is ready.';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendMessage(transcript);
    };

    recognition.onerror = (e) => {
        console.error('Recognition error:', e);
        statusText.innerText = 'Request timeout. Try again.';
    };
} else {
    micBtn.style.display = 'none';
    statusText.innerText = 'Voice input not available.';
}

// --- Voice Synthesis ---
const synth = window.speechSynthesis;
let voice = null;

function loadVoices() {
    const voices = synth.getVoices();
    // Prefer a premium sounding female voice if available
    voice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Microsoft Zira')) || voices[0];
}

if (synth) {
    synth.onvoiceschanged = loadVoices;
    loadVoices();
}

function speak(text) {
    if (!synth) return;
    stopSpeaking();
    
    // Clean text for speech
    const cleanText = text.replace(/[*#_~]/g, '');
    
    // Split long text into manageable chunks
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = voice;
    utterance.rate = state.voiceRate;
    utterance.pitch = state.voicePitch;
    
    utterance.onstart = () => { state.isSpeaking = true; };
    utterance.onend = () => { state.isSpeaking = false; };
    
    synth.speak(utterance);
}

function stopSpeaking() {
    if (synth && synth.speaking) {
        synth.cancel();
    }
}

// --- Chat Core Logic ---

function addMessage(role, content) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const icon = role === 'assistant' ? 'sparkles' : 'user';
    
    msgDiv.innerHTML = `
        <div class="msg-content">${role === 'assistant' ? '' : content}</div>
        <div class="msg-meta"><i class="fas fa-${icon}"></i> ${time}</div>
    `;
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Typing effect for assistant
    if (role === 'assistant') {
        typeWriter(msgDiv.querySelector('.msg-content'), content);
    }
    
    // Maintain state history
    state.history.push({ role, content });
    if (state.history.length > 20) state.history.shift();
}

function typeWriter(element, text) {
    state.isTyping = true;
    let i = 0;
    const speed = 10; // Typing speed in ms

    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            chatHistory.scrollTop = chatHistory.scrollHeight;
            setTimeout(type, speed);
        } else {
            state.isTyping = false;
        }
    }
    type();
}

async function sendMessage(text) {
    const message = text || userInput.value.trim();
    if (!message || state.isTyping) return;

    // Add User Message UI
    addMessage('user', message);
    userInput.value = '';
    
    // Show typing indicator
    typingIndicator.style.display = 'inline-flex';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: state.history
            })
        });

        const data = await response.json();
        
        typingIndicator.style.display = 'none';
        addMessage('assistant', data.response);
        speak(data.response);
        
    } catch (error) {
        console.error('Chat error:', error);
        typingIndicator.style.display = 'none';
        const errorMsg = "I'm having trouble connecting to my neural core. Please check your network.";
        addMessage('assistant', errorMsg);
        speak("Connectivity lost. Re-establishing link...");
    }
}

// --- Event Listeners ---

sendBtn.addEventListener('click', () => sendMessage());

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

micBtn.addEventListener('click', () => {
    if (state.isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
});

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
    setTimeout(() => settingsModal.classList.add('show'), 10);
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('show');
    setTimeout(() => settingsModal.style.display = 'none', 300);
    state.voiceRate = parseFloat(voiceRateInput.value);
});

// Click outside to close modal
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeSettings.click();
    }
});

// Startup focus
window.onload = () => {
    userInput.focus();
    // Add initial small bounce to logo
    document.getElementById('app-logo').style.transform = 'scale(1.2)';
    setTimeout(() => {
        document.getElementById('app-logo').style.transform = 'scale(1)';
    }, 500);
};
