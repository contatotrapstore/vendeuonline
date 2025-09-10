import requests
from time import sleep

BASE_URL = "http://localhost:4001"
LOGIN_ENDPOINT = f"{BASE_URL}/api/auth/login"
TIMEOUT = 30

valid_email = "gouveiarx@gmail.com"
valid_password = "Teste123"
invalid_password = "WrongPass!23"

def test_user_login_with_rate_limiting():
    headers = {
        "Content-Type": "application/json"
    }

    # 1. Test successful login with valid credentials
    payload_valid = {
        "email": valid_email,
        "password": valid_password
    }
    try:
        response = requests.post(LOGIN_ENDPOINT, json=payload_valid, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200 for valid login, got {response.status_code}"
        json_resp = response.json()
        assert "token" in json_resp and isinstance(json_resp["token"], str) and len(json_resp["token"]) > 0, "Token missing or invalid in successful login response"
        assert "user" in json_resp and isinstance(json_resp["user"], dict), "User object missing or invalid in successful login response"
        assert "expiresIn" in json_resp and isinstance(json_resp["expiresIn"], str), "expiresIn missing or invalid in successful login response"
    except requests.RequestException as e:
        assert False, f"Request exception during valid login: {e}"

    # 2. Test invalid credentials response (401)
    payload_invalid = {
        "email": valid_email,
        "password": invalid_password
    }
    try:
        response = requests.post(LOGIN_ENDPOINT, json=payload_invalid, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request exception during invalid login attempt: {e}"

    # 3. Test rate limiting after 5 failed attempts within 10 minutes
    # We already made 1 failed attempt above; make 5 more and expect 429 on the last
    # Note: Depending on backend implementation, it might be 5 in total or 5 + current, so we will do 5 more attempts.
    rate_limit_reached = False
    for attempt in range(5):
        try:
            response = requests.post(LOGIN_ENDPOINT, json=payload_invalid, headers=headers, timeout=TIMEOUT)
            if response.status_code == 429:
                rate_limit_reached = True
                break
            else:
                # Expect 401 until rate limit reached
                assert response.status_code == 401, f"Expected 401 or 429, got {response.status_code} on attempt {attempt+2}"
        except requests.RequestException as e:
            assert False, f"Request exception during rate limiting attempts: {e}"
        # No sleep needed because limit is based on last 10 minutes - quick requests count

    assert rate_limit_reached, "Did not receive 429 Too Many Requests after 5 failed login attempts"

test_user_login_with_rate_limiting()