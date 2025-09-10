import requests

BASE_URL = "http://localhost:4001"
TIMEOUT = 30


def test_address_management_with_validation_and_csrf_protection():
    session = requests.Session()

    # 1) Login to get Bearer token
    login_payload = {
        "email": "gouveiarx@gmail.com",
        "password": "Teste123"
    }
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_data = login_resp.json()
    token = login_data.get("token")
    assert token, "Login response missing token"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 2) Get CSRF token for authenticated user
    csrf_resp = session.get(f"{BASE_URL}/api/csrf-token", headers=headers, timeout=TIMEOUT)
    assert csrf_resp.status_code == 200, f"Failed to get CSRF token, status: {csrf_resp.status_code}"
    csrf_data = csrf_resp.json()
    csrf_token = csrf_data.get("csrfToken")
    assert csrf_token, "CSRF token missing in response"

    # 3) GET /api/addresses - should return addresses list for authenticated user
    # Note: Do not send X-CSRF-Token header here as spec doesn't require it for GET
    get_resp = session.get(f"{BASE_URL}/api/addresses", headers=headers, timeout=TIMEOUT)
    assert get_resp.status_code == 200, f"GET /api/addresses failed with status {get_resp.status_code}"
    get_json = get_resp.json()
    assert "addresses" in get_json, "Response JSON missing 'addresses' key"
    assert isinstance(get_json["addresses"], list), "'addresses' is not a list"

    # Prepare a valid new address payload according to schema (required fields + CSRF)
    new_address = {
        "label": "Home Address",
        "street": "Rua das Flores",
        "number": "123",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01000-000",
        "_csrfToken": csrf_token
    }

    # Optional fields included to test optional acceptance
    new_address_optional = new_address.copy()
    new_address_optional.update({
        "neighborhood": "Centro",
        "isDefault": True
    })

    # 4) POST valid new address - expect 201 Created
    # Note: Send CSRF token only in payload, not as header
    post_resp = session.post(f"{BASE_URL}/api/addresses", json=new_address_optional, headers=headers, timeout=TIMEOUT)
    assert post_resp.status_code == 201, f"POST valid address failed with status {post_resp.status_code}"

    # Extract created address id if returned for cleanup; if not present, skip cleanup
    created_address = post_resp.json() if post_resp.headers.get("Content-Type", "").startswith("application/json") else {}
    address_id = created_address.get("id")

    try:
        # 5) POST new address with missing required fields to get 400 validation error
        invalid_address = {
            "label": "",  # invalid as minLength 1 required
            "street": "Rua",
            "number": "",  # invalid minLength 1
            "city": "S",
            "state": "S",
            "zipCode": "123",  # invalid pattern
            "_csrfToken": csrf_token
        }
        post_invalid_resp = session.post(f"{BASE_URL}/api/addresses", json=invalid_address, headers=headers, timeout=TIMEOUT)
        assert post_invalid_resp.status_code == 400, f"POST invalid address should fail with 400 but got {post_invalid_resp.status_code}"

        # 6) POST new address with invalid CSRF token to get 403
        address_with_bad_csrf = new_address_optional.copy()
        address_with_bad_csrf["_csrfToken"] = "invalid_csrf_token"
        post_csrf_resp = session.post(f"{BASE_URL}/api/addresses", json=address_with_bad_csrf, headers=headers, timeout=TIMEOUT)
        assert post_csrf_resp.status_code == 403, f"POST with invalid CSRF token should fail 403 but got {post_csrf_resp.status_code}"
    finally:
        # Cleanup: Delete the created address if possible
        if address_id:
            del_resp = session.delete(f"{BASE_URL}/api/addresses/{address_id}", headers=headers, timeout=TIMEOUT)
            # Accept 200 or 204 for successful delete
            assert del_resp.status_code in (200, 204), f"Failed to delete address id {address_id}, status {del_resp.status_code}"


test_address_management_with_validation_and_csrf_protection()
