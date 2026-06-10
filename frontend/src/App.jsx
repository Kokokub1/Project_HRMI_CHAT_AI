import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Chat from "./pages/Chat";
import History from "./pages/History";
import Register from "./pages/Register";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/chat" element={<Chat />} />

        <Route path="/history" element={<History />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;