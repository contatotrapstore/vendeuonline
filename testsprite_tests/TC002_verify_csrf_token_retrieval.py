import requests
from requests.auth import HTTPBasicAuth

def test_verify_csrf_token_retrieval():
    base_url = "http://localhost:4002"
    login_url = f"{base_url}/auth/login"
    csrf_token_url = f"{base_url}/csrf-token"
    timeout = 30

    credentials = {
        "email": "gouveiarx@gmail.com",
        "password": "Teste123"
    }

    # Step 1: Authenticate user via /auth/login to obtain JWT token
    try:
        login_response = requests.post(
            login_url,
            json=credentials,
            timeout=timeout
        )
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        login_data = login_response.json()
        assert login_data.get("success") is True, f"Login unsuccessful: {login_data.get('message')}"
        token = login_data.get("token")
        assert token and isinstance(token, str), "JWT token not found in login response"
    except requests.RequestException as e:
        assert False, f"Login request exception: {e}"

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Step 2: Access /csrf-token GET endpoint with JWT token
    try:
        csrf_response = requests.get(csrf_token_url, headers=headers, timeout=timeout)
        assert csrf_response.status_code == 200, f"Failed to retrieve CSRF token, status {csrf_response.status_code}"
        csrf_data = csrf_response.json()
        # Assuming the CSRF token is returned with a key e.g. 'csrfToken' or similar
        # Since schema is not explicitly given for response, validate presence of a token string
        assert isinstance(csrf_data, dict), "CSRF response is not a JSON object"
        token_keys = [k.lower() for k in csrf_data.keys()]
        csrf_token = None
        for key in token_keys:
            if 'csrf' in key and ('token' in key or 'token' == key):
                csrf_token = csrf_data.get(key)
                break
        assert csrf_token and isinstance(csrf_token, str) and len(csrf_token) > 0, "CSRF token not found or invalid"
    except requests.RequestException as e:
        assert False, f"CSRF token request exception: {e}"

test_verify_csrf_token_retrieval()