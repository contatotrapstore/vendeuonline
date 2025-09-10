import requests

BASE_URL = "http://localhost:4002/api"
AUTH_CREDENTIALS = {
    "username": "gouveiarx@gmail.com",
    "password": "Teste123"
}
TIMEOUT = 30

def test_verify_password_change_with_csrf_protection():
    session = requests.Session()
    try:
        # Step 1: Authenticate and get JWT token
        login_url = f"{BASE_URL}/auth/login"
        login_payload = {
            "email": AUTH_CREDENTIALS["username"],
            "password": AUTH_CREDENTIALS["password"]
        }
        login_response = session.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        assert login_data.get("success") is True, f"Login unsuccessful: {login_data}"
        token = login_data.get("token")
        assert token and isinstance(token, str), "No token received on login"
        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Step 2: Get CSRF token for authenticated user
        csrf_url = f"{BASE_URL}/csrf-token"
        csrf_response = session.get(csrf_url, headers=headers, timeout=TIMEOUT)
        assert csrf_response.status_code == 200, f"CSRF token fetch failed: {csrf_response.text}"
        csrf_json = csrf_response.json()
        csrf_token = csrf_json.get("csrfToken") or csrf_json.get("token")
        assert csrf_token and isinstance(csrf_token, str), "No CSRF token found in response"
        headers["X-CSRF-Token"] = csrf_token

        # Step 3: Attempt to change password with incorrect current password (expect failure)
        change_password_url = f"{BASE_URL}/users/password"
        bad_password_payload = {
            "currentPassword": "WrongPassword123!",
            "newPassword": "NewPass!2345"
        }
        bad_pw_response = session.put(change_password_url, headers=headers, json=bad_password_payload, timeout=TIMEOUT)
        assert bad_pw_response.status_code in (400, 401), "Expected failure when current password is wrong"
        bad_pw_json = bad_pw_response.json()
        assert "error" in bad_pw_json or "message" in bad_pw_json, "Expected error message for wrong current password"

        # Step 4: Attempt to change password with invalid new password (e.g. too short or fails requirements)
        invalid_new_pw_payload = {
            "currentPassword": AUTH_CREDENTIALS["password"],
            "newPassword": "short"
        }
        invalid_pw_response = session.put(change_password_url, headers=headers, json=invalid_new_pw_payload, timeout=TIMEOUT)
        # Backend likely returns 400 Bad Request or validation error
        assert invalid_pw_response.status_code == 400, "Expected validation error for invalid new password"
        invalid_pw_json = invalid_pw_response.json()
        assert "error" in invalid_pw_json or "message" in invalid_pw_json, "Expected error message for new password validation"

        # Step 5: Change password with valid current password and valid new password (expect success)
        valid_new_password = "NewValidPass123!"
        valid_pw_payload = {
            "currentPassword": AUTH_CREDENTIALS["password"],
            "newPassword": valid_new_password
        }
        valid_pw_response = session.put(change_password_url, headers=headers, json=valid_pw_payload, timeout=TIMEOUT)
        assert valid_pw_response.status_code == 200, f"Password change failed: {valid_pw_response.text}"
        valid_pw_json = valid_pw_response.json()
        assert valid_pw_json.get("success") is True or "message" in valid_pw_json, "Password change response missing success indicator"

        # Step 6: Verify that old password no longer works by attempting login with old password (expect failure)
        login_old_response = session.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_old_response.status_code in (400,401), "Login with old password should fail after change"

        # Step 7: Verify login works with new password
        login_new_payload = {
            "email": AUTH_CREDENTIALS["username"],
            "password": valid_new_password
        }
        login_new_response = session.post(login_url, json=login_new_payload, timeout=TIMEOUT)
        assert login_new_response.status_code == 200, f"Login with new password failed: {login_new_response.text}"
        login_new_json = login_new_response.json()
        assert login_new_json.get("success") is True, "Login with new password unsuccessful"

        # Step 8: Revert password to original (cleanup) to maintain test user state
        # Need new bearer token and CSRF token after login with new password
        new_token = login_new_json.get("token")
        assert new_token and isinstance(new_token, str), "No token received after login with new password"
        headers_revert = {
            "Authorization": f"Bearer {new_token}"
        }
        # Get CSRF token again for revert
        csrf_response_revert = session.get(csrf_url, headers=headers_revert, timeout=TIMEOUT)
        assert csrf_response_revert.status_code == 200, "Failed to get CSRF token for revert password"
        csrf_json_revert = csrf_response_revert.json()
        csrf_token_revert = csrf_json_revert.get("csrfToken") or csrf_json_revert.get("token")
        assert csrf_token_revert and isinstance(csrf_token_revert, str), "No CSRF token for revert password"
        headers_revert["X-CSRF-Token"] = csrf_token_revert

        revert_payload = {
            "currentPassword": valid_new_password,
            "newPassword": AUTH_CREDENTIALS["password"]
        }
        revert_response = session.put(change_password_url, headers=headers_revert, json=revert_payload, timeout=TIMEOUT)
        assert revert_response.status_code == 200, f"Password revert failed: {revert_response.text}"
        revert_json = revert_response.json()
        assert revert_json.get("success") is True or "message" in revert_json, "Password revert response missing success indicator"
    finally:
        session.close()

test_verify_password_change_with_csrf_protection()