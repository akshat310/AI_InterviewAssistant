import { useNavigate } from 'react-router-dom'
import { Brain } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-dark-600 bg-dark-900/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-bold text-white">InterviewAI</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Powered by Gemini 2.5
        </div>
      </div>
    </nav>
  )
}