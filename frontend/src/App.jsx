// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/home/Home";
import Assignment from "./pages/admin/Assignment";
import LiveInterview from "./pages/admin/LiveInterview";
import VideoInterview from "./pages/admin/VideoInterview";
import Layout from "./components/Layout";
// import AdminRoom from "./pages/admin/AdminRoom";
import GuestRoom from "./pages/guest/GuestRoom";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Routes with sidebar */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="assignment" element={<Assignment />} />
          <Route path="live-interview" element={<LiveInterview />} />
          <Route path="video-interview" element={<VideoInterview />} />
        </Route>
        
        {/* <Route path="admin-room" element={<AdminRoom />} /> */}
        <Route path="guest-room" element={<GuestRoom />} />
      </Routes>
    </Router>
  );
}