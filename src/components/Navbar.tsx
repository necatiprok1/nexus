"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/signin");
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2">
          <div className="text-2xl font-black text-blue-600">NEXUS</div>
          <span className="text-sm font-bold text-purple-600">X</span>
        </Link>

        {/* Nav Items */}
        <div className="flex items-center gap-6">
          <Link href="/feed" className="text-gray-700 hover:text-blue-600 font-medium">
            Home
          </Link>
          <Link href="/compose" className="text-gray-700 hover:text-blue-600 font-medium">
            Create
          </Link>
          <Link href={`/profile/${user.uid}`} className="text-gray-700 hover:text-blue-600 font-medium">
            Profile
          </Link>

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-1 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
