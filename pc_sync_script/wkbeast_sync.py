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


def send_cgminer_command(ip, command, parameter=None, port=4028, timeout=3):
    """Send a command to CGMiner API.
    Correct CGMiner protocol: {"command": "addpool", "parameter": "url,user,pass"}
    NOT {"command": "addpool|url,user,pass"} (that's a common mistake).
    """
    try:
        payload = {"command": command}
        if parameter is not None:
            payload["parameter"] = parameter
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((ip, port))
        sock.send(json.dumps(payload).encode() + b'\n')

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
    except Exception:
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
    """Push machine data in batches to avoid timeout"""
    batch_size = 25
    total_synced = 0
    
    for i in range(0, len(machines), batch_size):
        batch = machines[i:i + batch_size]
        try:
            resp = requests.post(
                f"{WKBEAST_URL}/api/machine-data/push",
                json={"api_key": API_KEY, "machines": batch, "farm": FARM_NAME},
                timeout=30
            )
            data = resp.json()
            if data.get("success"):
                total_synced += data.get("synced", 0)
            else:
                print(f"[SYNC ERROR] Batch {i//batch_size + 1}: {data.get('error', 'Unknown error')}")
        except Exception as e:
            print(f"[SYNC ERROR] Batch {i//batch_size + 1}: {e}")
    
    print(f"[SYNC] Pushed {total_synced} machines ({FARM_NAME})")


def check_commands():
    """Check for pending commands from wkbeast.org"""
    try:
        resp = requests.get(
            f"{WKBEAST_URL}/api/machine-data/commands",
            params={"api_key": API_KEY, "farm": FARM_NAME},
            timeout=30
        )
        commands = resp.json()
        
        for cmd in commands:
            print(f"[COMMAND] {cmd.get('action')} for {cmd.get('ip')}")
            execute_command(cmd)
            
    except Exception as e:
        print(f"[CMD ERROR] {e}")


def _http_auth_request(method, url, **kwargs):
    """Try HTTP Digest auth first, fall back to Basic. Returns (response, auth_name)."""
    from requests.auth import HTTPDigestAuth, HTTPBasicAuth
    last_err = None
    for auth_name, auth in [("Digest", HTTPDigestAuth(MINER_USER, MINER_PASS)),
                            ("Basic", HTTPBasicAuth(MINER_USER, MINER_PASS))]:
        try:
            r = requests.request(method, url, auth=auth, **kwargs)
            # 401 means wrong auth scheme - try the next one
            if r.status_code != 401:
                return r, auth_name
            last_err = f"HTTP 401 with {auth_name}"
        except Exception as e:
            last_err = f"{auth_name} failed: {e}"
    raise Exception(last_err or "All auth attempts failed")


def antminer_get_conf(ip, timeout=15):
    """GET miner config via Antminer web UI. Returns parsed JSON config or None."""
    try:
        r, auth_name = _http_auth_request("GET", f"http://{ip}/cgi-bin/get_miner_conf.cgi", timeout=timeout)
        if r.status_code == 200:
            try:
                return r.json(), auth_name
            except Exception:
                # Some firmwares prepend JS or non-JSON noise
                txt = r.text.strip()
                start = txt.find("{")
                end = txt.rfind("}")
                if start != -1 and end != -1:
                    return json.loads(txt[start:end + 1]), auth_name
        return None, auth_name
    except Exception as e:
        print(f"  [HTTP] get_miner_conf failed on {ip}: {e}")
        return None, None


def antminer_set_conf(ip, conf, auth_name="Digest", timeout=15):
    """POST miner config via Antminer web UI. Returns (ok, status_code, body)."""
    from requests.auth import HTTPDigestAuth, HTTPBasicAuth
    auth = HTTPDigestAuth(MINER_USER, MINER_PASS) if auth_name == "Digest" else HTTPBasicAuth(MINER_USER, MINER_PASS)
    url = f"http://{ip}/cgi-bin/set_miner_conf.cgi"

    # Most Antminer firmwares accept JSON body with the FULL config dict.
    try:
        r = requests.post(url, auth=auth, json=conf, timeout=timeout)
        if r.status_code == 200:
            return True, 200, r.text[:200]
        if r.status_code != 401:
            # Try form-encoded as a fallback (very old firmware)
            form = {}
            pools = conf.get("pools", [])
            for i, p in enumerate(pools, start=1):
                form[f"_ant_pool{i}url"] = p.get("url", "")
                form[f"_ant_pool{i}user"] = p.get("user", "")
                form[f"_ant_pool{i}pw"] = p.get("pass", "")
            for k, v in conf.items():
                if k != "pools":
                    form[f"_ant_{k}"] = "true" if v is True else ("false" if v is False else v)
            r2 = requests.post(url, auth=auth, data=form, timeout=timeout)
            return (r2.status_code == 200), r2.status_code, r2.text[:200]
        return False, r.status_code, r.text[:200]
    except Exception as e:
        return False, 0, str(e)


def change_worker_via_http(ip, new_worker, pool_url=""):
    """Update worker name on all pool entries via Antminer web UI (persistent)."""
    conf, auth_name = antminer_get_conf(ip)
    if not conf or "pools" not in conf:
        return False, "Could not read miner config (firmware not Antminer-compatible?)"

    pools = conf.get("pools", [])
    if not pools:
        return False, "Miner has no pools configured"

    # Mutate every pool's user to the new worker name. Keep URLs unless pool_url given.
    for p in pools:
        if pool_url:
            p["url"] = pool_url
        p["user"] = new_worker
        # Keep existing password, default to "x" if missing
        if not p.get("pass"):
            p["pass"] = "x"

    print(f"  [HTTP] Updating {len(pools)} pool(s) on {ip} -> user={new_worker}")
    ok, status, body = antminer_set_conf(ip, conf, auth_name=auth_name or "Digest")
    if ok:
        return True, "Web UI accepted new config (HTTP 200)"
    return False, f"Web UI rejected config (HTTP {status}): {body}"


def change_worker_via_cgminer(ip, new_worker, pool_url=""):
    """Fallback: live-switch pools via CGMiner API. NOT persistent across reboot."""
    pools_data = send_cgminer_command(ip, "pools")
    if not pools_data or "POOLS" not in pools_data:
        return False, "CGMiner API not reachable on port 4028"

    pools = pools_data["POOLS"]
    if not pools:
        return False, "No pools returned by CGMiner"

    # Pick URL: explicit pool_url > active pool URL > first pool URL
    target_url = pool_url
    if not target_url:
        for p in pools:
            if p.get("Stratum Active") or p.get("Status") == "Alive":
                target_url = p.get("URL", "")
                break
    if not target_url and pools:
        target_url = pools[0].get("URL", "")
    if not target_url:
        return False, "Could not determine pool URL"

    # Add the new pool. Note CORRECT protocol: parameter as separate field.
    add_resp = send_cgminer_command(ip, "addpool", parameter=f"{target_url},{new_worker},x")
    if not add_resp:
        return False, "addpool returned no response (write-API likely disabled in miner config)"

    # Check status code
    status = (add_resp.get("STATUS") or [{}])[0]
    if status.get("STATUS") not in ("S", "I"):
        return False, f"addpool rejected: {status.get('Msg', 'unknown')}"

    # New pool index = previous count
    new_idx = len(pools)
    sw_resp = send_cgminer_command(ip, "switchpool", parameter=str(new_idx))
    if not sw_resp:
        return False, "switchpool returned no response"

    sw_status = (sw_resp.get("STATUS") or [{}])[0]
    if sw_status.get("STATUS") not in ("S", "I"):
        return False, f"switchpool rejected: {sw_status.get('Msg', 'unknown')}"

    # Best-effort: disable old pools so miner doesn't fall back
    for i in range(new_idx):
        send_cgminer_command(ip, "disablepool", parameter=str(i))

    return True, f"CGMiner switched to pool {new_idx} (worker={new_worker}) — NOT PERSISTENT, redo via web UI for permanence"


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
            params = cmd.get("params", {}) or {}
            new_worker = params.get("worker_name", "").strip()
            pool_url = params.get("pool_url", "").strip()

            if not new_worker:
                result = "Failed: worker_name is empty"
                print(f"  -> {result}")
            else:
                print(f"  [WORKER] {ip} -> {new_worker}" + (f" @ {pool_url}" if pool_url else ""))

                # Primary: HTTP web UI (persistent across reboots)
                ok, msg = change_worker_via_http(ip, new_worker, pool_url)
                if ok:
                    result = f"OK (web UI): {msg}"
                else:
                    print(f"  [HTTP fallback reason] {msg}")
                    # Fallback: CGMiner live switch (not persistent)
                    ok2, msg2 = change_worker_via_cgminer(ip, new_worker, pool_url)
                    if ok2:
                        result = f"OK (CGMiner): {msg2}"
                    else:
                        result = f"FAILED. HTTP: {msg} | CGMiner: {msg2}"
                print(f"  -> {result}")

        elif action == "change_pool":
            new_pool = cmd.get("params", {}).get("pool_url", "")
            resp = send_cgminer_command(ip, "addpool", parameter=f"{new_pool},x,x")
            result = f"Pool change to {new_pool} — addpool {'sent' if resp else 'failed'}"
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
