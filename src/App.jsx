import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "./components/AppLayout"
import Home from "./pages/Home"

function App() {
  // ได้เป็น "/da-bug/" จาก vite.config.js (หรือ "/" ตอนรันบนโดเมนอื่น)
  const basename = import.meta.env.BASE_URL || "/"

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        {/* เด้งกลับหน้าแรกถ้าเข้า /index.html ตรง ๆ */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />

        {/* ใช้ AppLayout เป็น layout หลัก */}
        <Route path="/" element={<AppLayout />}>
          {/* หน้าเริ่มต้นใต้ Layout */}
          <Route index element={<Home />} />
          {/* /home ก็ยังใช้ได้ */}
          <Route path="home" element={<Home />} />
        </Route>

        {/* กันพิมพ์พาธมั่ว */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
