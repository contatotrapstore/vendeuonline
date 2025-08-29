'use client';

import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/store/authStore';

export default function AdminTestPage() {
  const { user, isAuthenticated, token } = useAuthStore();
  const { isAdmin, hasPermission, permissions } = usePermissions();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Test Page</h1>
        
        <div className="grid gap-6">
          {/* User Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">User Information</h2>
            <div className="space-y-2">
              <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>User exists:</strong> {user ? 'Yes' : 'No'}</p>
              <p><strong>Token exists:</strong> {token ? 'Yes' : 'No'}</p>
              {user && (
                <>
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>User Type:</strong> {user.userType}</p>
                  <p><strong>User Type (raw):</strong> {JSON.stringify(user.type)}</p>
                </>
              )}
            </div>
          </div>

          {/* Admin Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Admin Information</h2>
            <div className="space-y-2">
              <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
              <p><strong>Has Permission (all):</strong> {hasPermission('all') ? 'Yes' : 'No'}</p>
              <p><strong>Permissions:</strong> {JSON.stringify(permissions)}</p>
              {user?.admin && (
                <>
                  <p><strong>Admin ID:</strong> {user.admin.id}</p>
                  <p><strong>Admin Permissions (raw):</strong> {JSON.stringify(user.admin.permissions)}</p>
                </>
              )}
            </div>
          </div>

          {/* Raw User Data */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Raw User Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          {/* Token Data */}
          {token && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Token Data</h2>
              <div className="space-y-2">
                <p><strong>Token (first 50 chars):</strong> {token.substring(0, 50)}...</p>
                <p><strong>Token payload:</strong></p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(JSON.parse(atob(token.split('.')[1])), null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Actions</h2>
            <div className="space-x-4">
              <button 
                onClick={() => window.location.href = '/admin'}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Go to Admin Dashboard
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Go to Login
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Clear Storage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}