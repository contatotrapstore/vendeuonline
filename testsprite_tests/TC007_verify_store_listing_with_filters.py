import requests

BASE_URL = "http://localhost:4002/api"
LOGIN_URL = f"{BASE_URL}/auth/login"
STORES_URL = f"{BASE_URL}/stores"

USERNAME = "gouveiarx@gmail.com"
PASSWORD = "Teste123"

timeout = 30


def test_verify_store_listing_with_filters():
    # Authenticate to obtain JWT token
    try:
        login_resp = requests.post(
            LOGIN_URL,
            json={"email": USERNAME, "password": PASSWORD},
            timeout=timeout,
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        assert login_json.get("success") is True and "token" in login_json, "Login response missing success or token"
        token = login_json.get("token")
        assert token, "No token received on login"
    except Exception as e:
        raise AssertionError(f"Authentication failed: {e}")

    # Fix boolean for verified filter to match API schema (boolean, not string)
    # Therefore, convert string 'true' or 'false' to boolean True/False

    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # Define filter parameter sets to test
    filter_test_cases = [
        {},  # no filters
        {"page": 1, "limit": 5},
        {"search": "shop"},
        {"verified": True},
        {"city": "São Paulo"},
        {"state": "SP"},
        {"page": 2, "limit": 3, "search": "market", "verified": False, "city": "Rio", "state": "RJ"},
        {"verified": False},
        {"verified": True, "city": "Curitiba"},
        {"limit": 0},  # edge case: limit zero or invalid
        {"limit": -1},
        {"page": 99999},  # very high page number
        {"search": "!@#$%"},  # special chars search
    ]

    for params in filter_test_cases:
        try:
            response = requests.get(STORES_URL, params=params, headers=headers, timeout=timeout)
        except Exception as e:
            raise AssertionError(f"Request failed for params {params}: {e}")

        # Should always succeed since no authentication required for /stores per schema
        assert response.status_code == 200, f"Failed with status {response.status_code} for params {params}"

        try:
            data = response.json()
        except Exception:
            raise AssertionError(f"Response not in JSON format for params {params}")

        # Data should be a list or contain list of stores - The schema states /stores GET returns list with filters.
        assert isinstance(data, (list, dict)), f"Response for params {params} expected to be list or dict."

        # If dict, it should have keys related to paging or stores
        if isinstance(data, dict):
            # Common keys might be 'data', 'stores', 'page', 'limit', 'total' etc.
            possible_keys = ("data", "stores", "page", "limit", "total")
            found_keys = set(data.keys()) & set(possible_keys)
            assert found_keys, f"Response keys {data.keys()} for params {params} do not include expected keys"

            # Check if 'data' or 'stores' key contains list
            if "data" in data:
                assert isinstance(data["data"], list), f"'data' field is not list for params {params}"
            elif "stores" in data:
                assert isinstance(data["stores"], list), f"'stores' field is not list for params {params}"
        elif isinstance(data, list):
            # If list, assume list of stores
            # Items should be dicts representing stores
            if data:
                assert isinstance(data[0], dict), f"Store list item not dict for params {params}"
        else:
            assert False, f"Unexpected response type for params {params}"

        # Additional validations on known params
        if "verified" in params:
            # Check that each returned store matches verified filter if stores list present
            stores_list = None
            if isinstance(data, dict):
                stores_list = data.get("data") or data.get("stores") or []
            elif isinstance(data, list):
                stores_list = data
            for store in stores_list:
                param_verified = params["verified"]
                if "isVerified" in store:
                    assert store["isVerified"] == param_verified, f"Store verified mismatch for params {params}"

        if "city" in params:
            city_param = params["city"].lower()
            stores_list = None
            if isinstance(data, dict):
                stores_list = data.get("data") or data.get("stores") or []
            elif isinstance(data, list):
                stores_list = data
            for store in stores_list:
                assert "city" in store, f"Store missing city field for params {params}"
                if store["city"]:
                    assert city_param in store["city"].lower(), f"Store city '{store['city']}' does not match filter city '{params['city']}'"

        if "state" in params:
            state_param = params["state"].lower()
            stores_list = None
            if isinstance(data, dict):
                stores_list = data.get("data") or data.get("stores") or []
            elif isinstance(data, list):
                stores_list = data
            for store in stores_list:
                assert "state" in store, f"Store missing state field for params {params}"
                if store["state"]:
                    assert state_param == store["state"].lower(), f"Store state '{store['state']}' does not match filter state '{params['state']}'"


test_verify_store_listing_with_filters()
