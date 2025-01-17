import React, { useState, useEffect } from 'react';
import { generateSummary } from '../services/mockAi';
import { decode } from 'js-base64';

// The sign-in/out logic and the Google script loading
// have been moved into App.jsx. Now we just consume
// the `accessToken` passed in as a prop.

function extractFullEmailBody(detailData) {
  if (!detailData.payload) {
    return detailData.snippet || '(No content)';
  }

  const parts = detailData.payload.parts;
  if (parts && parts.length > 0) {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decode(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
      if (part.parts && part.parts.length > 0) {
        for (const nestedPart of part.parts) {
          if (
            nestedPart.mimeType === 'text/plain' &&
            nestedPart.body &&
            nestedPart.body.data
          ) {
            return decode(
              nestedPart.body.data.replace(/-/g, '+').replace(/_/g, '/')
            );
          }
        }
      }
    }
  }

  if (detailData.payload.body && detailData.payload.body.data) {
    return decode(
      detailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')
    );
  }

  return detailData.snippet || '(No content)';
}

const GmailEmails = ({ accessToken }) => {
  const [emails, setEmails] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState([]);

  // If user is signed in, fetch emails on mount
  useEffect(() => {
    if (accessToken) {
      fetchEmails(accessToken);
    }
  }, [accessToken]);

  // Fetch up to 10 (or 100) inbox emails
  const fetchEmails = async (token) => {
    setError(null);
    try {
      const listResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const listData = await listResponse.json();

      if (!listData.messages) {
        setEmails([]);
        setExpanded([]);
        return;
      }

      const emailPromises = listData.messages.map(async (message) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const detailData = await detailResponse.json();
        return {
          snippet: detailData.snippet || '(No snippet)',
          internalDate: parseInt(detailData.internalDate, 10) || 0,
          body: extractFullEmailBody(detailData),
        };
      });

      const emailDetails = await Promise.all(emailPromises);
      const sortedEmails = emailDetails.sort(
        (a, b) => b.internalDate - a.internalDate
      );

      setEmails(sortedEmails);
      setSummaries([]);
      setExpanded(Array(sortedEmails.length).fill(false));
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails.');
    }
  };

  // Re-fetch emails
  const refreshEmails = () => {
    if (accessToken) {
      fetchEmails(accessToken);
    }
  };

  // Summarize each email
  const handleSummaries = async () => {
    setLoadingSummaries(true);
    setSummaries([]);
    const newSummaries = [];

    for (const emailObj of emails) {
      try {
        const summary = await generateSummary(emailObj.body);
        newSummaries.push(summary);
      } catch (err) {
        console.error('Error summarizing snippet:', err);
        newSummaries.push('Failed to summarize.');
      }
    }

    setSummaries(newSummaries);
    setLoadingSummaries(false);
  };

  // Toggle expanded/collapsed state for a given email
  const handleToggle = (index) => {
    setExpanded((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Show a message if not signed in
  if (!accessToken) {
    return (
      <div style={{ border: '1px solid #ddd', padding: '1rem', marginTop: '1rem' }}>
        <h2>Gmail Account Integration</h2>
        <p>Please sign in to see your latest emails.</p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', marginTop: '1rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
        Gmail Account Integration (Latest Emails in Your Inbox)
      </h2>

      {error && (
        <p style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
        </p>
      )}

      <div style={{ margin: '1rem 0' }}>
        <button onClick={refreshEmails} style={{ marginRight: '1rem' }}>
          Refresh Emails
        </button>
      </div>

      {emails.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={handleSummaries}
            disabled={loadingSummaries}
            style={{ marginRight: '1rem' }}
          >
            {loadingSummaries ? 'Summarizing...' : 'Summarize All Emails'}
          </button>
        </div>
      )}

      {emails.length > 0 ? (
        <div>
          <h3 style={{ marginBottom: '0.5rem' }}>
            Showing {emails.length} Email{emails.length === 1 ? '' : 's'}
          </h3>
          <ul style={{ paddingLeft: '1rem', marginBottom: '1rem' }}>
            {emails.map((emailObj, i) => (
              <li
                key={i}
                style={{
                  borderBottom: '1px solid #ccc',
                  marginBottom: '0.5rem',
                  padding: '0.5rem 0',
                }}
              >
                <strong>Email {i + 1} (Snippet):</strong> {emailObj.snippet}
                <div style={{ marginTop: '0.5rem' }}>
                  <button onClick={() => handleToggle(i)}>
                    {expanded[i] ? 'Hide Full Email' : 'Show Full Email'}
                  </button>
                </div>

                {expanded[i] && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: '#f9f9f9',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <strong>Full Email Content:</strong>
                    <div>{emailObj.body}</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No emails fetched yet.</p>
      )}

      {summaries.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Summaries</h3>
          <ul style={{ paddingLeft: '1rem' }}>
            {summaries.map((summary, i) => (
              <li
                key={i}
                style={{
                  borderBottom: '1px solid #ccc',
                  marginBottom: '0.5rem',
                  padding: '0.5rem 0',
                }}
              >
                <strong>Summary {i + 1}:</strong> {summary}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GmailEmails;
