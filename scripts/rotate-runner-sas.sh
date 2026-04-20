#!/usr/bin/env bash
# Rotate the runner Logic App's SAS access key, publish the new callback
# URL to Azure Key Vault, and redeploy the scheduler so it picks up the
# fresh URL. Run this whenever the URL may have leaked (e.g. exposed in
# logs) or on a regular cadence.
#
# Usage:
#   bash scripts/rotate-runner-sas.sh
#
# Or via npm:
#   npm run infra:rotate-sas
#
# Env overrides:
#   RESOURCE_GROUP   default: f1-fantazy-bot
#   LOGIC_APP_NAME   default: f1-fantasy-scraper-runner
#   TRIGGER_NAME     default: manual
#   KEY_VAULT_NAME   default: f1-fantasy-kv
#   KV_SECRET_NAME   default: f1-fantasy-scraper-runner-url
#   KEY_TYPE         default: Primary   (Primary|Secondary)

set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-f1-fantazy-bot}"
LOGIC_APP_NAME="${LOGIC_APP_NAME:-f1-fantasy-scraper-runner}"
TRIGGER_NAME="${TRIGGER_NAME:-manual}"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-f1-fantasy-kv}"
KV_SECRET_NAME="${KV_SECRET_NAME:-f1-fantasy-scraper-runner-url}"
KEY_TYPE="${KEY_TYPE:-Primary}"

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

echo "==> 1/4: Regenerating $KEY_TYPE access key on $LOGIC_APP_NAME"
az rest --method post \
  --uri "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Logic/workflows/$LOGIC_APP_NAME/regenerateAccessKey?api-version=2019-05-01" \
  --body "{\"keyType\":\"$KEY_TYPE\"}" \
  --output none --only-show-errors
echo "    Key rotated."

echo "==> 2/4: Fetching new callback URL for trigger '$TRIGGER_NAME'"
NEW_URL="$(az rest --method post \
  --uri "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Logic/workflows/$LOGIC_APP_NAME/triggers/$TRIGGER_NAME/listCallbackUrl?api-version=2019-05-01" \
  --query value -o tsv)"

if [ -z "$NEW_URL" ]; then
  echo "Failed to resolve callback URL after rotation." >&2
  exit 1
fi
echo "    New URL retrieved (not printed)."

echo "==> 3/4: Storing URL in Key Vault secret '$KV_SECRET_NAME'"
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "$KV_SECRET_NAME" \
  --value "$NEW_URL" \
  --output none --only-show-errors
echo "    Secret updated."

unset NEW_URL

echo "==> 4/4: Redeploying scheduler so its embedded URL is refreshed"
# Re-run only the scheduler deploy — runner is unchanged.
RESOURCE_GROUP="$RESOURCE_GROUP" \
  npm run --silent infra:deploy:scheduler
echo "    Scheduler redeployed."

echo
echo "Rotation complete. Consumers that read from Key Vault will pick up"
echo "the new URL automatically. Any consumer that caches the value in"
echo "memory should be restarted or instructed to refresh."
