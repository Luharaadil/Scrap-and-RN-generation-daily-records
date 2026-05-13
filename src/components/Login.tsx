import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Lock, User } from 'lucide-react';
import { fetchUsers } from '@/src/lib/api';

export function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password) {
      setError('Please enter ID and Password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (id === '180044' && password === 'MX180044') {
        onLogin({ id: '180044', role: 'Admin' });
        return;
      }

      const res = await fetchUsers();
      const users = res.users || [];
      const user = users.find((u: any) => u.id === id && u.password === password);

      if (user) {
        onLogin({ id: user.id, role: user.role || 'User' });
      } else {
        setError('Invalid ID or Password.');
      }
    } catch (err: any) {
      setError(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">MRI Tracker Login</CardTitle>
          <p className="text-sm text-gray-500">Enter your ID and Password to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" /> User ID
              </label>
              <Input
                type="text"
                placeholder="Enter User ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoComplete="username"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500" /> Password
              </label>
              <Input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold mt-2"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
