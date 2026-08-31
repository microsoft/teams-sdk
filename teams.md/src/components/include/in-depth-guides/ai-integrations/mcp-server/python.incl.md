<!-- intro -->

The setup uses the official [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) (`FastMCP`) mounted onto the same FastAPI server that hosts the Teams bot.

Full source: [examples/mcp-server](https://github.com/microsoft/teams.py/tree/main/examples/mcp-server).

<!-- define-tool -->

Tools are defined with the `@mcp.tool()` decorator. The function signature defines the input schema, the return type the output, and the docstring the tool description for agent consumption.

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("teams-bot")

@mcp.tool()
async def echo(message: str) -> str:
    """Echo back whatever was sent."""
    return f"You said: {message}"
```

<!-- find-user -->

```python
from msgraph.generated.users.users_request_builder import UsersRequestBuilder

@mcp.tool()
async def find_user(query: str) -> FindUserResult:
    """Find users in this tenant by partial name, email, or UPN.

    Returns up to 5 matches with their AAD object ids — pass an id to
    notify, ask, or request_approval.
    """
    graph = app.get_app_graph()
    params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(
        search=f'"displayName:{query}" OR "userPrincipalName:{query}"',
        select=["id", "displayName", "userPrincipalName"],
        top=5,
    )
    config = UsersRequestBuilder.UsersRequestBuilderGetRequestConfiguration(query_parameters=params)
    config.headers.add("ConsistencyLevel", "eventual")
    result = await graph.users.get(request_configuration=config)
    matches = [
        UserMatch(id=u.id, display_name=u.display_name, user_principal_name=u.user_principal_name)
        for u in (result.value or [])
        if u.id
    ]
    return FindUserResult(matches=matches)
```

<!-- notify -->

```python
@mcp.tool()
async def notify(user_id: str, message: str) -> NotifyResult:
    """Send a notification to a Teams user. No response expected."""
    conversation_id = await _get_or_create_conversation(user_id)
    await app.send(conversation_id=conversation_id, activity=message)
    return NotifyResult(notified=True, user_id=user_id)
```

`_get_or_create_conversation` returns the cached 1:1 conversation id for the user, or opens one proactively via `app.api.conversations.create(...)` if the user hasn't messaged the bot yet.

<!-- ask -->

```python
@mcp.tool()
async def ask(user_id: str, question: str) -> AskResult:
    """Ask a Teams user a question. Returns a request_id — call wait_for_reply with it to get the answer."""
    conversation_id = await _get_or_create_conversation(user_id)
    request_id = str(uuid.uuid4())
    # Record the pending ask BEFORE sending so a fast reply is never lost.
    pending_asks[request_id] = PendingAsk(user_id=user_id)
    card = AdaptiveCard(body=[
        TextBlock(text=question, weight="Bolder", size="Medium", wrap=True),
        TextInput(id="reply", placeholder="Type your reply...", is_multiline=True, is_required=True),
    ], actions=[
        ExecuteAction(title="Send")
        .with_data(SubmitData("ask_reply", {"request_id": request_id}))
        .with_associated_inputs("auto"),
    ])
    await app.send(conversation_id=conversation_id, activity=card)
    return AskResult(request_id=request_id)


@mcp.tool()
async def wait_for_reply(request_id: str, timeout_seconds: int = 30) -> ReplyResult:
    """Wait for the user's reply to an earlier ask. Blocks up to timeout_seconds (default 30)."""
    entry = pending_asks.get(request_id)
    if not entry:
        raise ValueError(f"No ask found with request_id {request_id}.")
    if entry.status == "answered":
        return ReplyResult(status=entry.status, reply=entry.reply)
    try:
        await asyncio.wait_for(entry.event.wait(), timeout=float(timeout_seconds))
    except asyncio.TimeoutError:
        pass
    return ReplyResult(status=entry.status, reply=entry.reply)
```

`PendingAsk` carries its own `asyncio.Event`; `wait_for_reply` parks on it and returns the moment the user submits, or `status="pending"` if the timeout fires first.

<!-- ask-handler -->

```python
@app.on_card_action_execute("ask_reply")
async def handle_ask_reply(ctx: ActivityContext[AdaptiveCardInvokeActivity]) -> AdaptiveCardInvokeResponse:
    data = ctx.activity.value.action.data
    request_id = data.get("request_id")
    reply = data.get("reply") or ""
    if request_id in pending_asks and pending_asks[request_id].status == "pending":
        pending_asks[request_id].reply = reply
        pending_asks[request_id].status = "answered"
        pending_asks[request_id].event.set()  # wake wait_for_reply
        return AdaptiveCardActionCardResponse(
            value=AdaptiveCard(body=[TextBlock(text="Reply recorded", weight="Bolder", color="Good")])
        )
    return AdaptiveCardActionMessageResponse(
        status_code=200, type="application/vnd.microsoft.activity.message",
        value="Unable to record reply. The ask may be invalid or expired.",
    )
```

<!-- approval -->

```python
@mcp.tool()
async def request_approval(user_id: str, title: str, description: str) -> ApprovalRequestResult:
    """Send an approval request to a Teams user. Returns an approval_id."""
    conversation_id = await _get_or_create_conversation(user_id)
    approval_id = str(uuid.uuid4())
    card = AdaptiveCard(body=[
        TextBlock(text=title, weight="Bolder", size="Large", wrap=True),
        TextBlock(text=description, wrap=True),
    ], actions=[
        ExecuteAction(title="Approve").with_data(
            SubmitData("approval_response", {"approval_id": approval_id, "decision": "approved"})),
        ExecuteAction(title="Reject").with_data(
            SubmitData("approval_response", {"approval_id": approval_id, "decision": "rejected"})),
    ])
    pending_approvals[approval_id] = PendingApproval(user_id=user_id)
    await app.send(conversation_id=conversation_id, activity=card)
    return ApprovalRequestResult(approval_id=approval_id)


@mcp.tool()
async def wait_for_approval(approval_id: str, timeout_seconds: int = 30) -> ApprovalResult:
    """Wait for an approval decision. Returns 'approved', 'rejected', or 'pending' on timeout."""
    entry = pending_approvals.get(approval_id)
    if entry is None:
        raise ValueError(f"No approval found with approval_id {approval_id}.")
    if entry.status != "pending":
        return ApprovalResult(approval_id=approval_id, status=entry.status)
    try:
        await asyncio.wait_for(entry.event.wait(), timeout=float(timeout_seconds))
    except asyncio.TimeoutError:
        pass
    return ApprovalResult(approval_id=approval_id, status=entry.status)
```

`wait_for_approval` mirrors `wait_for_reply` — it parks on the approval's event and returns the decision the moment the user clicks, or `"pending"` on timeout.

<!-- approval-handler -->

```python
@app.on_card_action_execute("approval_response")
async def handle_approval_response(ctx: ActivityContext[AdaptiveCardInvokeActivity]) -> AdaptiveCardInvokeResponse:
    data = ctx.activity.value.action.data
    approval_id = data.get("approval_id")
    decision = data.get("decision")
    if (
        approval_id in pending_approvals
        and decision in ("approved", "rejected")
        and pending_approvals[approval_id].status == "pending"
    ):
        pending_approvals[approval_id].status = decision
        pending_approvals[approval_id].event.set()  # wake wait_for_approval
        color = "Good" if decision == "approved" else "Attention"
        label = "Approved" if decision == "approved" else "Rejected"
        return AdaptiveCardActionCardResponse(
            value=AdaptiveCard(body=[TextBlock(text=label, weight="Bolder", color=color)])
        )
    return AdaptiveCardActionMessageResponse(
        status_code=200, type="application/vnd.microsoft.activity.message",
        value="Unable to record response. The approval request may be invalid or expired.",
    )
```

<!-- wiring -->

Register the Teams routes first, then mount the MCP app onto the same FastAPI server.

```python
import asyncio
from microsoft_teams.apps.http.fastapi_adapter import FastAPIAdapter

async def main() -> None:
    await app.initialize()

    adapter = app.server.adapter
    assert isinstance(adapter, FastAPIAdapter)

    mcp_http_app = mcp.streamable_http_app()
    adapter.lifespans.append(mcp_http_app.router.lifespan_context)
    adapter.app.mount("/mcp", mcp_http_app)

    await app.start()

if __name__ == "__main__":
    asyncio.run(main())
```
