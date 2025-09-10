import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:4001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
WISHLIST_URL = f"{BASE_URL}/api/wishlist"

USERNAME = "gouveiarx@gmail.com"
PASSWORD = "Teste123"
TIMEOUT = 30

def test_get_user_wishlist_items():
    try:
        # Login to get auth token
        login_payload = {
            "email": USERNAME,
            "password": PASSWORD
        }
        login_headers = {
            "Content-Type": "application/json"
        }
        login_resp = requests.post(LOGIN_URL, json=login_payload, headers=login_headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "token" in login_data and isinstance(login_data["token"], str) and login_data["token"], "Token missing in login response"

        token = login_data["token"]
        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Call the wishlist GET endpoint
        resp = requests.get(WISHLIST_URL, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Wishlist request failed with status {resp.status_code}"

        json_data = resp.json()

        # Validate response structure
        assert isinstance(json_data, dict), "Response JSON is not an object"
        assert "success" in json_data and isinstance(json_data["success"], bool), "'success' field missing or not boolean"
        assert json_data["success"] is True, "Success field is not true"
        assert "data" in json_data and isinstance(json_data["data"], list), "'data' field missing or not a list"
        assert "total" in json_data and (isinstance(json_data["total"], int) and json_data["total"] >= 0), "'total' field missing or invalid"

    except requests.RequestException as e:
        assert False, f"Request error occurred: {e}"
    except AssertionError:
        raise

test_get_user_wishlist_items()