import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';
import './Chatbot.css'; // We'll create some basic styles here

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your AI Music Assistant. How can I help you with your musical journey today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    
    // Convert current messages to history format
    const history = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      content: msg.content
    }));

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Network error. Please check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-wrapper">
      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-title">
              <Bot size={20} />
              <h3>Amplepro AI Assistant</h3>
            </div>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
              <Minimize2 size={18} />
            </button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chatbot-message ${msg.role}`}>
                <div className="chatbot-message-icon">
                  {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="chatbot-message-content">
                  {/* Basic markdown-like rendering for bold text (often used in roadmaps) */}
                  {msg.content.split('\n').map((line, i) => {
                    const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return <p key={i} dangerouslySetInnerHTML={{ __html: boldLine }} />;
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message assistant">
                <div className="chatbot-message-icon"><Bot size={16} /></div>
                <div className="chatbot-message-content loading-dots">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input 
              type="text" 
              placeholder="Ask about music, roadmaps..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)}>
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};

export default Chatbot;
