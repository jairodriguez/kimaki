# Harmony Business OS Migration

## Goal

Recreate the adapted Kimaki capabilities for the `harmony` user without copying
`clawdbot` runtime state, secrets, or business-specific memory.

## Do Not Copy Directly

- `/Users/clawdbot/.kimaki/discord-sessions.db`
- `/Users/clawdbot/.kimaki/start-kimaki.sh`
- any bot token, API key, OAuth credential, or log file
- customer-specific workspace memory unless intentionally imported

## Source Of Truth

- Codebase to fork: `/Users/clawdbot/.kimaki/projects/kimaki-pr`
- Runtime pattern to reproduce: `/Users/clawdbot/.kimaki/`
- Example business topology: `/Users/Shared/nomadixgear`

## Target Layout

```text
/Users/harmony/.kimaki/
  MEMORY.md
  SOUL.md
  USER.md
  discord-sessions.db
  projects/

/Users/harmony/business-os/
  AGENTS.md
  MEMORY.md
  COMMS.md
  agents/
    sales/
    ops/
    finance/
    research/
```

## Migration Strategy

### Phase 1 - Prepare a reusable fork

- fork `kimaki-pr`
- add product-owned templates and scripts
- remove hardcoded customer references from the reusable layer

### Phase 2 - Install Harmony runtime

- run Kimaki with `--data-dir /Users/harmony/.kimaki`
- create Harmony global files:
  - `/Users/harmony/.kimaki/SOUL.md`
  - `/Users/harmony/.kimaki/USER.md`
  - `/Users/harmony/.kimaki/MEMORY.md`

### Phase 3 - Create Harmony business workspaces

- create root workspace
- create specialist workspaces
- render template files into each workspace
- create empty `memory/` folders

### Phase 4 - Bind channels

- map each Discord channel to the intended Harmony workspace
- recreate any desired agent defaults
- keep this as a fresh install instead of importing `channel_directories` rows from `clawdbot`

### Phase 5 - Recreate schedules

- add heartbeat cron tasks
- add reminder/standup jobs
- confirm recurring tasks point to Harmony channel IDs and workspaces

### Phase 6 - Validate

- first message in a session injects `MEMORY.md`
- `memory_search` works in root and specialist workspaces
- `memory_get` reads the intended files
- local `memory/memory.db` builds successfully
- global intelligence rebuild works across configured Harmony agents
- cross-agent messaging works through Discord

## Initial Harmony Preset

Recommended v1 topology:

- `chief-of-staff`
- `sales`
- `ops`
- `finance`
- `research`

Optional after v1:

- `content`
- `customer-support`
- `bookkeeping-receipts`

## Data To Rebuild Instead Of Copying

- channel bindings
- scheduled tasks
- root identity files
- specialist identities
- memory indexes
- global intelligence indexes

## Safe Things To Reuse As Examples

- structure of Nomadix docs
- heartbeat patterns
- COMMS contract shape
- memory layering strategy
- chief-of-staff plus specialist topology

## Unsafe Things To Reuse Blindly

- names like Atlas, Skye, Mira, Tito, Paco, Rai
- Nomadix company context
- channel IDs
- business memory history
- customer-facing operating rules tied to one business

## Acceptance Checklist

- Harmony can run Kimaki from her own data dir
- Harmony has global `SOUL.md` / `USER.md` / `MEMORY.md`
- Harmony has root and specialist workspaces
- every workspace has a memory folder and baseline docs
- memory sync can run without Nomadix paths
- global intelligence can rebuild from config
- default heartbeats are scheduled and use Harmony channels

## Recommended Next Build Step

Implement a config-driven bootstrap flow so this migration becomes:

```bash
kimaki bootstrap business-os --config /path/to/business-os.config.json
```

That command should:

- initialize global files
- create workspaces
- render templates
- write config-derived docs
- initialize memory folders
- print the channel binding and schedule commands still needed
