import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

// Protected shell: navigation + routed page content.
export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
