// components/TestRoleChange.tsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';

export function TestRoleChange() {
  const { user, refetchUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
      
      const response = await fetch(`${API_URL}/api/user/change-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to change role');
      }

      // Refetch user data to update UI
      await refetchUser();
      
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Test Role Change</h3>
      <p className="text-sm text-gray-600 mb-4">Current Role: <span className="font-bold text-[#93C01F]">{user.role}</span></p>
      
      <div className="flex gap-2">
        <button
          onClick={() => handleRoleChange('vendor')}
          disabled={loading || user.role === 'vendor'}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Switch to Vendor
        </button>
        <button
          onClick={() => handleRoleChange('customer')}
          disabled={loading || user.role === 'customer'}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Switch to Customer
        </button>
      </div>
    </div>
  );
}