// Initialize Particles.js
particlesJS('particles-js', {
    "particles": {
        "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
        "color": { "value": "#6e8efb" },
        "shape": { "type": "circle" },
        "opacity": { "value": 0.5, "random": false },
        "size": { "value": 3, "random": true },
        "line_linked": { "enable": true, "distance": 150, "color": "#6e8efb", "opacity": 0.2, "width": 1 },
        "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false }
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
    isSpeaking: false
};

// DOM Elements
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const themeToggle = document.getElementById('theme-toggle');
const typingIndicator = document.getElementById('typing-indicator');

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
        statusText.innerText = 'Click to speak...';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendMessage(transcript);
    };

    recognition.onerror = (e) => {
        console.error('Recognition error:', e);
        statusText.innerText = 'Error. Try again.';
    };
} else {
    micBtn.style.display = 'none';
    statusText.innerText = 'Speech recognition not supported.';
}

// --- Voice Synthesis ---
const synth = window.speechSynthesis;
let voice = null;

function loadVoices() {
    const voices = synth.getVoices();
    // Prefer a clear female/male voice if available
    voice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
}
synth.onvoiceschanged = loadVoices;
loadVoices();

function speak(text) {
    if (!synth) return;
    stopSpeaking();
    
    // Clean text for speech (remove markdown-like symbols)
    const cleanText = text.replace(/[*#_~]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => { state.isSpeaking = true; };
    utterance.onend = () => { state.isSpeaking = false; };
    
    synth.speak(utterance);
}

function stopSpeaking() {
    if (synth.speaking) {
        synth.cancel();
    }
}

// --- Core Logic ---

function addMessage(role, content) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    msgDiv.innerHTML = `
        <div class="msg-content">${content}</div>
        <div class="msg-time">${time}</div>
    `;
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Maintain state history
    state.history.push({ role, content });
    if (state.history.length > 10) state.history.shift();
}

async function sendMessage(text) {
    const message = text || userInput.value.trim();
    if (!message) return;

    // Handle Local Commands
    if (handleCommands(message.toLowerCase())) {
        userInput.value = '';
        return;
    }

    // Add User Message UI
    addMessage('user', message);
    userInput.value = '';
    
    // Show typing
    typingIndicator.style.display = 'flex';
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
        addMessage('assistant', "I'm having trouble connecting. Please check your internet.");
        speak("I am having trouble connecting to my brain.");
    }
}

function handleCommands(text) {
    if (text.includes('open google')) {
        speak("Opening Google for you.");
        window.open('https://www.google.com', '_blank');
        return true;
    }
    if (text.includes('open youtube')) {
        speak("Opening YouTube.");
        window.open('https://www.youtube.com', '_blank');
        return true;
    }
    if (text.includes('the time')) {
        const time = new Date().toLocaleTimeString();
        const response = `The current time is ${time}.`;
        addMessage('assistant', response);
        speak(response);
        return true;
    }
    if (text.includes('the date')) {
        const date = new Date().toDateString();
        const response = `Today is ${date}.`;
        addMessage('assistant', response);
        speak(response);
        return true;
    }
    if (text.includes('who created you') || text.includes('who is your creator')) {
        const response = "I was created by Aryan Jha. He is a brilliant developer.";
        addMessage('assistant', response);
        speak(response);
        return true;
    }
    return false;
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

// Startup focus
window.onload = () => {
    userInput.focus();
};
