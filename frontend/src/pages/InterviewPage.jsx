import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInterview } from '../context/InterviewContext'
import { interviewAPI } from '../services/api'
import Editor from '@monaco-editor/react'
import toast from 'react-hot-toast'
import { useVoice } from '../hooks/useVoice'

const LANG_MAP = {
  Python: 'python', Java: 'java', 'C++': 'cpp',
  JavaScript: 'javascript', Go: 'go', Rust: 'rust'
}

const DIFF = {
  easy:   { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  medium: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  hard:   { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  mixed:  { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' },
}

export default function InterviewPage() {
  const navigate = useNavigate()
  const {
    session, config, currentQuestion, setCurrentQuestion,
    answers, setAnswers, setFinalReport, setPhase
  } = useInterview()

  const [code,            setCode]            = useState('')
  const [loading,         setLoading]         = useState(false)
  const [evaluation,      setEvaluation]      = useState(null)
  const [showEval,        setShowEval]        = useState(false)
  const [qNum,            setQNum]            = useState(1)
  const [elapsed,         setElapsed]         = useState(0)
  const [voiceEnabled,    setVoiceEnabled]    = useState(false)
  const [chat,            setChat]            = useState([])
  const [aiTyping,        setAiTyping]        = useState(false)
  const [spokenLog,       setSpokenLog]       = useState('')
  const [templateLoading, setTemplateLoading] = useState(false)

  const chatEndRef   = useRef(null)
  const timerRef     = useRef(null)
  const lastChunkRef = useRef('')
  const codeRef      = useRef('')

  useEffect(() => { codeRef.current = code }, [code])

  // ── Voice ─────────────────────────────────────────────────────────
  const {
    supported, listening, startListening, stopListening,
    speaking,  speak,     stopSpeaking,   liveText,
    recognitionRef, restartRef, setListening
  } = useVoice({
    onTranscript: (full, latestChunk) => {
      setSpokenLog(full)
      if (latestChunk && latestChunk !== lastChunkRef.current) {
        lastChunkRef.current = latestChunk
        handleAIReact(latestChunk)
      }
    }
  })

  // ── Setup ─────────────────────────────────────────────────────────
  useEffect(() => { if (!session) navigate('/') }, [session])

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat, aiTyping])

  // New question → reset + fetch template + read aloud
  useEffect(() => {
    if (!currentQuestion) return
    setChat([{ role: 'ai', text: currentQuestion, type: 'question' }])
    setSpokenLog('')
    lastChunkRef.current = ''
    setCode('')
    setShowEval(false)
    setEvaluation(null)
    fetchTemplate(currentQuestion)
    if (voiceEnabled) setTimeout(() => speak(currentQuestion), 400)
  }, [currentQuestion])

  // ── Helpers ───────────────────────────────────────────────────────
  const fmt     = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const totalQ  = config?.totalQuestions || 5
  const language = config?.language || 'Python'
  const diff     = DIFF[config?.difficulty] || DIFF.medium
  const avgScore = answers.length
    ? (answers.reduce((a, b) => a + b.score, 0) / answers.length).toFixed(1)
    : null

  // ── Fetch starter template ────────────────────────────────────────
  const fetchTemplate = useCallback(async (question) => {
    if (!question) return
    setTemplateLoading(true)
    try {
      const res = await interviewAPI.getTemplate({
        question,
        language,
        topic: config?.topic,
      })
      setCode(res.data.template || '')
    } catch {
      const fallbacks = {
        Python:     `class Solution:\n    def solve(self):\n        # Your code here\n        pass`,
        Java:       `class Solution {\n    public void solve() {\n        // Your code here\n    }\n}`,
        'C++':      `class Solution {\npublic:\n    void solve() {\n        // Your code here\n    }\n};`,
        JavaScript: `var solve = function() {\n    // Your code here\n};`,
        Go:         `func solve() {\n    // Your code here\n}`,
        Rust:       `impl Solution {\n    pub fn solve() {\n        // Your code here\n    }\n}`,
      }
      setCode(fallbacks[language] || '// Your code here')
    } finally {
      setTemplateLoading(false)
    }
  }, [language, config])

  // ── AI reacts to spoken chunk ─────────────────────────────────────
  const handleAIReact = useCallback(async (latestChunk) => {
    if (!latestChunk || latestChunk.trim().split(' ').length < 4) return

    const wasListening = listening
    if (wasListening) {
      restartRef.current = false
      try { recognitionRef.current?.stop() } catch {}
      setListening(false)
    }

    setAiTyping(true)
    try {
      const res = await interviewAPI.chat({
        question:    currentQuestion,
        what_said:   latestChunk,
        code_so_far: codeRef.current,
        topic:       config?.topic,
        language,
      })
      const aiText = res.data?.response
      if (!aiText) return

      setChat(prev => [...prev, { role: 'ai', text: aiText, type: 'reaction' }])

      if (voiceEnabled) {
        speak(aiText, () => {
          if (wasListening) {
            setTimeout(() => {
              restartRef.current = true
              try { recognitionRef.current?.start(); setListening(true) } catch {}
            }, 600)
          }
        })
      } else if (wasListening) {
        setTimeout(() => {
          restartRef.current = true
          try { recognitionRef.current?.start(); setListening(true) } catch {}
        }, 300)
      }
    } catch {
      if (wasListening) {
        setTimeout(() => {
          restartRef.current = true
          try { recognitionRef.current?.start(); setListening(true) } catch {}
        }, 300)
      }
    } finally {
      setAiTyping(false)
    }
  }, [currentQuestion, config, language, voiceEnabled, speak, listening])

  // ── Mic toggle ────────────────────────────────────────────────────
  const handleMicToggle = () => {
    if (listening) {
      const said = stopListening()
      if (said) setChat(prev => [...prev, { role: 'user', text: said }])
    } else {
      startListening()
    }
  }

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!code.trim()) return toast.error('Write some code first')
    if (listening) stopListening()
    if (speaking)  stopSpeaking()
    setLoading(true)
    try {
      const res = await interviewAPI.submitAnswer({
        session_id:         session.id,
        question:           currentQuestion,
        answer:             `CODE:\n${code}\n\nCANDIDATE EXPLANATION:\n${spokenLog || 'No verbal explanation given.'}`,
        topic:              config.topic,
        difficulty:         config.difficulty,
        is_coding_question: true,
        language,
        is_approach_phase:  false,
      })
      const data = res.data

      if (data.evaluation) {
        setEvaluation(data.evaluation)
        setShowEval(true)
        setAnswers(prev => [...prev, {
          question: currentQuestion,
          answer:   code,
          score:    data.evaluation.score,
          feedback: data.evaluation
        }])
        if (voiceEnabled) {
          speak(`You scored ${data.evaluation.score} out of 10. ${data.evaluation.verdict}.`)
        }
      }

      if (data.is_complete) {
        const endRes = await interviewAPI.end(session.id)
        setFinalReport(endRes.data)
        navigate('/results')
        return
      }

      setCurrentQuestion(data.next_question)
      setQNum(data.next_question_number)
      setPhase('answer')

    } catch { toast.error('Something went wrong') }
    finally  { setLoading(false) }
  }

  // ── End session ───────────────────────────────────────────────────
  const handleEnd = async () => {
    if (!window.confirm('End the interview now?')) return
    if (listening) stopListening()
    stopSpeaking()
    try {
      const res = await interviewAPI.end(session.id)
      setFinalReport(res.data)
      navigate('/results')
    } catch { toast.error('Error ending interview') }
  }

  if (!session || !currentQuestion) return null

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#f5f5f5', fontFamily: 'Inter, sans-serif', overflow: 'hidden'
    }}>

      {/* ── Topbar ── */}
      <div style={{
        height: 48, background: '#fff', borderBottom: '0.5px solid #e8e8e8',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, background: '#1a1a2e', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#fff', fontWeight: 700
          }}>B</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Byte</span>
          <div style={{ width: 1, height: 16, background: '#e8e8e8' }} />
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 5,
            background: diff.bg, color: diff.color,
            border: `0.5px solid ${diff.border}`
          }}>
            {config?.topic?.toUpperCase()} · {config?.difficulty}
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: totalQ }, (_, i) => (
            <div key={i} style={{
              height: 6, borderRadius: 3, transition: 'all 0.3s',
              width: i + 1 === qNum ? 22 : 6,
              background: i + 1 < qNum ? '#22c55e'
                        : i + 1 === qNum ? '#1a1a2e' : '#e0e0e0',
            }} />
          ))}
          <span style={{
            fontSize: 11, color: '#aaa', marginLeft: 6,
            fontFamily: 'JetBrains Mono, monospace'
          }}>{qNum}/{totalQ}</span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {supported && (
            <button onClick={() => {
              const next = !voiceEnabled
              setVoiceEnabled(next)
              if (!next) { stopSpeaking(); if (listening) stopListening() }
              else speak(currentQuestion)
            }} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
              border: `0.5px solid ${voiceEnabled ? '#bfdbfe' : '#e0e0e0'}`,
              background: voiceEnabled ? '#eff6ff' : '#f5f5f5',
              color: voiceEnabled ? '#1d4ed8' : '#888',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.15s'
            }}>
              {speaking ? '🔊' : voiceEnabled ? '🔈' : '🔇'}
              {voiceEnabled ? ' Voice on' : ' Voice off'}
            </button>
          )}
          <span style={{
            fontSize: 12, color: '#555', fontFamily: 'JetBrains Mono, monospace',
            background: '#f5f5f5', border: '0.5px solid #e0e0e0',
            borderRadius: 6, padding: '4px 10px'
          }}>{fmt(elapsed)}</span>
          <button onClick={handleEnd} style={{
            fontSize: 12, color: '#dc2626', background: '#fef2f2',
            border: '0.5px solid #fecaca', borderRadius: 6,
            padding: '5px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
          }}>End session</button>
        </div>
      </div>

      {/* ── Split panel ── */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
        overflow: 'hidden', gap: 1, background: '#e8e8e8'
      }}>

        {/* ── LEFT — Interviewer chat ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: '#fff', overflow: 'hidden'
        }}>

          {/* Chat header */}
          <div style={{
            padding: '10px 16px', borderBottom: '0.5px solid #e8e8e8',
            background: '#fafafa', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: '#1a1a2e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', fontWeight: 600
              }}>AI</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                  Byte Interviewer
                </div>
                <div style={{
                  fontSize: 11, color: '#22c55e',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#22c55e'
                  }} />
                  Live · {config?.topic} round
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 10,
                background: diff.bg, color: diff.color,
                border: `0.5px solid ${diff.border}`
              }}>Q{qNum} of {totalQ}</span>
              {speaking && (
                <span style={{
                  fontSize: 10, color: '#1d4ed8', background: '#eff6ff',
                  border: '0.5px solid #bfdbfe', borderRadius: 10, padding: '2px 8px'
                }}>🔊 Speaking...</span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {chat.map((msg, i) => (
              <div key={i} style={{
                marginBottom: 14,
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start', gap: 8
              }}>
                {msg.role === 'ai' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: '#1a1a2e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#fff', flexShrink: 0, marginTop: 2
                  }}>AI</div>
                )}
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  borderRadius: msg.role === 'user'
                    ? '12px 12px 4px 12px'
                    : '12px 12px 12px 4px',
                  background: msg.role === 'user'
                    ? '#1a1a2e'
                    : msg.type === 'question' ? '#fafafa' : '#fff',
                  border: msg.role === 'user' ? 'none' : '0.5px solid #e8e8e8',
                  color: msg.role === 'user' ? '#fff' : '#111',
                  fontSize: msg.type === 'question' ? 14 : 13,
                  fontWeight: msg.type === 'question' ? 600 : 400,
                  lineHeight: 1.6,
                }}>
                  {msg.type === 'question' && (
                    <div style={{
                      fontSize: 10, color: '#aaa', marginBottom: 6,
                      textTransform: 'uppercase', letterSpacing: '0.06em'
                    }}>Question {qNum}</div>
                  )}
                  {msg.text}
                  {msg.type === 'question' && voiceEnabled && (
                    <button
                      onClick={() => speaking ? stopSpeaking() : speak(msg.text)}
                      style={{
                        display: 'block', marginTop: 8, fontSize: 11,
                        color: '#1d4ed8', background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0
                      }}>
                      {speaking ? '⏹ Stop' : '▶ Read aloud'}
                    </button>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: '#e8e8e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#888', flexShrink: 0, marginTop: 2
                  }}>You</div>
                )}
              </div>
            ))}

            {/* AI typing indicator */}
            {aiTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: '#1a1a2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff'
                }}>AI</div>
                <div style={{
                  padding: '10px 14px', background: '#fafafa',
                  border: '0.5px solid #e8e8e8',
                  borderRadius: '12px 12px 12px 4px',
                  display: 'flex', gap: 4, alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#ccc',
                      animation: `typingBounce 0.8s ${i * 0.15}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Inline evaluation */}
            {showEval && evaluation && (
              <div style={{
                marginTop: 8, border: '0.5px solid #e8e8e8',
                borderRadius: 10, overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 14px', background: '#fafafa',
                  borderBottom: '0.5px solid #e8e8e8',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
                    Evaluation
                  </span>
                  <span style={{
                    fontSize: 20, fontWeight: 700,
                    color: evaluation.score >= 7 ? '#16a34a'
                         : evaluation.score >= 4 ? '#d97706' : '#dc2626'
                  }}>
                    {evaluation.score}
                    <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400 }}>/10</span>
                  </span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  {evaluation.strengths?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 500,
                        color: '#16a34a', marginBottom: 5
                      }}>Strengths</div>
                      {evaluation.strengths.map((s, i) => (
                        <div key={i} style={{
                          fontSize: 12, color: '#555', marginBottom: 3,
                          paddingLeft: 10, borderLeft: '2px solid #bbf7d0'
                        }}>{s}</div>
                      ))}
                    </div>
                  )}
                  {evaluation.improvements?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 500,
                        color: '#d97706', marginBottom: 5
                      }}>To improve</div>
                      {evaluation.improvements.map((s, i) => (
                        <div key={i} style={{
                          fontSize: 12, color: '#555', marginBottom: 3,
                          paddingLeft: 10, borderLeft: '2px solid #fde68a'
                        }}>{s}</div>
                      ))}
                    </div>
                  )}
                  {evaluation.time_complexity && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {[
                        { label: 'Time',  val: evaluation.time_complexity,  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                        { label: 'Space', val: evaluation.space_complexity, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                      ].map(c => (
                        <div key={c.label} style={{
                          flex: 1, background: c.bg,
                          border: `0.5px solid ${c.border}`,
                          borderRadius: 7, padding: '8px 12px'
                        }}>
                          <div style={{ fontSize: 10, color: c.color, opacity: 0.7 }}>
                            {c.label}
                          </div>
                          <div style={{
                            fontSize: 13, fontWeight: 600, color: c.color,
                            fontFamily: 'JetBrains Mono, monospace'
                          }}>{c.val}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Live transcript */}
          {listening && liveText && (
            <div style={{
              padding: '8px 16px', borderTop: '0.5px solid #e8e8e8',
              background: '#fffbeb', fontSize: 12, color: '#92400e',
              fontStyle: 'italic', maxHeight: 56, overflow: 'hidden', flexShrink: 0
            }}>
              "{liveText}"
            </div>
          )}
        </div>

        {/* ── RIGHT — Code editor ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: '#fff', overflow: 'hidden'
        }}>

          {/* Editor header */}
          <div style={{
            height: 42, background: '#fafafa', borderBottom: '0.5px solid #e8e8e8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 12, color: '#555',
                fontFamily: 'JetBrains Mono, monospace'
              }}>{language}</span>
              <span style={{ fontSize: 10, color: '#ccc' }}>·</span>
              <span style={{ fontSize: 11, color: '#aaa' }}>
                {templateLoading
                  ? '⏳ Generating template...'
                  : 'Talk while you code — AI is listening'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Reset template */}
              <button
                onClick={() => fetchTemplate(currentQuestion)}
                disabled={templateLoading}
                style={{
                  fontSize: 11, padding: '5px 10px', borderRadius: 6,
                  cursor: templateLoading ? 'not-allowed' : 'pointer',
                  border: '0.5px solid #e0e0e0', background: '#f5f5f5',
                  color: '#888', fontFamily: 'Inter, sans-serif'
                }}>
                ↺ Reset
              </button>

              {/* Mic button */}
              {supported && (
                <button onClick={handleMicToggle} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, padding: '5px 12px', borderRadius: 6,
                  cursor: 'pointer',
                  border: `0.5px solid ${listening ? '#fecaca' : '#e0e0e0'}`,
                  background: listening ? '#fef2f2' : '#f5f5f5',
                  color: listening ? '#dc2626' : '#555',
                  fontFamily: 'Inter, sans-serif', transition: 'all 0.15s'
                }}>
                  {listening ? (
                    <>
                      <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: 2, height: 10, background: '#dc2626', borderRadius: 1,
                            animation: `typingBounce 0.6s ${i * 0.1}s infinite`
                          }} />
                        ))}
                      </span>
                      Stop mic
                    </>
                  ) : '🎙 Speak'}
                </button>
              )}
            </div>
          </div>

          {/* Monaco editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {templateLoading ? (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
                background: '#fafafa'
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#1a1a2e',
                      animation: `typingBounce 0.8s ${i * 0.15}s infinite`
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: '#aaa' }}>
                  Generating starter template...
                </span>
              </div>
            ) : (
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
            )}
          </div>

          {/* Action bar */}
          <div style={{
            padding: '12px 16px', borderTop: '0.5px solid #e8e8e8',
            background: '#fafafa', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {avgScore && (
                <>
                  <span style={{ fontSize: 11, color: '#aaa' }}>
                    Last:{' '}
                    <span style={{
                      color: '#111', fontWeight: 600,
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {answers[answers.length - 1]?.score}/10
                    </span>
                  </span>
                  <div style={{ width: 1, height: 12, background: '#e0e0e0' }} />
                  <span style={{ fontSize: 11, color: '#aaa' }}>
                    Avg:{' '}
                    <span style={{
                      color: '#111', fontWeight: 600,
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {avgScore}
                    </span>
                  </span>
                </>
              )}
              {spokenLog && (
                <span style={{ fontSize: 11, color: '#22c55e' }}>
                  🎙 {spokenLog.split(' ').length} words spoken
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {showEval && (
                <button
                  onClick={() => { setShowEval(false); setEvaluation(null) }}
                  style={{
                    padding: '8px 16px', background: '#f0fdf4',
                    border: '0.5px solid #bbf7d0', borderRadius: 8,
                    fontSize: 13, fontWeight: 500, color: '#16a34a',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                  }}>
                  Next question →
                </button>
              )}
              {!showEval && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    padding: '8px 20px',
                    background: loading ? '#e8e8e8' : '#1a1a2e',
                    border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 600,
                    color: loading ? '#aaa' : '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s'
                  }}>
                  {loading ? 'Evaluating...' : 'Submit code →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 100% { transform: scaleY(0.5); opacity: 0.4; }
          50%       { transform: scaleY(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  )
}