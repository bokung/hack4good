import * as React from 'react'
import { useState } from 'react'

function MeetingArranger() {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [participants, setParticipants] = useState('')
  const [message, setMessage] = useState('')

  const handleSchedule = () => {
    const details = {
      title,
      date,
      participants: participants.split(',').map(p => p.trim()),
    }
    // In a real app, you'd call a backend service here (e.g., Google Calendar API).
    setMessage(`Meeting scheduled: ${JSON.stringify(details)}`)
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem' }}>
      <h2>Arrange a Meeting</h2>
      <div>
        <label>Meeting Title:</label><br/>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Budget Sync Up"
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Date/Time:</label><br/>
        <input
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Participants (comma-separated emails):</label><br/>
        <input
          type="text"
          value={participants}
          onChange={e => setParticipants(e.target.value)}
          placeholder="alice@example.com, bob@example.com"
          style={{ width: '100%' }}
        />
      </div>
      <button onClick={handleSchedule}>Schedule Meeting</button>

      {message && <p style={{ marginTop: '1rem', color: 'green' }}>{message}</p>}
    </div>
  )
}

export default MeetingArranger
