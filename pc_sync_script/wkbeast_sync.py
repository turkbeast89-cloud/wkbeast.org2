"""
WKBeast Machine Sync Script
============================
Reads machine data from MineFleet Monitor's config file and pushes to wkbeast.org
Also pulls commands (reboot, etc.) and executes them via CGMiner API.

Can run on MULTIPLE PCs / farms - each farm sets a different FARM_NAME.

Setup:
1. pip install requests
2. Place this file in the SAME FOLDER as wkbeast_config.json
3. Edit FARM_NAME below to identify which farm this is
4. Run: python wkbeast_sync.py
"""

import requests
import time
import json
import os
import socket

# ============ CONFIG ============
WKBEAST_URL = "https://wkbeast-org-1.onrender.com"  # Backend API URL (DO NOT CHANGE)
API_KEY = "wkbeast2025sync"                           # Auth key (DO NOT CHANGE)
SYNC_INTERVAL = 120                                    # Push data every 2 minutes
FARM_NAME = "Main Farm"                                # CHANGE THIS PER FARM (e.g., "Main Farm", "Farm 2", "Lebanon Farm")
MINER_USER = "root"                                    # Miner web login username
MINER_PASS = "root"                                    # Miner web login password

# Path to config file (same folder as this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "wkbeast_config.json")
# ================================


def send_cgminer_command(ip, command, port=4028, timeout=3):
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
        
        if stats and "STATS" in stats:
            for stat in stats["STATS"]:
                for key in ["temp1", "temp2_6", "temp_pcb1", "Temperature"]:
                    if key in stat and stat[key]:
                        try:
                            result["temperature"] = max(result["temperature"], int(float(stat[key])))
                        except:
                            pass
                
                for key in ["fan1", "fan_num", "Fan Speed In", "Fan1"]:
                    if key in stat and stat[key]:
                        try:
                            result["fan_speed"] = max(result["fan_speed"], int(float(stat[key])))
                        except:
                            pass
                
                if "Type" in stat:
                    result["model"] = stat["Type"]
                elif "miner_type" in stat:
                    result["model"] = stat["miner_type"]
                
                if "Elapsed" in stat:
                    elapsed = int(stat["Elapsed"])
                    hours = elapsed // 3600
                    mins = (elapsed % 3600) // 60
                    result["uptime"] = f"{hours}h {mins}m"
                    
                if "Power" in stat:
                    try:
                        result["power"] = int(float(stat["Power"]))
                    except:
                        pass
        
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
    """Read machine data from config file"""
    machines = []
    
    if not os.path.exists(CONFIG_FILE):
        print(f"[WARN] Config not found at: {CONFIG_FILE}")
        return machines
    
    try:
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
    except Exception as e:
        print(f"[ERROR] Could not read config: {e}")
        return machines
    
    miners = config.get("miners", [])
    print(f"[INFO] Found {len(miners)} miners in config")
    
    for miner in miners:
        ip = miner.get("ip", "")
        if not ip:
            continue
        
        machine = {
            "ip": ip,
            "worker_name": miner.get("name", ""),
            "hashrate": miner.get("hashrate", 0),
            "status": miner.get("status", "unknown"),
            "model": miner.get("type", "Unknown"),
            "farm": FARM_NAME,
            "temperature": 0,
            "fan_speed": 0,
            "power": 0,
            "uptime": "",
            "pool": "",
        }
        
        # Try to get live details (quick timeout, don't block)
        try:
            details = get_miner_details(ip)
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
        except:
            pass
        
        machines.append(machine)
        
        # Print progress every 10 machines
        if len(machines) % 10 == 0:
            print(f"  Scanned {len(machines)}/{len(miners)} miners...")
    
    return machines


def push_data(machines):
    """Push machine data to wkbeast.org"""
    try:
        resp = requests.post(
            f"{WKBEAST_URL}/api/machine-data/push",
            json={"api_key": API_KEY, "machines": machines, "farm": FARM_NAME},
            timeout=15
        )
        data = resp.json()
        if data.get("success"):
            print(f"[SYNC] Pushed {data.get('synced', 0)} machines ({FARM_NAME})")
        else:
            print(f"[SYNC ERROR] {data.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"[SYNC ERROR] Could not reach server: {e}")


def check_commands():
    """Check for pending commands from wkbeast.org"""
    try:
        resp = requests.get(
            f"{WKBEAST_URL}/api/machine-data/commands",
            params={"api_key": API_KEY, "farm": FARM_NAME},
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
    result = "OK"
    
    try:
        if action == "reboot":
            # Try Digest auth first (newer Bitmain firmware)
            try:
                from requests.auth import HTTPDigestAuth
                r = requests.post(f"http://{ip}/cgi-bin/reboot.cgi",
                                auth=HTTPDigestAuth(MINER_USER, MINER_PASS), timeout=10)
                if r.status_code == 200:
                    result = f"Rebooting {ip}!"
                else:
                    # Try Basic auth (older firmware)
                    r = requests.post(f"http://{ip}/cgi-bin/reboot.cgi",
                                    auth=(MINER_USER, MINER_PASS), timeout=10)
                    if r.status_code == 200:
                        result = f"Rebooting {ip}!"
                    else:
                        result = f"Failed - HTTP {r.status_code}"
            except Exception as e:
                # Last resort: CGMiner API
                response = send_cgminer_command(ip, "restart")
                result = "CGMiner restart sent" if response else f"Failed: {str(e)}"
            print(f"  -> {result}")
            
        elif action == "change_worker":
            new_worker = cmd.get("params", {}).get("worker_name", "")
            pool_url = cmd.get("params", {}).get("pool_url", "")
            try:
                # Get current pools to find which one to modify
                pools_data = send_cgminer_command(ip, "pools")
                if pools_data and "POOLS" in pools_data:
                    # Find active pool
                    for pool in pools_data["POOLS"]:
                        if pool.get("Stratum Active") or pool.get("Status") == "Alive":
                            pool_id = pool.get("POOL", 0)
                            current_url = pool.get("URL", "")
                            # Remove old pool and add new one with new worker
                            if pool_url:
                                send_cgminer_command(ip, f"addpool|{pool_url},{new_worker},x")
                            else:
                                send_cgminer_command(ip, f"addpool|{current_url},{new_worker},x")
                            # Switch to the new pool
                            send_cgminer_command(ip, f"switchpool|{len(pools_data['POOLS'])}")
                            result = f"Worker changed to {new_worker} on {ip}"
                            break
                    else:
                        result = f"No active pool found on {ip}"
                else:
                    # Try direct approach - some firmwares support this
                    from requests.auth import HTTPDigestAuth
                    r = requests.post(f"http://{ip}/cgi-bin/set_miner_conf.cgi",
                                    auth=HTTPDigestAuth(MINER_USER, MINER_PASS),
                                    json={"pools": [{"url": pool_url or "stratum+tcp://ltc.viabtc.com:3002", "user": new_worker, "pass": "x"}]},
                                    timeout=10)
                    result = f"Config update sent to {ip} (status {r.status_code})"
            except Exception as e:
                result = f"Failed to change worker: {str(e)}"
            print(f"  -> {result}")
            
        elif action == "change_pool":
            new_pool = cmd.get("params", {}).get("pool_url", "")
            send_cgminer_command(ip, f"addpool|{new_pool}")
            result = f"Pool change to {new_pool} - addpool command sent"
            print(f"  -> {result}")
            
    except Exception as e:
        result = f"Error: {str(e)}"
        print(f"  -> ERROR: {e}")
    
    # Report back
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
    print(f"  Farm: {FARM_NAME}")
    print(f"  Server: {WKBEAST_URL}")
    print(f"  Config: {CONFIG_FILE}")
    print(f"  Sync every {SYNC_INTERVAL}s")
    print("=" * 50)
    print()
    
    while True:
        machines = get_machine_data()
        
        if machines:
            push_data(machines)
        else:
            print("[SYNC] No machines found.")
        
        check_commands()
        
        print(f"[WAIT] Next sync in {SYNC_INTERVAL}s...")
        print()
        time.sleep(SYNC_INTERVAL)


if __name__ == "__main__":
    main()
