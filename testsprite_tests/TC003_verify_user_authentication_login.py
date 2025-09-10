import requests


def verify_user_authentication_login():
    base_url = "http://localhost:4002/api"
    login_endpoint = f"{base_url}/auth/login"
    timeout = 30

    # Test data
    correct_credentials = {
        "email": "gouveiarx@gmail.com",
        "password": "Teste123"
    }
    # Include userType parameter (optional)
    correct_credentials_with_user_type = {
        "email": "gouveiarx@gmail.com",
        "password": "Teste123",
        "userType": "SELLER"
    }
    incorrect_credentials = {
        "email": "gouveiarx@gmail.com",
        "password": "WrongPassword"
    }
    invalid_email = {
        "email": "invalidemail@example.com",
        "password": "Teste123"
    }
    missing_password = {
        "email": "gouveiarx@gmail.com"
    }
    empty_body = {}

    headers = {
        "Content-Type": "application/json"
    }

    # Correct credentials login - without userType
    try:
        response = requests.post(
            login_endpoint, json=correct_credentials, headers=headers, timeout=timeout
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        resp_json = response.json()
        assert isinstance(resp_json.get("success"), bool), "Missing 'success' boolean in response"
        assert resp_json.get("success") is True, "Login with correct credentials failed"
        # Token presence and user object
        assert "token" in resp_json and isinstance(resp_json["token"], str) and resp_json["token"], "Token missing or invalid"
        assert "user" in resp_json and isinstance(resp_json["user"], dict), "User object missing or invalid"
    except Exception as e:
        raise AssertionError(f"Login with correct credentials failed: {e}")

    # Correct credentials login - with userType parameter
    try:
        response = requests.post(
            login_endpoint, json=correct_credentials_with_user_type, headers=headers, timeout=timeout
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        resp_json = response.json()
        assert isinstance(resp_json.get("success"), bool), "Missing 'success' boolean in response"
        assert resp_json.get("success") is True, "Login with correct credentials and userType failed"
        assert "token" in resp_json and isinstance(resp_json["token"], str) and resp_json["token"], "Token missing or invalid"
        assert "user" in resp_json and isinstance(resp_json["user"], dict), "User object missing or invalid"
    except Exception as e:
        raise AssertionError(f"Login with correct credentials and userType failed: {e}")

    # Incorrect password login
    try:
        response = requests.post(
            login_endpoint, json=incorrect_credentials, headers=headers, timeout=timeout
        )
        # Expected fail: 401 Unauthorized or 400 Bad Request or 200 with success False
        assert response.status_code in (400, 401, 403, 200), f"Unexpected status code {response.status_code} for incorrect password"
        resp_json = response.json()
        # If success boolean present, should be False
        if "success" in resp_json:
            assert resp_json["success"] is False, "Login should fail with incorrect password but success is True"
        else:
            assert response.status_code != 200, "Login succeeded unexpectedly with incorrect password"
    except Exception as e:
        raise AssertionError(f"Login with incorrect password test failed: {e}")

    # Invalid email login
    try:
        response = requests.post(
            login_endpoint, json=invalid_email, headers=headers, timeout=timeout
        )
        assert response.status_code in (400, 401, 403, 200), f"Unexpected status code {response.status_code} for invalid email"
        resp_json = response.json()
        if "success" in resp_json:
            assert resp_json["success"] is False, "Login should fail with invalid email but success True"
        else:
            assert response.status_code != 200, "Login succeeded unexpectedly with invalid email"
    except Exception as e:
        raise AssertionError(f"Login with invalid email test failed: {e}")

    # Missing password field
    try:
        response = requests.post(
            login_endpoint, json=missing_password, headers=headers, timeout=timeout
        )
        assert response.status_code == 400 or response.status_code == 422, "Expected 400 or 422 for missing password"
    except Exception as e:
        raise AssertionError(f"Login with missing password field test failed: {e}")

    # Empty request body
    try:
        response = requests.post(
            login_endpoint, json=empty_body, headers=headers, timeout=timeout
        )
        assert response.status_code == 400 or response.status_code == 422, "Expected 400 or 422 for empty request body"
    except Exception as e:
        raise AssertionError(f"Login with empty request body test failed: {e}")


verify_user_authentication_login()
