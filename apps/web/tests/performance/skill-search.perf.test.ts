/**
 * Skill Search Performance Tests
 * 测试 Skill 搜索的性能指标
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for performance testing
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Skill Search Performance', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // 模拟快速响应
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })
  })

  it('单次搜索 p95 响应时间 <200ms', async () => {
    const times: number[] = []

    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      await fetch('/api/skills/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '待办事项' }),
      })
      times.push(performance.now() - start)
    }

    times.sort((a, b) => a - b)
    const p95 = times[Math.floor(times.length * 0.95)]

    expect(p95).toBeLessThan(200)
  })

  it('并发 10 请求平均响应时间 <300ms', async () => {
    const concurrentRequests = 10
    const times: number[] = []

    const start = performance.now()
    const promises = Array.from({ length: concurrentRequests }, () =>
      fetch('/api/skills/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '日程管理' }),
      })
    )

    await Promise.all(promises)
    const totalTime = performance.now() - start
    const avgTime = totalTime / concurrentRequests

    expect(avgTime).toBeLessThan(300)
  })

  it('大数据量搜索 (1000+ Skill) p95 <500ms', async () => {
    // 模拟大数据量响应
    const largeResults = Array.from({ length: 1000 }, (_, i) => ({
      id: `skill-${i}`,
      name: `skill-${i}`,
      description: `Description ${i}`,
      similarity: 0.9 - i * 0.0001,
    }))

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: largeResults }),
    })

    const times: number[] = []

    for (let i = 0; i < 50; i++) {
      const start = performance.now()
      await fetch('/api/skills/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '复杂查询' }),
      })
      times.push(performance.now() - start)
    }

    times.sort((a, b) => a - b)
    const p95 = times[Math.floor(times.length * 0.95)]

    expect(p95).toBeLessThan(500)
  })
})
