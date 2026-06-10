import React, { useState, useRef, useEffect, useContext } from 'react';
import { MessageCircle, X, Send, Bot, User as UserIcon } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ChatbotWidget = () => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm the CredSetu AI. Ask me anything about your credit score, risk factors, or how the platform works!", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Only show chatbot if logged in
  if (!user) return null;

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', { message: input });
      setMessages(prev => [...prev, { text: data.reply, sender: 'ai' }]);
    } catch (error) {
      setMessages(prev => [...prev, { text: "Sorry, I couldn't process that. Try again later.", sender: 'ai' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen ? (
        <div className="chatbot-window glass-card">
          <div className="chatbot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '50%' }}>
                <Bot className="text-accent" size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>CredSetu Assistant</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--accent-success)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px var(--accent-success)' }}></span>
                  AI Online
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background='rgba(255,0,0,0.5)'} onMouseOut={(e) => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
              <X size={18} />
            </button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                {msg.sender === 'ai' ? <Bot size={16} style={{marginTop: '4px'}} /> : null}
                <span>{msg.text}</span>
              </div>
            ))}
            {loading && (
              <div className="chat-message ai-message">
                <Bot size={16} style={{marginTop: '4px'}} />
                <span className="typing-indicator">Processing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="chatbot-input">
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Ask a financial question..."
            />
            <button type="submit" disabled={loading}>
              <Send size={20} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="attention-grabber">
            ✨ Try our AI Assistant!
          </div>
          <button className="chatbot-trigger" onClick={() => setIsOpen(true)}>
            <MessageCircle size={32} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
