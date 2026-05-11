
from flask import Flask,request,jsonify
import joblib
import re

app=Flask(__name__)
model=joblib.load("model.pkl")

def extract_features(code):
    return [
        len(code),
        code.count("\n"),
        len(re.findall(r'for|while|if', code)),
        code.count("#")
    ]

@app.route('/predict',methods=['POST'])
def predict():
    code=request.json.get('code', '')
    
    # Heuristique demandée : forcer Humain sauf si le code est long et contient plusieurs commentaires
    is_long = len(code) > 150
    comment_count = code.count('//') + code.count('/*') + code.count('#')
    has_many_comments = comment_count >= 2
    
    if is_long and has_many_comments:
        features=extract_features(code)
        pred=int(model.predict([features])[0])
        # S'assurer qu'il soit détecté comme IA ou Plagiat
        if pred == 0:
            pred = 1
    else:
        pred = 0
        
    # Mapping des prédictions vers des labels lisibles
    labels = {0: "Humain", 1: "IA", 2: "Plagiat"}
    label = labels.get(pred, "Unknown")
    
    return jsonify({
        "prediction": pred,
        "label": label
    })

import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host='0.0.0.0', port=port)
