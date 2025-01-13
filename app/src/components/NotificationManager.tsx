import * as React from 'react'
import { useState } from 'react'

function NotificationManager() {
  const [reminders, setReminders] = useState<string[]>([])
  const [newReminder, setNewReminder] = useState('')

  const addReminder = () => {
    if (!newReminder) return
    setReminders([...reminders, newReminder])
    setNewReminder('')
  }

  // In a real system, these notifications might be scheduled server-side or integrated with a push notification service.
  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem' }}>
      <h2>Reminders & Notifications</h2>
      <div>
        <label>Add a Reminder:</label><br />
        <input
          type="text"
          value={newReminder}
          onChange={e => setNewReminder(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <button onClick={addReminder}>Add Reminder</button>

      <h3>Active Reminders</h3>
      <ul>
        {reminders.map((reminder, index) => (
          <li key={index}>{reminder}</li>
        ))}
      </ul>
    </div>
  )
}

export default NotificationManager
