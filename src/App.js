import React, { useEffect, useState } from 'react';
import { DirectLine } from 'botframework-directlinejs';
import './App.css';

const LoadingDots = () => {
  return (
    <div className="message bot-message loading-dots">
      <div className="dot-container">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
};

const App = () => {
  const tokenEndpoint = process.env.REACT_APP_WEBSITE_TOKEN;
  console.log('API Key:', tokenEndpoint);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [directLine, setDirectLine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const exampleQuestions = [
    'What digital services do you offer?',
    'Can you help me with automation solutions?',
    'Tell me more about cloud services.'
  ];

  useEffect(() => {
    const initializeBotConnection = async () => {
      try {
        const response = await fetch(tokenEndpoint, { method: 'GET' });
        if (!response.ok) {
          throw new Error(`Failed to fetch token: ${response.statusText}`);
        }
        const data = await response.json();
        const directLineToken = data.token;

        const directLineInstance = new DirectLine({ token: directLineToken });
        setDirectLine(directLineInstance);

        directLineInstance.activity$.subscribe(
          (activity) => {
            if (activity.type === 'message' && activity.from.name !== 'User') {
              setIsLoading(false);
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
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?:^|\n)-\s*(\d+\.\s*[^\n]+)/g, '<li>$1</li>')
      .replace(/(?:^|\n)\d+\.\s*([^\n]+)/g, '<li>$1</li>')
      .replace(/(?:^|\n)-\s+([^\n]+)/g, '<li>$1</li>')
      .replace(/###\s*(.*?)\s*\n/g, '<h2>$1</h2>')
      .replace(/\[(\d+)\]/g, (match, num) => {
        const ref = references.find((r) => r.num === num);
        if (ref) {
          return `<a href='${ref.url}' target='_blank' class='reference-link'>[${num}]</a>`;
        }
        return match;
      });

    return { text: `<ul>${textWithClickableRefs}</ul>`, sources: references };
  };

  const sendMessage = (messageText) => {
    if (directLine && messageText.trim()) {
      setIsLoading(true);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: messageText, from: 'User' }
      ]);
      directLine.postActivity({
        from: { id: 'user1', name: 'User' },
        type: 'message',
        text: messageText,
      }).subscribe(
        (id) => console.log(`Message sent with ID: ${id}`),
        (err) => {
          setIsLoading(false);
          setError(`Error sending message: ${err}`);
        }
      );
      setInput('');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      sendMessage(input);
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
              {isLoading && <LoadingDots />}
            </div>
            <div className="input-container">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hi there! How can I assist you today?"
              />
              <button onClick={() => sendMessage(input)}>
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
            <div className="example-questions-row">
              {exampleQuestions.map((question, index) => (
                <div
                  key={index}
                  className="example-question-box"
                  onClick={() => sendMessage(question)}
                >
                  {question}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;