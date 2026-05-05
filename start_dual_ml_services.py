#!/usr/bin/env python3
"""
Script pour démarrer les deux services ML:
1. Service ML Detection (port 5050) - Détection AI/Plagiat
2. Service Complexité (port 5002) - Prédiction de complexité temporelle
"""

import subprocess
import sys
import os
import time
from pathlib import Path

def start_service(service_name, script_path, port):
    """Démarre un service ML dans son propre dossier"""
    print(f"[*] Démarrage de {service_name} (Port {port})...")
    
    service_dir = Path(script_path).parent
    if not service_dir.exists():
        print(f"[X] Dossier {service_dir} introuvable")
        return False
    
    try:
        # Changer vers le dossier du service
        original_dir = os.getcwd()
        os.chdir(service_dir)
        
        # Vérifier si les requirements existent
        requirements_file = Path("requirements.txt")
        if requirements_file.exists():
            print(f"[#] Installation des dépendances pour {service_name}...")
            install_result = subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
            ], capture_output=True, text=True)
            
            if install_result.returncode != 0:
                print(f"[X] Erreur installation dépendances {service_name}: {install_result.stderr}")
                return False
            print(f"[OK] Dépendances {service_name} installées")
        
        # Démarrer le service
        print(f"[>] Lancement de {service_name}...")
        process = subprocess.Popen([sys.executable, Path(script_path).name])
        
        # Revenir au dossier d'origine
        os.chdir(original_dir)
        
        # Attendre un peu pour vérifier que le service démarre
        time.sleep(2)
        
        if process.poll() is None:
            print(f"[OK] {service_name} démarré avec succès (PID: {process.pid})")
            return True
        else:
            print(f"[X] {service_name} a échoué au démarrage")
            return False
            
    except Exception as e:
        print(f"[X] Erreur démarrage {service_name}: {e}")
        return False

def main():
    print("--- Démarrage des services ML pour FortCode Battle System ---")
    print("=" * 60)
    
    # Configuration des services
    services = [
        {
            "name": "ML Detection Service",
            "script": "ml-service-python/api.py",
            "port": 5050,
            "path": "ml-service-python"
        },
        {
            "name": "Complexity Prediction Service", 
            "script": "complexity-service/app.py",
            "port": 5002,
            "path": "complexity-service"
        }
    ]
    
    # Vérifier que les dossiers existent
    base_dir = Path.cwd()
    missing_services = []
    
    for service in services:
        service_path = base_dir / service["path"]
        if not service_path.exists():
            missing_services.append(service["name"])
    
    if missing_services:
        print(f"[X] Services manquants: {', '.join(missing_services)}")
        print("Veuillez vous assurer que les dossiers existent:")
        for service in services:
            print(f"  - {service['path']}/")
        return 1
    
    print("[...] Démarrage des services en parallèle...")
    
    # Démarrer tous les services
    started_services = []
    processes = []
    
    for service in services:
        success = start_service(
            service["name"], 
            service["script"], 
            service["port"]
        )
        
        if success:
            started_services.append(service["name"])
        else:
            # Arrêter les services déjà démarrés en cas d'erreur
            for process in processes:
                if process.poll() is None:
                    process.terminate()
            print(f"[!] Arrêt des services dû à l'erreur de {service['name']}")
            return 1
    
    print("\n" + "=" * 60)
    print("[OK] TOUS LES SERVICES SONT DÉMARRÉS")
    print(f"[*] Services actifs: {', '.join(started_services)}")
    print(f"[*] ML Detection: http://localhost:5050")
    print(f"[*] Complexity Prediction: http://localhost:5002")
    print("[*] Utilisez Ctrl+C pour arrêter tous les services")
    print("=" * 60)
    
    try:
        # Attendre que les services tournent
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[!] Arrêt des services...")
        
        # Arrêter tous les processus
        for process in processes:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
        
        print("[OK] Services arrêtés")
        return 0

if __name__ == "__main__":
    sys.exit(main())
