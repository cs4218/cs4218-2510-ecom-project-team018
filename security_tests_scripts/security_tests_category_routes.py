"""
security_tests_categoryRoutes.py
Security tests for Category routes (MERN App)
Each record = 1 single security assertion test.
"""

import os, json, time
from concurrent.futures import ThreadPoolExecutor
import requests

# -------------------------
# Configuration
# -------------------------
BASE = "http://localhost:3000"
AUTH_API = f"{BASE}/api/v1/auth"
CAT_API  = f"{BASE}/api/v1/category"
TIMEOUT = 10
REPORT_DIR = "./reports_category"

ADMIN_EMAIL = "brendansoh@gmail.com"
ADMIN_PASSWORD = "Password"
USER_EMAIL = "brendansoh1@gmail.com"
USER_PASSWORD = "Password"

# -------------------------
# Setup Reporting
# -------------------------
os.makedirs(REPORT_DIR, exist_ok=True)

results = {
    "meta": {
        "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "base": BASE,
        "api": CAT_API
    },
    "tests": []
}

def record(name, ok, status=None, summary=None, details=None, endpoint=None):
    entry = {
        "name": name,
        "ok": bool(ok),
        "status_code": status,
        "summary": summary,
        "details": details,
        "endpoint": endpoint,
        "time": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    results["tests"].append(entry)
    print(f"> {entry['name']} => {entry['ok']} ({status}) - {summary}")

# -------------------------
# Helpers
# -------------------------
def get_token(email, password):
    url = f"{AUTH_API}/login"
    r = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    if r.status_code != 200: return None
    return r.json().get("token")

def authed(method, url, token, **kw):
    headers = kw.pop("headers", {})
    if token: headers["Authorization"] = token
    return getattr(requests, method)(url, headers=headers, timeout=TIMEOUT, **kw)

# Methods
def GET(url, token=None, **kw): return authed("get", url, token, **kw)
def POST(url, token=None, **kw): return authed("post", url, token, **kw)
def PUT(url, token=None, **kw): return authed("put", url, token, **kw)
def DELETE(url, token=None, **kw): return authed("delete", url, token, **kw)

# -------------------------
# Get Tokens
# -------------------------
ADMIN_TOKEN = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
USER_TOKEN  = get_token(USER_EMAIL, USER_PASSWORD)

# -------------------------
# RBAC Tests
# -------------------------
def rbac_tests():
    create_url = f"{CAT_API}/create-category"
    
    # Admin creates baseline category
    base_name = f"cat_{int(time.time())}"
    resp = POST(create_url, ADMIN_TOKEN, json={"name": base_name})
    categoryID = resp.json().get("category", {}).get("_id", None)

    record("RBAC - Admin create allowed",
           resp.status_code == 201, resp.status_code,
           "Admin should create category", "/create-category")

    # --- No token
    resp = POST(create_url, None, json={"name": "x"})
    record("RBAC - Create w/o token denied", resp.status_code == 401, resp.status_code, "Expect 401", "/create-category")

    # --- User token
    resp = POST(create_url, USER_TOKEN, json={"name": "x"})
    record("RBAC - User create denied", resp.status_code == 401, resp.status_code, "Expect 401", "/create-category")

    # --- Admin create again allowed
    resp = POST(create_url, ADMIN_TOKEN, json={"name": f"{base_name}_2"})
    record("RBAC - Admin create allowed again", resp.status_code == 201, resp.status_code, "Expect 201", "/create-category")

    # If no category id, cannot test update/delete RBAC
    if not categoryID:
        record("RBAC - Skip update/delete (no categoryID)", True, None, "Baseline create did not return _id")
        return

    # --- Update tests
    update_url = f"{CAT_API}/update-category/{categoryID}"
    resp = PUT(update_url, None, json={"name": "bad"})
    record("RBAC - Update w/o token denied", resp.status_code == 401, resp.status_code, "Expect 401", "/update-category")

    resp = PUT(update_url, USER_TOKEN, json={"name": "bad"})
    record("RBAC - Update user denied", resp.status_code == 401, resp.status_code, "Expect 401", "/update-category")

    resp = PUT(update_url, ADMIN_TOKEN, json={"name": "ok_admin"})
    record("RBAC - Update admin allowed", resp.status_code == 200, resp.status_code, "Expect 200", "/update-category")

    # --- Delete tests
    del_url = f"{CAT_API}/delete-category/{categoryID}"
    resp = DELETE(del_url, None)
    record("RBAC - Delete w/o token denied", resp.status_code == 401, resp.status_code, "Expect 401", "/delete-category")

    resp = DELETE(del_url, USER_TOKEN)
    record("RBAC - Delete user denied", resp.status_code == 401, resp.status_code, "Expect 401", "/delete-category")

    resp = DELETE(del_url, ADMIN_TOKEN)
    record("RBAC - Delete admin allowed", resp.status_code == 200, resp.status_code, "Expect 200", "/delete-category")


# -------------------------
# JWT Corruption Test
# -------------------------
def jwt_corruption():
    url = f"{CAT_API}/create-category"
    bad = ADMIN_TOKEN + "XYZ"
    resp = POST(url, bad, json={"name": "badtoken"})
    record("JWT - Corrupted token denied", resp.status_code == 401, resp.status_code, "Expect 401", "/create-category")


# -------------------------
# XSS Tests
# -------------------------
def xss_tests():
    create_url = f"{CAT_API}/create-category"
    list_url = f"{CAT_API}/get-category"

    for payload in ['<script>alert(1)</script>', '<svg/onload=alert(1337)>']:
        name = f"{payload}_{time.time()}"
        
        # Reflected
        resp = POST(create_url, ADMIN_TOKEN, json={"name": name})
        reflected = payload in resp.text
        record(f"XSS - Reflected ({payload})", not reflected and resp.status_code in (200,201),
               resp.status_code, f"No reflected payload", "/create-category",
               details=f"reflected={reflected}")

        # Stored
        r2 = requests.get(list_url, timeout=TIMEOUT)
        stored = payload in r2.text
        record(f"XSS - Stored ({payload})", not stored,
               r2.status_code, "No raw payload should persist in API", "/get-category",
               details=f"stored={stored}")


# -------------------------
# NoSQL Injection Tests
# -------------------------
def nosql_tests():
    url = f"{CAT_API}/create-category"
    payloads = [
        {"name": {"$gt": ""}},
        {"name": {"$regex": ".*"}},
        {"$or": [{"name": {"$ne": ""}}]}
    ]

    for p in payloads:
        resp = POST(url, ADMIN_TOKEN, json=p)
        ok = resp.status_code not in (200, 201)
        record(f"NoSQL - Name Payload {str(p)}", ok, resp.status_code,
               "DB should reject operator injection", "/create-category",
               details=str(p))


# -------------------------
# CORS Test
# -------------------------
def cors_test():
    evil = "http://evil.com"
    headers = {"Origin": evil, "Authorization": ADMIN_TOKEN}
    resp = requests.get(f"{CAT_API}/get-category", headers=headers, timeout=TIMEOUT)

    acao = resp.headers.get("Access-Control-Allow-Origin", "")
    ok = (acao != "*" and acao != evil)
    record("CORS - Malicious origin rejected", ok, resp.status_code,
           f"ACAO={acao}", "/get-category")


# -------------------------
# Slug Abuse Tests
# -------------------------
def slug_tests():
    slugs = [
        "<script>alert(1)</script>",
        "%24ne%3A%22%22",
        "../../etc/passwd"
    ]
    for s in slugs:
        resp = requests.get(f"{CAT_API}/single-category/{s}", timeout=TIMEOUT)
        ok = resp.status_code in (200,404)
        record(f"Slug Abuse - {s}", ok, resp.status_code,
               "No server crash / traversal", "/single-category")


# -------------------------
# Rate Limit (single summary)
# -------------------------
def rate_limit_test():
    url = f"{CAT_API}/create-category"
    prefix = f"rl_{int(time.time())}_"

    def run(i):
        try:
            return POST(url, ADMIN_TOKEN, json={"name": prefix+str(i)}).status_code
        except:
            return "ERR"

    with ThreadPoolExecutor(max_workers=50) as ex:
        codes = list(ex.map(run, range(50)))

    ok = 429 in codes
    record("RATE LIMIT - Burst create", ok, status=None,
           summary="Expect at least 1x 429 response", details=str(codes))


# -------------------------
# MAIN
# -------------------------
def main():
    if not ADMIN_TOKEN or not USER_TOKEN:
        record("Auth Failure - cannot run tests", False, None, "Missing tokens")
    else:
        rbac_tests()
        jwt_corruption()
        xss_tests()
        nosql_tests()
        cors_test()
        slug_tests()
        rate_limit_test()

    with open(os.path.join(REPORT_DIR,"results.json"),"w") as f:
        f.write(json.dumps(results, indent=2))

    print("\n✅ Security tests done. Results saved.")

if __name__ == "__main__":
    main()
