# Business OS Product Plan

## Goal

Turn the adapted Kimaki install into a reusable product for running a business with AI.

The first product preset is `business-os`: a chief-of-staff root agent coordinating
specialist agents with shared operating rules, scheduled heartbeats, local memory,
and global intelligence across workspaces.

## Product Layers

```text
Kimaki Core Fork
  -> Discord runtime, sessions, scheduled tasks, workspaces
  -> memory_search / memory_get tools
  -> system prompt memory discipline

Business OS Package
  -> agent templates
  -> workspace bootstrap
  -> memory sync scripts
  -> global intelligence builder
  -> default heartbeat/task recipes

Customer Install
  -> customer identity and business context
  -> customer workspaces and channels
  -> customer schedules
  -> customer secrets and tokens
```

## Reusable Features To Keep In Product

- `discord/src/memory.ts`
  - workspace-local memory index in `memory/memory.db`
- `discord/src/opencode-plugin.ts`
  - `memory_search`
  - `memory_get`
  - first-message `MEMORY.md` injection
- `discord/src/system-message.ts`
  - mandatory memory recall and write discipline
- `scheduled_tasks` database model and task runner
  - recurring heartbeats
  - reminders
  - proactive automation

## Productized Business OS Pattern

### Root agent

- `chief-of-staff`
  - owns priorities
  - delegates work
  - reviews outputs
  - escalates blockers
  - reads global intelligence

### Specialist agents

- `sales`
- `ops`
- `finance`
- `research`
- `content` (optional)

Each specialist gets:

- its own workspace
- local `MEMORY.md`
- local `memory/` folder
- heartbeat schedule
- handoff protocol back to the chief of staff

## Files That Must Become Templates

### Global templates

- `SOUL.md`
- `USER.md`
- `MEMORY.md`

### Agent templates

- `AGENTS.md`
- `SOUL.md`
- `USER.md`
- `IDENTITY.md`
- `HEARTBEAT.md`
- `TASKS.md`
- `TOOLS.md`
- `MEMORY.md`

## Config Surface

The current setup is too hardcoded. Product installs should be driven by a config file.

Recommended file: `business-os.config.json`

Required fields:

- business name
- install root
- root agent name and persona
- enabled specialist agents
- workspace paths
- default models per role
- heartbeat schedules
- global intelligence participants
- channel bindings

See `docs/business-os-config.example.json`.

## Bootstrap Commands To Add

These commands would make installs reproducible instead of convention-only:

- `kimaki bootstrap global`
- `kimaki bootstrap business-os`
- `kimaki bootstrap agent --role sales`
- `kimaki memory sync`
- `kimaki intelligence rebuild`

## Scripts To Generalize

Move these from customer-specific locations into product-owned scripts:

- `sync_agent_memory.py`
- `sync_global_intelligence.py`
- `query_global_intelligence.py`

Required changes:

- remove hardcoded Nomadix paths
- remove hardcoded agent IDs
- load participants from config
- allow custom memory root per install

## What Must Stay Customer-Specific

- `~/.kimaki/discord-sessions.db`
- startup scripts with secrets
- bot tokens / API keys / OAuth state
- customer memory history
- customer workspace documents
- customer channel IDs unless explicitly exported/imported

## Acceptance Criteria For V1

A fresh install should be able to:

1. bootstrap a global Kimaki identity layer
2. bootstrap a Business OS workspace layout
3. create root + specialist agent files from templates
4. enable local 3-level memory in each workspace
5. build global intelligence from configured agents
6. schedule default heartbeats
7. answer using memory_search / memory_get
8. support cross-agent handoffs through Discord channels

## Recommended Build Order

1. extract reusable scripts into this repo
2. add config schema and preset loader
3. add global and agent templates
4. add bootstrap commands
5. add install docs
6. test on a clean user install
7. use Harmony as the first clean acceptance environment

## Positioning

This should be presented as:

- an AI Business Operating System
- a Discord-native chief-of-staff platform
- a deployable multi-agent operating layer for founder-led businesses

Not as:

- a copied Nomadix install
- a one-off prompt collection
- a raw Kimaki fork with undocumented conventions
