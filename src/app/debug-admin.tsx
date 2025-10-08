"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "@/config/api";
import { getAuthToken } from "@/config/storage-keys";

export default function DebugAdminPage() {
  const [loginResult, setLoginResult] = useState(null);
  const [storageData, setStorageData] = useState(null);

  const testLogin = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "admin@vendeuonline.com",
          password: "123456",
          userType: "admin",
        }),
      });

      const data = await response.json();
      setLoginResult(data);

      if (data.token) {
        localStorage.setItem("auth-token", data.token);
        checkStorage();
      }
    } catch (error) {
      setLoginResult({ error: error.message });
    }
  };

  const checkStorage = () => {
    const token = getAuthToken();
    const authStorage = localStorage.getItem("auth-storage");

    setStorageData({
      token: token ? token.substring(0, 50) + "..." : null,
      authStorage: authStorage ? JSON.parse(authStorage) : null,
      tokenPayload: token ? JSON.parse(atob(token.split(".")[1])) : null,
    });
  };

  useEffect(() => {
    checkStorage();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Admin Login</h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Actions</h2>
            <div className="space-x-4">
              <button onClick={testLogin} className="bg-blue-500 text-white px-4 py-2 rounded">
                Test Admin Login
              </button>
              <button onClick={checkStorage} className="bg-green-500 text-white px-4 py-2 rounded">
                Check Storage
              </button>
              <button
                onClick={() => (window.location.href = "/admin")}
                className="bg-purple-500 text-white px-4 py-2 rounded"
              >
                Go to Admin
              </button>
            </div>
          </div>

          {loginResult && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Login Result</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(loginResult, null, 2)}
              </pre>
            </div>
          )}

          {storageData && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Storage Data</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(storageData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
