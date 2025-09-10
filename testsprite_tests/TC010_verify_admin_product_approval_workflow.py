import requests
import time

BASE_URL = "http://localhost:4001"
API_PREFIX = "/admin/products"
AUTH_CREDENTIALS = {
    "email": "gouveiarx@gmail.com",
    "password": "Teste123"
}
TIMEOUT = 30

def test_verify_admin_product_approval_workflow():
    session = requests.Session()
    try:
        # Step 1: Authenticate as ADMIN user to get JWT token
        login_resp = session.post(
            f"http://localhost:4002/api/auth/login",
            json={"email": AUTH_CREDENTIALS["email"], "password": AUTH_CREDENTIALS["password"]},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert login_data.get("success") is True, "Login response success false"
        token = login_data.get("token")
        assert token, "No token returned on login"
        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Step 2: Get CSRF token for Admin user
        csrf_resp = session.get(
            f"http://localhost:4002/api/csrf-token",
            headers=headers,
            timeout=TIMEOUT
        )
        assert csrf_resp.status_code == 200, f"Failed to get CSRF token: {csrf_resp.text}"
        csrf_data = csrf_resp.json()
        csrf_token = csrf_data.get("csrfToken")
        assert csrf_token, "No CSRF token received"
        headers["X-CSRF-Token"] = csrf_token
        headers["Content-Type"] = "application/json"

        # Step 3: Since resource ID is not provided, create a new product as ADMIN user for testing approval
        product_payload = {
            "name": f"Test Product {int(time.time())}",
            "description": "Test product for approval workflow",
            "price": 99.99,
            "stock": 10,
            "categoryId": "test-category-id"
        }
        create_resp = session.post(
            f"http://localhost:4002/api/products",
            headers=headers,
            json=product_payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Product creation failed: {create_resp.text}"
        product_data = create_resp.json()
        product_id = product_data.get("id") or product_data.get("data", {}).get("id")
        assert product_id, "Product ID not returned after creation"

        # Step 4: Approve the product via PATCH /admin/products/:id/approval
        approval_payload_approve = {
            "approvalStatus": "APPROVED"
        }
        approve_resp = session.patch(
            f"http://localhost:4002/api/admin/products/{product_id}/approval",
            headers=headers,
            json=approval_payload_approve,
            timeout=TIMEOUT
        )
        assert approve_resp.status_code == 200, f"Product approval failed: {approve_resp.text}"
        approve_data = approve_resp.json()
        # Check approvalStatus is APPROVED in response if returned
        if isinstance(approve_data, dict) and "approvalStatus" in approve_data:
            assert approve_data["approvalStatus"] == "APPROVED", "Product not marked as approved"

        # Step 5: Reject the product with a reason
        rejection_reason = "Quality issues found"
        approval_payload_reject = {
            "approvalStatus": "REJECTED",
            "rejectionReason": rejection_reason
        }
        reject_resp = session.patch(
            f"http://localhost:4002/api/admin/products/{product_id}/approval",
            headers=headers,
            json=approval_payload_reject,
            timeout=TIMEOUT
        )
        assert reject_resp.status_code == 200, f"Product rejection failed: {reject_resp.text}"
        reject_data = reject_resp.json()
        # Check approvalStatus is REJECTED and rejectionReason is present and match
        if isinstance(reject_data, dict):
            assert reject_data.get("approvalStatus") == "REJECTED", "Product not marked as rejected"
            assert reject_data.get("rejectionReason") == rejection_reason, "Rejection reason mismatch"

        # Step 6: Try invalid approvalStatus value to test error handling
        invalid_payload = {
            "approvalStatus": "INVALID_STATUS"
        }
        invalid_resp = session.patch(
            f"http://localhost:4002/api/admin/products/{product_id}/approval",
            headers=headers,
            json=invalid_payload,
            timeout=TIMEOUT
        )
        # Expect this to fail with 4xx error
        assert invalid_resp.status_code >= 400 and invalid_resp.status_code < 500, \
            f"Invalid approvalStatus was accepted: {invalid_resp.text}"

    finally:
        # Cleanup: delete the product created (if product_id exists)
        if 'product_id' in locals():
            # Get new CSRF token for DELETE
            try:
                del_csrf_resp = session.get(
                    f"http://localhost:4002/api/csrf-token",
                    headers=headers,
                    timeout=TIMEOUT
                )
                if del_csrf_resp.status_code == 200:
                    del_csrf_data = del_csrf_resp.json()
                    del_csrf_token = del_csrf_data.get("csrfToken")
                else:
                    del_csrf_token = None
            except Exception:
                del_csrf_token = None

            delete_headers = headers.copy()
            if del_csrf_token:
                delete_headers["X-CSRF-Token"] = del_csrf_token
            try:
                delete_resp = session.delete(
                    f"http://localhost:4002/api/products/{product_id}",
                    headers=delete_headers,
                    timeout=TIMEOUT
                )
                # Accept 200 or 204 as successful deletion
                assert delete_resp.status_code in (200, 204), f"Failed to delete product: {delete_resp.text}"
            except Exception as e:
                # Log or ignore cleanup failure
                pass

test_verify_admin_product_approval_workflow()