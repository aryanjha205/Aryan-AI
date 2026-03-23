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

SYSTEM_PROMPT = f"You are {ASSISTANT_NAME}, a helpful and conversational AI voice assistant created by {DEVELOPER_NAME}. You are intelligent, friendly, and have a human-like tone. Keep your responses concise and suitable for voice output. Current Developer: {DEVELOPER_NAME}."

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
    
    # Simple response caching (in-memory for session)
    # In a real app, you might use Redis, but here we keep it simple.
    
    response_text = ""
    used_model = ""

    # Fallback Logic
    for model in LLM_MODELS:
        try:
            # Construct context-aware prompt
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            for msg in history[-5:]:
                messages.append(msg)
            messages.append({"role": "user", "content": user_input})

            payload = {
                "messages": messages,
                "model": model["params"]["model"]
            }
            
            # Use POST first
            res = requests.post("https://text.pollinations.ai/", json=payload, timeout=10)
            
            if res.status_code == 200 and res.text:
                response_text = res.text
                used_model = model["name"]
                break
            
            # If POST fails, try simple GET as a second layer fallback for this specific model
            import urllib.parse
            safe_prompt = urllib.parse.quote(user_input)
            get_url = f"https://text.pollinations.ai/prompt/{safe_prompt}?model={model['params']['model']}&system={urllib.parse.quote(SYSTEM_PROMPT)}"
            res_get = requests.get(get_url, timeout=10)
            
            if res_get.status_code == 200 and res_get.text:
                response_text = res_get.text
                used_model = model["name"] + " (GET)"
                break
                
        except Exception as e:
            print(f"Error with {model['name']}: {e}")
            continue
    
    if not response_text:
        response_text = f"I'm sorry, I'm having trouble connecting to my brain right now. But I am {ASSISTANT_NAME}, created by {DEVELOPER_NAME}. Please try again in a moment."

    return jsonify({
        "response": response_text,
        "model": used_model
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
