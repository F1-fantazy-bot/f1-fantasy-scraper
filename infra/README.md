# F1 Fantasy Scraper — Infrastructure

ARM templates for the two Logic Apps that drive the scraper in production:

| Logic App                      | Trigger                                        | Purpose                                                                                          |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `f1-fantasy-scraper-runner`    | HTTP (Request)                                 | Starts the `f1-fantasy-scraper-aci` container group via Managed Identity → Azure Management API. |
| `f1-fantasy-scraper-scheduler` | Recurrence (Fri/Sat, every 15 & 45 min, UTC)   | Fetches the next race schedule; if `FP1 < now < Qualifying`, calls the runner.                   |

## Layout

```
infra/
├── runner/
│   ├── azuredeploy.json
│   └── azuredeploy.parameters.json
└── scheduler/
    ├── azuredeploy.json
    └── azuredeploy.parameters.json
```

## Deploy

Deploy **runner first** — the scheduler template resolves the runner's callback URL at deploy time via `listCallbackUrl()`.

```bash
# 1. Runner
az deployment group create \
  --resource-group f1-fantazy-bot \
  --template-file infra/runner/azuredeploy.json \
  --parameters @infra/runner/azuredeploy.parameters.json

# 2. Grant the runner's system-assigned MSI permission to start the ACI
PRINCIPAL_ID=$(az deployment group show \
  --resource-group f1-fantazy-bot \
  --name azuredeploy \
  --query properties.outputs.logicAppPrincipalId.value -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role Contributor \
  --scope /subscriptions/5cfc4033-d828-4bdb-b9ea-de042e483715/resourceGroups/f1-fantazy-bot/providers/Microsoft.ContainerInstance/containerGroups/f1-fantasy-scraper-aci

# 3. Scheduler
az deployment group create \
  --resource-group f1-fantazy-bot \
  --template-file infra/scheduler/azuredeploy.json \
  --parameters @infra/scheduler/azuredeploy.parameters.json
```

## CI/CD

`.github/workflows/deploy-infra.yml` deploys both templates automatically on push to `main` when any file under `infra/**` changes. It can also be run manually via **workflow_dispatch**.

## Design notes

- **Runner uses System-Assigned Managed Identity** (no Azure API Connection needed). The MSI must hold a role granting `Microsoft.ContainerInstance/containerGroups/start/action` on the ACI — Contributor at the ACI scope is the simplest fit.
- **Scheduler → Runner auth is SAS**: the scheduler template calls `listCallbackUrl()` at deploy time, so the SAS-signed URL is always fresh and never hardcoded in source.
- **Idempotent:** Re-running the deployment updates the workflow definitions in place.
- **Replacing existing portal-created Logic Apps:** The first deploy will overwrite the current definitions. Behavior is equivalent but action names differ (e.g., `Start_ACI` replaces the previous `aci-1` connector action).
