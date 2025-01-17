import * as React from 'react';
import './App.css';
import { useState, useEffect } from 'react';

import MeetingArranger from './components/MeetingArranger';
import TaskScheduler from './components/TaskScheduler';
import NotificationManager from './components/NotificationManager';
import GmailEmails from './components/GmailEmails';
import EmailSummarizer from './components/EmailSummarizer'; // We'll keep the import if we still want to show it internally, but the tab is removed.

import { parseMeetingRequest } from './services/mockAi';

function App() {
  const [activeTab, setActiveTab] = useState('meeting');

  // ---------- Shared Google OAuth State ----------
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);

  // For "Add Meetings from Emails" status message
  const [addMeetingsMessage, setAddMeetingsMessage] = useState('');

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

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  /**
   * Initialize Google Client
   */
  const initializeGoogleClient = () => {
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
      setAccessToken(null);
      clearTokenCookie();
    }
  };

  /**
   * Below is the logic that was previously in EmailSummarizer for adding meetings from emails.
   * We have relocated it here, along with helper methods.
   */

  const transformToValidJson = (raw) => {
    if (!raw || raw.trim() === '{None}') {
      return null;
    }

    const pattern = new RegExp(
      String.raw`^\{\s*Day:\s*(\d+)\s*,\s*Month:\s*(\d+)\s*,\s*Year:\s*(\d+)\s*,\s*Time:\s*([\d:]+)\s*,\s*Task:\s*"([^"]+)"\s*\}$`
    );
    const match = raw.trim().match(pattern);
    if (!match) {
      return null;
    }

    return {
      Day: parseInt(match[1], 10),
      Month: parseInt(match[2], 10),
      Year: parseInt(match[3], 10),
      Time: match[4],
      Task: match[5],
    };
  };

  const buildDateTime = (parsedJson) => {
    let [hours, minutes] = [9, 0];
    if (parsedJson.Time) {
      const [hh, mm] = parsedJson.Time.split(':');
      hours = parseInt(hh, 10);
      minutes = parseInt(mm, 10);
    }
    return new Date(
      parsedJson.Year,
      parsedJson.Month - 1,
      parsedJson.Day,
      hours,
      minutes
    );
  };

  const extractFullEmailBody = (detailData) => {
    const decodeBase64 = (str) =>
      decodeURIComponent(
        atob(str.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

    if (!detailData.payload) {
      return detailData.snippet || '(No content)';
    }

    const parts = detailData.payload.parts;
    if (parts && parts.length > 0) {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return decodeBase64(part.body.data);
        }
        if (part.parts && part.parts.length > 0) {
          for (const nestedPart of part.parts) {
            if (
              nestedPart.mimeType === 'text/plain' &&
              nestedPart.body &&
              nestedPart.body.data
            ) {
              return decodeBase64(nestedPart.body.data);
            }
          }
        }
      }
    }

    if (detailData.payload.body && detailData.payload.body.data) {
      return decodeBase64(detailData.payload.body.data);
    }

    return detailData.snippet || '(No content)';
  };

  const handleAddMeetingsFromEmails = async () => {
    setAddMeetingsMessage('');

    if (!accessToken) {
      setAddMeetingsMessage('Please sign in with Google first to schedule on Calendar.');
      return;
    }

    try {
      // 1) Fetch up to 10 emails from Gmail
      const listResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const listData = await listResponse.json();

      if (!listData.messages) {
        setAddMeetingsMessage('No recent emails found.');
        return;
      }

      const scheduledMeetings = [];

      // 2) For each email, fetch details and parse date/time
      const emailPromises = listData.messages.map(async (msg) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        const detailData = await detailResponse.json();

        // Attempt to parse for a meeting request
        const body = extractFullEmailBody(detailData);
        const parseResult = await parseMeetingRequest(body);
        const parsedJson = transformToValidJson(parseResult);

        // If we get a valid JSON object, schedule the meeting
        if (parsedJson) {
          try {
            const startDateTime = buildDateTime(parsedJson);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

            const eventBody = {
              summary: parsedJson.Task || 'Meeting Request',
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              attendees: [],
            };

            // Write to Google Calendar
            const response = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventBody),
              }
            );

            if (!response.ok) {
              const errorDetails = await response.json();
              throw new Error(
                `Calendar API error: ${response.status} - ${errorDetails.error.message}`
              );
            }

            scheduledMeetings.push(
              `Scheduled meeting for ${startDateTime.toLocaleString()} (Task: "${
                parsedJson.Task || 'N/A'
              }")`
            );
          } catch (err) {
            console.error('Error scheduling meeting:', err);
          }
        }
      });

      await Promise.all(emailPromises);

      if (scheduledMeetings.length > 0) {
        setAddMeetingsMessage(
          `Scheduled ${scheduledMeetings.length} meeting(s):\n\n${scheduledMeetings.join('\n')}`
        );
      } else {
        setAddMeetingsMessage('No valid meeting requests found.');
      }
    } catch (err) {
      console.error('Error processing emails for meetings:', err);
      setAddMeetingsMessage('Failed to process emails for meeting scheduling.');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '2rem auto' }}>
      <h1 className="title">TaskSage</h1>

      {/* GLOBAL AUTH CONTROLS */}
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

        {/* New Button: Add Meetings from Emails (now in main screen) */}
        {accessToken && (
          <button onClick={handleAddMeetingsFromEmails} style={{ marginRight: '1rem' }}>
            Add Meetings from Emails
          </button>
        )}

        {/* Show the status message after attempting to add meetings */}
        {addMeetingsMessage && (
          <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', color: 'green' }}>
            {addMeetingsMessage}
          </p>
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
        {/* REMOVED the 'EmailSummarizer' tab button */}
        <button onClick={() => setActiveTab('notifications')}>
          Notifications
        </button>
      </nav>

      {activeTab === 'meeting' && (
        <MeetingArranger accessToken={accessToken} />
      )}
      {activeTab === 'tasks' && <TaskScheduler />}
      {activeTab === 'gmail' && <GmailEmails accessToken={accessToken} />}
      {/* REMOVED the EmailSummarizer route:
          {activeTab === 'emailsummarizer' && <EmailSummarizer accessToken={accessToken} />} */}

      {activeTab === 'notifications' && <NotificationManager />}
    </div>
  );
}

export default App;
