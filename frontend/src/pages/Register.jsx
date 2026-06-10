import { useState, useEffect } from "react";
import {
  FaRobot,
  FaUser,
  FaIdCard,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaEnvelope,
} from "react-icons/fa";
import api from "../services/api";
import "./Register.css";
import Notification from "../components/Notification";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");

  // 🔹 Real-time Email Validation
  useEffect(() => {
    if (!email) setEmailError("");
    else if (!email.endsWith("@gmail.com"))
      setEmailError("Email ต้องลงท้าย @gmail.com");
    else setEmailError("");
  }, [email]);

  // 🔹 Real-time Password Match
  useEffect(() => {
    if (!confirmPassword) setPasswordMatchError("");
    else if (password !== confirmPassword)
      setPasswordMatchError("รหัสผ่านไม่ตรงกัน");
    else setPasswordMatchError("");
  }, [password, confirmPassword]);

  // 🔹 Password Strength Meter
  useEffect(() => {
    if (!password) setPasswordStrength("");
    else if (password.length < 6) setPasswordStrength("อ่อน");
    else if (/^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z]).{6,}$/.test(password))
      setPasswordStrength("แข็ง");
    else setPasswordStrength("กลาง");
  }, [password]);

  const register = async () => {
    // check empty
    if (!fullName || !username || !email || !password || !confirmPassword) {
      setNotif({ type: "warning", message: "กรอกข้อมูลให้ครบทุกช่อง" });
      return;
    }

    if (emailError) {
      setNotif({ type: "error", message: emailError });
      return;
    }

    if (passwordMatchError) {
      setNotif({ type: "error", message: passwordMatchError });
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        fullName,
        username,
        email,
        password,
      });

      setNotif({
        type: "success",
        message: "สมัครสมาชิกสำเร็จ 🎉 กำลังไปหน้าล็อกอิน...",
      });

      // reset form
      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPasswordStrength("");

      // redirect after 1.5s
      setTimeout(() => (window.location.href = "/"), 1500);
    } catch (err) {
      setNotif({
        type: "error",
        message: err.response?.data?.message || "สมัครไม่สำเร็จ",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength === "อ่อน") return "red";
    if (passwordStrength === "กลาง") return "orange";
    if (passwordStrength === "แข็ง") return "green";
    return "transparent";
  };

  return (
    <>
      {notif && (
        <Notification
          type={notif.type}
          message={notif.message}
          onClose={() => setNotif(null)}
        />
      )}

      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <FaRobot className="robot-icon" />
            <h1>AI HRMI Assistant</h1>
            <p>สร้างบัญชีผู้ใช้งานใหม่</p>
          </div>

          {/* Full Name */}
          <div className="input-group">
            <label>ชื่อ - นามสกุล</label>
            <div className="input-box">
              <FaIdCard />
              <input
                type="text"
                placeholder="กรอกชื่อ - นามสกุล"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          {/* Username */}
          <div className="input-group">
            <label>Username</label>
            <div className="input-box">
              <FaUser />
              <input
                type="text"
                placeholder="กรอก Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="input-group">
            <label>Email</label>
            <div className="input-box">
              <FaEnvelope />
              <input
                type="email"
                placeholder="กรอก Email (@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {emailError && <span className="error-text">{emailError}</span>}
          </div>

          {/* Password */}
          <div className="input-group">
            <label>Password</label>
            <div className="input-box">
              <FaLock />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {passwordStrength && (
              <span style={{ color: getStrengthColor() }}>
                ความแข็งแรง: {passwordStrength}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="input-group">
            <label>ยืนยันรหัสผ่าน</label>
            <div className="input-box">
              <FaLock />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="กรอกยืนยันรหัสผ่าน"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {passwordMatchError && (
              <span className="error-text">{passwordMatchError}</span>
            )}
          </div>

          <button
            className="register-btn"
            onClick={register}
            disabled={loading}
          >
            {loading ? "กำลังสมัคร..." : "Create Account"}
          </button>

          <div className="login-link">
            <span>มีบัญชีอยู่แล้ว ? </span>
            <a href="/">เข้าสู่ระบบ</a>
          </div>
        </div>
      </div>
    </>
  );
}
