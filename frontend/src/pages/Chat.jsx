import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import "./Chat.css";
import logo from "../assets/logo.png";
export default function Chat() {

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null); // ✅ เก็บ session ปัจจุบัน

  const messagesEndRef = useRef(null);

  // =========================
  // GET USER ID FROM TOKEN
  // =========================
  const getUserId = () => {
    const token = localStorage.getItem("token");
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.userId || payload.id || payload.sub || 0;
    } catch {
      return 0;
    }
  };

  // =========================
  // LOAD HISTORY (ตอน Login)
  // =========================
  const loadHistory = async () => {

    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    try {

      const userId = getUserId();
      const res = await api.get(`/chat/history?userId=${userId}`);

      if (!Array.isArray(res.data)) return;

      const formatted = res.data.map(item => ({
        id: item.Id,
        Question: item.Title ?? ""
      }));

      setHistory(formatted);
      setMessages([]);

    } catch (err) {

      console.error("LOAD HISTORY ERROR:", err.response?.data || err.message);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    }
  };

  // =========================
  // REFRESH HISTORY (หลัง Send)
  // =========================
  const refreshHistory = async () => {
    try {

      const userId = getUserId();
      const res = await api.get(`/chat/history?userId=${userId}`);

      if (!Array.isArray(res.data)) return;

      const formatted = res.data.map(item => ({
        id: item.Id,
        Question: item.Title ?? ""
      }));

      setHistory(formatted); // ✅ อัพเดต sidebar เท่านั้น ไม่แตะ messages

    } catch (err) {
      console.error("REFRESH HISTORY ERROR:", err.response?.data || err.message);
    }
  };

  // =========================
  // LOAD SESSION MESSAGES (คลิก History)
  // =========================
  const loadSessionMessages = async (sessionId) => {
    try {

      const res = await api.get(`/chat/session/${sessionId}`);

      if (!Array.isArray(res.data)) return;

      const formatted = res.data.map(item => ({
        Question: item.Message ?? "",
        Answer: item.Response ?? ""
      }));

      setMessages(formatted);             // ✅ โหลดข้อความทั้งหมดใน session
      setCurrentSessionId(sessionId);     // ✅ set session ปัจจุบัน

    } catch (err) {
      console.error("LOAD SESSION ERROR:", err.response?.data || err.message);
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
  // SEND MESSAGE
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

      const userId = getUserId();

      // ✅ สร้าง session ใหม่ถ้ายังไม่มี (ข้อความแรกของ chat)
      let sessionId = currentSessionId;

      if (!sessionId) {
        const sessionRes = await api.post("/chat/session", {
          userId,
          title: userMessage
        });
        sessionId = sessionRes.data.sessionId;
        setCurrentSessionId(sessionId);
      }

      const res = await api.post("/chat", {
        message: userMessage,
        userId,
        sessionId  // ✅ ส่ง sessionId ไปด้วยทุกครั้ง
      });

      const answer = res.data.answer;

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].Answer = answer;
        return updated;
      });

      await refreshHistory();

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

  // =========================
  // NEW CHAT
  // =========================
  const newChat = () => {
    setMessages([]);
    setCurrentSessionId(null); // ✅ reset session ให้สร้างใหม่ตอนพิมพ์
    localStorage.removeItem("currentChatId");
  };

  // =========================
  // SELECT HISTORY
  // =========================
  const selectHistory = async (item) => {
    await loadSessionMessages(item.id); // ✅ โหลดข้อความทั้งหมดของ session นั้น
  };

  // =========================
  // DELETE HISTORY
  // =========================
  const deleteHistory = async (index) => {

    const item = history[index];

    try {

      if (item.id) {
        await api.delete(`/chat/session/${item.id}`); // ✅ ลบทั้ง session + messages
      }

      setHistory(prev => prev.filter((_, i) => i !== index));
      setMessages([]);
      setCurrentSessionId(null); // ✅ reset session

    } catch (err) {
      console.error("DELETE ERROR:", err.response?.data || err.message);
      alert("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentChatId");
    window.location.href = "/";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="chat-container">

      {/* Sidebar */}
      <div className="sidebar">

        <div className="sidebar-top">
          
          <div className="logo">
          <img src={logo} alt="Prosoft HRM Logo" style={{ width: "50%", height: "auto" }} />
        </div>

          <button className="new-chat" onClick={newChat}>
            + New Chat
          </button>

        </div>

        <div className="history">

          {history.map((msg, index) => (

            <div
              key={index}
              className="history-item"
              style={{ cursor: "pointer" }}
              onClick={() => selectHistory(msg)}
            >

              <span>{msg.Question}</span>

              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation(); // ✅ กันไม่ให้ trigger selectHistory
                  deleteHistory(index);
                }}
              >
                🗑️
              </button>

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

        <div className="chat-body">

          {messages.length === 0 && (
          <div className="welcome">
            <h1 style={{ fontSize: "40px" }}>
              สอบถามระบบ HRMI ได้ตลอดเวลา
            </h1>
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