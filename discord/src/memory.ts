// Memory system for semantic search across memory files.
// Uses SQLite FTS5 for full-text search with BM25 ranking.
// Memory index is stored within the project/agent folder for portability.
// Structure: <projectDir>/memory/memory.db

import fs from 'node:fs'
import path from 'node:path'

const MEMORY_DIR = 'memory'
const MEMORY_DB = 'memory.db'

export interface MemorySearchResult {
  path: string
  startLine: number
  endLine: number
  score: number
  snippet: string
}

export interface MemorySearchOptions {
  maxResults?: number
  minScore?: number
}

function getMemoryDir(projectDir: string): string {
  return path.join(projectDir, MEMORY_DIR)
}

function getDbPath(projectDir: string): string {
  return path.join(getMemoryDir(projectDir), MEMORY_DB)
}

async function getDb(projectDir: string): Promise<any> {
  const { createClient } = await import('@libsql/client')
  const dbPath = getDbPath(projectDir)
  const dir = path.dirname(dbPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  return createClient({ url: `file:${dbPath}` })
}

export async function ensureMemoryIndex(projectDir: string): Promise<void> {
  const db = await getDb(projectDir)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS memory_files (
      path TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      mtime INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
      path,
      content,
      content='memory_files',
      content_rowid='rowid'
    )
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS memory_files_ai AFTER INSERT ON memory_files BEGIN
      INSERT INTO memory_fts(rowid, path, content) VALUES (new.rowid, new.path, new.content);
    END
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS memory_files_ad AFTER DELETE ON memory_files BEGIN
      INSERT INTO memory_fts(memory_fts, rowid, path, content) VALUES('delete', old.rowid, old.path, old.content);
    END
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS memory_files_au AFTER UPDATE ON memory_files BEGIN
      INSERT INTO memory_fts(memory_fts, rowid, path, content) VALUES('delete', old.rowid, old.path, old.content);
      INSERT INTO memory_fts(rowid, path, content) VALUES (new.rowid, new.path, new.content);
    END
  `)
}

async function getMemoryFiles(projectDir: string): Promise<string[]> {
  const memoryFiles: string[] = []
  const memoryPath = path.join(projectDir, 'MEMORY.md')
  const memoryDir = path.join(projectDir, 'memory')

  if (fs.existsSync(memoryPath)) {
    memoryFiles.push(memoryPath)
  }

  if (fs.existsSync(memoryDir)) {
    const entries = fs.readdirSync(memoryDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        memoryFiles.push(path.join(memoryDir, entry.name))
      }
    }
  }

  return memoryFiles
}

export async function syncMemoryIndex(projectDir: string): Promise<void> {
  await ensureMemoryIndex(projectDir)
  const db = await getDb(projectDir)
  const files = await getMemoryFiles(projectDir)

  const fileStats = new Map<string, { mtime: number; content: string }>()

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath)
      const content = fs.readFileSync(filePath, 'utf-8')
      fileStats.set(filePath, { mtime: stat.mtimeMs, content })
    } catch {
      // File might have been deleted
    }
  }

  const existing = await db.execute('SELECT path, mtime FROM memory_files')
  const existingMap = new Map((existing.rows || []).map((r: any) => [r.path, r.mtime]))

  for (const [filePath, stat] of fileStats) {
    const existingMtime = existingMap.get(filePath)
    if (existingMtime !== stat.mtime) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO memory_files (path, content, mtime) VALUES (?, ?, ?)`,
        args: [filePath, stat.content, stat.mtime],
      })
    }
  }

  for (const row of existing.rows || []) {
    if (!fileStats.has(row.path)) {
      await db.execute({
        sql: `DELETE FROM memory_files WHERE path = ?`,
        args: [row.path],
      })
    }
  }
}

export async function searchMemory(
  projectDir: string,
  query: string,
  options: MemorySearchOptions = {},
): Promise<MemorySearchResult[]> {
  const { maxResults = 6, minScore = 0.35 } = options

  await syncMemoryIndex(projectDir)
  const db = await getDb(projectDir)

  const results = await db.execute({
    sql: `
      SELECT
        m.path,
        highlight(memory_fts, 1, '<mark>', '</mark>') as snippet,
        bm25(memory_fts) as score
      FROM memory_fts m
      WHERE memory_fts MATCH ?
      ORDER BY score
      LIMIT ?
    `,
    args: [query, maxResults * 2],
  })

  const searchResults: MemorySearchResult[] = []

  for (const row of results.rows || []) {
    const score = Math.abs(row.score || 0)
    if (score < minScore) continue

    const lines = row.snippet?.split('\n') || []
    const pathParts = row.path.split('/')
    const fileName = pathParts[pathParts.length - 1]

    searchResults.push({
      path: row.path,
      startLine: 1,
      endLine: lines.length,
      score,
      snippet: row.snippet || '',
    })

    if (searchResults.length >= maxResults) break
  }

  return searchResults
}

export async function readMemoryFile(
  projectDir: string,
  relPath: string,
  fromLine?: number,
  maxLines?: number,
): Promise<{ text: string; path: string }> {
  const fullPath = path.isAbsolute(relPath)
    ? relPath
    : path.join(projectDir, relPath)

  if (!fs.existsSync(fullPath)) {
    return { text: '', path: fullPath }
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const lines = content.split('\n')

  const startLine = fromLine ?? 1
  const endLine = maxLines ? startLine + maxLines : lines.length

  const selectedLines = lines.slice(startLine - 1, endLine - 1)

  return {
    text: selectedLines.join('\n'),
    path: fullPath,
  }
}
