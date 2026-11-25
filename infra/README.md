# F1 Fantasy Scraper — Infrastructure

ARM templates for the Logic Apps that drive the scraper in production:

| Logic App | Trigger | Purpose |
| --- | --- | --- |
| `f1-fantasy-scraper-runner` | HTTP request | Starts the scraper ACI using its managed identity. |
| `f1-fantasy-scraper-scheduler` | Fri/Sat at :15 and :45 UTC | Triggers the runner when `FP1 < now < Qualifying` for any cached round. |
| `f1-fantasy-scraper-scheduler-post-race` | Monday at 02:00 UTC | Triggers the runner after the weekend. |

The weekend scheduler reads `jolpica/calendar.json` with its managed identity.
The deployment assigns Storage Blob Data Reader on the existing storage
container. An invalid or unavailable calendar alerts and skips the runner.

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

Make sure you're logged in first: `az login` and `az account set --subscription <id>`.

### Via npm scripts (recommended for manual verification)

All scripts default to resource group `f1-fantazy-bot`. Override via `RESOURCE_GROUP=<name>` if needed.

```bash
# Validate templates without deploying
npm run infra:validate

# Preview changes (what-if)
npm run infra:whatif

# Full flow: runner -> grant MSI -> schedulers
npm run infra:deploy

# Or individual steps
npm run infra:deploy:runner
npm run infra:grant-runner-msi
npm run infra:deploy:scheduler

# End-to-end verify: POST the runner's HTTP trigger to start the ACI
npm run infra:trigger-runner

# Rotate the runner's SAS key, push the new URL to Key Vault, redeploy
# scheduler. Defaults: vault=f1-fantasy-kv, secret=f1-fantasy-scraper-runner-url.
npm run infra:rotate-sas

# Inspect
npm run infra:status
npm run infra:logs:runner
```

### Raw az CLI (equivalent)

```bash
# 1. Runner
az deployment group create \
  --resource-group f1-fantazy-bot \
  --template-file infra/runner/azuredeploy.json \
  --parameters @infra/runner/azuredeploy.parameters.json

# 2. Grant the runner's system-assigned MSI permission to start the ACI
bash scripts/grant-runner-msi.sh

# 3. Schedulers
az deployment group create \
  --resource-group f1-fantazy-bot \
  --template-file infra/scheduler/azuredeploy.json \
  --parameters @infra/scheduler/azuredeploy.parameters.json
```

## CI/CD

`.github/workflows/deploy-infra.yml` deploys both templates automatically on push to `main` when any file under `infra/**` changes. It can also be run manually via **workflow_dispatch**.

## Design notes

- **Runner uses System-Assigned Managed Identity** (no Azure API Connection needed). The MSI must hold a role granting `Microsoft.ContainerInstance/containerGroups/start/action` on the ACI — Contributor at the ACI scope is the simplest fit.
- **Scheduler -> Runner auth is SAS**: the scheduler template calls `listCallbackUrl()` at deploy time, so the SAS-signed URL is always fresh and never hardcoded in source.
- **Two single-trigger scheduler Logic Apps:** `f1-fantasy-scraper-scheduler` handles the Fri/Sat FP1-to-Qualifying window check. `f1-fantasy-scraper-scheduler-post-race` handles the post-race 02:00/10:00/18:00 UTC runner calls. Splitting the workflows keeps each one compatible with the Azure Logic Apps Designer.
- **Idempotent:** Re-running the deployment updates the workflow definitions in place.
- **Replacing existing portal-created Logic Apps:** The first deploy will overwrite the current definitions. Behavior is equivalent but action names differ (e.g., `Start_ACI` replaces the previous `aci-1` connector action).
