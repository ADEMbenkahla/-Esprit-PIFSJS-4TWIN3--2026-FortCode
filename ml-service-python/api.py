
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
    pred=model.predict([features])[0]
    return jsonify({"prediction":int(pred)})

if __name__ == "__main__":
    app.run(debug=True, port=5050)
