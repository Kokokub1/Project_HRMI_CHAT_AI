import "./Notification.css";

export default function Notification({ type, message, onClose }) {
  return (
    <div className={`toast ${type}`}>
      <div className="toast-content">
        {type === "success" && "✅"}
        {type === "error" && "❌"}
        {type === "warning" && "⚠️"}

        <span>{message}</span>
      </div>

      <button onClick={onClose}>✕</button>
    </div>
  );
}