import requests

BASE_URL = "http://localhost:4002/api"
HEALTH_ENDPOINT = "/health"
TIMEOUT = 30

def test_verify_api_health_check_endpoint():
    url = f"{BASE_URL}{HEALTH_ENDPOINT}"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    # Validate expected fields for status and version information
    # We expect keys like "status" and "version" based on typical health check responses
    # The PRD states: "API status and version information"
    assert isinstance(data, dict), "Response JSON should be an object"
    assert "status" in data, "Response JSON missing 'status' key"
    assert isinstance(data["status"], str), "'status' should be a string"
    assert "version" in data, "Response JSON missing 'version' key"
    assert isinstance(data["version"], str), "'version' should be a string"

    # Common health endpoint status check, status usually 'ok' or 'healthy'
    assert data["status"].lower() in ["ok", "healthy", "up"], f"Unexpected status value: {data['status']}"
    # Version expected to be non-empty string like "1.0.0"
    assert len(data["version"].strip()) > 0, "Version string is empty"


test_verify_api_health_check_endpoint()
