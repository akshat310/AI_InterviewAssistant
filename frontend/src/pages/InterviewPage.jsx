import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInterview } from '../context/InterviewContext'
import { interviewAPI } from '../services/api'
import Editor from '@monaco-editor/react'
import toast from 'react-hot-toast'

const LANG_MAP = { Python: 'python', Java: 'java', 'C++': 'cpp',
                   JavaScript: 'javascript', Go: 'go', Rust: 'rust' }

const DIFF = {
  easy:   { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  medium: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  hard:   { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  mixed:  { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' },
}

export default function InterviewPage() {
  const navigate = useNavigate()
  const { session, config, currentQuestion, setCurrentQuestion,
          answers, setAnswers, setFinalReport, phase, setPhase } = useInterview()

  const [answer,     setAnswer]     = useState('')
  const [code,       setCode]       = useState('')
  const [loading,    setLoading]    = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [showEval,   setShowEval]   = useState(false)
  const [qNum,       setQNum]       = useState(1)
  const [elapsed,    setElapsed]    = useState(0)
  const timerRef = useRef(null)

  useEffect(() => { if (!session) navigate('/') }, [session])
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const fmt    = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const totalQ = config?.totalQuestions || 5
  const isCoding  = config?.codingRound || false
  const language  = config?.language || 'Python'
  const diff      = DIFF[config?.difficulty] || DIFF.medium

  const handleSubmit = async () => {
    const currentAnswer = isCoding && phase === 'code' ? code : answer
    if (!currentAnswer.trim()) return toast.error('Write an answer first')
    setLoading(true)
    try {
      const res  = await interviewAPI.submitAnswer({
        session_id:         session.id,
        question:           currentQuestion,
        answer:             currentAnswer,
        topic:              config.topic,
        difficulty:         config.difficulty,
        is_coding_question: isCoding,
        language:           isCoding ? language : null,
        is_approach_phase:  phase === 'approach',
      })
      const data = res.data

      if (data.phase === 'code') {
        setPhase('code')
        setAnswer('')
        toast.success('Approach noted — now write the code')
        setLoading(false)
        return
      }

      if (data.evaluation) {
        setEvaluation(data.evaluation)
        setShowEval(true)
        setAnswers(prev => [...prev, {
          question: currentQuestion, answer: currentAnswer,
          score: data.evaluation.score, feedback: data.evaluation
        }])
      }

      if (data.is_complete) {
        const endRes = await interviewAPI.end(session.id)
        setFinalReport(endRes.data)
        navigate('/results')
        return
      }

      setCurrentQuestion(data.next_question)
      setQNum(data.next_question_number)
      setPhase(isCoding ? 'approach' : 'answer')
      setAnswer('')
      setCode('')

    } catch { toast.error('Something went wrong') }
    finally  { setLoading(false) }
  }

  const handleEnd = async () => {
    if (!window.confirm('End the interview now?')) return
    try {
      const res = await interviewAPI.end(session.id)
      setFinalReport(res.data)
      navigate('/results')
    } catch { toast.error('Error ending interview') }
  }

  if (!session || !currentQuestion) return null

  const avgScore = answers.length
    ? (answers.reduce((a,b) => a + b.score, 0) / answers.length).toFixed(1)
    : null

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column',
                  background: '#f5f5f5', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ height: 48, background: '#fff', borderBottom: '0.5px solid #e8e8e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 20px', flexShrink: 0 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: '#1a1a2e', borderRadius: 7,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#fff', fontWeight: 700 }}>B</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Byte</span>
          <div style={{ width: 1, height: 16, background: '#e8e8e8' }} />
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5,
                         background: diff.bg, color: diff.color, border: `0.5px solid ${diff.border}` }}>
            {config?.topic?.toUpperCase()} · {config?.difficulty}
          </span>
        </div>

        {/* Question progress pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: totalQ }, (_, i) => {
            const done   = i + 1 < qNum
            const active = i + 1 === qNum
            return (
              <div key={i} style={{
                height: 6, width: active ? 22 : 6, borderRadius: 3,
                background: done ? '#22c55e' : active ? '#1a1a2e' : '#e0e0e0',
                transition: 'all 0.3s',
              }} />
            )
          })}
          <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6,
                         fontFamily: 'JetBrains Mono, monospace' }}>{qNum}/{totalQ}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#555', fontFamily: 'JetBrains Mono, monospace',
                         background: '#f5f5f5', border: '0.5px solid #e0e0e0',
                         borderRadius: 6, padding: '4px 10px' }}>
            {fmt(elapsed)}
          </span>
          <button onClick={handleEnd}
            style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2',
                     border: '0.5px solid #fecaca', borderRadius: 6,
                     padding: '5px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            End session
          </button>
        </div>
      </div>

      {/* Split panel */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', gap: 1, background: '#e8e8e8' }}>

        {/* LEFT — Problem */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #e8e8e8', padding: '0 20px' }}>
            {['Problem', 'Feedback'].map((t, i) => (
              <div key={t} style={{ fontSize: 12, padding: '10px 12px', cursor: 'pointer',
                                    color: i === 0 ? '#111' : '#bbb',
                                    borderBottom: i === 0 ? '2px solid #1a1a2e' : '2px solid transparent' }}>
                {t}
              </div>
            ))}
          </div>

          {/* Question */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'JetBrains Mono, monospace' }}>
                Q{qNum} of {totalQ}
              </span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                             background: diff.bg, color: diff.color, border: `0.5px solid ${diff.border}` }}>
                {config?.difficulty}
              </span>
              {isCoding && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10,
                               background: '#f5f3ff', color: '#5b21b6', border: '0.5px solid #ddd6fe' }}>
                  {language}
                </span>
              )}
            </div>

            <div style={{ fontSize: 15, fontWeight: 600, color: '#111',
                          marginBottom: 16, lineHeight: 1.55 }}>
              {currentQuestion}
            </div>

            {isCoding && (
              <div style={{ background: '#fafafa', border: '0.5px solid #e8e8e8',
                            borderRadius: 8, padding: 14, marginTop: 8 }}>
                <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase',
                              letterSpacing: '0.07em', marginBottom: 8 }}>Instructions</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                  <div>1. Explain your <span style={{ color: '#1a1a2e', fontWeight: 500 }}>approach</span> and algorithm</div>
                  <div>2. State time & space complexity</div>
                  <div>3. Write clean <span style={{ color: '#5b21b6', fontWeight: 500 }}>{language} code</span></div>
                </div>
              </div>
            )}

            {/* Inline evaluation */}
            {showEval && evaluation && (
              <div style={{ marginTop: 20, border: '0.5px solid #e8e8e8', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#fafafa',
                              borderBottom: '0.5px solid #e8e8e8',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>Evaluation</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 700,
                                   color: evaluation.score >= 7 ? '#16a34a'
                                        : evaluation.score >= 4 ? '#d97706' : '#dc2626' }}>
                      {evaluation.score}<span style={{ fontSize: 12, color: '#aaa', fontWeight: 400 }}>/10</span>
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5,
                                   background: '#f5f5f5', color: '#888', border: '0.5px solid #e0e0e0' }}>
                      {evaluation.verdict}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  {evaluation.strengths?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#16a34a', marginBottom: 6 }}>
                        Strengths
                      </div>
                      {evaluation.strengths.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4,
                                              paddingLeft: 10, borderLeft: '2px solid #bbf7d0' }}>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                  {evaluation.improvements?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#d97706', marginBottom: 6 }}>
                        To improve
                      </div>
                      {evaluation.improvements.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4,
                                              paddingLeft: 10, borderLeft: '2px solid #fde68a' }}>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                  {evaluation.ideal_answer_summary && (
                    <div style={{ background: '#fafafa', border: '0.5px solid #e8e8e8',
                                  borderRadius: 7, padding: 12 }}>
                      <div style={{ fontSize: 10, color: '#aaa', marginBottom: 6 }}>Ideal approach</div>
                      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
                        {evaluation.ideal_answer_summary}
                      </div>
                    </div>
                  )}
                  {isCoding && evaluation.time_complexity && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      {[
                        { label: 'Time', val: evaluation.time_complexity,  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                        { label: 'Space', val: evaluation.space_complexity, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                      ].map(c => (
                        <div key={c.label} style={{ flex: 1, background: c.bg,
                                                    border: `0.5px solid ${c.border}`,
                                                    borderRadius: 7, padding: '8px 12px' }}>
                          <div style={{ fontSize: 10, color: c.color, opacity: 0.7 }}>{c.label}</div>
                          <div style={{ fontSize: 13, color: c.color, fontWeight: 600,
                                        fontFamily: 'JetBrains Mono, monospace' }}>{c.val}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Phase tracker */}
          {isCoding && (
            <div style={{ padding: '10px 20px', borderTop: '0.5px solid #e8e8e8',
                          background: '#fafafa', display: 'flex', alignItems: 'center', gap: 8 }}>
              {[
                { key: 'approach', label: 'Approach', num: 1 },
                { key: 'code',     label: 'Code',     num: 2 },
                { key: 'review',   label: 'Review',   num: 3 },
              ].map((p, i, arr) => {
                const isDone   = (p.key === 'approach' && phase === 'code') || showEval
                const isActive = p.key === phase
                return (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', fontSize: 9,
                                  fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: isDone ? '#dcfce7' : isActive ? '#1a1a2e' : '#f0f0f0',
                                  color: isDone ? '#16a34a' : isActive ? '#fff' : '#bbb',
                                  border: isDone ? '0.5px solid #bbf7d0' : 'none' }}>
                      {isDone ? '✓' : p.num}
                    </div>
                    <span style={{ fontSize: 11, color: isActive ? '#111' : '#aaa',
                                   fontWeight: isActive ? 500 : 400 }}>{p.label}</span>
                    {i < arr.length - 1 && (
                      <span style={{ color: '#ddd', fontSize: 12, marginLeft: 2 }}>›</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT — Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>

          {/* Editor header */}
          <div style={{ height: 42, background: '#fafafa', borderBottom: '0.5px solid #e8e8e8',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#555' }}>
                {isCoding && phase === 'code' ? language : 'Answer'}
              </span>
              {phase === 'approach' && isCoding && (
                <span style={{ fontSize: 10, color: '#5b21b6', background: '#f5f3ff',
                               border: '0.5px solid #ddd6fe', borderRadius: 4, padding: '2px 6px' }}>
                  explain approach first
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: '#bbb' }}>
              {phase === 'approach' ? 'Step 1 of 2' : phase === 'code' ? 'Step 2 of 2' : ''}
            </span>
          </div>

          {/* Approach reminder when coding */}
          {isCoding && phase === 'code' && answer && (
            <div style={{ margin: '12px 14px 0', background: '#f0fdf4',
                          border: '0.5px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#16a34a', marginBottom: 5, fontWeight: 500 }}>
                ✓ Your approach
              </div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{answer}</div>
            </div>
          )}

          {/* Editor body */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {isCoding && phase === 'code' ? (
              <Editor
                height="100%"
                language={LANG_MAP[language] || 'python'}
                value={code}
                onChange={val => setCode(val || '')}
                theme="light"
                options={{
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  padding: { top: 16 },
                  wordWrap: 'on',
                  renderLineHighlight: 'line',
                }}
              />
            ) : (
              <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                placeholder={
                  phase === 'approach'
                    ? 'Explain your approach...\n\n• What algorithm / data structure?\n• Time and space complexity?\n• How will you handle edge cases?'
                    : 'Type your answer here...'
                }
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none',
                         resize: 'none', fontSize: 14, lineHeight: 1.7, padding: '20px',
                         fontFamily: 'Inter, sans-serif', color: '#111', background: '#fff' }}
              />
            )}
          </div>

          {/* Action bar */}
          <div style={{ padding: '12px 16px', borderTop: '0.5px solid #e8e8e8',
                        background: '#fafafa', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {avgScore && (
                <>
                  <span style={{ fontSize: 11, color: '#aaa' }}>
                    Last: <span style={{ color: '#111', fontWeight: 600,
                                         fontFamily: 'JetBrains Mono, monospace' }}>
                      {answers[answers.length-1]?.score}/10
                    </span>
                  </span>
                  <div style={{ width: 1, height: 12, background: '#e0e0e0' }} />
                  <span style={{ fontSize: 11, color: '#aaa' }}>
                    Avg: <span style={{ color: '#111', fontWeight: 600,
                                        fontFamily: 'JetBrains Mono, monospace' }}>
                      {avgScore}
                    </span>
                  </span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {showEval && (
                <button onClick={() => { setShowEval(false); setEvaluation(null) }}
                  style={{ padding: '8px 16px', background: '#f0fdf4',
                           border: '0.5px solid #bbf7d0', borderRadius: 8,
                           fontSize: 13, fontWeight: 500, color: '#16a34a', cursor: 'pointer',
                           fontFamily: 'Inter, sans-serif' }}>
                  Next →
                </button>
              )}
              {!showEval && (
                <button onClick={handleSubmit} disabled={loading}
                  style={{ padding: '8px 20px',
                           background: loading ? '#e8e8e8' : '#1a1a2e',
                           border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                           color: loading ? '#aaa' : '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                           fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                  {loading ? 'Evaluating...'
                   : phase === 'approach' ? 'Submit approach →'
                   : 'Submit →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}