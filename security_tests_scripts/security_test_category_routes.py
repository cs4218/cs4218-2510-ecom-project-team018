"""
security_test_category_routes.py
Security tests for Category routes (MERN App)

Rules Based Access Control Test for all guarded endpoints
JSON Web Token Corruption Tests
Reflected and Stored XSS Attack Tests
NoSQL Injection Tests
Cross Origin Resource Sharing Test
DDOS Protection with Rate Limit Test
Mass Assignment Vulnerability Test for ORM Layer
"""

import os, json, time
from concurrent.futures import ThreadPoolExecutor
import requests

# -------------------------
# Configuration
# -------------------------
BASE = "http://localhost:3000"
AUTH_API = f"{BASE}/api/v1/auth"
CATEGORY_API  = f"{BASE}/api/v1/category"
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
        "api": CATEGORY_API
    },
    "tests": []
}

def record(name, ok, status_code=None, summary=None, details=None, endpoint=None):
    entry = {
        "name": name,
        "ok": bool(ok),
        "status_code": status_code,
        "summary": summary,
        "details": details,
        "endpoint": endpoint,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    }
    results["tests"].append(entry)
    print(f"[{entry['timestamp']}] {name} => ok={entry['ok']} status={status_code} summary={summary} endpoint={endpoint}")

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

def GET(url, token=None, **kw): return authed("get", url, token, **kw)
def POST(url, token=None, **kw): return authed("post", url, token, **kw)
def PUT(url, token=None, **kw): return authed("put", url, token, **kw)
def DELETE(url, token=None, **kw): return authed("delete", url, token, **kw)

def create_update_url(categoryID):
    return f"{CATEGORY_API}/update-category/{categoryID}"

# -------------------------
# Get Tokens
# -------------------------
ADMIN_TOKEN = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
USER_TOKEN  = get_token(USER_EMAIL, USER_PASSWORD)

# -------------------------
# Rules Based Access Control Tests (/create-category, /update-category/:id, /delete-category/:id)
# -------------------------

created_category_id = []
create_url = f"{CATEGORY_API}/create-category"
test_category_name = f"cat_{int(time.time())}"

def rbac_test_admin_create_category():
    # Unique Category Name for Tests Only
    resp = POST(create_url, ADMIN_TOKEN, json={"name": test_category_name})
    
    print(resp.text)
    record(
        name="RBAC - Admin create category allowed",
        ok=(resp.status_code == 201),
        status_code=resp.status_code,
        summary="Admin should create category",
        endpoint="/create-category"
    )
    
    categoryID = None
    
    try:
        categoryID = resp.json().get("category", {}).get("_id")
    except Exception as e:
        print(f"Error extracting category ID from response: {e}")
    
    if categoryID != None:
        created_category_id.append(categoryID)
    
def rbac_test_user_create_category():
    # Unique Category Name for Tests Only
    resp = POST(create_url, USER_TOKEN, json={"name": test_category_name})
    
    record(
        name="RBAC - User create category not allowed",
        ok=(resp.status_code == 401),
        status_code=resp.status_code,
        summary="User should not create category",
        endpoint="/create-category"
    )
    
    # Defensive Coding In Case Category was created
    categoryID = None
    try:
        categoryID = resp.json().get("category", {}).get("_id")
    except:
        pass
    
    if categoryID != None:
        created_category_id.append(categoryID)

def rbac_test_no_token_create_category():
    # Unique Category Name for Tests Only
    resp = requests.post(create_url, json={"name": test_category_name}, timeout=TIMEOUT)
    
    record(
        name="RBAC - No Token create category not allowed",
        ok=(resp.status_code == 401),
        status_code=resp.status_code,
        summary="No Token should not create category",
        endpoint="/create-category"
    )
    
    # Defensive Coding In Case Category was created
    categoryID = None
    try:
        categoryID = resp.json().get("category", {}).get("_id")
    except:
        pass
    
    if categoryID != None:
        created_category_id.append(categoryID)
        
def rbac_admin_update_category():
    unique_name = f"upd_admin_{int(time.time())}"
    resp = PUT(create_update_url(created_category_id[0]), ADMIN_TOKEN, json={"name": unique_name})
    
    record(
        name="RBAC - Admin update category allowed",
        ok=(resp.status_code == 200),
        status_code=resp.status_code,
        summary="Admin should update category",
        endpoint="/update-category"
    )

def rbac_user_update_category():
    unique_name = f"upd_admin_{int(time.time())}"
    resp = PUT(create_update_url(created_category_id[0]), USER_TOKEN, json={"name": unique_name})
    
    record(
        name="RBAC - User update category not allowed",
        ok=(resp.status_code == 401),
        status_code=resp.status_code,
        summary="User should not update category",
        endpoint="/update-category"
    )

def rbac_no_token_update_category():
    unique_name = f"upd_admin_{int(time.time())}"
    resp = requests.put(create_update_url(created_category_id[0]), json={"name": unique_name}, timeout=TIMEOUT)
    
    record(
        name="RBAC - No Token update category not allowed",
        ok=(resp.status_code == 401),
        status_code=resp.status_code,
        summary="No Token should not update category",
        endpoint="/update-category"
    )
    
def rbac_admin_delete_category():
    cid = created_category_id[0]
    resp = DELETE(f"{CATEGORY_API}/delete-category/{cid}", ADMIN_TOKEN)

    record(
        name="RBAC - Admin delete category allowed",
        ok=(resp.status_code == 200),
        status_code=resp.status_code,
        summary="Admin should delete category",
        endpoint=f"/delete-category/{cid}"
    )

def rbac_user_delete_category():
    # Need a new category so user isn't trying to delete an already deleted one
    resp_create = POST(f"{CATEGORY_API}/create-category", ADMIN_TOKEN, json={"name": f"user_delete_{time.time()}"})
    cid = resp_create.json().get("category", {}).get("_id")

    resp = DELETE(f"{CATEGORY_API}/delete-category/{cid}", USER_TOKEN)

    record(
        name="RBAC - User delete category not allowed",
        ok=(resp.status_code == 401),
        status_code=resp.status_code,
        summary="User should not delete category",
        endpoint=f"/delete-category/{cid}"
    )
    
    created_category_id.append(cid)

def rbac_no_token_delete_category():
    # Need a new category to test on
    resp_create = POST(f"{CATEGORY_API}/create-category", ADMIN_TOKEN, json={"name": f"no_token_del_{time.time()}"})
    cid = resp_create.json().get("category", {}).get("_id")

    resp = requests.delete(f"{CATEGORY_API}/delete-category/{cid}", timeout=TIMEOUT)

    record(
        name="RBAC - No Token delete category not allowed",
        ok=(resp.status_code == 401),
        status_code=resp.status_code,
        summary="No token should not delete category",
        endpoint=f"/delete-category/{cid}"
    )
    
    created_category_id.append(cid)


def clean_up_test_category():
        for cid in created_category_id:
            try:
                DELETE(f"{CATEGORY_API}/delete-category/{cid}", ADMIN_TOKEN)
            except Exception:
                print("Warning Failure to delete test created categories, please reset data in MongoDB")
                
def rbac_tests():
    rbac_test_admin_create_category()
    rbac_test_user_create_category()
    rbac_test_no_token_create_category()

    rbac_admin_update_category()
    rbac_user_update_category()
    rbac_no_token_update_category()

    rbac_admin_delete_category()
    rbac_user_delete_category()
    rbac_no_token_delete_category()
    clean_up_test_category()

# -------------------------
# JWT Corruption
# -------------------------
def jwt_corruption():
    url = f"{CATEGORY_API}/create-category"
    bad = ADMIN_TOKEN + "BAD"
    resp = POST(url, bad, json={"name": "badtoken"})
    record(
        name="JWT - Corrupted token rejected",
        ok=(resp.status_code == 401),
        status_code=resp.status_code,
        summary="Expect 401",
        endpoint="/create-category"
    )

# -------------------------
# Reflected and Stored XSS Tests (/create-category, /list-category)
# -------------------------
def xss_tests():
    list_url = f"{CATEGORY_API}/get-category"

    payloads = ['<script>alert(1)</script>', '<svg/onload=alert(1337)>']

    for payload in payloads:
        name = f"{payload}_{time.time()}"

        # reflected
        resp = POST(create_url, ADMIN_TOKEN, json={"name": name})
        
        cid = resp.json().get("category", {}).get("_id")
        reflected = payload in (resp.text or "")

        record(
            name=f"XSS - Reflected ({payload})",
            ok=(not reflected and resp.status_code in (200,201)),
            status_code=resp.status_code,
            summary="Payload must not appear raw",
            details=f"reflected={reflected}",
            endpoint="/create-category"
        )

        # stored
        r2 = requests.get(list_url, timeout=TIMEOUT)
        stored = payload in (r2.text or "")

        record(
            name=f"XSS - Stored ({payload})",
            ok=(not stored),
            status_code=r2.status_code,
            summary="Payload must not be readable via API",
            details=f"stored={stored}",
            endpoint="/get-category"
        )
        
        # Delete Created Category - cleanup
        if cid:
            try:
                DELETE(f"{CATEGORY_API}/delete-category/{cid}", ADMIN_TOKEN)
            except Exception:
                print(f"Warning: Failed to clean XSS test category {cid}")
        

# -------------------------
# NoSQL Tests
# -------------------------
def nosql_tests():
    url = f"{CATEGORY_API}/create-category"
    payloads = [
        {"name": {"$gt": ""}},
        {"name": {"$regex": ".*"}},
        {"$or": [{"name": {"$ne": ""}}]}
    ]
    for p in payloads:
        resp = POST(url, ADMIN_TOKEN, json=p)
        record(
            name=f"NoSQL Injection {p}",
            ok=(resp.status_code not in (200,201)),
            status_code=resp.status_code,
            summary="Reject mongo operators",
            details=f"payload={p}",
            endpoint="/create-category"
        )

# -------------------------
# CORS
# -------------------------
def cors_test():
    evil = "http://evil.com"
    headers = {"Origin": evil, "Authorization": ADMIN_TOKEN}
    resp = requests.get(f"{CATEGORY_API}/get-category", headers=headers, timeout=TIMEOUT)
    acao = resp.headers.get("Access-Control-Allow-Origin", "")
    ok = (acao != "*" and acao != evil)

    record(
        name="CORS - Malicious origin denied",
        ok=ok,
        status_code=resp.status_code,
        summary=f"ACAO={acao}",
        endpoint="/get-category"
    )

# -------------------------
# Rate Limit
# -------------------------
def rate_limit_test():
    url = f"{CATEGORY_API}/get-category"

    def run(i):
        try: return requests.get(url, timeout=TIMEOUT).status_code
        except: return "ERR"

    with ThreadPoolExecutor(max_workers=50) as ex:
        codes = list(ex.map(run, range(50)))

    ok = 429 in codes
    record(
        name="Rate Limit - create-category",
        ok=ok,
        summary="Expect at least one Status 429",
        details=str(codes),
        endpoint="/create-category"
    )

# ------------------------
# Mass Assignment Vulnerability Test
# ------------------------
def mass_assignment_test():
    name = f"ma_{int(time.time())}"
    
    payload = {
        "name": name,
        "role": "admin",
        "isAdmin": True,
        "permissions": ["*"]
    }

    resp = POST(create_url, ADMIN_TOKEN, json=payload)
    
    # Mass Assignment Attempt will result in request failure
    ok = resp.status_code == 400

    record(
        name="Mass Assignment Rejected",
        ok=ok,
        status_code=resp.status_code,
        summary="Server should reject extra privileged fields",
        details=resp.text,
        endpoint="/create-category"
    )

    # Cleanup code just in case category is created
    try:
        cid = resp.json().get("category", {}).get("_id")
        if cid:
            DELETE(f"{CATEGORY_API}/delete-category/{cid}", ADMIN_TOKEN)
    except Exception:
        pass

# -------------------------
# MAIN
# -------------------------
def main():
    if not ADMIN_TOKEN or not USER_TOKEN:
        record(
            name="Auth Failure",
            ok=False,
            summary="Missing token(s)"
        )
    else:
        rbac_tests()
        jwt_corruption()
        xss_tests()
        nosql_tests()
        cors_test()
        rate_limit_test()
        mass_assignment_test()

    with open(os.path.join(REPORT_DIR,"results.json"),"w") as f:
        f.write(json.dumps(results, indent=2))

    print("\n✅ Security tests finished. Results saved.")

if __name__ == "__main__":
    main()
