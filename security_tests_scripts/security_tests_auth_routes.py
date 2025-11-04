"""
security_tests_auth_routes.py
Run basic automated security tests for a local MERN app and save results to ./reports/
Tests included:
 - Rules Based Access Control (Normal and Admin User)
 - JWT tampering (Normal and Admin User)
 - NoSQL injection
 - Reflected XSS Check
 - Stored XSS Check
 - Brute-force login simulation (rate-limit check)
 - CORS origin header check
Outputs: reports/results.json
Configure endpoints and tokens below before running.
"""

import requests, json, os, time
from concurrent.futures import ThreadPoolExecutor

# -------------------------
# Test Configurations
# -------------------------

BASE = "http://localhost:3000"
API = f"{BASE}/api/v1/auth"       
TIMEOUT = 10
REPORT_DIR="./reports_auth"
ADMIN_EMAIL = "brendansoh@gmail.com"
ADMIN_PASSWORD = "Password"
USER_EMAIL = "brendansoh1@gmail.com"
USER_PASSWORD = "Password"
ADMIN_ENDPOINTS_GET = ['/test', '/admin-auth', '/all-orders', '/users']
ADMIN_ENDPOINTS_PUT = ['/order-status/12345']
USER_ENDPOINTS_GET = ['/user-auth', '/orders']
USER_ENDPOINTS_PUT = ['/profile']
REGISTER_URL = f"{API}/register"
PROFILE_URL = f"{API}/profile"
LOGIN_URL = f"{API}/login"

# -------------------------

os.makedirs(REPORT_DIR, exist_ok=True)

results = {
    "meta": {
        "start_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        "base": BASE
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

def get_token(email, password):
    url = f"{API}/login"
    try:
        r = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
        if r.status_code != 200: 
            return None
        else:
            j = r.json()
            return j.get("token")
    except Exception as e:
        print(e)
    
def authed_get(url, token, **kw):
    h = kw.pop("headers", {})
    if token: h["Authorization"] = token
    return requests.get(url, headers=h, timeout=TIMEOUT, **kw)

def authed_put(url, token, **kw):
    h = kw.pop("headers", {})
    if token: h["Authorization"] = token
    return requests.put(url, headers=h, timeout=TIMEOUT, **kw)

# -------------------------
# Test Implementations
# -------------------------

# -------------------------
# Rules Based Access Control (Admin User)
# -------------------------

# Get tokens
ADMIN_TOKEN = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
USER_TOKEN = get_token(USER_EMAIL, USER_PASSWORD)
secret = os.environ.get("JWT_SECRET","your_secret_here")

def test_admin_routes_no_token():
    for endpoint in ADMIN_ENDPOINTS_GET:
        request_endpoint = API + endpoint
        r = requests.get(request_endpoint, timeout=TIMEOUT)
        record("Admin Route without token", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)
    for endpoint in ADMIN_ENDPOINTS_PUT:
        request_endpoint = API + endpoint
        r = requests.put(request_endpoint, timeout=TIMEOUT)
        record("Admin Route without token", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)
    
def test_admin_auth_admin_token():
    url = f"{API}/admin-auth"
    r = authed_get(url, ADMIN_TOKEN)
    record("Admin-auth with admin token", r.status_code == 200, r.status_code, "Expect 200", endpoint="/admin-auth")
    
def test_admin_routes_user_token():
    for endpoint in ADMIN_ENDPOINTS_GET:
        request_endpoint = API + endpoint
        r = authed_get(request_endpoint, USER_TOKEN)
        record("Admin Routes with User Token", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)
    for endpoint in ADMIN_ENDPOINTS_PUT:
        request_endpoint = API + endpoint
        r = authed_put(request_endpoint, USER_TOKEN)
        record("Admin Routes with User Token", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)

# -------------------------
# Rules Based Access Control (Normal User)
# -------------------------

def test_user_route_no_token():
    for endpoint in USER_ENDPOINTS_GET:
        request_endpoint = API + endpoint
        r = requests.get(request_endpoint, timeout=TIMEOUT)
        record("User Routes without token", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)
    for endpoint in USER_ENDPOINTS_PUT:
        request_endpoint = API + endpoint
        r = requests.put(request_endpoint, timeout=TIMEOUT)
        record("User Routes without token", r.status_code == 401, r.status_code, "Expect 401", endpoint = endpoint)
        
def test_user_auth_with_token():
    url = f"{API}/user-auth"
    r = authed_get(url, USER_TOKEN)
    record("User-auth with user token", r.status_code == 200, r.status_code, "Expect 200", endpoint="user-auth")

# -------------------------
# Corrupted JWT Test (Admin User)
# -------------------------

def corrupted_jwt_test_admin():
    corrupted_jwt = ADMIN_TOKEN + "L"
    for endpoint in ADMIN_ENDPOINTS_GET:
        request_endpoint = API + endpoint
        r = authed_get(request_endpoint, corrupted_jwt)
        record("Corrupted JWT Token Admin Routes", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)
    for endpoint in ADMIN_ENDPOINTS_PUT:
        request_endpoint = API + endpoint
        r = authed_put(request_endpoint, corrupted_jwt)
        record("Corrupted JWT Token Admin Routes", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)
    
# -------------------------
# Corrupted JWT Test (Normal User)
# -------------------------

def corrupted_jwt_test_user():
    corrupted_jwt = USER_TOKEN + "L"
    for endpoint in USER_ENDPOINTS_GET:
        request_endpoint = API + endpoint
        r = authed_get(request_endpoint, corrupted_jwt)
        record("Corrupted JWT Token User Routes", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)
    for endpoint in USER_ENDPOINTS_PUT:
        request_endpoint = API + endpoint
        r = authed_put(request_endpoint, corrupted_jwt)
        record("Corrupted JWT Token User Routes", r.status_code == 401, r.status_code, "Expect 401", endpoint=endpoint)
    
# -------------------------
# Brute-force login (no auth)
# -------------------------
def brute_force_login(attempts=50, concurrency=50):
    login_url = f"{API}/login"
    test_email = "doesnotexist@example.com"
    def attempt(i):
        body = {"email": test_email, "password": f"wrong{i}"}
        try:
            r = requests.post(login_url, json=body, timeout=TIMEOUT)
            return r.status_code
        except Exception as e:
            return str(e)
    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        codes = list(ex.map(attempt, range(1, attempts+1)))
    # Status Code 429 to indicate Rate Limit Error
    ok = any(c == 429 for c in codes)
    record("Brute-force login simulation", ok, status_code= codes, summary="Pass if 429 or throttling observed; otherwise recommend rate-limiting", endpoint="login")

# -------------------------
# CORS probe (Origin header)
# -------------------------
def cors_probe():
    url = f"{API}/user-auth"
    try:
        r = requests.get(url, headers={"Origin":"http://evil.example.com"}, timeout=TIMEOUT)
        acao = r.headers.get("Access-Control-Allow-Origin", "")
        ok = (acao != "*" and acao != "http://evil.example.com")
        record("CORS probe", ok, r.status_code, summary=f"ACAO={acao or 'None'}", endpoint="/user-auth")
    except Exception as e:
        record("CORS probe", False, summary="Exception", details=str(e), endpoint="/user-auth")

# --------------------------
# Reflected XSS check (POST /register)
# --------------------------
def reflected_xss_test_register():
    url = f"{API}/register"
    payload_name = '"><script>alert(1)</script>'
    body = {
        "name": payload_name,
        "email": f"xss_{int(time.time())}@example.com",
        "password": "Password123!",
        "phone": "99999999",
        "address": "NUS",
        "answer": "test"
    }
    try:
        r = requests.post(url, json=body, timeout=TIMEOUT)
        # Check if exact payload appears unescaped in response (very basic)
        ok = payload_name not in r.text
        record("Reflected XSS via register", ok, r.status_code, summary="Payload should not appear raw in response", endpoint="/register")
    except Exception as e:
        record("Reflected XSS via register", False, summary="Exception", details=str(e), endpoint="/register")

# --------------------------
# Stored XSS check (POST /register)
# --------------------------
XSS_PAYLOAD = '"><svg/onload=alert(1337HelloWorld)>'

def stored_xss_register_test():
    email = f"xss_reg_{int(time.time())}@test.com"
    body = {
        "name": XSS_PAYLOAD,
        "email": email,
        "password": "Password123!",
        "phone": "91234567",
        "address": "NUS",
        "answer": "blue"
    }

    r = requests.post(REGISTER_URL, json=body, timeout=TIMEOUT)
    reflected = XSS_PAYLOAD in r.text
    ok_reg = (r.status_code == 201) and not reflected
    record(
        "Stored XSS Test - Register (submit)",
        ok_reg,
        r.status_code,
        summary="Register should create user but not reflect raw payload in response",
        details=f"Reflected payload in register response: {reflected}",
        endpoint="/register"
    )

    if r.status_code != 201:
        # cannot proceed if registration failed
        record("Stored XSS Test - Register (abort)", False, r.status_code, summary="Registration failed; aborting verification")
        return

    # 2) login and verify stored value appears in the returned user object
    r_login = requests.post(LOGIN_URL, json={"email": email, "password": "Password123!"}, timeout=TIMEOUT)
    # login returns user object — check if name appears raw
    stored_in_login = XSS_PAYLOAD in r_login.text
    ok_login_verify = (r_login.status_code == 200) and not stored_in_login

    record(
        "Stored XSS Verify - Register (login response)",
        ok_login_verify,
        r_login.status_code,
        summary="Login response should NOT contain raw stored payload in user.name",
        details="Stored payload visible in login response = Stored XSS risk" if stored_in_login else None,
        endpoint="/login"
    )
       
# -------------------------
# NoSQL Injection Attack (Greater Than, Not Equal, Regex, Or)
# -------------------------

NOSQL_PAYLOADS_BASIC = [
    {"email": {"$ne": ""}, "password": "doesntmatter"},
    {"email": {"$gt": ""}, "password": "doesntmatter"},
    {"email": {"$regex": ".*"}, "password": "doesntmatter"},
    {"$or": [{"email": {"$ne": ""}}, {"password": {"$ne": ""}}]}
]

NOSQL_PAYLOADS_FORGOT = [
    {"email": {"$ne": ""}, "answer": {"$ne": ""}, "newPassword": "NewPass123!"},
    {"email": {"$regex": ".*"}, "answer": {"$regex": ".*"}, "newPassword": "NewPass123!"},
    {"$or": [{"email": {"$ne": ""}}, {"answer": {"$ne": ""}}], "newPassword": "NewPass123!"}
]

NOSQL_PAYLOADS_REGISTER = [
    {"name":"x","email":{"$ne": ""},"password":"Password123","phone":"98765432","address":"a","answer":"b"},
    {"name":"x","email":{"$gt": ""},"password":"Password123","phone":"98765432","address":"a","answer":"b"},
    {"name":"x","email":{"$regex": ".*"},"password":"Password123","phone":"98765432","address":"a","answer":"b"},
    {"$or":[{"email":{"$ne": ""}},{"name":{"$ne": ""}}],"password":"Password123","phone":"98765432","address":"a","answer":"b"}
]

def _run_nosql_tests(endpoint, payloads, expected_success_codes=(200,201)):
    url = f"{API}{endpoint}"
    for i, p in enumerate(payloads, start=1):
        try:
            r = requests.post(url, json=p, timeout=TIMEOUT)
            got_success = r.status_code in expected_success_codes
            ok = not got_success
            record(f"Nosql {endpoint} try{i}", ok, r.status_code, summary=f"Payload: {str(p)[:80]}", endpoint=endpoint)
        except Exception as e:
            record(f"Nosql {endpoint} try{i}", False, summary="Exception", details=str(e))

def test_nosql_login():
    _run_nosql_tests("/login", NOSQL_PAYLOADS_BASIC, expected_success_codes=(200, 201))

def test_nosql_forgot_password():
    _run_nosql_tests("/forgot-password", NOSQL_PAYLOADS_FORGOT, expected_success_codes=(200, 201))

def test_nosql_register():
    _run_nosql_tests("/register", NOSQL_PAYLOADS_REGISTER, expected_success_codes=(200, 201))


def main():
    test_admin_routes_no_token()
    test_admin_auth_admin_token()
    test_admin_routes_user_token()
    test_user_route_no_token()
    test_user_auth_with_token()
    corrupted_jwt_test_admin()
    corrupted_jwt_test_user()
    brute_force_login()
    cors_probe()
    reflected_xss_test_register()
    stored_xss_register_test()
    test_nosql_forgot_password()
    test_nosql_login()
    test_nosql_register()
    
    # Save results.json
    results_path = os.path.join(REPORT_DIR, "results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(results, indent=2))

    
if __name__ == "__main__":
    main()
