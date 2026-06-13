import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { InterviewProvider } from './context/InterviewContext'
import Home          from './pages/Home'
import InterviewPage from './pages/InterviewPage'
import ResultsPage   from './pages/ResultsPage'

export default function App() {
  return (
    <BrowserRouter>
      <InterviewProvider>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#fff', color: '#111', border: '0.5px solid #e8e8e8',
                   fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
        }} />
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/results"   element={<ResultsPage />} />
        </Routes>
      </InterviewProvider>
    </BrowserRouter>
  )
}