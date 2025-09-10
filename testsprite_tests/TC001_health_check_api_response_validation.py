import requests
from requests.auth import HTTPBasicAuth

def test_health_check_api_response_validation():
    base_url = "http://localhost:4001"
    endpoint = "/api/health"
    url = base_url + endpoint
    auth = HTTPBasicAuth("gouveiarx@gmail.com", "Teste123")
    timeout = 30

    try:
        response = requests.get(url, auth=auth, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    # Assert HTTP 200 status code
    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Assert required keys in response JSON
    expected_keys = {"status", "message", "timestamp", "environment", "version"}
    json_keys = set(json_data.keys())
    missing_keys = expected_keys - json_keys
    assert not missing_keys, f"Response JSON missing keys: {missing_keys}"

    # Assert types of the values for the expected fields
    assert isinstance(json_data["status"], str), "Field 'status' should be a string"
    assert isinstance(json_data["message"], str), "Field 'message' should be a string"
    assert isinstance(json_data["timestamp"], str), "Field 'timestamp' should be a string"
    assert isinstance(json_data["environment"], str), "Field 'environment' should be a string"
    assert isinstance(json_data["version"], str), "Field 'version' should be a string"

test_health_check_api_response_validation()