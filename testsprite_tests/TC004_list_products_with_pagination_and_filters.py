import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:4001"
AUTH_USERNAME = "gouveiarx@gmail.com"
AUTH_PASSWORD = "Teste123"
TIMEOUT = 30

def test_list_products_with_pagination_and_filters():
    url = f"{BASE_URL}/api/products"
    auth = HTTPBasicAuth(AUTH_USERNAME, AUTH_PASSWORD)

    # Example query parameters for pagination, search, filtering, sorting
    params = {
        "page": 1,
        "limit": 10,
        "search": "shoe",
        "category": "footwear",
        "minPrice": 50,
        "maxPrice": 200,
        "sortBy": "price_asc"
    }

    try:
        response = requests.get(url, auth=auth, params=params, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request failed: {e}")

    # Assert status code 200
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    try:
        json_data = response.json()
    except ValueError:
        raise AssertionError("Response is not valid JSON")

    # Validate the JSON structure as per API schema
    assert isinstance(json_data, dict), "Response JSON is not an object"
    assert "products" in json_data, "'products' key missing in response"
    assert "pagination" in json_data, "'pagination' key missing in response"

    products = json_data["products"]
    pagination = json_data["pagination"]

    assert isinstance(products, list), "'products' is not a list"
    assert isinstance(pagination, dict), "'pagination' is not an object"

    # Validate pagination fields (at least current page and limit if present)
    # Since schema only says object, we accept any dict here, could be extended if more info available
    # Validate products entries if list not empty
    if products:
        for product in products:
            assert isinstance(product, dict), "Each product must be an object"

    # No authentication error or other HTTP codes expected for this GET endpoint but basic auth is used

test_list_products_with_pagination_and_filters()