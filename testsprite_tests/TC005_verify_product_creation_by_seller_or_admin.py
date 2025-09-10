import requests
from requests.auth import HTTPBasicAuth
import uuid
import time

BASE_URL = "http://localhost:4002/api"
AUTH_ENDPOINT = "/auth/login"
PRODUCTS_ENDPOINT = "/products"
TIMEOUT = 30

# Credentials from instructions
USERNAME = "gouveiarx@gmail.com"
PASSWORD = "Teste123"

def test_verify_product_creation_by_seller_or_admin():
    # Authenticate user to obtain JWT token
    try:
        auth_resp = requests.post(
            BASE_URL + AUTH_ENDPOINT,
            json={"email": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT,
        )
        assert auth_resp.status_code == 200, f"Auth failed: {auth_resp.text}"
        auth_data = auth_resp.json()
        assert auth_data.get("success") is True, f"Auth not successful: {auth_data}"
        token = auth_data.get("token")
        user = auth_data.get("user")
        assert token, "No token received"
        assert user and "type" in user, "User type missing"

        user_role = user["type"]
        # Allowed roles to create product: SELLER, ADMIN
        allowed_roles = {"SELLER", "ADMIN"}

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Prepare product data with required fields and optional images/specifications
        unique_suffix = str(uuid.uuid4())[:8]
        product_payload = {
            "name": f"Test Product {unique_suffix}",
            "description": "A test product created during automated tests.",
            "price": 99.99,
            "stock": 10,
            "categoryId": "category-test-id-123",  # Assuming this is a valid category ID or adjust accordingly
            "images": [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg"
            ],
            "specifications": [
                {"key": "Color", "value": "Red"},
                {"key": "Size", "value": "Medium"}
            ]
        }

        # Test allowed role creating product
        if user_role in allowed_roles:
            created_product_id = None
            try:
                create_resp = requests.post(
                    BASE_URL + PRODUCTS_ENDPOINT,
                    json=product_payload,
                    headers=headers,
                    timeout=TIMEOUT
                )
                assert create_resp.status_code in (200, 201), f"Failed to create product: {create_resp.text}"
                product_data = create_resp.json()
                # Expect product id or similar confirmation
                if isinstance(product_data, dict):
                    if "id" in product_data:
                        created_product_id = product_data["id"]
                    elif "product" in product_data and "id" in product_data["product"]:
                        created_product_id = product_data["product"]["id"]
                assert created_product_id, "No product ID returned after creation"

            finally:
                # Cleanup: delete created product if possible
                if created_product_id:
                    try:
                        delete_resp = requests.delete(
                            f"{BASE_URL}{PRODUCTS_ENDPOINT}/{created_product_id}",
                            headers=headers,
                            timeout=TIMEOUT
                        )
                        # Either 200 or 204 accepted for successful deletion
                        assert delete_resp.status_code in (200, 204), f"Failed to delete product during cleanup: {delete_resp.text}"
                    except Exception:
                        pass

        else:
            # For disallowed roles, creation should fail with 403 or 401
            create_resp = requests.post(
                BASE_URL + PRODUCTS_ENDPOINT,
                json=product_payload,
                headers=headers,
                timeout=TIMEOUT
            )
            assert create_resp.status_code in (401, 403), f"Unauthorized role was able to create product: {create_resp.text}"

    except requests.RequestException as e:
        assert False, f"Request failed: {str(e)}"

test_verify_product_creation_by_seller_or_admin()