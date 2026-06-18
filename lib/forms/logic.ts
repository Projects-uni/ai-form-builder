import type { Answers, FormSchema, LogicEdge, LogicGraph, Question } from './types'

export function createEmptyLogicGraph(schema: FormSchema): LogicGraph {
  return {
    nodes: schema.questions.map((question) => question.id),
    edges: [],
  }
}

export function normalizeFormSchema(value: unknown): FormSchema {
  if (!value || typeof value !== 'object') return { questions: [] }

  const questions = (value as { questions?: unknown }).questions
  const settings = (value as { settings?: unknown }).settings
  
  if (!Array.isArray(questions)) return { questions: [] }

  const result: FormSchema = { questions: questions.filter(isQuestion) }
  if (settings && typeof settings === 'object') {
    result.settings = settings as FormSchema['settings']
  }
  return result
}

export function normalizeLogicGraph(value: unknown, schema: FormSchema): LogicGraph {
  const questionIds = new Set(schema.questions.map((question) => question.id))

  if (!value || typeof value !== 'object') {
    return createEmptyLogicGraph(schema)
  }

  const rawEdges = (value as { edges?: unknown }).edges
  const edges = Array.isArray(rawEdges)
    ? rawEdges.filter((edge): edge is LogicEdge => isLogicEdge(edge, questionIds))
    : []

  return reconcileLogicGraph(schema, {
    nodes: schema.questions.map((question) => question.id),
    edges,
  })
}

export function reconcileLogicGraph(schema: FormSchema, graph: LogicGraph): LogicGraph {
  const questionIds = new Set(schema.questions.map((question) => question.id))
  const questionIndex = new Map(schema.questions.map((question, index) => [question.id, index]))
  const orderedEdges = graph.edges.filter((edge) => {
    const sourceIndex = questionIndex.get(edge.source)
    const targetIndex = questionIndex.get(edge.target)

    return (
      questionIds.has(edge.source) &&
      questionIds.has(edge.target) &&
      sourceIndex !== undefined &&
      targetIndex !== undefined &&
      sourceIndex < targetIndex
    )
  })

  return {
    nodes: schema.questions.map((question) => question.id),
    edges: hasLogicCycle({ nodes: schema.questions.map((question) => question.id), edges: orderedEdges })
      ? []
      : orderedEdges,
  }
}

export function getIncomingEdges(questionId: string, graph: LogicGraph): LogicEdge[] {
  return graph.edges.filter((edge) => edge.target === questionId)
}

export function getVisibleQuestions(
  schema: FormSchema,
  graph: LogicGraph,
  answers: Answers,
): Question[] {
  const visibleIds = new Set<string>()

  return schema.questions.filter((question) => {
    const incomingEdges = getIncomingEdges(question.id, graph)
    const isVisible = incomingEdges.length === 0 || incomingEdges.some((edge) => {
      if (!visibleIds.has(edge.source)) return false
      return matchesEdge(edge, answers[edge.source])
    })

    if (isVisible) visibleIds.add(question.id)
    return isVisible
  })
}

export function setQuestionCondition(
  graph: LogicGraph,
  targetQuestionId: string,
  edge: Omit<LogicEdge, 'id' | 'target'> | null,
): LogicGraph {
  const edgesWithoutTarget = graph.edges.filter((existing) => existing.target !== targetQuestionId)

  if (!edge) {
    return { ...graph, edges: edgesWithoutTarget }
  }

  const nextEdge: LogicEdge = {
    ...edge,
    id: `edge_${edge.source}_${targetQuestionId}`,
    target: targetQuestionId,
  }

  const nextEdges = [...edgesWithoutTarget, nextEdge]
  if (createsCycle(nextEdges)) {
    return { ...graph, edges: edgesWithoutTarget }
  }

  return { ...graph, edges: nextEdges }
}

export function hasLogicCycle(graph: LogicGraph): boolean {
  const adjacency = new Map<string, string[]>()

  for (const node of graph.nodes) adjacency.set(node, [])
  for (const edge of graph.edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target])
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(node: string): boolean {
    if (visiting.has(node)) return true
    if (visited.has(node)) return false

    visiting.add(node)
    for (const next of adjacency.get(node) ?? []) {
      if (visit(next)) return true
    }
    visiting.delete(node)
    visited.add(node)
    return false
  }

  return graph.nodes.some(visit)
}

export function filterAnswersForQuestions(answers: Answers, questions: Question[]): Answers {
  const visibleIds = new Set(questions.map((question) => question.id))

  return Object.fromEntries(
    Object.entries(answers).filter(([questionId]) => visibleIds.has(questionId)),
  )
}

function matchesEdge(edge: LogicEdge, answer: string | undefined): boolean {
  if (edge.operator !== 'equals') return false
  return answer === edge.value
}

function createsCycle(edges: LogicEdge[]): boolean {
  return hasLogicCycle({
    nodes: Array.from(new Set(edges.flatMap((item) => [item.source, item.target]))),
    edges,
  })
}

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false

  const question = value as Question
  return (
    typeof question.id === 'string' &&
    typeof question.label === 'string' &&
    typeof question.required === 'boolean' &&
    ['short_text', 'long_text', 'multiple_choice', 'rating', 'file'].includes(question.type)
  )
}

function isLogicEdge(value: unknown, questionIds: Set<string>): value is LogicEdge {
  if (!value || typeof value !== 'object') return false

  const edge = value as LogicEdge
  return (
    typeof edge.id === 'string' &&
    typeof edge.source === 'string' &&
    typeof edge.target === 'string' &&
    edge.operator === 'equals' &&
    typeof edge.value === 'string' &&
    questionIds.has(edge.source) &&
    questionIds.has(edge.target) &&
    edge.source !== edge.target
  )
}
