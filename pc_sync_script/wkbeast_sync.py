"""
WKBeast Machine Sync Script
============================
Reads machine data from MineFleet Monitor's config file and pushes to wkbeast.org
Also pulls commands (reboot, etc.) from wkbeast.org and executes them via CGMiner API.

Setup:
1. pip install requests
2. Place this file in the SAME FOLDER as minefleet_monitor.py
3. Edit WKBEAST_URL if needed
4. Run: python wkbeast_sync.py
   (Run alongside minefleet_monitor.py - both can run at the same time)
"""

import requests
import time
import json
import os
import socket

# ============ CONFIG ============
WKBEAST_URL = "https://wkbeast.org"   # Your website URL
API_KEY = "wkbeast2025sync"            # Must match MACHINE_SYNC_KEY in backend .env
SYNC_INTERVAL = 120                    # Push data every 2 minutes (seconds)

# Path to MineFleet config (same folder as this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MINEFLEET_CONFIG = os.path.join(SCRIPT_DIR, "wkbeast_config.json")
# ================================


def send_cgminer_command(ip, command, port=4028, timeout=5):
    """Send a command to CGMiner API"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((ip, port))
        sock.send(json.dumps({"command": command}).encode() + b'\n')
        
        response = b''
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            response += chunk
            if b'\x00' in chunk:
                break
        
        sock.close()
        return json.loads(response.decode().replace('\x00', ''))
    except:
        return None


def get_miner_details(ip):
    """Get detailed info from a miner via CGMiner API"""
    try:
        # Get stats for temperature, fan speed, model
        stats = send_cgminer_command(ip, "stats")
        summary = send_cgminer_command(ip, "summary")
        pools = send_cgminer_command(ip, "pools")
        
        result = {
            "ip": ip,
            "temperature": 0,
            "fan_speed": 0,
            "power": 0,
            "model": "",
            "uptime": "",
            "pool": "",
            "worker_name": ""
        }
        
        # Parse stats
        if stats and "STATS" in stats:
            for stat in stats["STATS"]:
                # Temperature (check multiple possible fields)
                for key in ["temp1", "temp2_6", "temp_pcb1", "Temperature"]:
                    if key in stat and stat[key]:
                        try:
                            result["temperature"] = max(result["temperature"], int(float(stat[key])))
                        except:
                            pass
                
                # Fan speed
                for key in ["fan1", "fan_num", "Fan Speed In", "Fan1"]:
                    if key in stat and stat[key]:
                        try:
                            result["fan_speed"] = max(result["fan_speed"], int(float(stat[key])))
                        except:
                            pass
                
                # Model/Type
                if "Type" in stat:
                    result["model"] = stat["Type"]
                elif "miner_type" in stat:
                    result["model"] = stat["miner_type"]
                
                # Uptime
                if "Elapsed" in stat:
                    elapsed = int(stat["Elapsed"])
                    hours = elapsed // 3600
                    mins = (elapsed % 3600) // 60
                    result["uptime"] = f"{hours}h {mins}m"
                    
                # Power
                if "Power" in stat:
                    try:
                        result["power"] = int(float(stat["Power"]))
                    except:
                        pass
        
        # Parse pools for worker name
        if pools and "POOLS" in pools:
            for pool in pools["POOLS"]:
                if pool.get("Stratum Active") or pool.get("Status") == "Alive":
                    result["pool"] = pool.get("URL", "")
                    result["worker_name"] = pool.get("User", "")
                    break
        
        return result
    except:
        return None


def get_machine_data():
    """Read machine data from MineFleet config file"""
    machines = []
    
    if not os.path.exists(MINEFLEET_CONFIG):
        print(f"[WARN] MineFleet config not found at: {MINEFLEET_CONFIG}")
        print(f"  Make sure this script is in the same folder as minefleet_monitor.py")
        return machines
    
    try:
        with open(MINEFLEET_CONFIG, "r") as f:
            config = json.load(f)
    except Exception as e:
        print(f"[ERROR] Could not read config: {e}")
        return machines
    
    miners = config.get("miners", [])
    print(f"[INFO] Found {len(miners)} miners in MineFleet config")
    
    for miner in miners:
        ip = miner.get("ip", "")
        if not ip:
            continue
        
        # Get extra details from the miner directly
        details = get_miner_details(ip)
        
        machine = {
            "ip": ip,
            "worker_name": miner.get("name", ""),
            "hashrate": miner.get("hashrate", 0),
            "status": miner.get("status", "unknown"),
            "model": miner.get("type", "Unknown"),
        }
        
        # Merge live details if we got them
        if details:
            machine["temperature"] = details.get("temperature", 0)
            machine["fan_speed"] = details.get("fan_speed", 0)
            machine["power"] = details.get("power", 0)
            machine["uptime"] = details.get("uptime", "")
            machine["pool"] = details.get("pool", "")
            if details.get("worker_name"):
                machine["worker_name"] = details["worker_name"]
            if details.get("model"):
                machine["model"] = details["model"]
        
        machines.append(machine)
    
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
    """Execute a command on a machine via CGMiner API"""
    ip = cmd.get("ip", "")
    action = cmd.get("action", "")
    result = "OK"
    
    try:
        if action == "reboot":
            # Try HTTP reboot for Bitmain/Antminer (most common)
            try:
                import urllib3
                urllib3.disable_warnings()
                r = requests.post(f"http://{ip}/cgi-bin/reboot.cgi", 
                                auth=("root", "root"), timeout=10)
                result = f"HTTP reboot sent (status {r.status_code})"
            except:
                try:
                    # Try digest auth (some firmware versions)
                    from requests.auth import HTTPDigestAuth
                    r = requests.post(f"http://{ip}/cgi-bin/reboot.cgi",
                                    auth=HTTPDigestAuth("root", "root"), timeout=10)
                    result = f"HTTP digest reboot sent (status {r.status_code})"
                except:
                    # Last resort: CGMiner API restart
                    response = send_cgminer_command(ip, "restart")
                    if response:
                        result = "CGMiner restart command sent"
                    else:
                        result = "Failed - could not connect to miner"
            print(f"  -> {result}")
            
        elif action == "change_worker":
            new_worker = cmd.get("params", {}).get("worker_name", "")
            # This requires pool configuration change - varies by miner
            result = f"Worker change to {new_worker} - requires manual config on miner web UI"
            print(f"  -> {result}")
            
        elif action == "change_pool":
            new_pool = cmd.get("params", {}).get("pool_url", "")
            # Try addpool + switchpool commands
            send_cgminer_command(ip, f"addpool|{new_pool}")
            result = f"Pool change to {new_pool} - addpool command sent"
            print(f"  -> {result}")
            
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
    print(f"  Config: {MINEFLEET_CONFIG}")
    print(f"  Sync every {SYNC_INTERVAL}s")
    print("=" * 50)
    print()
    
    while True:
        # 1. Read machine data from MineFleet config + live CGMiner data
        machines = get_machine_data()
        
        # 2. Push to wkbeast.org
        if machines:
            push_data(machines)
        else:
            print("[SYNC] No machines found. Check that minefleet_monitor.py has scanned miners.")
        
        # 3. Check for commands from wkbeast.org
        check_commands()
        
        print(f"[WAIT] Next sync in {SYNC_INTERVAL}s...")
        print()
        time.sleep(SYNC_INTERVAL)


if __name__ == "__main__":
    main()
