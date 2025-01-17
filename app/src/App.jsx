import * as React from 'react';
import './App.css';
import { useState } from 'react'

import MeetingArranger from './components/MeetingArranger'
import TaskScheduler from './components/TaskScheduler'
import NotificationManager from './components/NotificationManager'
import EmailSummarizer from './components/EmailSummarizer'
import GmailEmails from './components/GmailEmails';

function App() {
  const [activeTab, setActiveTab] = useState('meeting')

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '2rem auto' }}>
      <h1 className="title"> TaskSage</h1>

      <nav style={{ marginBottom: '2rem' }}>
        <button onClick={() => setActiveTab('meeting')}>Arrange Meeting</button>
        <button onClick={() => setActiveTab('tasks')}>Task Scheduler</button>
        <button onClick={() => setActiveTab('summarizer')}>Email Summarizer</button>
        <button onClick={() => setActiveTab('notifications')}>Notifications</button>
        <button onClick={() => setActiveTab('gmail')}>Gmail Emails</button>
      </nav>

      {activeTab === 'meeting' && <MeetingArranger />}
      {activeTab === 'tasks' && <TaskScheduler />}
      {activeTab === 'summarizer' && <EmailSummarizer />}
      {activeTab === 'notifications' && <NotificationManager />}
      {activeTab === 'gmail' && <GmailEmails />}
    </div>
  )
}

export default App
