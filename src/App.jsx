import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "./components/AppLayout"
import Home from "./pages/Home"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* เด้งกลับหน้าแรกถ้าเข้า /index.html ตรง ๆ */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />

        {/* ใช้ AppLayout เป็น layout หลัก */}
        <Route path="/" element={<AppLayout />}>
          {/* หน้าเริ่มต้นใต้ Layout -> จะแสดง Topbar/Sidebar ด้วย */}
          <Route index element={<Home />} />
          {/* ถ้าจะให้ /home ก็ยังใช้ได้ */}
          <Route path="home" element={<Home />} />
        </Route>

        {/* กันพิมพ์พาธมั่ว */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
