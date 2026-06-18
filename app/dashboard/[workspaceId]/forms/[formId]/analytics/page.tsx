import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeFormSchema } from '@/lib/forms/logic'
import { SentimentPieChart } from '@/app/components/AnalyticsCharts'
import { kmeans } from 'ml-kmeans'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { ArrowLeft, BrainCircuit, FileText, BarChart3, TrendingUp, Download } from 'lucide-react'
import DownloadPdfButton from '@/app/components/DownloadPdfButton'
import ReportTemplate from '@/app/components/ReportTemplate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'

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
    
    let a_i = 0
    let sameClusterCount = 0
    for (let j = 0; j < data.length; j++) {
      if (i !== j && clusters[j] === clusterId) {
        a_i += cosineDistance(point, data[j])
        sameClusterCount++
      }
    }
    a_i = sameClusterCount > 0 ? a_i / sameClusterCount : 0
    
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

  const [{ data: form }, { count: responsesCount }, { data: embeddings, error: embeddingsErr }] = await Promise.all([
    supabase
      .from('forms')
      .select('id, title, description, schema')
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

  let positive = 0, negative = 0, neutral = 0
  const validEmbeddings = embeddings || []
  
  for (const e of validEmbeddings) {
    if (e.sentiment_label === 'positive') positive++
    else if (e.sentiment_label === 'negative') negative++
    else neutral++
  }

  const sentimentData = [
    { name: t.analytics.positive, value: positive, color: '#10b981' },
    { name: t.analytics.neutral, value: neutral, color: '#94a3b8' },
    { name: t.analytics.negative, value: '#ef4444' },
  ].map((d, i) => {
      if (i === 0) return { name: t.analytics.positive, value: positive, color: '#10b981' }
      if (i === 1) return { name: t.analytics.neutral, value: neutral, color: '#94a3b8' }
      return { name: t.analytics.negative, value: negative, color: '#ef4444' }
  }).filter(d => d.value > 0)

  const questionEmbeddings = new Map<string, typeof validEmbeddings>()
  for (const e of validEmbeddings) {
    if (!questionEmbeddings.has(e.question_key)) {
      questionEmbeddings.set(e.question_key, [])
    }
    questionEmbeddings.get(e.question_key)!.push(e)
  }

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
    if (embs.length < 2) continue

    const k = Math.max(2, Math.floor(Math.sqrt(embs.length)))
    
    const dataMatrix = embs.map(e => 
      typeof e.embedding === 'string' ? JSON.parse(e.embedding) : e.embedding
    )

    try {
      const result = kmeans(dataMatrix, Math.min(k, dataMatrix.length), { initialization: 'kmeans++' })
      const clusters = result.clusters

      const silhouette = calculateSilhouetteScore(dataMatrix, clusters)

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
        sampleAnswers: texts.slice(0, 3)
      })).sort((a, b) => b.size - a.size)

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
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
      <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b-2 border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link
            href={`/dashboard/${workspaceId}/forms/${formId}`}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-black transition-colors shadow-sm"
          >
            <ArrowLeft size={24} strokeWidth={3} />
          </Link>
          <div className="h-8 w-1 bg-slate-200 rounded-full"></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 truncate max-w-sm">
              {form.title}
            </h1>
            <p className="text-lg font-bold text-slate-500">Analytics & Insights</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Link href={`/dashboard/${workspaceId}/forms/${formId}/responses`}>
            <Button variant="outline" size="lg">
              View All Responses
            </Button>
          </Link>
          <DownloadPdfButton fileName={`${form.title} - AI Report.pdf`} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-8 space-y-12">
        
        <section className="grid gap-8 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-500">Total Responses</CardTitle>
              <FileText className="h-6 w-6 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">{responsesCount || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-500">Completion Rate</CardTitle>
              <TrendingUp className="h-6 w-6 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">100%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-bold text-indigo-500">AI Analyzed</CardTitle>
              <BrainCircuit className="h-6 w-6 text-indigo-500" strokeWidth={3} />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-indigo-600">{validEmbeddings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-500">Overall Sentiment</CardTitle>
              <BarChart3 className="h-6 w-6 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900 capitalize">
                {positive > negative ? t.analytics.positive : negative > positive ? t.analytics.negative : t.analytics.neutral}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-black text-slate-900">{t.analytics.sentimentBreakdown}</CardTitle>
              <CardDescription className="text-xl font-medium mt-2">Overall sentiment distribution across all text answers</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-10">
              <SentimentPieChart data={sentimentData} />
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900">{t.analytics.semanticClustersTitle}</h2>
            <p className="text-xl text-slate-500 mt-2 font-medium">{t.analytics.semanticClustersDesc}</p>
          </div>
          
          {clusterResults.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-20 text-center border-4 border-dashed border-slate-300 bg-white shadow-sm">
              <div className="size-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-6">
                <BrainCircuit size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Not enough data</h3>
              <p className="text-lg text-slate-500 max-w-md font-medium">{t.analytics.notEnoughText}</p>
            </Card>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {clusterResults.map(res => (
                <Card key={res.questionId} className="flex flex-col overflow-hidden">
                  <div className="border-b-2 border-slate-100 bg-slate-50 p-8">
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-2 leading-snug" title={res.questionLabel}>
                      {res.questionLabel}
                    </h3>
                    <div className="mt-4 flex items-center gap-4">
                      <Badge variant={res.silhouetteScore > 0.5 ? 'success' : res.silhouetteScore > 0.2 ? 'warning' : 'danger'} className="text-base py-1 px-3">
                        Score: {res.silhouetteScore.toFixed(2)}
                      </Badge>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                        {res.silhouetteScore > 0.5 ? t.analytics.strongClusters : res.silhouetteScore > 0.2 ? t.analytics.fairClusters : t.analytics.weakClusters}
                      </span>
                    </div>
                  </div>
                  
                  <CardContent className="flex-1 p-8 overflow-y-auto max-h-[500px]">
                    <div className="space-y-8">
                      {res.clusters.map((cluster, i) => (
                        <div key={cluster.id}>
                          <h4 className="mb-4 text-lg font-bold text-slate-900 flex items-center gap-3">
                            <span className="flex size-8 items-center justify-center rounded-xl bg-black text-white text-sm font-black">
                              {i + 1}
                            </span>
                            {t.analytics.themeGroup} <span className="text-slate-400 ml-1">({cluster.size} {t.analytics.responseCount})</span>
                          </h4>
                          <ul className="space-y-4 pl-10 border-l-4 border-slate-100 ml-4">
                            {cluster.sampleAnswers.map((answer, j) => (
                              <li key={j} className="text-lg text-slate-700 font-medium relative">
                                <span className="absolute -left-[46px] top-[10px] size-2 rounded-full bg-slate-300"></span>
                                &ldquo;{answer}&rdquo;
                              </li>
                            ))}
                            {cluster.size > 3 && (
                              <li className="text-base font-bold text-indigo-500 pl-2 pt-2">
                                + {cluster.size - 3} {t.analytics.moreSimilar}
                              </li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

      </main>

      <ReportTemplate 
        form={form} 
        responsesCount={responsesCount || 0}
        validEmbeddingsCount={validEmbeddings.length}
        sentimentData={sentimentData}
        clusterResults={clusterResults}
      />
    </div>
  )
}
