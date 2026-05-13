import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Save, UserPlus, Shield, Loader2 } from 'lucide-react';
import { fetchUsers, saveUser } from '@/src/lib/api';

export function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('User');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchUsers();
      setUsers(res.users || []);
    } catch (e: any) {
      setMessage(`Error loading users: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId || !newUserPassword) {
      setMessage('User ID and Password are required.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await saveUser({ userId: newUserId, password: newUserPassword, role: newUserRole });
      setMessage('User added successfully!');
      setNewUserId('');
      setNewUserPassword('');
      loadData();
    } catch (e: any) {
      setMessage(`Error saving user: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Admin Panel
          </CardTitle>
          <CardDescription>Manage application users and passwords.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Add New User
              </h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                {message && (
                  <div className={`p-3 rounded text-sm font-medium ${message.includes('Error') || message.includes('required') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">User ID</label>
                  <Input 
                    placeholder="Enter User ID" 
                    value={newUserId} 
                    onChange={e => setNewUserId(e.target.value)} 
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input 
                    type="text"
                    placeholder="Enter Password" 
                    value={newUserPassword} 
                    onChange={e => setNewUserPassword(e.target.value)} 
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select 
                    className="w-full border border-gray-300 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                    disabled={saving}
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <Button type="submit" disabled={saving} className="w-full flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save className="w-4 h-4" /> Save User
                </Button>
              </form>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[400px]">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-sm">Existing Users</h3>
              </div>
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-white sticky top-0 shadow-sm border-b">
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-gray-500 py-8">
                            No users found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{u.id}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                {u.role || 'User'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
