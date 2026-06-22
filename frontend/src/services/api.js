import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

export const interviewAPI = {
  start:       (data)      => api.post('/interview/start', data),
  submitAnswer:(data)      => api.post('/interview/answer', data),
  end:         (sessionId) => api.post('/interview/end', { session_id: sessionId }),
  getTopics:   ()          => api.get('/interview/topics'),
  getTemplate: (data)      => api.post('/interview/template', data),
  chat:        (data)      => api.post('/interview/chat', data),
}

export default api