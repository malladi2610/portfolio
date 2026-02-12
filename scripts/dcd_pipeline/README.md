# DCD 2026 Pipeline

## Run

```bash
export OPENAI_API_KEY="<your-openai-key>"
python3 /Users/subhash/Projects/portfolio/scripts/dcd_pipeline/run_pipeline.py --visible
```

The run uses browser-use in visible real-browser mode (`--browser real --headed --profile Default`) and resumes from checkpoints.

## Optional config

Edit `/Users/subhash/Projects/portfolio/scripts/dcd_pipeline/config.yaml`:
- `dcd_participants_url`: set official DCD participants URL to auto-open it.
- `hunter.mode`: `portal` (default) or `api`.
- For API mode set `HUNTER_API_KEY`.

## Files

- Output: `/Users/subhash/Projects/portfolio/docs/dcd_2026_contacts.jsonl`
- Checkpoints: `/Users/subhash/Projects/portfolio/scripts/dcd_pipeline/state/checkpoints.json`
- Action log: `/Users/subhash/Projects/portfolio/scripts/dcd_pipeline/state/actions.jsonl`
- Screenshots: `/Users/subhash/Projects/portfolio/scripts/dcd_pipeline/evidence/screenshots/`
