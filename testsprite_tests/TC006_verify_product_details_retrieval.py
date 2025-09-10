import requests
from requests.auth import HTTPBasicAuth
import uuid
import time

BASE_URL = "http://localhost:4001"
AUTH_USERNAME = "gouveiarx@gmail.com"
AUTH_PASSWORD = "Teste123"
TIMEOUT = 30

def test_verify_product_details_retrieval():
    # Login to obtain token for product creation (SELLER role assumed by test user)
    login_url = f"http://localhost:4002/api/auth/login"
    login_payload = {
        "email": AUTH_USERNAME,
        "password": AUTH_PASSWORD
    }

    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        login_resp.raise_for_status()
        login_data = login_resp.json()
        assert login_data.get("success") is True, "Login unsuccessful"
        token = login_data.get("token")
        assert token, "No token received on login"

        headers_auth = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Get category ID needed to create product (we need an active category)
        categories_url = "http://localhost:4002/api/categories"
        categories_resp = requests.get(categories_url, timeout=TIMEOUT)
        categories_resp.raise_for_status()
        categories_data = categories_resp.json()
        assert isinstance(categories_data, dict) and "data" in categories_data, "Categories response malformed"
        categories_list = categories_data.get("data", [])
        assert len(categories_list) > 0, "No categories available to assign product"
        category_id = categories_list[0].get("id")
        assert category_id, "Category ID missing"

        product_id = None
        # Create a product to test retrieval on valid ID
        create_product_url = "http://localhost:4002/api/products"
        product_payload = {
            "name": f"Test Product {str(uuid.uuid4())}",
            "description": "Product description for testing retrieval",
            "price": 19.99,
            "stock": 10,
            "categoryId": category_id
        }

        create_resp = requests.post(create_product_url, json=product_payload, headers=headers_auth, timeout=TIMEOUT)
        create_resp.raise_for_status()
        created_product = create_resp.json()
        # The response shape is not specified exactly for successful creation, try to extract product id
        # Assuming it returns the created product object with an 'id' field
        if isinstance(created_product, dict) and 'id' in created_product:
            product_id = created_product['id']
        else:
            # Possible response wrapping
            if 'data' in created_product and 'id' in created_product['data']:
                product_id = created_product['data']['id']
            else:
                raise AssertionError("Created product response missing ID")

        # Test valid product ID retrieval (no authentication required)
        get_product_url = f"http://localhost:4002/api/products/{product_id}"
        get_resp = requests.get(get_product_url, timeout=TIMEOUT)
        get_resp.raise_for_status()
        product_data = get_resp.json()
        assert isinstance(product_data, dict), "Product details response not a dictionary"
        # Validate key fields in product data
        expected_fields = [
            "id", "name", "description", "price", "stock", "categoryId"
        ]
        for field in expected_fields:
            assert field in product_data, f"Field '{field}' missing in product details"
        assert product_data["id"] == product_id, "Returned product ID mismatch"

        # Test retrieval with invalid ID format
        invalid_id = "invalid-id-format"
        get_invalid_url = f"http://localhost:4002/api/products/{invalid_id}"
        invalid_resp = requests.get(get_invalid_url, timeout=TIMEOUT)
        # Should return 4xx (likely 400 or 404)
        assert invalid_resp.status_code in {400,404}, f"Expected 400 or 404 for invalid ID, got {invalid_resp.status_code}"

        # Test retrieval with non-existent but valid ID (UUID)
        non_existent_id = str(uuid.uuid4())
        get_nonexistent_url = f"http://localhost:4002/api/products/{non_existent_id}"
        nonexistent_resp = requests.get(get_nonexistent_url, timeout=TIMEOUT)
        # Should return 404 Not Found
        assert nonexistent_resp.status_code == 404 or nonexistent_resp.status_code == 400, f"Expected 404 or 400 for non-existent ID, got {nonexistent_resp.status_code}"

    finally:
        # Cleanup - delete the created product if product_id is set
        if 'token' in locals() and product_id:
            try:
                delete_url = f"http://localhost:4002/api/products/{product_id}"
                # Assuming DELETE endpoint exists and requires auth with role SELLER or ADMIN
                del_resp = requests.delete(delete_url, headers=headers_auth, timeout=TIMEOUT)
                # May be 200 or 204 if deleted
                if del_resp.status_code not in {200,204,404}:
                    raise AssertionError(f"Failed to delete product with status code {del_resp.status_code}")
            except Exception:
                pass

test_verify_product_details_retrieval()