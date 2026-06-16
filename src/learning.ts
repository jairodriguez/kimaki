// Kimaki self-learning module
// Enables the bot to learn from conversations and improve over time

import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.env.HOME || '.', '.kimaki')
const LEARNING_DB = path.join(DATA_DIR, 'learning.json')

export interface Conversation {
  id: number
  timestamp: string
  user_message: string
  bot_response: string
  thread_id: string | null
  score: number
}

export interface Skill {
  id: number
  name: string
  pattern: string
  prompt_injection: string
  success_count: number
  created_at: string
}

export interface LearningData {
  conversations: Conversation[]
  skills: Skill[]
  nextId: number
}

function loadData(): LearningData {
  try {
    if (fs.existsSync(LEARNING_DB)) {
      return JSON.parse(fs.readFileSync(LEARNING_DB, 'utf-8'))
    }
  } catch {
    // Ignore errors
  }
  return { conversations: [], skills: [], nextId: 1 }
}

function saveData(data: LearningData): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(LEARNING_DB, JSON.stringify(data, null, 2))
}

export function initLearning(): void {
  const data = loadData()
  console.log(`[Learning] ${data.conversations.length} conversations, ${data.skills.length} skills`)
}

export function logConversation(
  userMessage: string,
  botResponse: string,
  threadId?: string
): number {
  const data = loadData()
  const id = data.nextId++
  
  data.conversations.push({
    id,
    timestamp: new Date().toISOString(),
    user_message: userMessage,
    bot_response: botResponse,
    thread_id: threadId || null,
    score: 0
  })
  
  saveData(data)
  return id
}

export function addFeedback(conversationId: number, isPositive: boolean): void {
  const data = loadData()
  
  const conv = data.conversations.find((c) => c.id === conversationId)
  if (!conv) return

  conv.score += isPositive ? 1 : -1

  // Extract skill after 2+ positive feedback on same pattern
  if (conv.score >= 2) {
    const pattern = conv.user_message.substring(0, 50)
    const existing = data.skills.find((s) => s.pattern === pattern)
    
    if (existing) {
      existing.success_count++
    } else {
      data.skills.push({
        id: data.skills.length + 1,
        name: `skill_${Date.now()}`,
        pattern,
        prompt_injection: `When user says similar to "${conv.user_message.substring(0, 40)}...", respond like: ${conv.bot_response.substring(0, 80)}`,
        success_count: 1,
        created_at: new Date().toISOString(),
      })
      console.log('[Learning] Extracted new skill!')
    }
  }

  saveData(data)
}

export function getLearnedContext(): string {
  const data = loadData()
  if (data.skills.length === 0) return ''

  const top = data.skills
    .sort((a, b) => b.success_count - a.success_count)
    .slice(0, 3)

  return '\n\n📚 Learned from conversation:\n' + top.map((s) => s.prompt_injection).join('\n')
}

export function getStats(): { conversations: number; skills: number } {
  const data = loadData()
  return {
    conversations: data.conversations.length,
    skills: data.skills.length,
  }
}

export function parseFeedbackMessage(content: string): { conversationId: number; isPositive: boolean } | null {
  const good = /good|👍|✅|yes|yep|great|awesome/i.test(content)
  const bad = /bad|👎|❌|no|nope|sorry|wrong/i.test(content)
  const idMatch = content.match(/#(\d+)/i)

  if (!idMatch) return null

  const conversationId = parseInt(idMatch[1], 10)
  if (isNaN(conversationId)) return null
  if (!good && !bad) return null

  return { conversationId, isPositive: good }
}
