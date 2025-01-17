// File Path: ./app/src/components/GmailEmails.jsx

import React, { useState, useEffect } from 'react';
import { generateSummary } from '../services/mockAi';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GmailEmails() {
  const [accessToken, setAccessToken] = useState(null);
  const [emails, setEmails] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [error, setError] = useState(null);

  // Load Google script once
  useEffect(() => {
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

  const initializeGoogleClient = () => {
    // Initialize the token client
    window.google?.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      callback: (response) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
        }
      },
    });
  };

  // Sign in and fetch the last 100 emails
  const handleSignIn = () => {
    if (window.google?.accounts.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            fetchEmails(response.access_token);
          }
        },
      });
      tokenClient.requestAccessToken();
    } else {
      setError('Google Identity Services not loaded');
    }
  };

  // Sign out and clear data
  const handleSignOut = () => {
    if (window.google?.accounts.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setEmails([]);
        setSummaries([]);
      });
    }
  };

  // Fetch up to 100 emails (message IDs)
  const fetchEmails = async (token) => {
    setError(null);
    try {
      const listResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const listData = await listResponse.json();

      if (!listData.messages) {
        setEmails([]);
        return;
      }

      // For each message, fetch the snippet
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
        return detailData.snippet || '(No snippet)';
      });

      const emailSnippets = await Promise.all(emailPromises);
      setEmails(emailSnippets);
      setSummaries([]); // Clear old summaries when new emails are fetched
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails.');
    }
  };

  // Generate a summary for each fetched email snippet
  const handleSummaries = async () => {
    setLoadingSummaries(true);
    setSummaries([]);
    const newSummaries = [];

    for (const snippet of emails) {
      try {
        const summary = await generateSummary(snippet);
        newSummaries.push(summary);
      } catch (err) {
        console.error('Error summarizing snippet:', err);
        newSummaries.push('Failed to summarize.');
      }
    }

    setSummaries(newSummaries);
    setLoadingSummaries(false);
  };

  // Re-fetch emails
  const refreshEmails = () => {
    if (accessToken) {
      fetchEmails(accessToken);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', marginTop: '1rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
        Gmail Integration (Up to 100 Emails)
      </h2>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</p>}

      {/* Logged Out State */}
      {!accessToken && (
        <div style={{ marginBottom: '1rem' }}>
          <p>You are not signed in.</p>
          <button onClick={handleSignIn} style={{ marginRight: '1rem' }}>
            Sign In with Google
          </button>
        </div>
      )}

      {/* Logged In State */}
      {accessToken && (
        <div>
          <p>You are signed in!</p>
          <div style={{ margin: '1rem 0' }}>
            <button onClick={handleSignOut} style={{ marginRight: '1rem' }}>
              Sign Out
            </button>
            <button onClick={refreshEmails} style={{ marginRight: '1rem' }}>
              Refresh Emails
            </button>
          </div>

          {/* Email List */}
          {emails.length > 0 ? (
            <div>
              <h3 style={{ marginBottom: '0.5rem' }}>
                Showing {emails.length} Email Snippets
              </h3>
              <ul style={{ paddingLeft: '1rem', marginBottom: '1rem' }}>
                {emails.map((snippet, i) => (
                  <li
                    key={i}
                    style={{
                      borderBottom: '1px solid #ccc',
                      marginBottom: '0.5rem',
                      padding: '0.5rem 0',
                    }}
                  >
                    <strong>Email {i + 1}:</strong> {snippet}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleSummaries}
                disabled={loadingSummaries}
                style={{ marginRight: '1rem' }}
              >
                {loadingSummaries ? 'Summarizing...' : 'Summarize All Emails'}
              </button>
            </div>
          ) : (
            <p>No emails fetched yet.</p>
          )}

          {/* Summaries List */}
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
      )}
    </div>
  );
}

export default GmailEmails;
