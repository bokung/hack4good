import * as React from 'react';
import './App.css';
import { useState } from 'react'

import MeetingArranger from './components/MeetingArranger'
import TaskScheduler from './components/TaskScheduler'
import NotificationManager from './components/NotificationManager'
import GmailEmails from './components/GmailEmails';

function App() {
  const [activeTab, setActiveTab] = useState('meeting')

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '2rem auto' }}>
      <h1 className="title"> TaskSage</h1>

      <nav style={{ marginBottom: '2rem' }}>
        <button onClick={() => setActiveTab('meeting')}>Arrange Meeting</button>
        <button onClick={() => setActiveTab('tasks')}>Task Scheduler</button>
        <button onClick={() => setActiveTab('gmail')}>Gmail Summarizer</button>
        <button onClick={() => setActiveTab('notifications')}>Notifications</button>
      </nav>

      {activeTab === 'meeting' && <MeetingArranger />}
      {activeTab === 'tasks' && <TaskScheduler />}
      {activeTab === 'gmail' && <GmailEmails />}
      {activeTab === 'notifications' && <NotificationManager />}
    </div>
  )
}

export default App
