import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { SentimentPieChart, FormsPerformanceChart } from '@/app/components/AnalyticsCharts'
import { LayoutDashboard, BarChart3, BrainCircuit, FileText, Sparkles, AlertCircle } from 'lucide-react'

interface Props {
  params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceAnalyticsPage({ params }: Props) {
  const { workspaceId } = await params
  const supabase = await createClient()
  const { t } = await getServerTranslations()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all forms in the workspace
  const { data: formsData, error } = await supabase
    .from('forms')
    .select('id, title, is_published')
    .eq('workspace_id', workspaceId)

  if (error || !formsData) {
    redirect('/dashboard')
  }

  const formIds = formsData.map(f => f.id)

  // Fetch response counts
  const { data: responsesData } = await supabase
    .from('responses')
    .select('form_id')
    .in('form_id', formIds)

  // Fetch all embeddings for sentiment analysis
  const { data: embeddingsData } = await supabase
    .from('embeddings')
    .select('sentiment_label')
    .in('form_id', formIds)

  // Aggregate Data
  const totalResponses = responsesData?.length || 0
  const totalAnalyzed = embeddingsData?.length || 0

  let positive = 0, negative = 0, neutral = 0
  if (embeddingsData) {
    for (const e of embeddingsData) {
      if (e.sentiment_label === 'positive') positive++
      else if (e.sentiment_label === 'negative') negative++
      else neutral++
    }
  }

  const sentimentData = [
    { name: t.analytics.positive || 'Positive', value: positive, color: '#10b981' },
    { name: t.analytics.neutral || 'Neutral', value: neutral, color: '#94a3b8' },
    { name: t.analytics.negative || 'Negative', value: negative, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const responseCountMap = new Map<string, number>()
  if (responsesData) {
    for (const r of responsesData) {
      responseCountMap.set(r.form_id, (responseCountMap.get(r.form_id) || 0) + 1)
    }
  }

  const performanceData = formsData
    .map(f => ({
      name: f.title.length > 20 ? f.title.substring(0, 20) + '...' : f.title,
      responses: responseCountMap.get(f.id) || 0
    }))
    .filter(d => d.responses > 0)
    .sort((a, b) => b.responses - a.responses)
    .slice(0, 10) // top 10 forms

  // Helper text for overall sentiment
  let overallVibe = "Not enough data"
  let vibeColor = "text-slate-500"
  if (totalAnalyzed > 0) {
    if (positive > negative && positive > neutral) {
      overallVibe = "Mostly Positive"
      vibeColor = "text-emerald-500"
    } else if (negative > positive && negative > neutral) {
      overallVibe = "Mostly Negative"
      vibeColor = "text-rose-500"
    } else {
      overallVibe = "Mixed / Neutral"
      vibeColor = "text-slate-500"
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
      <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b-2 border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link
            href={`/dashboard/${workspaceId}`}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-black transition-colors shadow-sm"
          >
            <LayoutDashboard size={24} strokeWidth={3} />
          </Link>
          <div className="h-8 w-1 bg-slate-200 rounded-full"></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Workspace Analytics</h1>
            <p className="text-lg font-bold text-slate-500">Global insights across all forms</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-8 space-y-8">
        
        {/* KPI Cards */}
        <section className="grid gap-8 md:grid-cols-4">
          <Card className="border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Total Responses</CardTitle>
              <FileText className="h-6 w-6 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">{totalResponses}</div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Forms Tracked</CardTitle>
              <BarChart3 className="h-6 w-6 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">{formsData.length}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-indigo-400">AI Analyzed</CardTitle>
              <BrainCircuit className="h-6 w-6 text-indigo-500" strokeWidth={2.5} />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-indigo-600">{totalAnalyzed}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Overall Vibe</CardTitle>
              <Sparkles className="h-6 w-6 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-black ${vibeColor}`}>{overallVibe}</div>
            </CardContent>
          </Card>
        </section>

        {totalResponses === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border-4 border-dashed border-slate-200 bg-white">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-slate-100 mb-6 shadow-sm">
              <AlertCircle className="h-10 w-10 text-slate-400" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">No data available yet</h2>
            <p className="text-lg text-slate-500 max-w-md font-medium">
              Publish some forms and collect responses to see global analytics and AI insights here.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Sentiment Breakdown */}
            <Card className="border-2 border-slate-100 shadow-sm flex flex-col">
              <CardHeader className="border-b-2 border-slate-50 bg-white pb-6">
                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Sparkles className="text-indigo-500" size={24} />
                  Global Sentiment
                </CardTitle>
                <CardDescription className="text-base font-medium mt-2 text-slate-500">
                  Aggregated AI sentiment analysis across all free-text responses in this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center py-10">
                <SentimentPieChart data={sentimentData} />
              </CardContent>
            </Card>

            {/* Top Performing Forms */}
            <Card className="border-2 border-slate-100 shadow-sm flex flex-col">
              <CardHeader className="border-b-2 border-slate-50 bg-white pb-6">
                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <BarChart3 className="text-indigo-500" size={24} />
                  Top Forms by Responses
                </CardTitle>
                <CardDescription className="text-base font-medium mt-2 text-slate-500">
                  The most active forms in your workspace based on total response volume.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 py-10 px-4">
                <FormsPerformanceChart data={performanceData} />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
