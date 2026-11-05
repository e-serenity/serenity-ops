from app.core import confirmations, hub, subagents


def test_confirmations_lifecycle():
    called = []

    def dummy_callback():
        called.append(True)
        return "Success"

    action_id = confirmations.register_pending(
        agent_name="serenity-agent-cw",
        action_name="put_metric_alarm",
        target="HighCPU",
        details="Create alarm for CPU > 85%",
        callback=dummy_callback,
        incident_id="inc-test-123"
    )

    assert action_id is not None
    action = confirmations.pop_pending(action_id)
    assert action is not None
    assert action["agent"] == "serenity-agent-cw"
    assert action["target"] == "HighCPU"

    # Execution
    result = confirmations.execute_pending(action, approved_by="test-user")
    assert result == "Success"
    assert called == [True]


def test_slack_approval_blocks():
    blocks = confirmations.create_slack_approval_blocks(
        action_id="test-action-id",
        summary="Action summary here",
        incident_id="inc-123"
    )
    assert len(blocks) >= 2
    assert blocks[0]["type"] == "section"
    assert blocks[1]["type"] == "actions"

    # Check button action IDs
    buttons = blocks[1]["elements"]
    action_ids = [btn["action_id"] for btn in buttons]
    assert "serenity_confirm" in action_ids
    assert "serenity_cancel" in action_ids


def test_dynamic_tools_no_modules(monkeypatch):
    monkeypatch.setattr(hub, "get_active_modules", lambda: [])
    tools, descriptions = subagents.get_dynamic_tools()
    assert len(tools) == 0
    assert len(descriptions) == 1
    assert "investigator" in descriptions[0]


def test_dynamic_tools_with_ses(monkeypatch):
    monkeypatch.setattr(hub, "get_active_modules", lambda: [
        {"id": "serenity-ses", "name": "serenity-ses", "status": "ACTIVE", "agent_role_arn": "arn:aws:iam::123:role/serenity-agent-ses"}
    ])
    tools, descriptions = subagents.get_dynamic_tools()
    assert len(tools) == 1
    assert tools[0].name == "ses_suppress_destination"
    assert any("serenity-agent-ses" in desc for desc in descriptions)


def test_format_application_context():
    from app.llm.orchestrator import format_application_context, generate_system_prompt

    ctx = {
        "organization_name": "ACME Corp",
        "business_domain": "Fintech / Payments",
        "architecture_summary": "Microservices on AWS ECS with RDS Aurora",
        "services": [
            {
                "name": "payment-api",
                "tech_stack": "Go / Gin / PostgreSQL",
                "repository": "github.com/acme/payment-api",
                "log_group": "/aws/ecs/payment-api",
                "criticality": "HIGH",
            }
        ],
        "runbooks": {
            "PaymentGateway5XX": "https://wiki.acme.com/runbooks/payment-5xx"
        },
    }

    formatted = format_application_context(ctx)
    assert "ACME Corp" in formatted
    assert "Fintech / Payments" in formatted
    assert "payment-api" in formatted
    assert "github.com/acme/payment-api" in formatted
    assert "https://wiki.acme.com/runbooks/payment-5xx" in formatted

    prompt = generate_system_prompt(["- serenity-agent-investigator"], app_context=ctx)
    assert "ACME Corp" in prompt
    assert "payment-api" in prompt

