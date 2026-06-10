import { useState } from "react";
import {
  FaUser,
  FaLock,
  FaRobot,
  FaEye,
} from "react-icons/fa";

import api from "../services/api";
import "./Login.css";

export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const login = async () => {
    try {
      const res = await api.post("/auth/login", {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      window.location.href = "/chat";
    } catch (error) {
      alert("Username หรือ Password ไม่ถูกต้อง");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      login();
    }
  };

  return (
    <div className="login-container">
      <div className="bg-circle one"></div>
      <div className="bg-circle two"></div>

      <div className="login-card">
        <div className="logo-section">
          <FaRobot className="robot-icon" />

          <h1>AI HRMI Assistant</h1>

          <p>ระบบผู้ช่วยอัจฉริยะสำหรับโปรแกรม HRMI</p>
        </div>

        <div className="input-group">
          <label>Username</label>

          <div className="input-box">
            <FaUser />

            <input
              type="text"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>
        </div>

        <div className="input-group">
          <label>Password</label>

          <div className="input-box">
            <FaLock />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
            />

            <button
              type="button"
              className="eye-btn"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
            >
              <FaEye />
            </button>
          </div>
        </div>

        <button className="login-btn" onClick={login}>
          Sign In
        </button>

        <div className="register-link">
          <span>ยังไม่มีบัญชี ? </span>
          <a href="/register">สมัครสมาชิก</a>
        </div>
      </div>
    </div>
  );
}