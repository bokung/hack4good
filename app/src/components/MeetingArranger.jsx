import * as React from 'react';
import { useState } from 'react';

/**
 * Meeting Arranger now integrates with Google Calendar.
 * Updated to align with the latest Google Calendar API requirements.
 */
function MeetingArranger({ accessToken }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [participants, setParticipants] = useState('');
  const [message, setMessage] = useState('');

  const handleSchedule = async () => {
    const details = {
      title,
      date,
      participants: participants.split(',').map((p) => p.trim()),
    };

    setMessage(`Attempting to schedule meeting: ${JSON.stringify(details)}`);

    if (!accessToken) {
      setMessage('Please sign in with Google first to schedule on Calendar.');
      return;
    }

    try {
      const startDateTime = new Date(date);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const eventBody = {
        summary: title,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: details.participants
          .filter((email) => email.includes('@'))
          .map((email) => ({
            email,
          })),
      };

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

      setMessage('Meeting scheduled on Google Calendar successfully!');
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      setMessage(`Failed to schedule on Google Calendar: ${error.message}`);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem' }}>
      <h2>Arrange a Meeting</h2>
      <div>
        <label>Meeting Title:</label>
        <br />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Budget Sync Up"
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Date/Time:</label>
        <br />
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Participants (comma-separated emails):</label>
        <br />
        <input
          type="text"
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
          placeholder="alice@example.com, bob@example.com"
          style={{ width: '100%' }}
        />
      </div>
      <button onClick={handleSchedule}>
        Schedule Meeting
      </button>

      {message && (
        <p style={{ marginTop: '1rem', color: 'green' }}>{message}</p>
      )}
    </div>
  );
}

export default MeetingArranger;
