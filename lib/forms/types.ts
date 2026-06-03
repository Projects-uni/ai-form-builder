export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'rating' | 'file'

export type AnswerValue = string

export interface Option {
  id: string
  label: string
}

export interface Question {
  id: string
  type: QuestionType
  label: string
  required: boolean
  options?: Option[]
  max?: number
}

export interface FormSchema {
  questions: Question[]
}

export type LogicOperator = 'equals'

export interface LogicEdge {
  id: string
  source: string
  target: string
  operator: LogicOperator
  value: string
}

export interface LogicGraph {
  nodes: string[]
  edges: LogicEdge[]
}

export type Answers = Record<string, AnswerValue>

