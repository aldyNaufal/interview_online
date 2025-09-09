import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MeetingRoom from './pages/MeetingRoom';
import Assignment from './pages/Assignment';
import AdminHome from './pages/admin/home/AdminHome';
import UserHome from './pages/user/home/UserHome';
import Layout from './components/layout/Layout';
import InterviewResult from './pages/InterviewResult';
import VideoInterview from './pages/VideoInterview';
import Login from './pages/authentication/Login';
import Signup from './pages/authentication/Signup';
import Profile from './pages/profile/Profile';
import Settings from './pages/profile/Setting';
import VideoConference from './pages/VideoConference';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default landing page - Login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected routes with Layout */}
        <Route path="/" element={<Layout />}>
          <Route path="admin-home" element={<AdminHome />} />
          <Route path="user-home" element={<UserHome />} />
          <Route path="assignment" element={<Assignment />} />
          <Route path="interview-result" element={<InterviewResult />} />
          <Route path="video-interview" element={<VideoInterview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* Standalone routes (no Layout) */}
        <Route path="/room" element={<MeetingRoom />} />
        <Route path="/video-conference" element={<VideoConference />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;