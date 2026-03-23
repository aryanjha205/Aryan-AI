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

SYSTEM_PROMPT = f"You are {ASSISTANT_NAME}, a helpful and conversational AI voice assistant. You are intelligent, friendly, and have a human-like tone. Keep your responses concise and suitable for voice output."

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
        # Final layer fallback for network issues
        response_text = f"My apologies, I am experiencing a temporary sync issue with my neural core. I am {ASSISTANT_NAME}, built by {DEVELOPER_NAME}. Please attempt your request again."

    return jsonify({
        "response": response_text,
        "model": used_model
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
