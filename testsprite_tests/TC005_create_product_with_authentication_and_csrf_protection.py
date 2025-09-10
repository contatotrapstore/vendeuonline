import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:4001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
CSRF_TOKEN_URL = f"{BASE_URL}/api/csrf-token"
PRODUCTS_URL = f"{BASE_URL}/api/products"

USERNAME = "gouveiarx@gmail.com"
PASSWORD = "Teste123"
TIMEOUT = 30


def test_create_product_with_auth_and_csrf():
    session = requests.Session()
    auth = HTTPBasicAuth(USERNAME, PASSWORD)

    # Step 1: Login to get bearer token
    try:
        login_resp = session.post(
            LOGIN_URL,
            json={"email": USERNAME, "password": PASSWORD, "userType": "SELLER"},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token and isinstance(token, str), "Token not found in login response"

        headers_auth = {"Authorization": f"Bearer {token}"}

        # Step 2: Get CSRF token with auth
        csrf_resp = session.get(CSRF_TOKEN_URL, headers=headers_auth, timeout=TIMEOUT)
        assert csrf_resp.status_code == 200, f"CSRF token request failed: {csrf_resp.text}"
        csrf_data = csrf_resp.json()
        csrf_token = csrf_data.get("csrfToken")
        assert csrf_token and isinstance(csrf_token, str), "CSRF token not found"

        headers_auth_csrf = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Helpers for payloads
        valid_product_payload = {
            "name": "Test Product",
            "description": "A product created during automated test",
            "price": 99.99,
            "_csrfToken": csrf_token
        }
        invalid_csrf_product_payload = {
            "name": "Test Product",
            "description": "A product with invalid CSRF token",
            "price": 50.0,
            "_csrfToken": "invalid_csrf_token"
        }
        invalid_validation_payload = {
            "name": "",  # invalid empty name
            "description": "Missing price",
            "_csrfToken": csrf_token
        }

        created_product_id = None

        # Success: create product with valid token and csrf
        create_resp = session.post(
            PRODUCTS_URL,
            headers=headers_auth_csrf,
            json=valid_product_payload,
            timeout=TIMEOUT,
        )
        assert create_resp.status_code == 201, f"Product creation failed: {create_resp.text}"
        created_data = create_resp.json()
        # Assuming product ID returned in response body under 'id' or '_id'
        created_product_id = created_data.get("id") or created_data.get("_id") or None

        # Validation error 400: missing price or invalid fields
        resp_400 = session.post(
            PRODUCTS_URL,
            headers=headers_auth_csrf,
            json=invalid_validation_payload,
            timeout=TIMEOUT,
        )
        assert resp_400.status_code == 400, "Expected 400 validation error for bad payload"

        # Unauthorized 401: no token
        resp_401 = session.post(
            PRODUCTS_URL,
            headers={"Content-Type": "application/json"},
            json=valid_product_payload,
            timeout=TIMEOUT,
        )
        assert resp_401.status_code == 401, "Expected 401 Unauthorized without token"

        # Forbidden 403: invalid CSRF token
        resp_403 = session.post(
            PRODUCTS_URL,
            headers=headers_auth_csrf,
            json=invalid_csrf_product_payload,
            timeout=TIMEOUT,
        )
        assert resp_403.status_code == 403, "Expected 403 Forbidden for invalid CSRF token"

        # Rate limit 429: simulate by sending multiple rapid requests
        # Sending 10 requests with valid payload to try trigger rate limit
        rate_limit_hit = False
        for _ in range(10):
            rl_resp = session.post(
                PRODUCTS_URL,
                headers=headers_auth_csrf,
                json=valid_product_payload,
                timeout=TIMEOUT,
            )
            if rl_resp.status_code == 429:
                rate_limit_hit = True
                break
        assert rate_limit_hit, "Expected to hit 429 rate limit but did not"

    finally:
        # Cleanup: delete created product if any and if token available
        if created_product_id and token:
            delete_url = f"{PRODUCTS_URL}/{created_product_id}"
            try:
                del_resp = session.delete(delete_url, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
                # It's okay if delete fails, we just try to clean
            except Exception:
                pass


test_create_product_with_auth_and_csrf()
