/**
 * File: ./app/src/components/GmailEmails.jsx
 */
import React, { useState, useEffect } from 'react';
import { generateSummary } from '../services/mockAi';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

function GmailEmails() {
  const [initialized, setInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [emails, setEmails] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load gapi client when the component mounts
   */
  useEffect(() => {
    const script = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
    if (!script) {
      setError('Google API script not found in index.html.');
      return;
    }

    script.onload = () => {
      window.gapi.load('client:auth2', initClient);
    };

    // If script was already loaded, call it directly:
    if (window.gapi) {
      window.gapi.load('client:auth2', initClient);
    }
  }, []);

  /**
   * Initialize the GAPI client library
   */
  const initClient = async () => {
    try {
      await window.gapi.client.init({
        clientId: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
      });
      setInitialized(true);

      // Listen for sign-in state changes
      window.gapi.auth2.getAuthInstance().isSignedIn.listen(onSignInChange);

      // Set the initial sign-in state
      const signedIn = window.gapi.auth2.getAuthInstance().isSignedIn.get();
      setIsSignedIn(signedIn);
    } catch (err) {
      console.error('Error initializing GAPI', err);
      setError('Error initializing Google API client.');
    }
  };

  /**
   * Sign-in state change callback
   */
  const onSignInChange = (isSignedIn) => {
    setIsSignedIn(isSignedIn);
    if (isSignedIn) {
      fetchEmails();
    } else {
      setEmails([]);
      setSummaries([]);
    }
  };

  /**
   * Sign in the user
   */
  const handleSignIn = async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signIn();
    } catch (err) {
      console.error('Sign-in error:', err);
      setError('Failed to sign in.');
    }
  };

  /**
   * Sign out the user
   */
  const handleSignOut = async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signOut();
    } catch (err) {
      console.error('Sign-out error:', err);
      setError('Failed to sign out.');
    }
  };

  /**
   * Fetch a list of email snippets from Gmail
   */
  const fetchEmails = async () => {
    if (!window.gapi.client || !isSignedIn) return;

    try {
      // Load the Gmail API
      await window.gapi.client.load('gmail', 'v1');
      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
      });

      const messages = response.result.messages || [];
      const newEmails = [];

      // We’ll fetch snippet for each message
      for (const msg of messages) {
        const detail = await window.gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
        });
        const snippet = detail.result.snippet || '(No snippet)';
        newEmails.push(snippet);
      }

      setEmails(newEmails);
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails.');
    }
  };

  /**
   * Summarize all fetched emails with your existing mockAi function
   */
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

  const renderNotInitialized = () => (
    <div>
      <p>Loading Google API client...</p>
    </div>
  );

  const renderSignIn = () => (
    <div>
      <p>You are not signed in.</p>
      <button onClick={handleSignIn}>Sign In with Google</button>
    </div>
  );

  const renderEmails = () => (
    <div>
      <p>You are signed in!</p>
      <button onClick={handleSignOut}>Sign Out</button>

      <div style={{ marginTop: '1rem' }}>
        <button onClick={fetchEmails}>Refresh Emails</button>
      </div>

      {emails.length > 0 && (
        <>
          <h3>Email Snippets</h3>
          <ul>
            {emails.map((snippet, i) => (
              <li key={i} style={{ margin: '0.5rem 0' }}>
                <strong>Email {i + 1}:</strong> {snippet}
              </li>
            ))}
          </ul>
          <button onClick={handleSummaries} disabled={loadingSummaries}>
            {loadingSummaries ? 'Summarizing...' : 'Summarize All'}
          </button>
        </>
      )}

      {summaries.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Summaries</h3>
          <ul>
            {summaries.map((summary, i) => (
              <li key={i}>
                <strong>Summary {i + 1}:</strong> {summary}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', marginTop: '2rem' }}>
      <h2>Gmail Integration (Front-End Only)</h2>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!initialized && renderNotInitialized()}
      {initialized && !isSignedIn && renderSignIn()}
      {initialized && isSignedIn && renderEmails()}
    </div>
  );
}

export default GmailEmails;
