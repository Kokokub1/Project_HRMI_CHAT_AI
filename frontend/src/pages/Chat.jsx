import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import "./Chat.css";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // =========================
  // LOAD HISTORY
  // =========================
  const loadHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
      return;
    }

    try {
      const res = await api.get("/chat/history");

      if (!Array.isArray(res.data)) return;

      const formatted = res.data.map(item => ({
        Question: item.Message ?? "",
        Answer: item.Response ?? ""
      }));

      setMessages(formatted);

    } catch (err) {
      console.error("LOAD HISTORY ERROR:", err.response?.data || err.message);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // =========================
  // AUTO SCROLL
  // =========================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // =========================
  // SEND MESSAGE  ✅ แก้ตรงนี้ — เพิ่ม userId
  // =========================
  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;

    setMessages(prev => [
      ...prev,
      { Question: userMessage, Answer: "..." }
    ]);

    setMessage("");
    setLoading(true);

    try {
      // ✅ ดึง userId จาก JWT token ที่เก็บใน localStorage
      const token = localStorage.getItem("token");
      let userId = 0;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload.userId || payload.id || payload.sub || 0;
        } catch {
          userId = 0;
        }
      }

      // ✅ เพิ่ม userId ใน body ที่ส่งไป backend
      const res = await api.post("/chat", {
        message: userMessage,
        userId: userId
      });

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].Answer = res.data.answer;
        return updated;
      });

    } catch (err) {
      console.error("SEND ERROR:", err.response?.data || err.message);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const newChat = () => setMessages([]);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="chat-container">

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-top">
          <div className="logo">🤖 AI HRMI</div>

          <button className="new-chat" onClick={newChat}>
            + New Chat
          </button>
        </div>

        <div className="history">
          {messages.map((msg, index) => (
            <div key={index} className="history-item">
              {msg.Question}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="chat-main">

        <div className="chat-header">
          🤖 AI HRMI Assistant
        </div>

        <div className="chat-body">

          {messages.length === 0 && (
            <div className="welcome">
              <h1>🤖 AI HRMI Assistant</h1>
              <p>สอบถามระบบ HRMI ได้ตลอดเวลา</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className="message">

              <div className="user-row">
                <div className="user-bubble">
                  {msg.Question}
                </div>
              </div>

              <div className="ai-row">
                <div className="ai-bubble">
                  {msg.Answer}
                </div>
              </div>

            </div>
          ))}

          {loading && (
            <div className="ai-row">
              <div className="ai-bubble">
                🤖 กำลังค้นหาข้อมูล...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer">
          <div className="input-wrapper">

            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์คำถามเกี่ยวกับ HRMI..."
            />

            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!message.trim()}
            >
              ➤
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}