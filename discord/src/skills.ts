// MetaClaw-style skill system for kimaki
// Skills are stored as markdown files with YAML frontmatter

import fs from 'fs'
import path from 'path'

const SKILLS_DIR = path.join(process.env.HOME || '.', '.kimaki', 'skills')

interface Skill {
  name: string
  description: string
  category: string
  content: string
}

interface ParsedSkill {
  name: string
  description: string
  category: string
  content: string
}

const TASK_KEYWORDS: Record<string, string[]> = {
  coding: ['code', 'debug', 'implement', 'function', 'class', 'bug', 'error', 'python', 'javascript', 'typescript', 'api', 'test', 'refactor', 'git'],
  research: ['research', 'paper', 'arxiv', 'study', 'find information', 'look up'],
  data_analysis: ['data', 'dataset', 'csv', 'pandas', 'sql', 'analytics', 'chart', 'visualize'],
  security: ['security', 'vulnerability', 'auth', 'password', 'token', 'secret', 'encrypt', 'injection'],
  communication: ['email', 'message', 'slack', 'notify', 'draft', 'reply'],
  automation: ['automate', 'script', 'cron', 'pipeline', 'webhook', 'bot', 'scrape'],
  agentic: ['agent', 'multi-agent', 'sub-agent', 'orchestrate', 'delegate', 'memory', 'session'],
}

function ensureSkillsDir(): void {
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true })
    fs.mkdirSync(path.join(SKILLS_DIR, 'general'), { recursive: true })
    fs.mkdirSync(path.join(SKILLS_DIR, 'coding'), { recursive: true })
  }
}

function parseSkillMd(content: string): ParsedSkill | null {
  if (!content.startsWith('---')) return null
  
  const endIdx = content.indexOf('\n---', 3)
  if (endIdx === -1) return null
  
  const frontmatter = content.slice(3, endIdx).trim()
  const body = content.slice(endIdx + 4).trim()
  
  const fm: Record<string, string> = {}
  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    fm[key] = val
  }
  
  const name = fm.name?.trim() || ''
  const description = fm.description?.trim() || ''
  const category = fm.category?.trim() || 'general'
  
  if (!name || !description) return null
  
  return { name, description, category, content: body }
}

export function loadSkills(): Skill[] {
  ensureSkillsDir()
  const skills: Skill[] = []
  
  function walkDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (entry.name === 'SKILL.md') {
        const content = fs.readFileSync(fullPath, 'utf-8')
        const parsed = parseSkillMd(content)
        if (parsed) {
          skills.push(parsed)
        }
      }
    }
  }
  
  walkDir(SKILLS_DIR)
  return skills
}

function detectTaskType(prompt: string): string {
  const lower = prompt.toLowerCase()
  for (const [type, keywords] of Object.entries(TASK_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return type
    }
  }
  return 'general'
}

export function retrieveSkills(prompt: string, topK: number = 6): Skill[] {
  const skills = loadSkills()
  const taskType = detectTaskType(prompt)
  
  const general = skills.filter(s => s.category === 'general').slice(0, 3)
  const taskSpecific = skills.filter(s => s.category === taskType).slice(0, topK - general.length)
  const common = skills.filter(s => s.category === 'common_mistakes').slice(0, 2)
  
  return [...general, ...taskSpecific, ...common]
}

export function formatSkillsForPrompt(skills: Skill[]): string {
  if (skills.length === 0) return ''
  
  const lines = ['## Active Skills']
  for (const skill of skills) {
    lines.push(`\n### ${skill.name}`)
    if (skill.description) {
      lines.push(`_${skill.description}_`)
    }
    if (skill.content) {
      lines.push('')
      lines.push(skill.content)
    }
  }
  return lines.join('\n')
}

export function getSkillsForPrompt(prompt: string): string {
  const skills = retrieveSkills(prompt)
  return formatSkillsForPrompt(skills)
}

export function addSkill(skill: Skill): void {
  ensureSkillsDir()
  
  const dir = path.join(SKILLS_DIR, skill.category)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  const slug = skill.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const filePath = path.join(dir, `${slug}.md`)
  
  const fm = `---
name: ${skill.name}
description: ${skill.description}
category: ${skill.category}
---`
  
  fs.writeFileSync(filePath, `${fm}\n\n${skill.content}`)
  console.log(`[Skills] Added: ${skill.name} (${skill.category})`)
}

export function getSkillCount(): { total: number; categories: Record<string, number> } {
  const skills = loadSkills()
  const categories: Record<string, number> = {}
  
  for (const skill of skills) {
    categories[skill.category] = (categories[skill.category] || 0) + 1
  }
  
  return { total: skills.length, categories }
}

export function initSkills(): void {
  ensureSkillsDir()
  const count = getSkillCount()
  console.log(`[Skills] Loaded ${count.total} skills:`, count.categories)
}
