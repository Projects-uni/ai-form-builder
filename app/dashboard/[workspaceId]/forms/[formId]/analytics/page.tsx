import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeFormSchema } from '@/lib/forms/logic'
import { SentimentPieChart } from '@/app/components/AnalyticsCharts'
import { kmeans } from 'ml-kmeans'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ workspaceId: string; formId: string }>
}

function cosineDistance(a: number[], b: number[]) {
  let dotProduct = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
  }
  return 1 - dotProduct
}

function calculateSilhouetteScore(data: number[][], clusters: number[]) {
  if (data.length < 2 || new Set(clusters).size < 2) return 0
  
  let totalSilhouette = 0
  for (let i = 0; i < data.length; i++) {
    const point = data[i]
    const clusterId = clusters[i]
    
    // a(i)
    let a_i = 0
    let sameClusterCount = 0
    for (let j = 0; j < data.length; j++) {
      if (i !== j && clusters[j] === clusterId) {
        a_i += cosineDistance(point, data[j])
        sameClusterCount++
      }
    }
    a_i = sameClusterCount > 0 ? a_i / sameClusterCount : 0
    
    // b(i)
    let b_i = Infinity
    const otherClusters = new Set(clusters)
    otherClusters.delete(clusterId)
    
    for (const otherId of otherClusters) {
      let distSum = 0
      let count = 0
      for (let j = 0; j < data.length; j++) {
        if (clusters[j] === otherId) {
          distSum += cosineDistance(point, data[j])
          count++
        }
      }
      if (count > 0) {
        const avgDist = distSum / count
        if (avgDist < b_i) b_i = avgDist
      }
    }
    
    if (sameClusterCount > 0) {
       totalSilhouette += (b_i - a_i) / Math.max(a_i, b_i)
    }
  }
  
  return totalSilhouette / data.length
}

export default async function AnalyticsPage({ params }: Props) {
  const { workspaceId, formId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { t } = await getServerTranslations()

  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/dashboard')

  // Fetch form, responses count, and embeddings
  const [{ data: form }, { count: responsesCount }, { data: embeddings, error: embeddingsErr }] = await Promise.all([
    supabase
      .from('forms')
      .select('id, title, schema')
      .eq('id', formId)
      .eq('workspace_id', workspaceId)
      .single(),
    supabase
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', formId),
    supabase
      .from('embeddings')
      .select('id, question_key, response_id, embedding, sentiment_label, sentiment_score')
      .eq('form_id', formId)
  ])

  if (!form) redirect(`/dashboard/${workspaceId}`)
  
  const schema = normalizeFormSchema(form.schema)
  const questionMap = new Map(schema.questions.map(q => [q.id, q.label || t.formEditor.untitledQuestion]))

  // 1. Sentiment Distribution
  let positive = 0, negative = 0, neutral = 0
  const validEmbeddings = embeddings || []
  
  for (const e of validEmbeddings) {
    if (e.sentiment_label === 'positive') positive++
    else if (e.sentiment_label === 'negative') negative++
    else neutral++ // counts both 'neutral' and 'mixed' or anything else as neutral
  }

  const sentimentData = [
    { name: t.analytics.positive, value: positive, color: '#22c55e' },
    { name: t.analytics.neutral, value: neutral, color: '#94a3b8' },
    { name: t.analytics.negative, value: negative, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // 2. Semantic Clustering per Question
  // Group embeddings by question_key
  const questionEmbeddings = new Map<string, typeof validEmbeddings>()
  for (const e of validEmbeddings) {
    if (!questionEmbeddings.has(e.question_key)) {
      questionEmbeddings.set(e.question_key, [])
    }
    questionEmbeddings.get(e.question_key)!.push(e)
  }

  // To display clusters, we also need the actual text answers to show what the cluster contains!
  // Let's fetch the responses that have these embeddings
  const responseIds = [...new Set(validEmbeddings.map(e => e.response_id))]
  let responsesMap = new Map<string, any>()
  if (responseIds.length > 0) {
    const { data: responsesData } = await supabase
      .from('responses')
      .select('id, answers')
      .in('id', responseIds)
    if (responsesData) {
      responsesMap = new Map(responsesData.map(r => [r.id, r.answers]))
    }
  }

  const clusterResults: Array<{
    questionId: string
    questionLabel: string
    silhouetteScore: number
    clusters: Array<{
      id: number
      size: number
      sampleAnswers: string[]
    }>
  }> = []

  for (const [qKey, embs] of questionEmbeddings.entries()) {
    if (embs.length < 2) continue // Too few to cluster

    // Run k-means
    // k = sqrt(N)
    const k = Math.max(2, Math.floor(Math.sqrt(embs.length)))
    
    // Parse embeddings (they are stored as JSON strings or arrays in Supabase pgvector)
    const dataMatrix = embs.map(e => 
      typeof e.embedding === 'string' ? JSON.parse(e.embedding) : e.embedding
    )

    try {
      const result = kmeans(dataMatrix, Math.min(k, dataMatrix.length), { initialization: 'kmeans++' })
      const clusters = result.clusters

      const silhouette = calculateSilhouetteScore(dataMatrix, clusters)

      // Group by cluster
      const grouped = new Map<number, string[]>()
      for (let i = 0; i < embs.length; i++) {
        const clusterId = clusters[i]
        const rId = embs[i].response_id
        const text = responsesMap.get(rId)?.[qKey]
        
        if (text) {
          if (!grouped.has(clusterId)) grouped.set(clusterId, [])
          grouped.get(clusterId)!.push(text)
        }
      }

      const formattedClusters = Array.from(grouped.entries()).map(([cId, texts]) => ({
        id: cId,
        size: texts.length,
        // take up to 3 sample answers to represent the cluster
        sampleAnswers: texts.slice(0, 3)
      })).sort((a, b) => b.size - a.size) // sort largest cluster first

      clusterResults.push({
        questionId: qKey,
        questionLabel: questionMap.get(qKey) || qKey,
        silhouetteScore: silhouette,
        clusters: formattedClusters
      })
    } catch (err) {
      console.error(`Failed to cluster question ${qKey}:`, err)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/dashboard/${workspaceId}/forms/${formId}`}
                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} />
                {t.common.backToEditor}
              </Link>
              <div className="lg:hidden"><LanguageToggle /></div>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                {t.analytics.title}
              </h1>
              <div className="hidden lg:block"><LanguageToggle /></div>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {form.title}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/dashboard/${workspaceId}/forms/${formId}/responses`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.analytics.viewAllResponses}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        
        {/* Top Metrics Cards */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">{t.analytics.totalResponses}</h3>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{responsesCount || 0}</p>
          </div>
          
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">{t.analytics.completionRate}</h3>
            <p className="mt-2 text-3xl font-semibold text-slate-900">100%</p>
            <p className="mt-1 text-xs text-slate-400">{t.analytics.completionRateDesc}</p>
          </div>
          
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">{t.analytics.aiAnalyzedAnswers}</h3>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{validEmbeddings.length}</p>
          </div>
          
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">{t.analytics.overallSentiment}</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-semibold text-slate-900">
                {positive > negative ? t.analytics.positive : negative > positive ? t.analytics.negative : t.analytics.neutral}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-400">{t.analytics.sentimentBasedOn}</p>
          </div>
        </div>

        {/* Sentiment Chart */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">{t.analytics.sentimentBreakdown}</h2>
          <SentimentPieChart data={sentimentData} />
        </div>

        {/* Semantic Clusters */}
        <div>
          <h2 className="mb-6 text-lg font-semibold text-slate-900">{t.analytics.semanticClustersTitle}</h2>
          <p className="mb-6 text-sm text-slate-500">
            {t.analytics.semanticClustersDesc}
          </p>
          
          {clusterResults.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              {t.analytics.notEnoughText}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {clusterResults.map(res => (
                <div key={res.questionId} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h3 className="font-medium text-slate-900 line-clamp-1" title={res.questionLabel}>
                      {res.questionLabel}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                        {t.analytics.silhouetteScore}: {res.silhouetteScore.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {res.silhouetteScore > 0.5 ? `(${t.analytics.strongClusters})` : res.silhouetteScore > 0.2 ? `(${t.analytics.fairClusters})` : `(${t.analytics.weakClusters})`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-5">
                    <div className="space-y-6">
                      {res.clusters.map((cluster, i) => (
                        <div key={cluster.id}>
                          <h4 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
                              {i + 1}
                            </span>
                            {t.analytics.themeGroup} ({cluster.size} {t.analytics.responseCount})
                          </h4>
                          <ul className="space-y-2 pl-8">
                            {cluster.sampleAnswers.map((answer, j) => (
                              <li key={j} className="text-sm text-slate-600 relative">
                                <span className="absolute -left-4 top-2 h-1 w-1 rounded-full bg-slate-300"></span>
                                "{answer}"
                              </li>
                            ))}
                            {cluster.size > 3 && (
                              <li className="text-xs text-slate-400 pl-2 italic">
                                + {cluster.size - 3} {t.analytics.moreSimilar}
                              </li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
