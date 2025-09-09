// components/Layout.jsx
import { Outlet } from "react-router-dom";
import SideBar from "../sidebar/SideBar";

export default function Layout() {
  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#FFFDF6' }}>
      <SideBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}