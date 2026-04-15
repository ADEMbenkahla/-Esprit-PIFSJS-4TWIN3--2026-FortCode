
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import re
import joblib

def extract_features(code):
    return [
        len(code),
        code.count("\n"),
        len(re.findall(r'for|while|if', code)),
        code.count("#")
    ]

def load_data():
    X=[]
    y=[]
    with open("dataset.txt","r") as f:
        for line in f:
            code,label=line.strip().split("||")
            code=code.replace("<nl>","\n")
            X.append(extract_features(code))
            y.append(int(label))
    return X,y

X,y=load_data()
model=RandomForestClassifier(n_estimators=100)
model.fit(X,y)

joblib.dump(model,"model.pkl")
print("trained")
