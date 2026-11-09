"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminUser } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  KeyRound,
  Trash2,
  Edit2,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  X,
  Lock,
} from "lucide-react";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUser | null>(null);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  // Create form state
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "engineer">("engineer");
  const [newIsActive, setNewIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  // Edit form state
  const [editRole, setEditRole] = useState<"admin" | "engineer">("engineer");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editFullName, setEditFullName] = useState("");
  const [updating, setUpdating] = useState(false);

  // Password reset form state
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createAdminUser({
        email: newEmail.trim(),
        full_name: newFullName.trim() || undefined,
        password: newPassword,
        role: newRole,
        is_active: newIsActive,
      });
      setShowCreateModal(false);
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      setActionSuccess(`User ${newEmail} was provisioned successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Could not create user");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setUpdating(true);
    setError(null);
    try {
      await api.updateAdminUser(selectedUserForEdit.id, {
        role: editRole,
        is_active: editIsActive,
        full_name: editFullName.trim() || undefined,
      });
      setSelectedUserForEdit(null);
      setActionSuccess(`User ${selectedUserForEdit.email} was updated.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    setResettingPassword(true);
    setError(null);
    try {
      await api.updateAdminUser(selectedUserForPassword.id, {
        new_password: resetPasswordVal,
      });
      setSelectedUserForPassword(null);
      setResetPasswordVal("");
      setActionSuccess(`Password for ${selectedUserForPassword.email} has been reset.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setError(null);
    try {
      await api.deleteAdminUser(userToDelete.id);
      setUserToDelete(null);
      setActionSuccess(`User ${userToDelete.email} was removed.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#30363D]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
            title="Back to Admin Console"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#F0F6FC]">User Management</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30">
                {users.length} Total Accounts
              </span>
            </div>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Provision developer accounts, assign roles, manage access suspensions, and reset credentials.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-md bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" /> Provision New User
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-[#3FB950]/15 border border-[#3FB950]/40 text-[#3FB950] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-[#3FB950] hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-[#F85149]/15 border border-[#F85149]/40 text-[#F85149] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[#F85149] hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter by email, name, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md bg-[#161B22] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-xs text-[#F0F6FC] placeholder-[#8B949E] transition-all font-mono"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1117] border-b border-[#30363D] text-[#8B949E] font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role &amp; Privilege</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Active Sessions</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8B949E]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#1F6FEB]" />
                      Loading user accounts...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8B949E]">
                    No accounts found matching &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isAdmin = u.role === "admin" || u.is_superuser;

                  return (
                    <tr key={u.id} className="hover:bg-[#21262D]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold font-mono text-xs ${
                            isAdmin
                              ? "bg-[#A371F7]/15 border border-[#A371F7]/40 text-[#D2A8FF]"
                              : "bg-[#1F6FEB]/15 border border-[#1F6FEB]/40 text-[#58A6FF]"
                          }`}>
                            {(u.full_name || u.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#F0F6FC]">
                                {u.full_name || "Unnamed Developer"}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#1F6FEB]/20 text-[#58A6FF]">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-[#8B949E] block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#A371F7]/15 text-[#D2A8FF] border border-[#A371F7]/30">
                            <ShieldAlert className="w-3 h-3 text-[#A371F7]" />
                            Lead Architect (Admin)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/25">
                            <Shield className="w-3 h-3 text-[#58A6FF]" />
                            Platform Engineer
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[#3FB950] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#F85149] font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#8B949E]">
                        <span className="px-2 py-0.5 rounded bg-[#0D1117] border border-[#30363D] text-[#C9D1D9]">
                          {u.active_sessions_count} {u.active_sessions_count === 1 ? "session" : "sessions"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#8B949E] text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUserForEdit(u);
                              setEditRole(u.role === "admin" ? "admin" : "engineer");
                              setEditIsActive(u.is_active);
                              setEditFullName(u.full_name || "");
                            }}
                            className="p-1.5 rounded hover:bg-[#30363D] text-[#8B949E] hover:text-[#58A6FF] transition-colors"
                            title="Edit Role & Status"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUserForPassword(u);
                              setResetPasswordVal("");
                            }}
                            className="p-1.5 rounded hover:bg-[#30363D] text-[#8B949E] hover:text-[#F0883E] transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded hover:bg-[#30363D] text-[#8B949E] hover:text-[#F85149] transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
              <h3 className="text-sm font-semibold text-[#F0F6FC] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1F6FEB]" /> Provision New Platform Account
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#8B949E] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  className="w-full px-3 py-2 rounded-md bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-[#F0F6FC] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Platform Engineer"
                  className="w-full px-3 py-2 rounded-md bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-[#F0F6FC] text-xs"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                  Temporary Password * (min 8 chars, 1 letter, 1 number)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-md bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-[#F0F6FC] font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#58A6FF]"
                  >
                    <option value="engineer">Platform Engineer</option>
                    <option value="admin">Lead Architect (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newIsActive ? "active" : "suspended"}
                    onChange={(e) => setNewIsActive(e.target.value === "active")}
                    className="w-full px-2.5 py-2 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#58A6FF]"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3 py-1.5 rounded-md bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER ROLE & STATUS MODAL */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
              <h3 className="text-sm font-semibold text-[#F0F6FC] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#58A6FF]" /> Modify Profile &amp; Role Permissions
              </h3>
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="text-[#8B949E] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#8B949E] text-[11px] block">Target Account</span>
                <span className="font-mono text-[#F0F6FC]">{selectedUserForEdit.email}</span>
              </div>

              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-[#F0F6FC] text-xs"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                  Platform Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  disabled={selectedUserForEdit.id === currentUser?.id}
                  className="w-full px-2.5 py-2 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#58A6FF] disabled:opacity-50"
                >
                  <option value="engineer">Platform Engineer (Scoped Projects)</option>
                  <option value="admin">Lead Architect (Superuser Admin)</option>
                </select>
                {selectedUserForEdit.id === currentUser?.id && (
                  <p className="text-[10px] text-[#8B949E] mt-1 font-mono">
                    * You cannot remove administrator permissions from yourself.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                  Account Status
                </label>
                <select
                  value={editIsActive ? "active" : "suspended"}
                  onChange={(e) => setEditIsActive(e.target.value === "active")}
                  disabled={selectedUserForEdit.id === currentUser?.id}
                  className="w-full px-2.5 py-2 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#58A6FF] disabled:opacity-50"
                >
                  <option value="active">Active (Access Granted)</option>
                  <option value="suspended">Suspended (Tokens Revoked immediately)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-3 py-1.5 rounded-md bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-medium disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
              <h3 className="text-sm font-semibold text-[#F0F6FC] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#F0883E]" /> Reset User Password
              </h3>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                className="text-[#8B949E] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-[#0D1117] border border-[#30363D]">
                <span className="text-[#8B949E] text-[11px] block">Target Account</span>
                <span className="font-mono text-[#F0F6FC]">{selectedUserForPassword.email}</span>
              </div>

              <div>
                <label className="block text-[#8B949E] font-mono text-[11px] mb-1">
                  New Password (min 8 chars, 1 letter, 1 number)
                </label>
                <input
                  type="password"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-md bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] focus:outline-none text-[#F0F6FC] font-mono text-xs"
                />
                <p className="text-[11px] text-[#8B949E] mt-1.5">
                  Resetting the password will terminate all active sessions for this account immediately.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-3 py-1.5 rounded-md bg-[#F0883E] hover:bg-[#F0883E]/85 text-white text-xs font-medium disabled:opacity-50"
                >
                  {resettingPassword ? "Resetting..." : "Apply New Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#F85149]/40 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#F85149]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-semibold text-[#F0F6FC]">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#F0F6FC] font-mono">{userToDelete.email}</strong>? All associated sessions will be immediately invalidated.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-3 py-1.5 rounded-md bg-[#F85149] hover:bg-[#F85149]/80 text-white text-xs font-medium"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
