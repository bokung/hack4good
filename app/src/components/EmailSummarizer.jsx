import * as React from 'react'
import { useState } from 'react'
import { generateSummary, parseMeetingRequest } from '../services/mockAi'

function EmailSummarizer({ accessToken }) {
  const [emailThread, setEmailThread] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

  /**
   * Helper to cleanly parse the GPT output:
   *   { Day: 17, Month: 1, Year: 2025, Time: 14:35, Task: "Take part in Codeforces Round 997" }
   * into a usable JS object. Returns null if {None} or if it doesn't match the expected format.
   */
  const transformToValidJson = (raw) => {
    if (!raw || raw.trim() === '{None}') {
      return null
    }

    // Strictly match the entire string for this pattern, e.g.:
    // { Day: 17, Month: 1, Year: 2025, Time: 14:35, Task: "Some text" }
    // We capture each group so we can parse them properly.
    const pattern = new RegExp(
      String.raw`^\{\s*Day:\s*(\d+)\s*,\s*Month:\s*(\d+)\s*,\s*Year:\s*(\d+)\s*,\s*Time:\s*([\d:]+)\s*,\s*Task:\s*"([^"]+)"\s*\}$`
    )
    const match = raw.trim().match(pattern)
    if (!match) {
      // If GPT returns something unexpected, we'll treat it as no valid meeting
      return null
    }

    // Example match groups:
    // 1=Day, 2=Month, 3=Year, 4=Time, 5=Task
    return {
      Day: parseInt(match[1], 10),
      Month: parseInt(match[2], 10),
      Year: parseInt(match[3], 10),
      Time: match[4],
      Task: match[5],
    }
  }

  /**
   * Fetch up to 10 inbox emails and attempt to schedule meetings,
   * then inform user how many were scheduled and when.
   */
  const handleAddMeetingsFromEmails = async () => {
    // Clear any prior message
    setMessage('')

    if (!accessToken) {
      setMessage('Please sign in with Google first to schedule on Calendar.')
      return
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
      )
      const listData = await listResponse.json()

      if (!listData.messages) {
        setMessage('No recent emails found.')
        return
      }

      const scheduledMeetings = []

      // 2) For each email, fetch details and parse date/time
      const emailPromises = listData.messages.map(async (message) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
        const detailData = await detailResponse.json()

        // Attempt to parse for a meeting request
        const body = extractFullEmailBody(detailData)
        const parseResult = await parseMeetingRequest(body)

        // Turn GPT output into a real JS object (or null)
        const parsedJson = transformToValidJson(parseResult)

        // If we get a valid JSON object, schedule the meeting
        if (parsedJson) {
          try {
            const startDateTime = buildDateTime(parsedJson)
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

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
            }

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
            )

            if (!response.ok) {
              const errorDetails = await response.json()
              throw new Error(
                `Calendar API error: ${response.status} - ${errorDetails.error.message}`
              )
            }

            scheduledMeetings.push(
              `Scheduled meeting for ${startDateTime.toLocaleString()} (Task: "${
                parsedJson.Task || 'N/A'
              }")`
            )
          } catch (err) {
            console.error('Error scheduling meeting:', err)
          }
        }
      })

      await Promise.all(emailPromises)

      if (scheduledMeetings.length > 0) {
        setMessage(
          `Scheduled ${scheduledMeetings.length} meeting(s):\n\n${scheduledMeetings.join('\n')}`
        )
      } else {
        setMessage('No valid meeting requests found.')
      }
    } catch (err) {
      console.error('Error processing emails for meetings:', err)
      setMessage('Failed to process emails for meeting scheduling.')
    }
  }

  // Helper to decode the full email body
  const extractFullEmailBody = (detailData) => {
    const decodeBase64 = (str) =>
      decodeURIComponent(
        atob(str.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          })
          .join('')
      )

    if (!detailData.payload) {
      return detailData.snippet || '(No content)'
    }

    const parts = detailData.payload.parts
    if (parts && parts.length > 0) {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return decodeBase64(part.body.data)
        }
        if (part.parts && part.parts.length > 0) {
          for (const nestedPart of part.parts) {
            if (
              nestedPart.mimeType === 'text/plain' &&
              nestedPart.body &&
              nestedPart.body.data
            ) {
              return decodeBase64(nestedPart.body.data)
            }
          }
        }
      }
    }

    if (detailData.payload.body && detailData.payload.body.data) {
      return decodeBase64(detailData.payload.body.data)
    }

    return detailData.snippet || '(No content)'
  }

  /**
   * Convert the parsed JSON into a JS Date
   */
  const buildDateTime = (parsedJson) => {
    // Example: { Day: 19, Month: 1, Year: 2024, Time: "20:10", Task: "Buy some books" }
    // If no time is given, default to 09:00
    let [hours, minutes] = [9, 0]
    if (parsedJson.Time) {
      const [hh, mm] = parsedJson.Time.split(':')
      hours = parseInt(hh, 10)
      minutes = parseInt(mm, 10)
    }
    return new Date(
      parsedJson.Year,
      parsedJson.Month - 1, // JS months start at 0
      parsedJson.Day,
      hours,
      minutes
    )
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

        {/* New Button: Add Meetings from Emails */}
        <button
          onClick={handleAddMeetingsFromEmails}
          style={{ marginLeft: '1rem' }}
        >
          Add Meetings from Emails
        </button>
      </div>

      {summary && (
        <div style={{ marginTop: '1rem', backgroundColor: '#f1f1f1', padding: '1rem' }}>
          <strong>Summary:</strong>
          <p>{summary}</p>
        </div>
      )}

      {message && (
        <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', color: 'green' }}>
          {message}
        </p>
      )}
    </div>
  )
}

export default EmailSummarizer
