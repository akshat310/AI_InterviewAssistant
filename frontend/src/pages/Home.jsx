import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInterview } from '../context/InterviewContext'
import { interviewAPI } from '../services/api'
import toast from 'react-hot-toast'

const TOPICS = [
  { id: 'dsa',           label: 'DSA',              tag: 'Technical',  desc: 'Arrays · Trees · DP · Graphs',       coding: true  },
  { id: 'os',            label: 'Operating Systems', tag: 'Technical',  desc: 'Processes · Memory · Scheduling',    coding: false },
  { id: 'dbms',          label: 'DBMS',              tag: 'Technical',  desc: 'SQL · Normalization · Transactions', coding: false },
  { id: 'cn',            label: 'Networks',          tag: 'Technical',  desc: 'TCP/IP · HTTP · DNS · OSI',         coding: false },
  { id: 'system_design', label: 'System Design',     tag: 'Design',     desc: 'Scalability · Architecture',        coding: false },
  { id: 'python',        label: 'Python',            tag: 'Language',   desc: 'OOP · Async · Internals',           coding: true  },
  { id: 'java',          label: 'Java',              tag: 'Language',   desc: 'JVM · Collections · Concurrency',   coding: true  },
  { id: 'cpp',           label: 'C++',               tag: 'Language',   desc: 'Memory · STL · Templates',          coding: true  },
  { id: 'hr',            label: 'HR / Behavioral',   tag: 'Behavioral', desc: 'STAR · Leadership · Conflict',      coding: false },
]

const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   desc: 'Fresher / Intern',  border: '#86efac', bg: '#f0fdf4', text: '#166534' },
  { id: 'medium', label: 'Medium', desc: '1–3 years exp',     border: '#fcd34d', bg: '#fffbeb', text: '#92400e' },
  { id: 'hard',   label: 'Hard',   desc: 'Senior / FAANG',    border: '#fca5a5', bg: '#fef2f2', text: '#991b1b' },
  { id: 'mixed',  label: 'Mixed',  desc: 'Adaptive AI',       border: '#c4b5fd', bg: '#f5f3ff', text: '#5b21b6' },
]

const CODING_LANGUAGES = ['Python', 'Java', 'C++', 'JavaScript', 'Go', 'Rust']

const TAG_STYLES = {
  Technical:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Design:     { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  Language:   { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' },
  Behavioral: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
}

const getInterviewType = (id) => {
  if (['dsa','os','dbms','cn'].includes(id)) return 'technical'
  if (['python','java','cpp'].includes(id))  return 'language'
  if (id === 'system_design')                return 'system_design'
  return 'hr'
}

const S = {
  page:    { minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Inter, sans-serif' },
  nav:     { height: 52, background: '#fff', borderBottom: '0.5px solid #e8e8e8',
             display: 'flex', alignItems: 'center', justifyContent: 'space-between',
             padding: '0 32px', position: 'sticky', top: 0, zIndex: 50 },
  logo:    { display: 'flex', alignItems: 'center', gap: 8 },
  mark:    { width: 28, height: 28, background: '#1a1a2e', borderRadius: 8,
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: 'Inter, sans-serif' },
  card:    { background: '#fff', border: '0.5px solid #e8e8e8', borderRadius: 10, overflow: 'hidden' },
  section: { padding: '22px 28px', borderBottom: '0.5px solid #e8e8e8' },
  label:   { fontSize: 11, color: '#aaa', textTransform: 'uppercase',
             letterSpacing: '0.07em', display: 'block', marginBottom: 12 },
  input:   { width: '100%', background: '#fafafa', border: '0.5px solid #e0e0e0',
             borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#111',
             outline: 'none', fontFamily: 'Inter, sans-serif' },
}

export default function Home() {
  const navigate = useNavigate()
  const { setSession, setConfig, setCurrentQuestion, setPhase } = useInterview()

  const [userName,       setUserName]       = useState('')
  const [selectedTopic,  setSelectedTopic]  = useState(null)
  const [difficulty,     setDifficulty]     = useState('medium')
  const [codingLang,     setCodingLang]     = useState('Python')
  const [totalQuestions, setTotalQuestions] = useState(5)
  const [loading,        setLoading]        = useState(false)

  const topic    = TOPICS.find(t => t.id === selectedTopic)
  const isCoding = topic?.coding ?? false

  const handleStart = async () => {
    if (!selectedTopic)   return toast.error('Select a topic first')
    if (!userName.trim()) return toast.error('Enter your name')
    setLoading(true)
    try {
      const res = await interviewAPI.start({
        topic:           selectedTopic,
        difficulty,
        interview_type:  getInterviewType(selectedTopic),
        total_questions: totalQuestions,
        user_name:       userName.trim(),
        language:        isCoding ? codingLang : null,
        coding_round:    isCoding,
      })
      const data = res.data
      setSession({ id: data.session_id, ...data })
      setConfig({ topic: selectedTopic, difficulty, totalQuestions,
                  userName: userName.trim(), language: isCoding ? codingLang : null,
                  codingRound: isCoding })
      setCurrentQuestion(data.question)
      setPhase(data.phase || 'answer')
      navigate('/interview')
    } catch {
      toast.error('Could not connect to backend. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.logo}>
          <div style={S.mark}>B</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111', letterSpacing: '-0.3px' }}>Byte</span>
        </div>
        <div style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          Gemini 2.5 Flash
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px 32px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', fontSize: 11, color: '#5b21b6', background: '#f5f3ff',
                      border: '0.5px solid #ddd6fe', borderRadius: 20, padding: '5px 14px',
                      marginBottom: 20, letterSpacing: '0.04em' }}>
          AI-powered mock interviews
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#111', lineHeight: 1.2,
                     letterSpacing: '-0.5px', marginBottom: 12 }}>
          Practice interviews<br />
          <span style={{ color: '#1a1a2e' }}>that feel real</span>
        </h1>
        <p style={{ fontSize: 15, color: '#888', maxWidth: 400, margin: '0 auto 40px',lineHeight: 1.6 }}>
          AI-generated questions across DSA, System Design, HR, and more. Instant feedback on every answer.
        </p>
      </div>

      {/* Config card */}
      <div style={{ maxWidth: 640, margin: '0 auto 80px', padding: '0 20px' }}>
        <div style={S.card}>

          {/* Name */}
          <div style={S.section}>
            <label style={S.label}>Your name</label>
            <input style={S.input} value={userName} onChange={e => setUserName(e.target.value)}
              placeholder="e.g. Aksha" onKeyDown={e => e.key === 'Enter' && handleStart()} />
          </div>

          {/* Topic */}
          <div style={S.section}>
            <label style={S.label}>Topic</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {TOPICS.map(t => {
                const ts     = TAG_STYLES[t.tag]
                const active = selectedTopic === t.id
                return (
                  <button key={t.id} onClick={() => setSelectedTopic(t.id)} style={{
                    background: active ? '#f8f8ff' : '#fafafa',
                    border: `0.5px solid ${active ? '#1a1a2e' : '#e8e8e8'}`,
                    borderRadius: 8, padding: '11px 13px', textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.12s',
                    outline: active ? '2px solid #1a1a2e20' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: active ? '#1a1a2e' : '#333' }}>
                        {t.label}
                      </span>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                     background: ts.bg, color: ts.color, border: `0.5px solid ${ts.border}`,
                                     whiteSpace: 'nowrap' }}>
                        {t.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.4 }}>{t.desc}</div>
                    {t.coding && (
                      <div style={{ marginTop: 6, fontSize: 10, color: '#5b21b6',
                                    background: '#f5f3ff', borderRadius: 4,
                                    padding: '2px 6px', display: 'inline-block' }}>
                        coding round
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div style={S.section}>
            <label style={S.label}>Difficulty</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {DIFFICULTIES.map(d => {
                const active = difficulty === d.id
                return (
                  <button key={d.id} onClick={() => setDifficulty(d.id)} style={{
                    padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    border: `0.5px solid ${active ? d.border : '#e8e8e8'}`,
                    background: active ? d.bg : '#fafafa',
                    transition: 'all 0.12s',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500,
                                  color: active ? d.text : '#555' }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: active ? d.text + 'aa' : '#aaa',
                                  marginTop: 2 }}>{d.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Coding language */}
          {isCoding && (
            <div style={{ ...S.section, background: '#fafafa' }}>
              <label style={S.label}>
                Coding language
                <span style={{ marginLeft: 8, color: '#5b21b6', textTransform: 'none',
                               letterSpacing: 0, fontSize: 11 }}>· coding round enabled</span>
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CODING_LANGUAGES.map(lang => {
                  const active = codingLang === lang
                  return (
                    <button key={lang} onClick={() => setCodingLang(lang)} style={{
                      padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
                      fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                      border: `0.5px solid ${active ? '#1a1a2e' : '#e0e0e0'}`,
                      background: active ? '#1a1a2e' : '#fff',
                      color: active ? '#fff' : '#555',
                      transition: 'all 0.12s',
                    }}>
                      {lang}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Questions count */}
          <div style={S.section}>
            <label style={S.label}>
              Number of questions —
              <span style={{ color: '#1a1a2e', fontWeight: 600, marginLeft: 4,
                             fontFamily: 'JetBrains Mono, monospace' }}>{totalQuestions}</span>
            </label>
            <input type="range" min={3} max={10} step={1} value={totalQuestions}
              onChange={e => setTotalQuestions(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#1a1a2e', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          fontSize: 11, color: '#aaa', marginTop: 6 }}>
              <span>3 — Quick round</span>
              <span>10 — Full round</span>
            </div>
          </div>

          {/* CTA */}
          <div style={{ padding: '20px 28px' }}>
            <button onClick={handleStart}
              disabled={loading || !selectedTopic || !userName.trim()}
              style={{ width: '100%', padding: '13px', borderRadius: 8, border: 'none',
                       background: loading || !selectedTopic || !userName.trim() ? '#e8e8e8' : '#1a1a2e',
                       color: loading || !selectedTopic || !userName.trim() ? '#aaa' : '#fff',
                       fontSize: 14, fontWeight: 600, cursor: 'pointer',
                       fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                       letterSpacing: '-0.1px' }}>
              {loading ? 'Starting...' : 'Start Interview →'}
            </button>
            {(!selectedTopic || !userName.trim()) && (
              <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 10 }}>
                {!userName.trim() ? 'Enter your name to continue' : 'Select a topic to continue'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}