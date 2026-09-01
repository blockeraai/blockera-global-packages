#!/usr/bin/env bash
# Post a Slack chat.postMessage. No-ops (exit 0) when token or channel is unset.
#
# Env:
#   SLACK_BOT_TOKEN / BLOCKERA_SLACK_BOT_TOKEN
#   SLACK_CHANNEL_ID / BLOCKERA_SLACK_CHANNEL_ID
#   SLACK_TEXT                 fallback / notifications text (required to post)
#   SLACK_BLOCKS_JSON          optional Block Kit JSON array string
set -euo pipefail

TOKEN="${BLOCKERA_SLACK_BOT_TOKEN:-${SLACK_BOT_TOKEN:-}}"
CHANNEL="${BLOCKERA_SLACK_CHANNEL_ID:-${SLACK_CHANNEL_ID:-}}"
TEXT="${SLACK_TEXT:-}"
BLOCKS_JSON="${SLACK_BLOCKS_JSON:-}"

if [[ -z "${TOKEN}" || -z "${CHANNEL}" ]]; then
	echo "slack-chat-post-message: skip (SLACK_BOT_TOKEN / SLACK_CHANNEL_ID unset)"
	exit 0
fi

if [[ -z "${TEXT}" ]]; then
	echo "slack-chat-post-message: skip (SLACK_TEXT empty)" >&2
	exit 0
fi

python3 - "${TOKEN}" "${CHANNEL}" "${TEXT}" "${BLOCKS_JSON}" <<'PY'
import json
import sys
import urllib.error
import urllib.request

token, channel, text, blocks_raw = sys.argv[1:5]
payload = {"channel": channel, "text": text}
if blocks_raw.strip():
    payload["blocks"] = json.loads(blocks_raw)

req = urllib.request.Request(
    "https://slack.com/api/chat.postMessage",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
except urllib.error.HTTPError as exc:
    body = exc.read().decode("utf-8", errors="replace")
    print(f"slack-chat-post-message: HTTP {exc.code}: {body}", file=sys.stderr)
    sys.exit(1)
except urllib.error.URLError as exc:
    print(f"slack-chat-post-message: {exc}", file=sys.stderr)
    sys.exit(1)

if not data.get("ok"):
    print(f"slack-chat-post-message: {data.get('error', 'unknown')}", file=sys.stderr)
    sys.exit(1)

print(f"slack-chat-post-message: ok ts={data.get('ts', '')}")
PY
