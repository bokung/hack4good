import * as React from 'react';
import './App.css';
import { useState } from 'react'

import MeetingArranger from './components/MeetingArranger'
import TaskScheduler from './components/TaskScheduler'
import NotificationManager from './components/NotificationManager'
import EmailSummarizer from './components/EmailSummarizer'

function App() {
  const [activeTab, setActiveTab] = useState<'meeting' | 'tasks' | 'summarizer' | 'notifications'>('meeting')

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '2rem auto' }}>
      <h1 className="title"> Digital PA System</h1>

      <div className="animated-bg"></div>
      <div className="animated-bg-rotating"></div>
      <div className="animated-bg-pulse"></div>
      <div className="starfield"></div>

      <div className="floating-shapes">
        <div className="shape shape1"></div>
        <div className="shape shape2"></div>
        <div className="shape shape3"></div>
        <div className="shape shape4"></div>
        <div className="shape shape5"></div>
      </div>

      <div className="confetti"></div>

      <nav style={{ marginBottom: '2rem' }}>
        <button onClick={() => setActiveTab('meeting')}>Arrange Meeting</button>
        <button onClick={() => setActiveTab('tasks')}>Task Scheduler</button>
        <button onClick={() => setActiveTab('summarizer')}>Email Summarizer</button>
        <button onClick={() => setActiveTab('notifications')}>Notifications</button>
      </nav>

      {activeTab === 'meeting' && <MeetingArranger />}
      {activeTab === 'tasks' && <TaskScheduler />}
      {activeTab === 'summarizer' && <EmailSummarizer />}
      {activeTab === 'notifications' && <NotificationManager />}
    </div>
  )
}

export default App
