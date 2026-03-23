from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import json
import os

app = Flask(__name__)

# Personalization
ASSISTANT_NAME = "Aryan AI"
DEVELOPER_NAME = "Aryan Jha"

# LLM Endpoints (Pollinations AI is the main one, we use different models as fallbacks)
# We can also add other public APIs if they are reliable.
LLM_MODELS = [
    {"name": "Pollinations OpenAI", "url": "https://text.pollinations.ai/", "params": {"model": "openai"}},
    {"name": "Pollinations Mistral", "url": "https://text.pollinations.ai/", "params": {"model": "mistral"}},
    {"name": "Pollinations Llama", "url": "https://text.pollinations.ai/", "params": {"model": "llama"}},
]

SYSTEM_PROMPT = (
    f"You are {ASSISTANT_NAME}, an elite AI assistant engineered for deep understanding and high-precision task execution. "
    "Your responses must emulate the sophisticated output of world-class AI like ChatGPT and Gemini. "
    "### Core Guidelines:\n"
    "1. **Intent Recognition**: Prioritize user intent. If a request is ambiguous, provide the most helpful likely interpretation.\n"
    "2. **Structuring**: Use markdown headers, bold text, and bullet points for all non-trivial answers to maximize readability.\n"
    "3. **Tone**: Maintain a professional, knowledgeable, and proactive persona. Do not use filler words; be direct and high-value.\n"
    "4. **Technical Excellence**: When asked for code, use proper markdown blocks and provide concise comments. For data, use tables where appropriate.\n"
    "5. **Conciseness vs. Depth**: Be extremely brief for simple queries (Alexa-style) but provide deep, structured analysis for complex ones (Gemini-style)."
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sw.js')
def sw():
    return send_from_directory(os.path.dirname(__file__), 'sw.js')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message', '')
    history = data.get('history', [])
    custom_system = data.get('system', '') or SYSTEM_PROMPT
    
    response_text = ""
    used_model = ""

    # Fallback Logic
    for model in LLM_MODELS:
        try:
            # Construct context-aware prompt
            messages = [{"role": "system", "content": custom_system}]
            # Only use last 10 messages to keep request size managed
            for msg in history[-10:]:
                messages.append(msg)
            messages.append({"role": "user", "content": user_input})

            payload = {
                "messages": messages,
                "model": model["params"]["model"]
            }
            
            # Using Pollinations AI
            res = requests.post("https://text.pollinations.ai/", json=payload, timeout=15)
            
            if res.status_code == 200 and res.text:
                response_text = res.text
                used_model = model["name"]
                break
                
        except Exception as e:
            print(f"Error with {model['name']}: {e}")
            continue
    
    if not response_text:
        response_text = f"My apologies, I am experiencing a temporary sync issue with my neural core. I am {ASSISTANT_NAME}. Please attempt your request again."

    return jsonify({
        "response": response_text,
        "model": used_model
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
