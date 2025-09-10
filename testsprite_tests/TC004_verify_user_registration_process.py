import requests
import uuid

BASE_URL = "http://localhost:4002/api"
REGISTER_ENDPOINT = f"{BASE_URL}/auth/register"
TIMEOUT = 30

def verify_user_registration_process():
    # Generate unique email to avoid duplication
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Test User",
        "email": unique_email,
        "password": "TestPass123!",
        "phone": "+5511999999999",
        "city": "São Paulo",
        "state": "SP",
        "userType": "BUYER"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(REGISTER_ENDPOINT, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200 or response.status_code == 201, f"Unexpected status code: {response.status_code}"
        data = response.json()

        assert "success" in data, "'success' field missing in response"
        assert data["success"] is True, f"Registration failed: {data.get('message', '')}"

        assert "user" in data and isinstance(data["user"], dict), "'user' object missing or invalid in response"
        user = data["user"]
        for field in ["id", "name", "email"]:
            assert field in user, f"Missing '{field}' in user data"
        assert user["email"] == unique_email, "Registered email does not match request payload"

        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 0, "JWT token missing or invalid"

    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"User registration test failed: {str(e)}")

verify_user_registration_process()
