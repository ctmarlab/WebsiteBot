import React, { useEffect, useState } from 'react';
import { DirectLine } from 'botframework-directlinejs';
import './App.css'; // Add a CSS file for styling

const App = () => {
  const tokenEndpoint = process.env.REACT_APP_WEBSITE_TOKEN;
  console.log('API Key:', tokenEndpoint);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [directLine, setDirectLine] = useState(null);

  useEffect(() => {
    const initializeBotConnection = async () => {
      try {
        // Fetch the DirectLine token
        const response = await fetch(tokenEndpoint, { method: 'GET' });
        if (!response.ok) {
          throw new Error(`Failed to fetch token: ${response.statusText}`);
        }
        const data = await response.json();
        const directLineToken = data.token;

        // Initialize DirectLine
        const directLineInstance = new DirectLine({ token: directLineToken });
        setDirectLine(directLineInstance);

        // Set up message subscription
        directLineInstance.activity$.subscribe(
          (activity) => {
            if (activity.type === 'message') {
              const enrichedMessage = processMessage(activity.text);
              setMessages((prevMessages) => [
                ...prevMessages,
                { text: enrichedMessage.text, from: activity.from.name, sources: enrichedMessage.sources },
              ]);
            }
          },
          (err) => setError(`Error receiving activity: ${err}`)
        );
      } catch (err) {
        setError(err.message);
      }
    };

    initializeBotConnection();
  }, [tokenEndpoint]);

  const processMessage = (text) => {
    const sourceRegex = /\[(\d+)\]:\s*(https?:\/\/[^\s]+)\s*\"([^\"]+)\"/g;
    const references = [];
    let messageWithoutSources = text.replace(sourceRegex, (_, num, url, sourceName) => {
      references.push({ num, url, sourceName });
      return '';
    });

    const textWithClickableRefs = messageWithoutSources
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Make **text** bold
      .replace(/(?:^|\n)-\s*(\d+\.\s*[^\n]+)/g, '<li>$1</li>') // Convert numbered bullet points prefixed with "- " into list items
      .replace(/(?:^|\n)\d+\.\s*([^\n]+)/g, '<li>$1</li>') // Convert numbered lists into list items with numbers
      .replace(/(?:^|\n)-\s+([^\n]+)/g, '<li>$1</li>') // Convert bullet points into list items with a preceding space
      .replace(/###\s*(.*?)\s*\n/g, '<h2>$1</h2>') // Convert ### Title to Capitalized Title with styling

      .replace(/\[(\d+)\]/g, (match, num) => {
        const ref = references.find((r) => r.num === num);
        if (ref) {
          return `<a href='${ref.url}' target='_blank' class='reference-link'>[${num}]</a>`;
        }
        return match;
      });

    return { text: `<ul>${textWithClickableRefs}</ul>`, sources: references };
  };

  const sendMessage = () => {
    if (directLine && input.trim()) {
      directLine.postActivity({
        from: { id: 'user1', name: 'User' },
        type: 'message',
        text: input,
      }).subscribe(
        (id) => console.log(`Message sent with ID: ${id}`),
        (err) => setError(`Error sending message: ${err}`)
      );
      setInput('');
    }
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">ask<span style={{ fontWeight: 'bold' }}>Marlabs</span></h1>
        <p className="app-subtitle">Your guide to digital solutions</p>
      </header>
      <main className="chat-container">
        {error ? (
          <p className="error-message">Error: {error}</p>
        ) : (
          <div className="chat-window">
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.from === 'User' ? 'user-message' : 'bot-message'}`}>
                  <div dangerouslySetInnerHTML={{ __html: message.text }}></div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="sources">
                      {message.sources.map((source, i) => (
                        <div key={i} id={source.num} className="source-item">
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            [{source.num}] {source.sourceName}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="input-container">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown} // Handle Enter key
                placeholder="Hi there! How can I assist you today?"
              />
              <button onClick={sendMessage}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-send"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default App;
