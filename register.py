import sys
import os
import argparse
from relay.api import client as http_client
from relay.shared import config

def get_client():
    cfg = config.read_config()
    manager_url = config.cfg_get(cfg, "manager.url")
    key_path = config.cfg_get(cfg, "auth.key_path") or config.default_key_path()
    
    if not manager_url:
        print("Error: Manager URL not found in config.")
        return None
        
    return http_client.Client(manager_url, key_path)

def register_project(path):
    client = get_client()
    if not client: return

    abs_path = os.path.abspath(path)
    print(f"Registering project from: {abs_path}")
    
    payload = {
        "id": "sandbox",
        "source": {
            "type": "dir",
            "path": abs_path
        }
    }
    try:
        res = client.post("/v1/projects", payload)
        print("Result:", res)
    except Exception as e:
        print(f"Error: {e}")

def trigger_deploy(deploy_id):
    client = get_client()
    if not client: return

    print(f"Triggering deploy: {deploy_id}")
    payload = {
        "deploy": deploy_id,
        "force": False,
        "branch": "local" 
    }
    try:
        res = client.post("/v1/deploys/apply", payload)
        print("Result:", res)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command")
    
    reg = subparsers.add_parser("register")
    reg.add_argument("path", default=".", nargs="?")

    dep = subparsers.add_parser("deploy")
    dep.add_argument("id")  # e.g., sandbox.dev

    args = parser.parse_args()

    if args.command == "register":
        register_project(args.path)
    elif args.command == "deploy":
        trigger_deploy(args.id)
    else:
        parser.print_help()
