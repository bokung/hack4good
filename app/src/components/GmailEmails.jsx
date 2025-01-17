import React, { useState, useEffect, useCallback } from 'react';
import { generateSummary } from '../services/mockAi';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GmailEmails() {
  const [accessToken, setAccessToken] = useState(null);
  const [emails, setEmails] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [error, setError] = useState(null);

  // Initialize Google Identity Services
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

  const handleSignOut = () => {
    if (window.google?.accounts.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setEmails([]);
        setSummaries([]);
      });
    }
  };

  const fetchEmails = async (token) => {
    try {
      // Fetch list of message IDs
      const listResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5',
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

      // Fetch details for each message
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
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails.');
    }
  };

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

  const refreshEmails = () => {
    if (accessToken) {
      fetchEmails(accessToken);
    }
  };

  return (
    <div className="border border-gray-300 p-4 mt-8">
      <h2 className="text-xl font-bold mb-4">Gmail Integration (Front-End Only)</h2>
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {!accessToken ? (
        <div>
          <p className="mb-4">You are not signed in.</p>
          <button
            onClick={handleSignIn}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Sign In with Google
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-4">You are signed in!</p>
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleSignOut}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
            <button
              onClick={refreshEmails}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Refresh Emails
            </button>
          </div>

          {emails.length > 0 && (
            <>
              <h3 className="text-lg font-semibold mt-4 mb-2">Email Snippets</h3>
              <ul className="space-y-2 mb-4">
                {emails.map((snippet, i) => (
                  <li key={i} className="border-b pb-2">
                    <strong>Email {i + 1}:</strong> {snippet}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSummaries}
                disabled={loadingSummaries}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loadingSummaries ? 'Summarizing...' : 'Summarize All'}
              </button>
            </>
          )}

          {summaries.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Summaries</h3>
              <ul className="space-y-2">
                {summaries.map((summary, i) => (
                  <li key={i} className="border-b pb-2">
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