# security_tests_productRoutes.py
"""
Security tests for Product routes (MERN App)
Security-only tests: RBAC, Mass Assignment, File upload, Slug abuse, NoSQL op injection,
Search ReDoS, Invalid ObjectId handling, Content-Type enforcement, JWT corruption, Stored XSS.
"""

import os
import io
import json
import time
from concurrent.futures import ThreadPoolExecutor
import requests

# -------------------------
# Configuration
# -------------------------
BASE = "http://localhost:3000"
AUTH_API = f"{BASE}/api/v1/auth"
CATEGORY_API = f"{BASE}/api/v1/category"
PRODUCT_API = f"{BASE}/api/v1/product"
TIMEOUT = 10
REPORT_DIR = "./reports_product"

ADMIN_EMAIL = "brendansoh@gmail.com"
ADMIN_PASSWORD = "Password"
USER_EMAIL = "brendansoh1@gmail.com"
USER_PASSWORD = "Password"

ADMIN_URL = ["/create-product", "/update-product", "/delete-product"]
USER_URL = ["/braintree/payment"]

# -------------------------
# Setup Reporting
# -------------------------
os.makedirs(REPORT_DIR, exist_ok=True)

results = {
    "meta": {
        "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "base": BASE,
        "api": PRODUCT_API
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
# Helpers (auth + wrappers)
# -------------------------
def get_token(email, password):
    url = f"{AUTH_API}/login"
    try:
        r = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    except Exception as e:
        print("Auth endpoint not reachable:", e)
        return None
    if r.status_code != 200:
        return None
    return r.json().get("token")

def authed(method, url, token, **kw):
    headers = kw.pop("headers", {})
    if token:
        headers["Authorization"] = token
    return getattr(requests, method)(url, headers=headers, timeout=TIMEOUT, **kw)

def GET(url, token=None, **kw): return authed("get", url, token, **kw)
def POST(url, token=None, **kw): return authed("post", url, token, **kw)
def PUT(url, token=None, **kw): return authed("put", url, token, **kw)
def DELETE(url, token=None, **kw): return authed("delete", url, token, **kw)

# Small python-side slugify for tests (approx)
def py_slugify(s: str) -> str:
    s = (s or "").strip().lower()
    # replace anything not alnum with hyphen
    import re
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s

# -------------------------
# Test state & setup helpers
# -------------------------
ADMIN_TOKEN = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
USER_TOKEN  = get_token(USER_EMAIL, USER_PASSWORD)

created_product_ids = []

def cleanup_created_products():
    # delete products
    for pid in created_product_ids:
        try:
            DELETE(f"{PRODUCT_API}/delete-product/{pid}", ADMIN_TOKEN)
        except Exception:
            print(f"Warning: failed to delete product {pid}")

# -------------------------
# Security Tests
# -------------------------

# -------------------------
# Rules Based Access Control for Product CRUD Operations
# -------------------------

create_url = f"{PRODUCT_API}/create-product"
name = f"rbac_prod_{int(time.time())}"

img_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
data = {
    "name": name,
    "description": "products created for security testing",
    "price": 10,
    "shipping": 1,
    "category": "66db427fdb0119d9234b27ee",
    "quantity": 100
}

files = {"photo": ("p.png", io.BytesIO(img_bytes), "image/png")}

def rbac_create_product_admin():
    resp = POST(create_url, ADMIN_TOKEN, files=files, data=data)
    ok = resp.status_code in (200, 201)
    details = resp.text
    try:
        pid = resp.json().get("products", {}).get("_id")      
        if pid:
            created_product_ids.append(pid)
    except Exception:
        pid = None

    record(
        name="RBAC - Admin create product",
        ok=ok,
        status_code=resp.status_code,
        summary="Admin should be able to create product (multipart/form-data)",
        details=details,
        endpoint="/create-product"
    )

def rbac_create_product_user():
    resp = POST(create_url, USER_TOKEN, files=files, data=data)
    ok = resp.status_code == 401
    details = resp.text
    try:
        pid = resp.json().get("products", {}).get("_id")      
        if pid:
            created_product_ids.append(pid)
    except Exception:
        pid = None

    record(
        name="RBAC - User cannot create product",
        ok=ok,
        status_code=resp.status_code,
        summary="User should not be able to create product (multipart/form-data)",
        details=details,
        endpoint="/create-product"
    )

def rbac_create_product_no_token():
    resp = requests.post(create_url, files=files, data=data, timeout=TIMEOUT)
    ok = resp.status_code == 401
    details = resp.text
    try:
        pid = resp.json().get("products", {}).get("_id")      
        if pid:
            created_product_ids.append(pid)
    except Exception:
        pid = None

    record(
        name="RBAC - No Token cannot create product",
        ok=ok,
        status_code=resp.status_code,
        summary="No Token should not be able to create product (multipart/form-data)",
        details=details,
        endpoint="/create-product"
    )

update_url = f"{PRODUCT_API}/update-product"

def create_update_url():
    if len(created_product_ids) == 0:
        print("Warning no created test products found!")
    else:
        return update_url + "/" + created_product_ids[0]
    
def rbac_update_product_admin():
    resp = PUT(create_update_url(), ADMIN_TOKEN, data=data, files=files)
    ok = resp.status_code == 201
    details = resp.text
    record(
        name="RBAC - Admin can update product",
        ok=ok,
        status_code=resp.status_code,
        summary="Admin should be able to update product (multipart/form-data)",
        details=details,
        endpoint="/update-product"
    )

def rbac_update_product_user():
    resp = PUT(create_update_url(), USER_TOKEN, data=data, files=files)
    ok = resp.status_code == 401
    details = resp.text
    record(
        name="RBAC - User cannot update product",
        ok=ok,
        status_code=resp.status_code,
        summary="User should not be able to update product (multipart/form-data)",
        details=details,
        endpoint="/update-product"
    )

def rbac_update_product_no_token():
    resp = requests.put(create_update_url(), data=data, files=files, timeout=TIMEOUT)
    ok = resp.status_code == 401
    details = resp.text
    record(
        name="RBAC - No Token cannot update product",
        ok=ok,
        status_code=resp.status_code,
        summary="No Token should not be able to update product (multipart/form-data)",
        details=details,
        endpoint="/update-product"
    )
    
delete_url = f"{PRODUCT_API}/delete-product"

def create_delete_url(productId=None):
    if productId != None:
        return delete_url + "/" + productId
    if len(created_product_ids) == 0:
        print("Warning no created test products found!")
    else:
        return delete_url + "/" + created_product_ids[0]


def rbac_delete_product_admin():
    resp = DELETE(create_delete_url(), ADMIN_TOKEN)
    ok = resp.status_code == 200
    details = resp.text
    record(
        name="RBAC - Admin can delete product",
        ok=ok,
        status_code=resp.status_code,
        summary="Admin should be able to delete product",
        details=details,
        endpoint="/delete-product"
    )

def rbac_delete_product_user():
    resp = DELETE(create_delete_url(), USER_TOKEN)
    ok = resp.status_code == 401
    details = resp.text
    record(
        name="RBAC - User cannot delete product",
        ok=ok,
        status_code=resp.status_code,
        summary="User should not be able to delete product",
        details=details,
        endpoint="/delete-product"
    )

def rbac_delete_product_no_token():
    resp = requests.delete(create_delete_url())
    ok = resp.status_code == 401
    details = resp.text
    record(
        name="RBAC - No Token cannot delete product",
        ok=ok,
        status_code=resp.status_code,
        summary="No Token should not be able to delete product",
        details=details,
        endpoint="/delete-product"
    )
    
def rbac_clean_up_all_test_products():
    for productIds in created_product_ids:
        try:
            DELETE(create_delete_url(productIds), ADMIN_TOKEN)
        except:
            pass

def product_mass_assignment_create():
    # Mass Assignment Vulnerability Test for create-product: server should reject extra privileged fields or not persist them
    mass_assignment_data = {
        "name": name,
        "description": "products created for security testing",
        "price": 10,
        "shipping": 1,
        "category": "66db427fdb0119d9234b27ee",
        "quantity": 100,
        # attacker-provided privileged fields
        "isFeatured": "true",
        "adminApproved": "true",
    }
    r = POST(create_url, ADMIN_TOKEN, data=mass_assignment_data)

    # Secure Behavior: Reject (403)
    ok = r.status_code == 403
    record("Mass Assignment Vulnerability- create product", ok=ok, status_code=r.status_code, details=r.text, endpoint="/create-product")


def product_mass_assignment_update():
    # Create the Test Product First
    resp_create_test_product = POST(create_url, ADMIN_TOKEN, data=data)
    
    try:
        pid = resp_create_test_product.json().get("products", {}).get("_id")      
            
    except Exception:
        pid = None
    
    # Mass Assignment Vulnerability Test for update-product: server should reject extra privileged fields or not persist them
    mass_assignment_data = {
        "name": name,
        "description": "products created for security testing",
        "price": 10,
        "shipping": 1,
        "category": "66db427fdb0119d9234b27ee",
        "quantity": 100,
        # attacker-provided privileged fields
        "isFeatured": "true",
        "adminApproved": "true",
    }
    
    r = PUT(f"{PRODUCT_API}/update-product/{pid}", ADMIN_TOKEN, data=mass_assignment_data)
    ok = r.status_code == 403

    record("Mass Assignment - update", ok=ok, status_code=r.status_code, details=r.text, endpoint=f"/update-product/{pid}")
    
    # Clean Up Created Product
    if pid != None:
        DELETE(create_delete_url(pid), ADMIN_TOKEN)
    
    
def product_image_mime_and_size_tests():
    data = {"name": f"img_{int(time.time())}", "description":"d", "price":"1", "category":"66db427fdb0119d9234b27ee", "quantity":"1", "shipping":"1"}

    # invalid mime
    files1 = {"photo": ("evil.txt", io.BytesIO(b'notimage'), "text/plain")}
    r1 = POST(create_url, ADMIN_TOKEN, files=files1, data=data)
    record("Image MIME rejected", ok=(r1.status_code==403), status_code=r1.status_code, details=r1.text, endpoint="/create-product")

    # oversized image (>1MB)
    large = b'\xff' * (1024*1024 + 200)
    files2 = {"photo": ("big.jpg", io.BytesIO(large), "image/jpeg")}
    r2 = POST(create_url, ADMIN_TOKEN, files=files2, data=data)
    record("Image Size limit enforced", ok=(r2.status_code == 413), status_code=r2.status_code, details=r2.text, endpoint="/create-product")

# ------------------------------
# Reflected XSS(/get-product/:slug, /product-photo/:pid, /search/:keyword,
#             /related-product/:pid/:cid,/product-category/:slug, /product-category-count/:slug)
# ------------------------------

payloads = [
    "<script>alert(1)</script>",
    "<svg/onload=alert(1)>"
]

endpoints_get = [
    f"{PRODUCT_API}/get-product/",
    f"{PRODUCT_API}/product-photo/",
    f"{PRODUCT_API}/search/",
    f"{PRODUCT_API}/related-product/",
    f"{PRODUCT_API}/product-category/",
    f"{PRODUCT_API}/product-category-count/",
]

def product_reflected_xss_tests():
    for p in payloads:
        for endpoint in endpoints_get:
            reflected_xss_endpoint = endpoint + p
            r = requests.get(reflected_xss_endpoint)
            ok = p not in (r.text or "")
            record(
                name=f"Reflected XSS - {endpoint}",
                ok=ok,
                status_code=r.status_code,
                summary= f"Reflected XSS - {p}",
                endpoint=endpoint
            )

def product_filters_nosql_operator_tests():
    """Send operator-like payloads to product-filters to ensure operators are not executed"""
    url = f"{PRODUCT_API}/product-filters"
    payloads = [
        {"checked":[{"$gt":""}]},
        {"checked":["$ne:"]},
        {"checked": {"$gt": ""}},
        {"radio": [{"$regex": ".*"}, 1000]},
        {"radio": {"$regex": ".*"}},
        {"radio": "$regex : .*"}
    ]
    for p in payloads:
        r = requests.post(url, json=p, timeout=TIMEOUT)
        ok = r.status_code == 400
        record(f"Product Filters NoSQL op - {p}", ok=ok, status_code=r.status_code, details=(r.text or "")[:300], endpoint="/product-filters")

def search_redos_test():
    """Send very long search keywords to test ReDoS resilience"""
    long_keyword = "a" * 2000
    r = requests.get(f"{PRODUCT_API}/search/{long_keyword}", timeout=8)
    ok = r.status_code == 400
    status = r.status_code
        
    record("Search ReDoS / very long input", ok=ok, status_code=status, details=f"len={len(long_keyword)}", endpoint="/search/:keyword")

def jwt_corruption_products():
    bad = (ADMIN_TOKEN or "") + "BAD"
    r = POST(create_url, bad, data=data)
    record("JWT Corruption (create-product)", ok=(r.status_code==401), status_code=r.status_code, details=r.text, endpoint="/create-product")

def stored_xss_product_test():
    """
    Stored XSS test:
    - create product (multipart/form-data) with XSS payload in name+description
    - ensure the raw payload does NOT appear in the create response or any public read endpoints
    - delete the created product afterwards (best-effort)
    """
    payload = f"<script>alert('xss'){int(time.time())}</script>"
    img_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
    files = {"photo": ("p.png", io.BytesIO(img_bytes), "image/png")}

    data_payload = {
        "name": payload,
        "description": payload,
        "price": "1",
        "category": "66db427fdb0119d9234b27ee",
        "quantity": "1",
        "shipping": "1",
    }

    try:
        create_resp = POST(create_url, ADMIN_TOKEN, files=files, data=data_payload)
    except Exception as e:
        record("Stored XSS - create product", ok=False, status_code=None,
               summary="Create request failed", details=str(e), endpoint="/create-product")
        return

    create_text = create_resp.text or ""
    status_ok = create_resp.status_code in (200, 201)
    reflected_in_create = payload in create_text

    ok_create = status_ok and (not reflected_in_create)
    record(
        name="Stored XSS - create response should not contain raw payload",
        ok=ok_create,
        status_code=create_resp.status_code,
        summary="Creation allowed; response must not echo raw payload",
        details=(create_text[:500] if len(create_text) > 0 else ""),
        endpoint="/create-product"
    )
    
    try:
        pid = create_resp.json().get("products", {}).get("_id")      
        if pid:
            DELETE(create_delete_url(pid), ADMIN_TOKEN)
    except Exception:
        pid = None

    
def stored_xss_update_test():
    """
    Stored XSS update test:
    - update an existing product with an XSS payload in name+description
    - ensure the raw payload is NOT present in the update response or in public read endpoints
    - delete the product afterwards (best-effort cleanup)
    """
    create_resp = POST(create_url, ADMIN_TOKEN, data=data, files=files)
    pid = None
    try:
        pid = create_resp.json().get("products", {}).get("_id")
    except Exception:
        pid = None

    if not pid:
        record("Stored XSS - update test", ok=False, status_code=create_resp.status_code,
               summary="Failed to obtain product id for update test", details=(create_resp.text or "")[:300], endpoint="/update-product")
        return

    payload = f"<script>alert('xss'){int(time.time())}</script>"
    data_payload = {
        "name": payload,
        "description": payload,
        "price": "1",
        "category": "66db427fdb0119d9234b27ee",
        "quantity": "1",
        "shipping": "1",
    }

    try:
        update_resp = PUT(f"{PRODUCT_API}/update-product/{pid}", ADMIN_TOKEN, data=data_payload, files=files)
    except Exception as e:
        record("Stored XSS - update request failed", ok=False, status_code=None,
               summary="Update request exception", details=str(e), endpoint=f"/update-product/{pid}")

    try:
        if pid:
            DELETE(create_delete_url(pid), ADMIN_TOKEN)
        else:
            pass
    except Exception:
        print("Failed to Clean Up Created Test Product")

    update_text = update_resp.text or ""
    status_ok = update_resp.status_code in (200, 201)
    reflected_in_update = payload in update_text

    ok_update = status_ok and (not reflected_in_update)
    record(
        name="Stored XSS - update response should not contain raw payload",
        ok=ok_update,
        status_code=update_resp.status_code,
        summary="Update allowed; response must not echo raw payload",
        details=(update_text[:500] if len(update_text) > 0 else ""),
        endpoint=f"/update-product/{pid}"
    )

    # check public read/list endpoint to ensure payload is not reflected there
    try:
        list_resp = GET(f"{PRODUCT_API}/get-product")
        list_text = list_resp.text or ""
        reflected_in_list = payload in list_text
        ok_list = (list_resp.status_code == 200) and (not reflected_in_list)
        record(
            name="Stored XSS - GET product list should not contain raw payload",
            ok=ok_list,
            status_code=list_resp.status_code,
            summary="Public list should not reflect raw XSS payload",
            details=(list_text[:500] if len(list_text) > 0 else ""),
            endpoint="/get-product"
        )
    except Exception as e:
        record("Stored XSS - GET product list failed", ok=False, status_code=None,
               summary="GET /get-product exception", details=str(e), endpoint="/get-product")

        
# -------------------------
# Rate Limit
# -------------------------
def rate_limit_test():
    url = f"{PRODUCT_API}/get-product"

    def run(i):
        try: return requests.get(url).status_code
        except: return "ERR"

    with ThreadPoolExecutor(max_workers=50) as ex:
        codes = list(ex.map(run, range(50)))

    ok = 429 in codes
    record(
        name="Rate Limit - Get Product. Expect at least one Status 429",
        ok=ok,
        summary=str(codes),
        endpoint="/get-product"
    )
    
# -------------------------
# CORS
# -------------------------
def cors_test():
    evil = "http://evil.com"
    headers = {"Origin": evil, "Authorization": ADMIN_TOKEN}
    resp = requests.get(f"{PRODUCT_API}/get-product", headers=headers, timeout=TIMEOUT)
    acao = resp.headers.get("Access-Control-Allow-Origin", "")
    ok = (acao != "*" and acao != evil)

    record(
        name="CORS - Malicious origin denied",
        ok=ok,
        status_code=resp.status_code,
        summary=f"ACAO={acao}",
        endpoint="/get-product"
    )


# -------------------------
# Test runner orchestration
# -------------------------
def main():
    if not ADMIN_TOKEN or not USER_TOKEN:
        record("Auth Failure", ok=False, summary="Missing ADMIN_TOKEN or USER_TOKEN - ensure credentials are correct and auth server running")
        # write results and exit
    else:
        rbac_create_product_admin()
        rbac_create_product_user()
        rbac_create_product_no_token()
        rbac_update_product_admin()
        rbac_update_product_user()
        rbac_update_product_no_token()
        rbac_delete_product_admin()
        rbac_delete_product_user()
        rbac_delete_product_no_token()
        rbac_clean_up_all_test_products()
        product_mass_assignment_create()
        product_mass_assignment_update()
        product_image_mime_and_size_tests()
        product_reflected_xss_tests()
        product_filters_nosql_operator_tests()
        search_redos_test()
        jwt_corruption_products()
        stored_xss_product_test()
        stored_xss_update_test()
        rate_limit_test()
        cors_test()

    # write results
    with open(os.path.join(REPORT_DIR,"results.json"), "w") as f:
        f.write(json.dumps(results, indent=2))

    print("\n✅ Product security tests finished. Results saved.")

if __name__ == "__main__":
    main()
