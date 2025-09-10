import requests

BASE_URL = "http://localhost:4001"
AUTH_USERNAME = "gouveiarx@gmail.com"
AUTH_PASSWORD = "Teste123"
TIMEOUT = 30

def test_get_and_update_user_profile_with_csrf_protection():
    session = requests.Session()
    session.auth = (AUTH_USERNAME, AUTH_PASSWORD)
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    # Login is assumed done by basic auth on each request (as per "authType":"basic token") or session auth
    # First, GET /api/users/profile - should return user profile and set cookies for CSRF token request
    profile_resp = session.get(f"{BASE_URL}/api/users/profile", headers=headers, timeout=TIMEOUT)
    assert profile_resp.status_code in (200,401), f"Unexpected status code for GET profile: {profile_resp.status_code}"
    if profile_resp.status_code == 401:
        # Unauthorized access test case
        return
    profile_json = profile_resp.json()
    assert "profile" in profile_json, "Response JSON missing 'profile' key"

    # Obtain CSRF token with GET /api/csrf-token
    csrf_resp = session.get(f"{BASE_URL}/api/csrf-token", headers=headers, timeout=TIMEOUT)
    assert csrf_resp.status_code == 200, f"Failed to get CSRF token: {csrf_resp.status_code}"
    csrf_json = csrf_resp.json()
    csrf_token = csrf_json.get("csrfToken")
    assert csrf_token and isinstance(csrf_token, str), "CSRF token missing or invalid"

    # Prepare updated profile data
    updated_profile = {
        "name": profile_json["profile"].get("name", "Updated Name"),
        "phone": profile_json["profile"].get("phone", "1234567890"),
        "city": profile_json["profile"].get("city", "Test City"),
        "state": profile_json["profile"].get("state", "TS"),
        "_csrfToken": csrf_token
    }

    # Successful profile update PUT /api/users/profile
    update_resp = session.put(
        f"{BASE_URL}/api/users/profile",
        json=updated_profile,
        headers=headers,
        timeout=TIMEOUT
    )
    assert update_resp.status_code == 200, f"Expected 200 OK for successful profile update, got {update_resp.status_code}"

    # Test validation error (400) by sending invalid data - omit _csrfToken
    invalid_payload_missing_csrf = updated_profile.copy()
    invalid_payload_missing_csrf.pop("_csrfToken")
    resp_400 = session.put(
        f"{BASE_URL}/api/users/profile",
        json=invalid_payload_missing_csrf,
        headers=headers,
        timeout=TIMEOUT
    )
    assert resp_400.status_code == 400 or resp_400.status_code == 401 or resp_400.status_code == 403, \
        f"Expected 400/401/403 for missing CSRF token or invalid auth, got {resp_400.status_code}"

    # Test unauthorized access (401) - do request without auth
    unauth_session = requests.Session()
    unauth_put_resp = unauth_session.put(
        f"{BASE_URL}/api/users/profile",
        json=updated_profile,
        headers=headers,
        timeout=TIMEOUT
    )
    assert unauth_put_resp.status_code == 401, f"Expected 401 for unauthorized access, got {unauth_put_resp.status_code}"

    # Test invalid CSRF token (403) - send incorrect CSRF token
    invalid_csrf_payload = updated_profile.copy()
    invalid_csrf_payload["_csrfToken"] = "invalidtoken"
    invalid_csrf_resp = session.put(
        f"{BASE_URL}/api/users/profile",
        json=invalid_csrf_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert invalid_csrf_resp.status_code == 403, f"Expected 403 for invalid CSRF token, got {invalid_csrf_resp.status_code}"

test_get_and_update_user_profile_with_csrf_protection()