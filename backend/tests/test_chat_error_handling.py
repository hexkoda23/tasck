from chat_error_handling import chat_error_for


def test_chat_error_maps_anthropic_billing_text_even_when_it_arrives_as_400():
    error = chat_error_for(400, "You have reached your specified API usage limits")

    assert error.status_code == 429
    assert error.code == "api_quota_exceeded"
    assert error.message.startswith("API Quota Exceeded:")


def test_chat_error_maps_required_provider_and_route_failures():
    cases = [
        (404, "", "action_not_supported", "Action Not Supported:"),
        (401, "", "api_authentication_failed", "API Authentication Failed:"),
        (400, "", "bad_request", "Chat Request Rejected:"),
        (529, "", "ai_service_unavailable", "AI Service Unavailable:"),
    ]

    for status, detail, code, prefix in cases:
        error = chat_error_for(status, detail)
        assert error.code == code
        assert error.message.startswith(prefix)
