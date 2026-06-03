import re

with open('app/dashboard/[workspaceId]/forms/[formId]/page.tsx', 'r') as f:
    content = f.read()

# Make TYPE_LABELS dynamic
content = content.replace(
"""const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  multiple_choice: 'Multiple choice',
  rating: 'Rating',
  file: 'File upload',
}""",
"""function getTypeLabels(t: any): Record<QuestionType, string> {
  return {
    short_text: t.formEditor.questionTypes.short_text,
    long_text: t.formEditor.questionTypes.long_text,
    multiple_choice: t.formEditor.questionTypes.multiple_choice,
    rating: t.formEditor.questionTypes.rating,
    file: t.formEditor.questionTypes.file,
  }
}""")

# Add useTranslation and LanguageToggle
content = content.replace(
"import AiGenerateModal from '@/app/components/AiGenerateModal'",
"""import AiGenerateModal from '@/app/components/AiGenerateModal'
import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'"""
)

# Update QuestionCard to accept t
content = content.replace(
"onConditionChange: (targetQuestionId: string, sourceQuestionId: string, value: string) => void\n}) {",
"onConditionChange: (targetQuestionId: string, sourceQuestionId: string, value: string) => void\n  t: any\n}) {"
)

# Replace TYPE_LABELS with typeLabels
content = content.replace("TYPE_LABELS[question.type]", "getTypeLabels(t)[question.type]")
content = content.replace("Object.keys(TYPE_LABELS)", "Object.keys(getTypeLabels(t))")

# QuestionCard strings
content = content.replace("'Untitled question'", "t.formEditor.untitledQuestion")
content = content.replace("'Option 1'", "`${t.formEditor.option} 1`")
content = content.replace("'Option 2'", "`${t.formEditor.option} 2`")
content = content.replace("`Option ${(question.options?.length ?? 0) + 1}`", "`${t.formEditor.option} ${(question.options?.length ?? 0) + 1}`")
content = content.replace("'required'", "t.formEditor.required.toLowerCase()")
content = content.replace("Question text", "{t.formEditor.questionText}")
content = content.replace("\"Enter your question...\"", "t.formEditor.untitledQuestion")
content = content.replace(">Question type<", ">{t.formEditor.questionType}<")
content = content.replace(">Options<", ">{t.formEditor.options}<")
content = content.replace("+ Add option", "+ {t.formEditor.addOption}")
content = content.replace("Max rating", "{t.formEditor.maxRating}")
content = content.replace(" stars<", " {t.formEditor.stars}<")
content = content.replace(">Required<", ">{t.formEditor.required}<")
content = content.replace("title=\"Move up\"", "title={t.formEditor.moveUp}")
content = content.replace(">↑<", ">{t.formEditor.moveUp === 'Yukarı taşı' ? '↑' : '↑'}<")
content = content.replace("title=\"Move down\"", "title={t.formEditor.moveDown}")
content = content.replace(">Delete<", ">{t.formEditor.delete}<")
content = content.replace("Conditional display", "{t.formEditor.conditionalDisplay}")
content = content.replace("First question is always shown.", "{t.formEditor.firstQuestionAlwaysShown}")
content = content.replace("Always show", "{t.formEditor.alwaysShow}")
content = content.replace("Show only if: ", "{t.formEditor.showOnlyIf}: ")
content = content.replace("equals", "{t.formEditor.equals}")
content = content.replace("Choose answer", "{t.formEditor.chooseAnswer}")
content = content.replace("Choose rating", "{t.formEditor.chooseRating}")
content = content.replace("\"Expected answer\"", "t.formEditor.expectedAnswer")

# Main page
content = content.replace("export default function FormEditorPage({ params }: Props) {",
"export default function FormEditorPage({ params }: Props) {\n  const { t } = useTranslation()")

content = content.replace("Loading form...", "{t.common.loading}")

# Top bar changes
content = content.replace(
"""<a href={`/dashboard/${workspaceId}`} style={{ fontSize: 13, color: '#999', textDecoration: 'none' }}>
            ← Back
          </a>""",
"""<Link href={`/dashboard/${workspaceId}`} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 text-sm font-medium transition-colors">
            <ArrowLeft size={16} />
            {t.common.back}
          </Link>
          <LanguageToggle />"""
)

content = content.replace("form.is_published ? 'Published' : 'Draft'", "form.is_published ? t.common.published : t.common.draft")
content = content.replace("saving && <span style={{ fontSize: 12, color: '#999' }}>Saving...</span>", "saving && <span style={{ fontSize: 12, color: '#999' }}>{t.common.saving}</span>")
content = content.replace("saved && <span style={{ fontSize: 12, color: '#22c55e' }}>✓ Saved</span>", "saved && <span style={{ fontSize: 12, color: '#22c55e' }}>✓ {t.common.saved}</span>")

content = content.replace("Preview ↗", "{t.common.preview} ↗")
content = content.replace(">Responses<", ">{t.common.responses}<")
content = content.replace(">Analytics<", ">{t.common.analytics}<")
content = content.replace("shareStatus || 'Share'", "shareStatus || t.common.share")
content = content.replace("publishing ? '...' : form.is_published ? 'Unpublish' : 'Publish'", "publishing ? '...' : form.is_published ? t.common.unpublish : t.common.publish")

content = content.replace("No questions yet", "{t.formEditor.noQuestionsYet}")
content = content.replace("Click Add question below to start building your form", "{t.formEditor.clickToAdd}")
content = content.replace("+ Add question", "+ {t.formEditor.addQuestion}")
content = content.replace("✨ Generate with AI", "✨ {t.formEditor.generateWithAI}")
content = content.replace("question{questions.length !== 1 ? 's' : ''} · auto-saved", "question{questions.length !== 1 ? 's' : ''} · {t.formEditor.autoSaved}")

# Pass t to QuestionCard
content = content.replace("onConditionChange={updateCondition}", "onConditionChange={updateCondition}\n              t={t}")

with open('app/dashboard/[workspaceId]/forms/[formId]/page.tsx', 'w') as f:
    f.write(content)
