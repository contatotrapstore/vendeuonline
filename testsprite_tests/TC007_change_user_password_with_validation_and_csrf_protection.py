import requests

BASE_URL = "http://localhost:4001"
LOGIN_EMAIL = "gouveiarx@gmail.com"
LOGIN_PASSWORD = "Teste123"
TIMEOUT = 30


def test_TC007_change_user_password_with_validation_and_csrf_protection():
    session = requests.Session()

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    # Step 1: Login to obtain JWT token
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "email": LOGIN_EMAIL,
        "password": LOGIN_PASSWORD
    }
    try:
        login_resp = session.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed, status {login_resp.status_code}"
        login_json = login_resp.json()
        token = login_json.get("token")
        assert token and isinstance(token, str), "Login token missing or invalid"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Error during login: {e}")

    auth_headers = headers.copy()
    auth_headers["Authorization"] = f"Bearer {token}"

    # Helper function to get a fresh CSRF token
    def get_csrf_token():
        csrf_url = f"{BASE_URL}/api/csrf-token"
        try:
            csrf_resp = session.get(csrf_url, headers=auth_headers, timeout=TIMEOUT)
            assert csrf_resp.status_code == 200, f"Failed to get CSRF token, status {csrf_resp.status_code}"
            csrf_json = csrf_resp.json()
            csrf_token = csrf_json.get("csrfToken")
            assert csrf_token and isinstance(csrf_token, str), "CSRF token missing or invalid"
            return csrf_token
        except (requests.RequestException, AssertionError) as e:
            raise AssertionError(f"Error obtaining CSRF token: {e}")

    # Test data
    current_password = LOGIN_PASSWORD
    new_password_valid = "NewPass!234"
    new_password_invalid = ""  # For validation error (empty)

    url = f"{BASE_URL}/api/users/password"

    # Helper function to perform the password change put request
    def put_change_password(current_pwd, new_pwd, csrf):
        payload = {
            "currentPassword": current_pwd,
            "newPassword": new_pwd,
            "_csrfToken": csrf
        }
        try:
            resp = session.put(url, json=payload, headers=auth_headers, timeout=TIMEOUT)
            return resp
        except requests.RequestException as e:
            raise AssertionError(f"Request exception during password change: {e}")

    # 1) Success case: change password with valid current and new password and valid CSRF
    csrf_token = get_csrf_token()
    resp_success = put_change_password(current_password, new_password_valid, csrf_token)
    assert resp_success.status_code == 200, f"Expected status 200, got {resp_success.status_code}, response: {resp_success.text}"
    resp_json = resp_success.json()
    assert isinstance(resp_json, dict), "Response JSON is not an object on successful password change"

    # Since password changed, update current_password for next steps
    updated_password = new_password_valid

    # 2) Error case: invalid current password (401 Unauthorized) with fresh CSRF token
    csrf_token = get_csrf_token()
    resp_unauth = put_change_password("WrongCurrentPwd", new_password_valid, csrf_token)
    assert resp_unauth.status_code == 401, f"Expected status 401, got {resp_unauth.status_code}, response: {resp_unauth.text}"

    # 3) Error case: validation error (400 Bad Request) - e.g. empty new password with fresh CSRF token
    csrf_token = get_csrf_token()
    resp_validation_error = put_change_password(updated_password, new_password_invalid, csrf_token)
    assert resp_validation_error.status_code == 400, f"Expected status 400, got {resp_validation_error.status_code}, response: {resp_validation_error.text}"

    # 4) Error case: invalid CSRF token (403 Forbidden)
    resp_csrf_invalid = put_change_password(updated_password, "AnotherNewPass123!", "InvalidCsrfTokenXYZ")
    assert resp_csrf_invalid.status_code == 403, f"Expected status 403, got {resp_csrf_invalid.status_code}, response: {resp_csrf_invalid.text}"

    # Cleanup: revert password back to original to not affect future tests
    csrf_token = get_csrf_token()
    resp_cleanup = put_change_password(updated_password, current_password, csrf_token)
    assert resp_cleanup.status_code == 200, f"Cleanup password revert failed, status {resp_cleanup.status_code}, response: {resp_cleanup.text}"


test_TC007_change_user_password_with_validation_and_csrf_protection()
