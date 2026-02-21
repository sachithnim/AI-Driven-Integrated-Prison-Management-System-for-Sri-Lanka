import subprocess
import sys
import time

# Configuration for all AI Microservices
services = [
    {
        "name": "Rehabilitation",
        "app_path": "modules.rehabilitation.app.main:app",
        "port": 8001,
        "color": "\033[94m" # Blue
    },
    {
        "name": "Overcrowding",
        "app_path": "modules.overcrowding.main:app",
        "port": 8002,
        "color": "\033[92m" # Green
    },
    {
        "name": "Violence Detection",
        "app_path": "modules.violence.main:app",
        "port": 8003,
        "color": "\033[91m" # Red
    },
    {
        "name": "Mental Health",
        "app_path": "modules.mental_health.main:app",
        "port": 8004,
        "color": "\033[95m" # Purple
    }
]

def run_services():
    processes = []
    print("\n🚀 \033[1mStarting AI-Driven Prison Management System - AI Modules\033[0m\n")

    try:
        for service in services:
            print(f"{service['color']}► Starting {service['name']} Service on port {service['port']}...\033[0m")
            
            # Using sys.executable ensures we use the currently active python environment
            cmd = [
                sys.executable, "-m", "uvicorn", 
                service["app_path"], 
                "--host", "0.0.0.0", 
                "--port", str(service["port"]),
                "--reload"
            ]
            
            # Start process without blocking
            proc = subprocess.Popen(cmd)
            processes.append((service["name"], proc))
            
        print("\n" + "="*60)
        print(f"{'SERVICE':<20} | {'STATUS':<10} | {'URL':<25}")
        print("-" * 60)
        for service in services:
            print(f"{service['name']:<20} | {'ONLINE':<10} | http://localhost:{service['port']}")
        print("="*60 + "\n")
        print("Press \033[1mCtrl+C\033[0m to stop all services.\n")

        # Keep main script alive
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\n🛑 Stopping all services...")
        for name, proc in processes:
            print(f"   Terminating {name}...")
            proc.terminate()
        
        print("\n✅ All services stopped successfully.")

if __name__ == "__main__":
    run_services()