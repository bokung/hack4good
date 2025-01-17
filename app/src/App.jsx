import * as React from 'react';
import './App.css';
import { useState, useEffect } from 'react';

import MeetingArranger from './components/MeetingArranger';
import TaskScheduler from './components/TaskScheduler';
import NotificationManager from './components/NotificationManager';
import GmailEmails from './components/GmailEmails';
import EmailSummarizer from './components/EmailSummarizer';

/**
 * Main Application Component
 */
function App() {
  const [activeTab, setActiveTab] = useState('meeting');

  // ---------- Shared Google OAuth State ----------
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);

  // On mount, load the Google script & attempt to read token from cookie
  useEffect(() => {
    const tokenCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('accessToken='));

    if (tokenCookie) {
      const tokenValue = tokenCookie.split('=')[1];
      if (tokenValue) {
        setAccessToken(tokenValue);
      }
    }

    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleClient;
      document.body.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  /**
   * Initialize Google Client
   */
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const initializeGoogleClient = () => {
    // Initialize the token client
    window.google?.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events',
      callback: (response) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          storeTokenInCookie(response.access_token);
        }
      },
    });
  };

  // Helper: Store token in a cookie for 1 day
  const storeTokenInCookie = (token) => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 1); // 1-day expiration
    document.cookie = `accessToken=${token}; expires=${expirationDate.toUTCString()}; path=/`;
  };

  // Helper: Clear the token cookie
  const clearTokenCookie = () => {
    document.cookie = `accessToken=; expires=${new Date(0).toUTCString()}; path=/`;
  };

  // ---------- Sign In / Sign Out Logic ----------
  const handleSignIn = () => {
    if (window.google?.accounts.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events',
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            storeTokenInCookie(response.access_token);
          }
        },
      });
      tokenClient.requestAccessToken();
    } else {
      setError('Google Identity Services not loaded');
    }
  };

  const handleSignOut = () => {
    if (window.google?.accounts.oauth2 && accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        clearTokenCookie();
      });
    } else {
      // Fallback if nothing to revoke
      setAccessToken(null);
      clearTokenCookie();
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '2rem auto' }}>
      <h1 className="title">TaskSage</h1>

      {/* GLOBAL AUTH CONTROLS (moved out of GmailEmails) */}
      <div style={{ marginBottom: '1rem' }}>
        {error && (
          <p style={{ color: 'red', marginBottom: '1rem' }}>
            Error: {error}
          </p>
        )}
        {!accessToken && (
          <button onClick={handleSignIn} style={{ marginRight: '1rem' }}>
            Sign In with Google
          </button>
        )}
        {accessToken && (
          <button onClick={handleSignOut} style={{ marginRight: '1rem' }}>
            Sign Out
          </button>
        )}
      </div>

      <nav style={{ marginBottom: '2rem' }}>
        <button onClick={() => setActiveTab('meeting')}>
          Arrange Meeting
        </button>
        <button onClick={() => setActiveTab('tasks')}>
          Task Scheduler
        </button>
        <button onClick={() => setActiveTab('gmail')}>
          Gmail Summarizer
        </button>
        <button onClick={() => setActiveTab('emailsummarizer')}>
          Email Summarizer
        </button>
        <button onClick={() => setActiveTab('notifications')}>
          Notifications
        </button>
      </nav>

      {activeTab === 'meeting' && (
        <MeetingArranger accessToken={accessToken} />
      )}
      {activeTab === 'tasks' && <TaskScheduler />}
      {activeTab === 'gmail' && <GmailEmails accessToken={accessToken} />}
      {activeTab === 'emailsummarizer' && <EmailSummarizer accessToken={accessToken} />}
      {activeTab === 'notifications' && <NotificationManager />}
    </div>
  );
}

export default App;
