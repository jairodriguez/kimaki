# New Repo Publishing Plan

## Recommended Repository

- name: `kimaki-business-os`
- source: `/Users/clawdbot/.kimaki/projects/kimaki-pr`
- initial positioning: Business OS preset built on top of Kimaki

## Why Not Push Directly To Current Remote

The current repository is still the general Kimaki fork and contains:

- unrelated local work in progress
- submodule changes
- product planning mixed with core runtime work
- customer-specific references used as examples during development

Publishing a separate repo keeps productization history and branding clean.

## Pre-Publish Cleanup Goals

Before first public push:

1. keep product planning docs
2. remove or isolate customer-specific example data
3. replace hardcoded business references with templates or config
4. ensure no runtime secrets or copied databases are included
5. decide whether this repo is:
   - a full Kimaki fork with Business OS included
   - or a thinner layer on top of Kimaki

## Safe To Publish

- product planning docs in `docs/`
- config examples with placeholder channel IDs
- generic bootstrap and memory architecture docs
- reusable code already committed or staged for productization

## Not Safe To Publish Blindly

- `~/.kimaki` runtime files
- startup scripts with tokens
- customer workspaces and memory history
- copied Discord channel IDs tied to a real business install

## Suggested First Public Commit Scope

- `docs/business-os-product-plan.md`
- `docs/harmony-business-os-migration.md`
- `docs/business-os-config.example.json`
- this publishing plan

Optionally, after cleanup:

- template folders
- generalized memory sync scripts
- bootstrap command scaffolding

## Ideal Initial README Direction

The new repo README should explain:

- what Business OS is
- how it builds on Kimaki
- who it is for
- how workspaces, memory, and heartbeats are structured
- what is included today vs planned next

## First Extraction Strategy

Short term:

- create a new GitHub repo
- push a branch or initial commit containing planning docs and safe reusable code only

Next:

- move product-specific work into dedicated folders
- rename or rewrite README for the new product
- add templates and install flow

## Visibility Recommendation

Start as `private` until:

- naming is final
- README is productized
- customer-specific references are reduced
- the bootstrap path is at least partially implemented

Then switch to public when the story is coherent and installable.
