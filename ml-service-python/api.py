
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
    code=request.json['code']
    features=extract_features(code)
    pred=int(model.predict([features])[0])
    
    # Mapping des prédictions vers des labels lisibles
    labels = {0: "Humain", 1: "IA", 2: "Plagiat"}
    label = labels.get(pred, "Unknown")
    
    return jsonify({
        "prediction": pred,
        "label": label
    })

if __name__ == "__main__":
    app.run(debug=True, port=5050)
