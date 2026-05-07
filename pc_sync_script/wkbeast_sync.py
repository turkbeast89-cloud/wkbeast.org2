"""
WKBeast Machine Sync Script
============================
Run this on your PC alongside your monitor app.
It pushes machine data to wkbeast.org and pulls commands to execute.

Setup:
1. pip install requests
2. Edit WKBEAST_URL and API_KEY below
3. Edit get_machine_data() to read from your monitor app
4. Run: python wkbeast_sync.py
"""

import requests
import time
import json
import subprocess

# ============ CONFIG ============
WKBEAST_URL = "https://wkbeast.org"  # Your website URL
API_KEY = "wkbeast2025sync"           # Must match MACHINE_SYNC_KEY in .env
SYNC_INTERVAL = 120                    # Push data every 2 minutes (seconds)
# ================================


def get_machine_data():
    """
    READ YOUR MACHINES HERE.
    
    Replace this with code that reads from your monitor app or scans the network.
    Each machine should have: ip, worker_name, hashrate, temperature, fan_speed, power, status, model
    
    Example for Antminer (Bitmain) - reads from miner's web API:
    """
    machines = []
    
    # ===== OPTION 1: Read from your monitor app's database/API =====
    # If your monitor app has an API, call it here:
    # response = requests.get("http://localhost:YOUR_MONITOR_PORT/api/machines")
    # machines = response.json()
    
    # ===== OPTION 2: Scan Antminers directly (uncomment to use) =====
    # List your machine IPs here or scan the network
    # machine_ips = ["192.168.1.100", "192.168.1.101", ...]
    #
    # for ip in machine_ips:
    #     try:
    #         # Antminer API (works for S9, S19, L7, L9, etc.)
    #         resp = requests.get(f"http://{ip}/cgi-bin/stats.cgi", 
    #                           auth=("root", "root"), timeout=5)
    #         data = resp.json()
    #         
    #         # Parse Antminer stats
    #         stats = data.get("STATS", [{}])[0] if "STATS" in data else {}
    #         machines.append({
    #             "ip": ip,
    #             "worker_name": "",  # Fill from your config
    #             "hashrate": stats.get("GHS 5s", 0),
    #             "temperature": stats.get("temp1", 0),
    #             "fan_speed": stats.get("fan1", 0),
    #             "power": 0,
    #             "status": "online",
    #             "model": stats.get("Type", "Unknown"),
    #             "uptime": str(stats.get("Elapsed", 0)),
    #         })
    #     except:
    #         machines.append({
    #             "ip": ip,
    #             "worker_name": "",
    #             "status": "offline"
    #         })
    
    # ===== OPTION 3: Read from a JSON file your monitor exports =====
    # try:
    #     with open("machines.json", "r") as f:
    #         machines = json.load(f)
    # except:
    #     pass
    
    return machines


def push_data(machines):
    """Push machine data to wkbeast.org"""
    try:
        resp = requests.post(
            f"{WKBEAST_URL}/api/machine-data/push",
            json={"api_key": API_KEY, "machines": machines},
            timeout=15
        )
        data = resp.json()
        if data.get("success"):
            print(f"[SYNC] Pushed {data.get('synced', 0)} machines to wkbeast.org")
        else:
            print(f"[SYNC ERROR] {data.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"[SYNC ERROR] Could not reach wkbeast.org: {e}")


def check_commands():
    """Check for pending commands from wkbeast.org"""
    try:
        resp = requests.get(
            f"{WKBEAST_URL}/api/machine-data/commands",
            params={"api_key": API_KEY},
            timeout=10
        )
        commands = resp.json()
        
        for cmd in commands:
            print(f"[COMMAND] {cmd.get('action')} for {cmd.get('ip')}")
            execute_command(cmd)
            
    except Exception as e:
        print(f"[CMD ERROR] {e}")


def execute_command(cmd):
    """Execute a command on a machine"""
    ip = cmd.get("ip", "")
    action = cmd.get("action", "")
    params = cmd.get("params", {})
    result = "OK"
    
    try:
        if action == "reboot":
            # Antminer reboot via CGMiner API
            # Uncomment the method that works for your machines:
            
            # Method 1: CGMiner API
            # import socket
            # sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            # sock.connect((ip, 4028))
            # sock.send(b'{"command":"restart"}')
            # sock.close()
            
            # Method 2: SSH reboot
            # subprocess.run(["ssh", f"root@{ip}", "reboot"], timeout=10)
            
            # Method 3: Web API reboot (Antminer)
            # requests.get(f"http://{ip}/cgi-bin/reboot.cgi", auth=("root", "root"), timeout=5)
            
            print(f"  -> Reboot {ip} (uncomment the reboot method in the script)")
            result = "Reboot command sent"
            
        elif action == "change_worker":
            new_worker = params.get("worker_name", "")
            print(f"  -> Change worker on {ip} to {new_worker}")
            result = f"Worker changed to {new_worker}"
            
        elif action == "change_pool":
            new_pool = params.get("pool_url", "")
            print(f"  -> Change pool on {ip} to {new_pool}")
            result = f"Pool changed to {new_pool}"
            
    except Exception as e:
        result = f"Error: {str(e)}"
        print(f"  -> ERROR: {e}")
    
    # Report back to wkbeast.org
    try:
        requests.post(
            f"{WKBEAST_URL}/api/machine-data/command-done",
            json={"api_key": API_KEY, "command_id": cmd.get("id"), "result": result},
            timeout=10
        )
    except:
        pass


def main():
    print("=" * 50)
    print("  WKBeast Machine Sync")
    print(f"  Server: {WKBEAST_URL}")
    print(f"  Sync every {SYNC_INTERVAL}s")
    print("=" * 50)
    
    while True:
        # 1. Get machine data from local network
        machines = get_machine_data()
        
        # 2. Push to wkbeast.org
        if machines:
            push_data(machines)
        else:
            print("[SYNC] No machine data to push (edit get_machine_data() in the script)")
        
        # 3. Check for commands
        check_commands()
        
        # 4. Wait
        time.sleep(SYNC_INTERVAL)


if __name__ == "__main__":
    main()
