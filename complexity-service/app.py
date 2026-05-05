import os
import re
import pickle
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Global variables for model and vectorizer
model = None
tfidf_vec = None
LABEL_MAP = {0: "O(1)", 1: "O(n)", 2: "O(log n)", 3: "O(n log n)", 4: "O(n²)", 5: "O(2^n)"}

def remove_comments(text):
    text = re.sub(r'//.*', '', text)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    return text

def extract_features(code):
    """Extrait 38 features syntaxiques (Logique synchro avec le notebook)."""
    if not isinstance(code, str): code = ''
    clean = remove_comments(code.lower())
    raw   = remove_comments(code)
    lines = clean.splitlines()
    n_lines = len(lines) if len(lines) > 0 else 1

    # --- Loops ---
    n_for      = len(re.findall(r'\bfor\s*\(', clean))
    n_while    = len(re.findall(r'\bwhile\s*\(', clean))
    n_foreach  = len(re.findall(r'\.foreach\s*\(', clean))
    total_loops = n_for + n_while + n_foreach

    # --- Array Methods ---
    n_map    = len(re.findall(r'\.map\s*\(', clean))
    n_filter = len(re.findall(r'\.filter\s*\(', clean))
    n_reduce = len(re.findall(r'\.reduce\s*\(', clean))
    n_sort   = len(re.findall(r'\.sort\s*\(', clean))
    n_find   = len(re.findall(r'\.find\s*\(|\.findindex\s*\(', clean))
    n_inc    = len(re.findall(r'\.includes\s*\(|\.indexof\s*\(', clean))
    n_push   = len(re.findall(r'\.push\s*\(', clean))
    n_shift  = len(re.findall(r'\.shift\s*\(', clean))
    n_slice  = len(re.findall(r'\.slice\s*\(', clean))
    n_concat = len(re.findall(r'\.concat\s*\(', clean))

    # --- Data Structures ---
    n_new_map  = len(re.findall(r'new\s+map\b', clean))
    n_new_set  = len(re.findall(r'new\s+set\b', clean))
    n_new_arr  = len(re.findall(r'=\s*\[\]', clean))

    # --- Recursion & Branching Factor ---
    func_names = [n for n in re.findall(r'function\s+([a-zA-Z0-9_$]+)', raw)]
    is_recursive = 0
    branching_factor = 0
    if func_names:
        outer = func_names[0]
        if 'function ' + outer in raw:
            parts = raw.split('function ' + outer)
            body = parts[1] if len(parts) > 1 else ""
            branching_factor = len(re.findall(rf'\b{outer}\s*\(', body))
            is_recursive = 1 if branching_factor > 0 else 0

    has_memo = 1 if re.search(r'\bmemo\b|\bcache\b|dp\[|visited', clean) else 0

    # --- Binary search vs Divide & Conquer ---
    has_mid   = 1 if re.search(r'\bmid\b|\blow\b|\bhigh\b', clean) else 0
    has_div2  = 1 if re.search(r'/\s*2\b|>>\s*1\b', clean) else 0
    has_mathf = 1 if 'math.floor' in clean or 'math.ceil' in clean else 0
    is_binary = 1 if (total_loops >= 1 and has_mid and (has_div2 or has_mathf) and n_slice == 0) else 0

    has_sort_kw = 1 if re.search(r'\bmerge\b|\bpartition\b|\bheapify\b|\bpivot\b|mergesort|quicksort', clean) else 0

    # --- Nested Loops ---
    loop_positions = [m.start() for m in re.finditer(r'\bfor\s*\(|\bwhile\s*\(', clean)]
    has_nested = 0
    if len(loop_positions) >= 2:
        for i in range(len(loop_positions) - 1):
            seg = clean[loop_positions[i]:loop_positions[i+1]]
            if seg.count('{') - seg.count('}') > 0:
                has_nested = 1; break

    # --- Async ---
    has_promise  = 1 if re.search(r'new\s+promise|promise\.', clean) else 0
    has_callback = 1 if re.search(r'callback\s*\(|=>\s*{', clean) else 0
    has_async    = 1 if re.search(r'\basync\b|\bawait\b', clean) else 0

    # --- Stats ---
    n_tokens = len(clean.split())
    n_ifs    = len(re.findall(r'\bif\s*\(', clean))
    n_return = len(re.findall(r'\breturn\b', clean))
    loop_density = total_loops / n_lines if n_lines > 0 else 0
    branch_density = n_ifs / n_lines if n_lines > 0 else 0

    return [
        n_for, n_while, n_foreach, total_loops,
        n_map, n_filter, n_reduce, n_sort, n_find, n_inc,
        n_push, n_shift, n_slice, n_concat,
        n_new_map, n_new_set, n_new_arr,
        is_recursive, has_memo,
        is_binary, has_mid, has_div2, has_mathf,
        has_sort_kw, has_nested,
        has_promise, has_callback, has_async,
        n_lines, n_tokens, n_ifs, n_return,
        loop_density, branch_density,
        int(total_loops >= 2),
        int(n_sort >= 1 or branching_factor >= 2),
        int(is_recursive and branching_factor == 1),
        int(has_nested and total_loops >= 2),
    ]

def load_model():
    global model, tfidf_vec
    model_path = 'complexity_classifier.pkl'
    if os.path.exists(model_path):
        try:
            # Use joblib instead of pickle
            data = joblib.load(model_path)
            if isinstance(data, dict):
                model = data.get('model')
                tfidf_vec = data.get('tfidf')
                print(f"[OK] Model loaded. Accuracy on test: {data.get('test_accuracy', 'N/A')}")
            else:
                model = data
            print("[OK] Model and Vectorizer loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
    else:
        print(f"Warning: {model_path} not found.")

load_model()

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
        
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({"error": "Missing 'code' field"}), 400
        
    code = data['code']
    try:
        # 1. Extraction des features hand-crafted (liste de 38)
        hand_crafted = extract_features(code)
        
        # 2. Vectorisation TF-IDF (3000 features)
        if tfidf_vec:
            tfidf_features = tfidf_vec.transform([code]).toarray()
            # Fusion : hand-crafted + tf-idf
            full_features = np.hstack([np.array(hand_crafted).reshape(1, -1), tfidf_features])
        else:
            full_features = np.array(hand_crafted).reshape(1, -1)

        # 3. Prédiction
        prediction = int(model.predict(full_features)[0])
        probabilities = model.predict_proba(full_features)[0].tolist()
        
        result = {
            "complexity": LABEL_MAP.get(prediction, "Unknown"),
            "probabilities": {LABEL_MAP[i]: round(prob, 4) for i, prob in enumerate(probabilities)},
            "prediction_code": prediction
        }
        return jsonify(result)

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5002, debug=True)
