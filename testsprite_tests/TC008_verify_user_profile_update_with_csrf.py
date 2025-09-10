import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:4002/api"
TIMEOUT = 30

USERNAME = "gouveiarx@gmail.com"
PASSWORD = "Teste123"

def test_verify_user_profile_update_with_csrf():
    session = requests.Session()
    try:
        # Step 1: Login to get JWT token
        login_payload = {
            "email": USERNAME,
            "password": PASSWORD
        }
        login_resp = session.post(
            f"{BASE_URL}/auth/login",
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert login_data.get("success") is True, f"Login unsuccessful: {login_data}"
        token = login_data.get("token")
        assert token, "No token returned on login"

        headers_auth = {
            "Authorization": f"Bearer {token}"
        }

        # Step 2: Retrieve CSRF token
        csrf_resp = session.get(
            f"{BASE_URL}/csrf-token",
            headers=headers_auth,
            timeout=TIMEOUT
        )
        assert csrf_resp.status_code == 200, f"CSRF token retrieval failed: {csrf_resp.text}"
        csrf_data = csrf_resp.json()
        csrf_token = csrf_data.get("csrfToken") or csrf_data.get("csrf_token") or csrf_data.get("token")
        assert csrf_token, f"CSRF token not found in response: {csrf_data}"

        headers_auth_csrf = {
            **headers_auth,
            "X-CSRF-Token": csrf_token
        }

        # Step 3: Get current user profile to compare later
        profile_get_resp = session.get(
            f"{BASE_URL}/users/profile",
            headers=headers_auth,
            timeout=TIMEOUT
        )
        assert profile_get_resp.status_code in (200, 405, 404), "GET /users/profile might not be allowed or does not exist"
        old_profile = {}
        if profile_get_resp.status_code == 200:
            old_profile = profile_get_resp.json()
        
        # Step 4: Update user profile with new data
        update_payload = {
            "name": "Updated Test User",
            "phone": "555-123-4567",
            "city": "São Paulo",
            "state": "SP"
        }
        update_resp = session.put(
            f"{BASE_URL}/users/profile",
            headers=headers_auth_csrf,
            json=update_payload,
            timeout=TIMEOUT
        )
        assert update_resp.status_code == 200, f"User profile update failed: {update_resp.text}"
        update_data = update_resp.json()
        # Assuming API returns the updated profile or success boolean
        # If it returns updated profile:
        if isinstance(update_data, dict):
            for key, value in update_payload.items():
                assert update_data.get(key) == value, f"Profile field '{key}' not updated correctly."

        # Step 5: Verify changes persist by getting profile again (if GET /users/profile supported)
        profile_verify_resp = session.get(
            f"{BASE_URL}/users/profile",
            headers=headers_auth,
            timeout=TIMEOUT
        )
        if profile_verify_resp.status_code == 200:
            profile_verify_data = profile_verify_resp.json()
            for key, value in update_payload.items():
                assert profile_verify_data.get(key) == value, f"Persisted profile field '{key}' does not match update."

    finally:
        session.close()

test_verify_user_profile_update_with_csrf()