import requests
from requests.auth import HTTPBasicAuth
import uuid
import time

BASE_URL = "http://localhost:4001"
REGISTER_ENDPOINT = "/api/auth/register"

AUTH_USERNAME = "gouveiarx@gmail.com"
AUTH_PASSWORD = "Teste123"
TIMEOUT = 30

def test_user_registration_validation_and_rate_limiting():
    headers = {
        "Content-Type": "application/json"
    }
    auth = HTTPBasicAuth(AUTH_USERNAME, AUTH_PASSWORD)

    # Helper function to register a user with given payload
    def register_user(payload):
        return requests.post(
            BASE_URL + REGISTER_ENDPOINT,
            json=payload,
            headers=headers,
            auth=auth,
            timeout=TIMEOUT
        )
    
    # Generate unique user email to avoid duplication
    unique_email = f"testuser_{uuid.uuid4()}@example.com"
    valid_payload = {
        "name": "Test User",
        "email": unique_email,
        "password": "StrongPass!123",
        "userType": "BUYER"
    }

    # 1) Test successful user registration with required fields
    response = register_user(valid_payload)
    assert response.status_code == 201, f"Expected 201 for successful registration, got {response.status_code}"

    # 2) Test validation error: missing required field 'email'
    bad_payload_missing_email = valid_payload.copy()
    bad_payload_missing_email.pop("email")
    response = register_user(bad_payload_missing_email)
    assert response.status_code == 400, f"Expected 400 for missing required field, got {response.status_code}"

    # 3) Test validation error: email already exists (duplicate user)
    response = register_user(valid_payload)
    assert response.status_code == 400, f"Expected 400 for duplicate user registration, got {response.status_code}"

    # 4) Test rate limiting on excessive registration attempts
    # Perform multiple registrations with unique emails quickly to trigger rate limit (assume limit < 10)
    rate_limit_exceeded = False
    for i in range(15):
        test_email = f"ratelimit_{uuid.uuid4()}@example.com"
        payload = {
            "name": "Rate Limit Test",
            "email": test_email,
            "password": "TestPass123!",
            "userType": "SELLER"
        }
        resp = register_user(payload)
        if resp.status_code == 429:
            rate_limit_exceeded = True
            break
        # Small delay to avoid false triggering if needed
        time.sleep(0.1)
    assert rate_limit_exceeded, "Expected to receive 429 Too Many Requests on excessive registration attempts"

test_user_registration_validation_and_rate_limiting()