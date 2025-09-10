import requests
from requests.auth import HTTPBasicAuth

def test_get_user_orders_with_pagination():
    base_url = "http://localhost:4001"
    login_url = f"{base_url}/api/auth/login"
    orders_url = f"{base_url}/api/orders"
    auth_username = "gouveiarx@gmail.com"
    auth_password = "Teste123"
    timeout = 30

    # Login payload
    login_payload = {
        "email": auth_username,
        "password": auth_password
    }

    try:
        # Perform login to get token
        login_response = requests.post(login_url, json=login_payload, timeout=timeout)
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        login_data = login_response.json()
        token = login_data.get("token")
        assert token, "Token not present in login response"

        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Request paginated orders (defaults can be used or specify page/limit if desired)
        orders_response = requests.get(orders_url, headers=headers, timeout=timeout)
        assert orders_response.status_code == 200, f"Expected 200 OK but got {orders_response.status_code}"

        orders_data = orders_response.json()
        assert isinstance(orders_data, dict), "Response is not a JSON object"

        # Validate response structure
        assert "success" in orders_data, "'success' field missing in response"
        assert isinstance(orders_data["success"], bool), "'success' is not boolean"

        assert "orders" in orders_data, "'orders' field missing in response"
        assert isinstance(orders_data["orders"], list), "'orders' is not a list"

        assert "pagination" in orders_data, "'pagination' field missing in response"
        assert isinstance(orders_data["pagination"], dict), "'pagination' is not a dict"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_user_orders_with_pagination()