"use client";
import {useRouter} from "next/navigation";
import axios from "axios";



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  
  // Logout logic; replace with your actual logout
  const route=useRouter();
  async function handleLogout() {
    const response = await axios.get("/api/users/logout");
    route.push("/login");
  }

  
  return (
    <div>

        {/* Logout button positioned at the top right */}
        <button
          type="button"
          onClick={handleLogout}
          className="
          fixed top-4 right-4
          px-6 py-2
          bg-red-600 text-white
          rounded-full font-semibold
          hover:bg-red-700
          z-50
          shadow-md
          transition-colors
          "
          >
          Logout
        </button>
        <main className="pt-16">{children}</main> {/* pt-16 for header/button offset */}
    </div>
  );
}
