# Sim-C inventory assistant

Sim-C is a Phase 2 prototype for people who manage supplies. It uses a fictional restaurant inventory to answer stock questions, flag projected shortages, and calculate draft reorder quantities.

## Run locally on Windows

From this folder, use Node.js 24 and PowerShell 7.

```powershell
pwsh -NoProfile -File ./setup-tls.ps1
node start.mjs
```

Open [the local HTTPS interface](https://127.0.0.1:8443/). The certificate is self-signed and valid for 30 days. Expect a browser trust warning on first visit. Confirm the URL is the local address you started before proceeding through the warning. The HTTPS tests configure trust for this specific certificate. The server listens only on the IPv4 loopback interface. Press Ctrl+C in the terminal to stop it.

## Try the end-to-end task

Enter `Draft a reorder for Harbor Foods`. Expand **How Sim-C handled your request** to see the classifier and the workflow.

| Item | On hand | Incoming | Projected | Minimum | Target | Supplier pack | Draft order |
|---|---:|---:|---:|---:|---:|---:|---:|
| Bread flour | 8 kg | 4 kg | 12 kg | 15 kg | 40 kg | 10 kg | 30 kg |
| Olive oil | 3 L | 0 L | 3 L | 8 L | 20 L | 6 L | 18 L |

The agent reads current and incoming stock, compares projected stock to the minimum, and rounds the quantity needed to reach the target up to the next full supplier pack. Try `Which items are below minimum?` or `How many canned tomatoes are on hand?` for other paths. Capture the submitted request, results table, and expanded workflow in a browser screenshot for the report.

## Enable LLM intent classification

The default classifier uses rules and runs offline. If you have Ollama running locally with an installed chat model, set its name before starting Sim-C. The UI shows the classifier used for each request.

```powershell
ollama list
$env:SIMC_OLLAMA_MODEL = 'your-installed-model-name'
node start.mjs
```

The local model receives the request text and chooses among stock lookup, shortage check, reorder draft, and help. Sim-C falls back to the rules when the local model call fails or its response is invalid. Calculations and inventory access run in application code.

## Security and tests

```powershell
node --test simc.test.mjs
```

- The browser and any model output are untrusted inputs. The server accepts same-origin JSON requests and validates the local host, request size, and message length. Rate and concurrency limits bound API usage.
- The classifier can select only supported inventory actions. The actions read the built-in dataset and calculate drafts. The model receives only the request text and classification instructions. User text is displayed as text under a same-origin content security policy.
- Static assets come from a fixed route list. Keep the generated `.tls` directory private. The Git ignore rules exclude local keys and environment files.
- The tests cover HTTPS, reorder calculations, lookups, invalid input, local-origin checks, rate limiting, key-file isolation, and simulated model output. The model tests substitute the Ollama response.

Phase 3 work includes authenticated class access, a publicly trusted HTTPS certificate, real inventory import and persistence, and evaluation with a live model. Purchase orders are drafts for human review.
