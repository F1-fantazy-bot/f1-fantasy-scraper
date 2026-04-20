#!/usr/bin/env bash
# Fetches the runner Logic App's HTTP trigger callback URL and invokes it,
# so you can end-to-end verify the runner starts the ACI.
#
# Usage:
#   RESOURCE_GROUP=f1-fantazy-bot bash scripts/trigger-runner.sh
#
# Or via npm:
#   npm run infra:trigger-runner --rg=f1-fantazy-bot

set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-f1-fantazy-bot}"
LOGIC_APP_NAME="${LOGIC_APP_NAME:-f1-fantasy-scraper-runner}"
TRIGGER_NAME="${TRIGGER_NAME:-manual}"

echo "Resolving callback URL for $LOGIC_APP_NAME/$TRIGGER_NAME ..."
CALLBACK_URL="$(az rest --method post \
  --uri "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Logic/workflows/$LOGIC_APP_NAME/triggers/$TRIGGER_NAME/listCallbackUrl?api-version=2019-05-01" \
  --query value -o tsv)"

if [ -z "$CALLBACK_URL" ]; then
  echo "Failed to resolve callback URL." >&2
  exit 1
fi

echo "POSTing to runner ..."
curl -fsS -X POST -H 'Content-Type: application/json' -d '{}' "$CALLBACK_URL"
echo
echo "Runner invoked. Check run history:"
echo "  az rest --method get --uri \"https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Logic/workflows/$LOGIC_APP_NAME/runs?api-version=2019-05-01&\\\$top=5\" --query 'value[].{name:name,status:properties.status,start:properties.startTime}' -o table"
