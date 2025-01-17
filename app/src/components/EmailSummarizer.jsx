import * as React from 'react'
import { useState } from 'react'
import { generateSummary } from '../services/mockAi'

function EmailSummarizer({ accessToken }) {
  const [emailThread, setEmailThread] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSummarize = async () => {
    setLoading(true)
    setSummary('')
    try {
      const result = await generateSummary(emailThread)
      setSummary(result)
    } catch (error) {
      console.error(error)
      setSummary('Failed to generate summary.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem' }}>
      <h2>Email Summarizer</h2>
      <textarea
        rows={6}
        style={{ width: '100%', marginBottom: '1rem' }}
        value={emailThread}
        onChange={e => setEmailThread(e.target.value)}
        placeholder="Paste your email thread here..."
      />
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={handleSummarize} disabled={!emailThread || loading}>
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>
      </div>

      {summary && (
        <div style={{ marginTop: '1rem', backgroundColor: '#f1f1f1', padding: '1rem' }}>
          <strong>Summary:</strong>
          <p>{summary}</p>
        </div>
      )}
    </div>
  )
}

export default EmailSummarizer
