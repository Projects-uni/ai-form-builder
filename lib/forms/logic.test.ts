import { describe, it, expect } from 'vitest'
import {
  normalizeFormSchema,
  hasLogicCycle,
  getVisibleQuestions,
} from './logic'
import type { FormSchema, LogicGraph } from './types'

describe('Form Logic', () => {
  it('normalizes form schema correctly', () => {
    const raw = {
      questions: [
        { id: 'q1', type: 'short_text', label: 'Q1', required: true },
        { id: 'q2', type: 'invalid_type', label: 'Q2', required: false },
        { id: 'q3', type: 'file', label: 'Q3', required: false }
      ]
    }
    const schema = normalizeFormSchema(raw)
    expect(schema.questions.length).toBe(2)
    expect(schema.questions[0].id).toBe('q1')
    expect(schema.questions[1].id).toBe('q3')
  })

  it('detects logic cycles', () => {
    const graph: LogicGraph = {
      nodes: ['q1', 'q2', 'q3'],
      edges: [
        { id: 'e1', source: 'q1', target: 'q2', operator: 'equals', value: 'yes' },
        { id: 'e2', source: 'q2', target: 'q3', operator: 'equals', value: 'yes' },
        { id: 'e3', source: 'q3', target: 'q1', operator: 'equals', value: 'yes' }
      ]
    }
    expect(hasLogicCycle(graph)).toBe(true)
  })

  it('gets visible questions based on answers', () => {
    const schema: FormSchema = {
      questions: [
        { id: 'q1', type: 'short_text', label: 'Q1', required: true },
        { id: 'q2', type: 'short_text', label: 'Q2', required: true },
        { id: 'q3', type: 'short_text', label: 'Q3', required: true }
      ]
    }
    const graph: LogicGraph = {
      nodes: ['q1', 'q2', 'q3'],
      edges: [
        { id: 'e1', source: 'q1', target: 'q2', operator: 'equals', value: 'show' }
      ]
    }

    const visible1 = getVisibleQuestions(schema, graph, {})
    expect(visible1.map(q => q.id)).toEqual(['q1', 'q3'])

    const visible2 = getVisibleQuestions(schema, graph, { q1: 'show' })
    expect(visible2.map(q => q.id)).toEqual(['q1', 'q2', 'q3'])
  })
})
