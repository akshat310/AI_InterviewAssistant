import { useNavigate } from 'react-router-dom'
import { useInterview } from '../context/InterviewContext'

const SCORE_COLOR = (s) =>
  s >= 8 ? { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' } :
  s >= 5 ? { color: '#d97706', bg: '#fffbeb', border: '#fde68a' } :
           { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }

const READINESS_STYLE = {
  'Ready for Interviews': { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  'Almost Ready':         { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  'Needs More Prep':      { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  'Not Ready':            { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

export default function ResultsPage() {
  const navigate  = useNavigate()
  const { finalReport, config, resetInterview } = useInterview()

  if (!finalReport) {
    navigate('/')
    return null
  }

  const fb       = finalReport.final_feedback || {}
  const score    = finalReport.overall_score || 0
  const sc       = SCORE_COLOR(score)
  const readSt   = READINESS_STYLE[fb.interview_readiness] || READINESS_STYLE['Needs More Prep']
  const breakdown = fb.score_breakdown || {}

  const handleRetry = () => { resetInterview(); navigate('/') }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Inter, sans-serif' }}>

      {/* Nav */}
      <nav style={{ height: 52, background: '#fff', borderBottom: '0.5px solid #e8e8e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, background: '#1a1a2e', borderRadius: 7,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#fff', fontWeight: 700 }}>B</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Byte</span>
        </div>
        <button onClick={handleRetry}
          style={{ fontSize: 13, fontWeight: 500, color: '#fff', background: '#1a1a2e',
                   border: 'none', borderRadius: 8, padding: '8px 18px',
                   cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Practice again →
        </button>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
            {config?.topic?.toUpperCase()} · {config?.difficulty} · {finalReport.total_questions_attempted} questions
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', letterSpacing: '-0.5px', marginBottom: 8 }}>
            Interview complete
          </h1>
          <p style={{ fontSize: 14, color: '#888' }}>
            {fb.motivational_message || 'Great effort — keep practicing!'}
          </p>
        </div>

        {/* Score cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Overall score', val: `${score}/10`, style: sc },
            { label: 'Verdict',       val: fb.overall_verdict || '—', style: { color: '#111', bg: '#fff', border: '#e8e8e8' } },
            { label: 'Readiness',     val: fb.interview_readiness || '—', style: readSt },
          ].map(c => (
            <div key={c.label} style={{ background: c.style.bg, border: `0.5px solid ${c.style.border}`,
                                        borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8,
                            textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.style.color,
                            lineHeight: 1.2 }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* Breakdown bars */}
        {Object.keys(breakdown).length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #e8e8e8', borderRadius: 10,
                        padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 16 }}>
              Score breakdown
            </div>
            {Object.entries(breakdown).map(([key, val]) => {
              const label = key.replace(/_/g, ' ')
              const pct   = Math.round((val / 10) * 100)
              const c     = val >= 7 ? '#22c55e' : val >= 4 ? '#f59e0b' : '#ef4444'
              return (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#555', textTransform: 'capitalize' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: '#111',
                                   fontFamily: 'JetBrains Mono, monospace' }}>{val}/10</span>
                  </div>
                  <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: c,
                                  borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Two col — strengths + gaps */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#fff', border: '0.5px solid #e8e8e8', borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 14 }}>
              Strengths
            </div>
            {(fb.top_strengths || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, color: '#16a34a', flexShrink: 0, marginTop: 1 }}>✓</div>
                <span style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e8e8e8', borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 14 }}>
              Areas to improve
            </div>
            {(fb.critical_gaps || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fef2f2',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, color: '#dc2626', flexShrink: 0, marginTop: 1 }}>↑</div>
                <span style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Study recommendations */}
        {fb.study_recommendations?.length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #e8e8e8', borderRadius: 10,
                        padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 14 }}>
              Study recommendations
            </div>
            {fb.study_recommendations.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0',
                                    borderBottom: i < fb.study_recommendations.length - 1
                                      ? '0.5px solid #f0f0f0' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff',
                              border: '0.5px solid #bfdbfe', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 12, color: '#1d4ed8', flexShrink: 0,
                              fontWeight: 600 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 3 }}>
                    {typeof r === 'string' ? r : r.topic}
                  </div>
                  {r.reason && (
                    <div style={{ fontSize: 12, color: '#888' }}>{r.reason}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Per-question breakdown */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e8e8', borderRadius: 10, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 16 }}>
            Question breakdown
          </div>
          {(finalReport.question_breakdown || []).map((q, i) => {
            const qc = SCORE_COLOR(q.score)
            return (
              <div key={i} style={{ padding: '14px 0',
                                    borderBottom: i < finalReport.question_breakdown.length - 1
                                      ? '0.5px solid #f5f5f5' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#aaa', marginBottom: 5 }}>Q{i + 1}</div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5, marginBottom: 6 }}>
                      {q.question}
                    </div>
                    {q.feedback?.verdict && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4,
                                     background: qc.bg, color: qc.color,
                                     border: `0.5px solid ${qc.border}` }}>
                        {q.feedback.verdict}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: qc.color,
                                background: qc.bg, border: `0.5px solid ${qc.border}`,
                                borderRadius: 8, padding: '6px 12px', flexShrink: 0 }}>
                    {q.score}/10
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}