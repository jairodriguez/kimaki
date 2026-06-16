// Skill Evolver - generates new skills from failed conversations
// Uses LLM to analyze failures and create Claude-style skills

import { getSkillCount } from './skills.js'

interface ConversationSample {
  prompt: string
  response: string
  reward: number
}

interface Skill {
  name: string
  description: string
  category: string
  content: string
}

const CATEGORIES = ['coding', 'research', 'data_analysis', 'security', 'communication', 'automation', 'agentic', 'general', 'common_mistakes']

export async function evolveSkills(
  failedSamples: ConversationSample[],
  openaiApiKey: string,
  model: string = 'gpt-4'
): Promise<Skill[]> {
  if (failedSamples.length === 0) return []
  
  const currentSkills = getSkillCount()
  
  const prompt = buildEvolutionPrompt(failedSamples, currentSkills)
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.7
      })
    })
    
    if (!response.ok) {
      console.error('[SkillEvolver] API error:', response.status)
      return []
    }
    
    const data = await response.json() as any
    const content = data.choices?.[0]?.message?.content || ''
    
    return parseSkillsFromResponse(content)
  } catch (e) {
    console.error('[SkillEvolver] Error:', e)
    return []
  }
}

function buildEvolutionPrompt(failedSamples: ConversationSample[], currentSkills: { total: number; categories: Record<string, number> }): string {
  const failureBlocks = failedSamples.slice(0, 5).map((sample, i) => {
    const promptText = sample.prompt.slice(-600)
    const responseText = sample.response.slice(0, 500)
    return `### Failure ${i + 1} (reward=${sample.reward})
**User request (last 600 chars):**
${promptText}

**Assistant response (first 500 chars):**
${responseText}${responseText.length >= 500 ? '...' : ''}`
  }).join('\n\n')
  
  const existingSkills = Object.entries(currentSkills.categories)
    .map(([cat, count]) => `${cat}: ${count} skills`)
    .join(', ')
  
  return `You are a skill engineer for an AI coding assistant.
Your job: analyze failed conversations and generate NEW skills that would prevent those failures.

## Failed Conversations
${failureBlocks}

## Current Skill Bank
Total: ${currentSkills.total} skills (${existingSkills})

## Instructions
Generate 1-3 new skills that directly address the failure patterns above.

Each skill must follow this YAML format:
---
name: <lowercase-hyphenated-name>
description: <one sentence - when to trigger this skill>
category: <coding|research|security|general|common_mistakes>
---
<content: 6-15 lines with actionable guidance, examples, and anti-patterns>

Output ONLY valid YAML, no other text.`
}

function parseSkillsFromResponse(content: string): Skill[] {
  const skills: Skill[] = []
  
  const yamlBlocks = content.split(/^---$/m).filter(block => block.trim())
  
  for (const block of yamlBlocks) {
    const lines = block.trim().split('\n')
    const skill: Partial<Skill> = {}
    let contentStart = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('name:')) {
        skill.name = line.slice(5).trim().toLowerCase().replace(/\s+/g, '-')
      } else if (line.startsWith('description:')) {
        skill.description = line.slice(12).trim()
      } else if (line.startsWith('category:')) {
        const cat = line.slice(9).trim().toLowerCase()
        skill.category = CATEGORIES.includes(cat) ? cat : 'general'
      } else if (!line.includes(':') && line.trim() && i > 2) {
        contentStart = i
        break
      }
    }
    
    if (skill.name && skill.description) {
      skill.content = lines.slice(contentStart).join('\n').trim()
      if (!skill.category) skill.category = 'general'
      skills.push(skill as Skill)
    }
  }
  
  return skills
}

export function shouldEvolve(samples: ConversationSample[], threshold: number = 0.4): boolean {
  if (samples.length === 0) return false
  const successes = samples.filter(s => s.reward > 0).length
  const rate = successes / samples.length
  return rate < threshold
}
