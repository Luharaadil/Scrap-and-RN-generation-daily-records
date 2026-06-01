import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Save, UserPlus, Shield, Loader2, Trash2, Plus, Camera, FileText } from 'lucide-react';
import { fetchUsers, saveUser } from '@/src/lib/api';
import { useData } from '@/src/lib/DataContext';

const MATERIALS = ["BIC", "PLY", "Rubber", "RN", "Chafer", "Fabric", "Carbon", "Chemical"];

const MATERIAL_NAMES: Record<string, string> = {
  BIC: "BIC (鋼絲)",
  PLY: "PLY (簾紗)",
  Rubber: "Rubber (膠料)",
  RN: "RN Generation",
  Chafer: "Chafer (防擦布)",
  Fabric: "Fabric",
  Carbon: "Carbon",
  Chemical: "Chemical"
};

export function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('User');
  const [message, setMessage] = useState('');

  // Scrap custom settings states
  const { scrapPicRequirements, materialReasons, updateScrapSettingsInSheet } = useData();
  const [activeMaterial, setActiveMaterial] = useState("BIC");
  const [tempPicReqs, setTempPicReqs] = useState<Record<string, 'Mandatory' | 'Optional'>>({});
  const [tempMatReasons, setTempMatReasons] = useState<Record<string, string[]>>({});
  const [newReasonText, setNewReasonText] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

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

  // Sync settings when fetched from database
  useEffect(() => {
    const reqs: Record<string, 'Mandatory' | 'Optional'> = {};
    const reasons: Record<string, string[]> = {};
    
    MATERIALS.forEach(mat => {
      reqs[mat] = scrapPicRequirements[mat] || 'Mandatory';
      reasons[mat] = materialReasons[mat] && materialReasons[mat].length > 0
        ? [...materialReasons[mat]]
        : ["Die Rubber", "Machine NG", "Human Error", "Process scrap", "Spec finish", "Other"];
    });

    setTempPicReqs(reqs);
    setTempMatReasons(reasons);
  }, [scrapPicRequirements, materialReasons]);

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

  // Settings modification functions
  const handleRequirementChange = (mat: string, value: 'Mandatory' | 'Optional') => {
    setTempPicReqs(prev => ({
      ...prev,
      [mat]: value
    }));
  };

  const handleAddReason = () => {
    if (!newReasonText.trim()) return;
    const currentList = tempMatReasons[activeMaterial] || [];
    if (currentList.includes(newReasonText.trim())) {
      setSettingsMessage('Reason already exists.');
      return;
    }
    const updatedList = [...currentList, newReasonText.trim()];
    setTempMatReasons(prev => ({
      ...prev,
      [activeMaterial]: updatedList
    }));
    setNewReasonText('');
    setSettingsMessage('');
  };

  const handleDeleteReason = (reasonToRemove: string) => {
    const currentList = tempMatReasons[activeMaterial] || [];
    const updatedList = currentList.filter(r => r !== reasonToRemove);
    setTempMatReasons(prev => ({
      ...prev,
      [activeMaterial]: updatedList
    }));
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      await updateScrapSettingsInSheet(tempPicReqs, tempMatReasons);
      setSettingsMessage('Settings saved to spreadsheet successfully!');
    } catch (err: any) {
      setSettingsMessage(`Error saving settings: ${err.message || err}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: USER MANAGEMENT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> User Credentials
          </CardTitle>
          <CardDescription>Manage application users and security roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gray-700" /> Add New User
              </h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                {message && (
                  <div className={`p-3 rounded text-sm font-medium ${message.includes('Error') || message.includes('required') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                    {message}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <Input 
                    placeholder="Enter User ID" 
                    value={newUserId} 
                    onChange={e => setNewUserId(e.target.value)} 
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <Input 
                    type="text"
                    placeholder="Enter Password" 
                    value={newUserPassword} 
                    onChange={e => setNewUserPassword(e.target.value)} 
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <select 
                    className="w-full border border-gray-300 bg-white rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                    disabled={saving}
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <Button type="submit" disabled={saving} className="w-full flex items-center gap-2 h-11 font-bold">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save className="w-4 h-4" /> Save User
                </Button>
              </form>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[400px]">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-sm text-gray-700">Existing System Users</h3>
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
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
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

      {/* SECTION 2: MATERIAL CONFIGURATIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Camera className="w-6 h-6 text-primary" /> Scrap Material Controls
          </CardTitle>
          <CardDescription>
            Configure picture rules and custom main reasons per material type (saves and syncs with Google Sheets).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settingsMessage && (
            <div className={`p-3 rounded mb-4 text-sm font-medium ${settingsMessage.includes('Error') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
              {settingsMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Block: Picture Requirements */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-700">
                <Camera className="w-5 h-5 text-gray-500" /> Photo &amp; Selection Settings
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Material Type</TableHead>
                      <TableHead>Scrap Photo Rule</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MATERIALS.map((mat) => (
                      <TableRow key={mat} className={activeMaterial === mat ? "bg-primary/5 border-l-2 border-l-primary" : ""}>
                        <TableCell className="font-medium text-sm text-gray-900">
                          {MATERIAL_NAMES[mat]}
                        </TableCell>
                        <TableCell>
                          <select
                            className="border border-gray-300 rounded-md h-8 px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                            value={tempPicReqs[mat] || 'Mandatory'}
                            onChange={(e) => handleRequirementChange(mat, e.target.value as 'Mandatory' | 'Optional')}
                          >
                            <option value="Mandatory">Mandatory ⚠️</option>
                            <option value="Optional">Optional ✅</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant={activeMaterial === mat ? "default" : "outline"} 
                            size="sm"
                            onClick={() => {
                              setActiveMaterial(mat);
                              setSettingsMessage('');
                            }}
                            className="h-8 font-semibold text-xs"
                          >
                            Edit Reasons
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Right Block: Reason List Manager */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-700">
                <FileText className="w-5 h-5 text-gray-500" /> Reasons for {MATERIAL_NAMES[activeMaterial]}
              </h3>

              <div className="flex gap-2">
                <Input 
                  placeholder="Enter new reason (e.g. Broken Core)"
                  value={newReasonText}
                  onChange={e => setNewReasonText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddReason();
                    }
                  }}
                  className="h-10"
                />
                <Button onClick={handleAddReason} type="button" className="h-10 flex items-center gap-1 font-bold">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[300px] overflow-y-auto space-y-2">
                {(!tempMatReasons[activeMaterial] || tempMatReasons[activeMaterial].length === 0) ? (
                  <p className="text-center text-sm text-gray-500 py-6">No reasons configured. Fallback to standard reasons occurs.</p>
                ) : (
                  tempMatReasons[activeMaterial].map((reason, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white border border-gray-200 px-3 py-2 rounded-md shadow-sm">
                      <span className="text-sm font-medium text-gray-800">{reason}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReason(reason)}
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-500 text-gray-400"
                        title="Delete reason"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t mt-6 flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              size="lg"
              className="flex items-center gap-2 h-12 font-bold px-8 bg-primary hover:bg-primary/95 text-white"
            >
              {settingsSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Saving Rules...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Save Scrap Settings &amp; Reasons
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
