'use client'

import React from 'react'
import { SentimentPieChart } from '@/app/components/AnalyticsCharts'

interface Props {
  form: { title: string; description: string | null }
  responsesCount: number
  validEmbeddingsCount: number
  sentimentData: any[]
  clusterResults: any[]
}

export default function ReportTemplate({ form, responsesCount, validEmbeddingsCount, sentimentData, clusterResults }: Props) {
  // We'll chunk the clusterResults so they don't overflow the page.
  // Assuming 2 questions per page maximum for A4.
  const clusterPages = []
  for (let i = 0; i < clusterResults.length; i += 2) {
    clusterPages.push(clusterResults.slice(i, i + 2))
  }

  // A4 dimensions at 96 DPI
  const a4Style: React.CSSProperties = { 
    width: '794px', 
    height: '1123px', 
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden'
  }

  return (
    <div id="pdf-report-template" className="absolute -left-[9999px] top-0 pointer-events-none z-[-9999] bg-slate-100 p-8 flex flex-col gap-8">
       {/* Cover Page */}
       <div className="pdf-page flex flex-col justify-center items-center text-center p-20 bg-slate-50 border border-slate-200" style={a4Style}>
          <div className="mb-12 rounded-full bg-indigo-100 p-8 shadow-sm">
             <div className="text-7xl">📊</div>
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 mb-6 max-w-2xl leading-tight">
            {form.title}
          </h1>
          {form.description && (
             <p className="text-xl text-slate-500 mb-8 max-w-xl">{form.description}</p>
          )}
          <p className="text-2xl text-indigo-600 mb-16 font-semibold uppercase tracking-widest">
            AI Analytics Report
          </p>
          
          <div className="mt-24 border-t-2 border-slate-200 pt-12 w-full max-w-lg">
             <div className="flex justify-between items-center text-xl text-slate-600 mb-6">
               <span>Date Generated</span>
               <span className="font-bold text-slate-900">{new Date().toLocaleDateString()}</span>
             </div>
             <div className="flex justify-between items-center text-xl text-slate-600">
               <span>Total Responses</span>
               <span className="font-bold text-slate-900">{responsesCount}</span>
             </div>
          </div>
       </div>

       {/* Overview Page */}
       <div className="pdf-page p-16 border border-slate-200 bg-white" style={a4Style}>
         <h2 className="text-3xl font-extrabold text-slate-900 mb-10 border-b-2 border-slate-100 pb-6">
           Executive Summary
         </h2>
         
         <div className="grid grid-cols-2 gap-8 mb-12">
           <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10">
             <h3 className="text-xl font-medium text-slate-500 mb-4">Total Responses</h3>
             <p className="text-6xl font-black text-slate-900">{responsesCount}</p>
           </div>
           <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10">
             <h3 className="text-xl font-medium text-slate-500 mb-4">AI Analyzed Answers</h3>
             <p className="text-6xl font-black text-slate-900">{validEmbeddingsCount}</p>
           </div>
         </div>

         <div className="rounded-2xl border border-slate-200 p-10 h-[500px] flex flex-col shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 mb-8">Overall Sentiment Breakdown</h3>
            <div className="flex-1 min-h-0 w-full relative -ml-8">
               <SentimentPieChart data={sentimentData} isPdf={true} />
            </div>
         </div>
       </div>

       {/* Cluster Pages */}
       {clusterPages.map((pageQuestions, pageIdx) => (
         <div key={pageIdx} className="pdf-page p-16 border border-slate-200 bg-white" style={a4Style}>
           <h2 className="text-3xl font-extrabold text-slate-900 mb-10 border-b-2 border-slate-100 pb-6">
             Semantic Analysis <span className="text-slate-400 text-2xl font-normal ml-2">Part {pageIdx + 1}</span>
           </h2>
           
           <div className="space-y-12">
             {pageQuestions.map((res: any) => (
               <div key={res.questionId} className="rounded-2xl border border-slate-200 p-8 shadow-sm">
                 <h3 className="text-2xl font-bold text-slate-900 mb-8 leading-snug">
                   Q: {res.questionLabel}
                 </h3>
                 <div className="space-y-6">
                   {res.clusters.slice(0, 3).map((cluster: any, i: number) => (
                     <div key={cluster.id} className="bg-slate-50 border border-slate-100 rounded-xl p-6">
                        <h4 className="font-bold text-slate-800 mb-4 text-lg flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm">
                            {i + 1}
                          </span>
                          Theme Group
                          <span className="text-sm font-medium text-slate-500 bg-slate-200 px-3 py-1 rounded-full ml-auto">
                            {cluster.size} responses
                          </span>
                        </h4>
                        <ul className="space-y-3 pl-11">
                          {cluster.sampleAnswers.map((answer: string, j: number) => (
                            <li key={j} className="text-slate-700 text-base relative">
                              <span className="absolute -left-5 top-2.5 h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                              "{answer}"
                            </li>
                          ))}
                        </ul>
                     </div>
                   ))}
                   {res.clusters.length === 0 && (
                     <p className="text-slate-500 italic">Not enough text responses to form themes.</p>
                   )}
                 </div>
               </div>
             ))}
           </div>
         </div>
       ))}
    </div>
  )
}
