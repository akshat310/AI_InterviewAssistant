import { createContext, useContext, useState } from 'react'

const InterviewContext = createContext(null)

export function InterviewProvider({ children }) {
  const [session,         setSession]         = useState(null)
  const [config,          setConfig]          = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [answers,         setAnswers]         = useState([])
  const [finalReport,     setFinalReport]     = useState(null)
  const [phase,           setPhase]           = useState('answer')

  const resetInterview = () => {
    setSession(null); setConfig(null)
    setCurrentQuestion(null); setAnswers([])
    setFinalReport(null); setPhase('answer')
  }

  return (
    <InterviewContext.Provider value={{
      session, setSession, config, setConfig,
      currentQuestion, setCurrentQuestion,
      answers, setAnswers, finalReport, setFinalReport,
      phase, setPhase, resetInterview
    }}>
      {children}
    </InterviewContext.Provider>
  )
}

export const useInterview = () => useContext(InterviewContext)