// File Path: ./app/src/components/GmailEmails.jsx

import React, { useState, useEffect } from 'react';
import { generateSummary } from '../services/mockAi';
import { decode } from 'js-base64';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Retrieve the full text/plain body from the Gmail API's message payload.
 * Fallback to snippet if there isn't a text/plain part.
 */
function extractFullEmailBody(detailData) {
  if (!detailData.payload) {
    // Fallback to snippet if there's no payload
    return detailData.snippet || '(No content)';
  }

  // If the message has multiple parts, look for the text/plain part
  const parts = detailData.payload.parts;
  if (parts && parts.length > 0) {
    // Attempt to locate a text/plain part
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        // Decode the Base64-URL-encoded message
        return decode(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
      // Some emails nest parts recursively
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

  // If there's a single-part email in the body
  if (detailData.payload.body && detailData.payload.body.data) {
    return decode(
      detailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')
    );
  }

  // If no text/plain content was found, fallback to snippet
  return detailData.snippet || '(No content)';
}

function GmailEmails() {
  const [accessToken, setAccessToken] = useState(null);
  const [emails, setEmails] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [error, setError] = useState(null);

  // On component mount, attempt to read an existing token from the cookie
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

  const initializeGoogleClient = () => {
    // Initialize the token client
    window.google?.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      callback: (response) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          storeTokenInCookie(response.access_token);
        }
      },
    });
  };

  // Helper to store token in a cookie
  const storeTokenInCookie = (token) => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 1); // 1-day expiration
    document.cookie = `accessToken=${token}; expires=${expirationDate.toUTCString()}; path=/`;
  };

  // Clear the cookie
  const clearTokenCookie = () => {
    document.cookie = `accessToken=; expires=${new Date(0).toUTCString()}; path=/`;
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
            storeTokenInCookie(response.access_token);
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
    if (window.google?.accounts.oauth2 && accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setEmails([]);
        setSummaries([]);
        clearTokenCookie();
      });
    } else {
      // Fallback if nothing to revoke
      setAccessToken(null);
      setEmails([]);
      setSummaries([]);
      clearTokenCookie();
    }
  };

  // Fetch up to 100 inbox emails (message IDs)
  const fetchEmails = async (token) => {
    setError(null);
    try {
      // Request the latest 100 messages in the INBOX
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
        return;
      }

      // For each message, fetch the detail (snippet + internalDate + full body)
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
          body: extractFullEmailBody(detailData), // <--- Full body extracted here
        };
      });

      // Wait for all details, then sort by `internalDate` descending (newest first)
      const emailDetails = await Promise.all(emailPromises);
      const sortedEmails = emailDetails.sort(
        (a, b) => b.internalDate - a.internalDate
      );

      setEmails(sortedEmails);
      setSummaries([]); // Clear old summaries when new emails are fetched
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails.');
    }
  };

  // Generate a summary for each fetched email's body
  const handleSummaries = async () => {
    setLoadingSummaries(true);
    setSummaries([]);
    const newSummaries = [];

    for (const emailObj of emails) {
      try {
        // Pass the full body instead of just the snippet
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

  // Re-fetch emails
  const refreshEmails = () => {
    if (accessToken) {
      fetchEmails(accessToken);
    }
  };

  // // Automatically poll for new emails every 5 seconds when signed in
  // useEffect(() => {
  //   let intervalId;
  //   if (accessToken) {
  //     intervalId = setInterval(() => {
  //       fetchEmails(accessToken);
  //     }, 5000);
  //   }
  //   return () => {
  //     if (intervalId) clearInterval(intervalId);
  //   };
  // }, [accessToken]);

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', marginTop: '1rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
        Gmail Account Integration (Latest 100 Emails in Your Inbox)
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
                {emails.map((emailObj, i) => (
                  <li
                    key={i}
                    style={{
                      borderBottom: '1px solid #ccc',
                      marginBottom: '0.5rem',
                      padding: '0.5rem 0',
                    }}
                  >
                    <strong>Email {i + 1}:</strong> {emailObj.snippet}
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
