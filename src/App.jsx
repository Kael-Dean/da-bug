// src/App.jsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "./components/AppLayout"
import Home from "./pages/Home"
import Setting from "./pages/setting" // หน้า Setting ที่สร้างไว้

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* กันกรณีเปิด /index.html ตรง ๆ (แม้ใช้ HashRouter ส่วนใหญ่จะมาที่ #/ อยู่แล้ว) */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />

        {/* เส้นทางหลักใช้ AppLayout ครอบ */}
        <Route path="/" element={<AppLayout />}>
          {/* หน้าแรก */}
          <Route index element={<Home />} />
          {/* alias: /home */}
          <Route path="home" element={<Home />} />

          {/* หน้า Setting สำหรับตั้งค่าเกณฑ์แจ้งเตือน + อีเมลผู้รับ */}
          <Route path="settings" element={<Setting />} />
        </Route>

        {/* กันพิมพ์พาธมั่ว */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
