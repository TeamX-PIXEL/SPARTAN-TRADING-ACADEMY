"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/portal/AppContext';
import { Settings, User, KeyRound, Check, AlertCircle, RefreshCw, Lock, Eye, EyeOff } from 'lucide-react';
import { API } from '@/portal/api';

export const SettingsPage: React.FC = () => {
  const searchParams = useSearchParams();
  const { user, updateUserProfile, addToast } = useApp();
  
  // Tab sync state through route parameters
  const activeTab = searchParams.get('tab') || 'account';

  // Local Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('+1 (555) 0168-912');
  const [tvid, setTvid] = useState('');
  const [telegramUserId, setTelegramUserId] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [discordUserId, setDiscordUserId] = useState('');
  const [discordChatId, setDiscordChatId] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Profile save feedback status
  const [isSaving, setIsSaving] = useState(false);

  // TVID redirect highlights
  const hasTvidError = searchParams.get('error') === 'tvid';

  // Load from global user model if populated
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setTvid(user.tvid || '');
      setTelegramUserId(user.telegram_user_id || '');
      setTelegramChatId(user.telegram_chat_id || '');
      setDiscordUserId(user.discord_user_id || '');
      setDiscordChatId(user.discord_chat_id || '');
      setFirstname(user.firstname || '');
      setLastname(user.lastname || '');
      setUsername(user.username || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvid) {
      addToast("TradingView ID represents a mandatory parameter.", "error");
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile({
        tvid,
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        discord_user_id: discordUserId,
        discord_chat_id: discordChatId,
      });
      addToast("Identity credentials synced and validated!", "success");
      
      // Clear errors from URL if tvid was fixed
      if (tvid && tvid.trim() !== "" && hasTvidError) {
        const params = new URLSearchParams(window.location.search);
        params.delete('error');
        const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
        window.history.pushState(null, '', newUrl);
      }
    } catch (err) {
      console.error(err);
      addToast("Error syncing your credentials.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass || !confirmPass) {
      addToast("All password fields are required.", "error");
      return;
    }

    if (newPass !== confirmPass) {
      addToast("New password and confirm password do not match.", "error");
      return;
    }

    try {
      setIsChangingPass(true);
      const res = await API.changePassword(currentPass, newPass);
      addToast(res.message, "success");
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      addToast(err.message || "Failed changing password", "error");
    } finally {
      setIsChangingPass(false);
    }
  };

  const setTab = (tab: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', newUrl);
  };

  return (
    <div className="flex-1 h-[calc(100vh-80px)] overflow-y-auto split-scroll p-6 md:p-8 space-y-8">
      {/* Title block */}
      <div className="border-b border-[#1e222b] pb-6">
        <div className="flex items-center gap-2 text-blue-400">
          <Settings className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase">CONFIGURATION CENTER</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide mt-1">
          Portal & Credentials Setup
        </h2>
        <p className="text-xs text-neutral-400 max-w-lg mt-1">
          Adjust security passwords, synchronise license keys, and configure alerts.
        </p>
      </div>

      {/* Tabs navigation menu bar */}
      <div className="flex border-b border-[#1e222b] gap-6">
        <button
          type="button"
          onClick={() => setTab('account')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'account'
              ? 'border-blue-500 text-white font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Account & Identity</span>
        </button>
      </div>

      {/* Account view */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Form edit fields column */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="bg-[#12151c]/40 border border-[#1e222b] rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white tracking-wide mb-1">
                Security Profile Details
              </h3>

              {/* TVID MANDATORY ALERT */}
              {hasTvidError && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-rose-400 flex items-start gap-3 text-xs leading-relaxed font-sans">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <strong className="text-white block font-bold">TradingView ID Required!</strong>
                    Secure checkout requires an active TradingView ID (TVID) payload to bind script access keys during execution. Please specify your account name below.
                  </div>
                </div>
              )}

              {/* Locked Fields Section */}
              <div className="bg-[#0c0d0f]/50 border border-[#1e222b]/50 rounded-xl p-4 space-y-4">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-500 block mb-1">
                  🔒 Locked Verification Items (Anti-Spam Protocol)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-neutral-500 block">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        disabled
                        className="w-full bg-[#07080a] border border-[#1e222b] rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-400 cursor-not-allowed outline-none select-none font-sans animate-pulse-once"
                      />
                      <div className="absolute left-3 top-2.5 text-neutral-600">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-neutral-500 block">
                      Secured Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-[#07080a] border border-[#1e222b] rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-400 cursor-not-allowed outline-none select-none font-sans"
                      />
                      <div className="absolute left-3 top-2.5 text-neutral-600">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-neutral-500 block">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={mobileNumber}
                      disabled
                      className="w-full bg-[#07080a] border border-[#1e222b] rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-400 cursor-not-allowed outline-none select-none font-sans"
                    />
                    <div className="absolute left-3 top-2.5 text-neutral-600">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Fields Section */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-blue-400 block mb-1">
                  ✏️ Synchronized Assets Profiles (Editable)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className={`text-[10px] uppercase font-mono tracking-wider font-bold block ${hasTvidError ? 'text-red-400' : 'text-neutral-400'}`}>
                      TradingView ID (TVID)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={tvid}
                        onChange={(e) => setTvid(e.target.value)}
                        disabled={!!user?.tvid}
                        className={`w-full bg-[#0c0d0f] border rounded-xl ${user?.tvid ? 'pl-9' : 'px-3.5'} py-2 text-xs placeholder-neutral-650 outline-none ${
                          hasTvidError
                            ? 'border-red-500 ring-2 ring-red-500/10'
                            : user?.tvid
                              ? 'border-[#1e222b] text-neutral-400 cursor-not-allowed select-none'
                              : 'border-[#1e222b] text-white focus:border-blue-550'
                        }`}
                        placeholder="Enter TradingView Username"
                      />
                      {user?.tvid && (
                        <div className="absolute left-3 top-2.5 text-neutral-600">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 block">
                      Telegram Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={telegramUserId}
                        onChange={(e) => setTelegramUserId(e.target.value)}
                        disabled={!!user?.telegram_user_id}
                        className={`w-full bg-[#0c0d0f] border border-[#1e222b] rounded-xl ${user?.telegram_user_id ? 'pl-9' : 'px-3.5'} py-2 text-xs placeholder-neutral-600 outline-none ${
                          user?.telegram_user_id
                            ? 'text-neutral-400 cursor-not-allowed select-none'
                            : 'text-white focus:border-blue-500'
                        }`}
                        placeholder="@username"
                      />
                      {user?.telegram_user_id && (
                        <div className="absolute left-3 top-2.5 text-neutral-600">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 block">
                      Telegram Chat ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        disabled={!!user?.telegram_chat_id}
                        className={`w-full bg-[#0c0d0f] border border-[#1e222b] rounded-xl ${user?.telegram_chat_id ? 'pl-9' : 'px-3.5'} py-2 text-xs placeholder-neutral-600 outline-none ${
                          user?.telegram_chat_id
                            ? 'text-neutral-400 cursor-not-allowed select-none'
                            : 'text-white focus:border-blue-500'
                        }`}
                        placeholder="123456789"
                      />
                      {user?.telegram_chat_id && (
                        <div className="absolute left-3 top-2.5 text-neutral-600">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 block">
                      Discord Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={discordUserId}
                        onChange={(e) => setDiscordUserId(e.target.value)}
                        disabled={!!user?.discord_user_id}
                        className={`w-full bg-[#0c0d0f] border border-[#1e222b] rounded-xl ${user?.discord_user_id ? 'pl-9' : 'px-3.5'} py-2 text-xs placeholder-neutral-600 outline-none ${
                          user?.discord_user_id
                            ? 'text-neutral-400 cursor-not-allowed select-none'
                            : 'text-white focus:border-blue-500'
                        }`}
                        placeholder="@discord_user"
                      />
                      {user?.discord_user_id && (
                        <div className="absolute left-3 top-2.5 text-neutral-600">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 block">
                      Discord Chat ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={discordChatId}
                        onChange={(e) => setDiscordChatId(e.target.value)}
                        disabled={!!user?.discord_chat_id}
                        className={`w-full bg-[#0c0d0f] border border-[#1e222b] rounded-xl ${user?.discord_chat_id ? 'pl-9' : 'px-3.5'} py-2 text-xs placeholder-neutral-600 outline-none ${
                          user?.discord_chat_id
                            ? 'text-neutral-400 cursor-not-allowed select-none'
                            : 'text-white focus:border-blue-500'
                        }`}
                        placeholder="9876543210"
                      />
                      {user?.discord_chat_id && (
                        <div className="absolute left-3 top-2.5 text-neutral-600">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md shadow-blue-500/10"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      <span>Syncing profile ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4.5 h-4.5" />
                      <span>Save Profile Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Password edit fields */}
            <form onSubmit={handlePasswordChange} className="bg-[#12151c]/40 border border-[#1e222b] rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Change Password Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-neutral-400 block">
                    Current Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className="w-full bg-[#0c0d0f] border border-[#1e222b] rounded-xl pl-3.5 pr-9 py-2 text-xs text-white focus:border-blue-500 outline-none font-mono"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-neutral-400 block">
                    New Password Key
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full bg-[#0c0d0f] border border-[#1e222b] rounded-xl pl-3.5 pr-9 py-2 text-xs text-white focus:border-blue-500 outline-none font-mono"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-neutral-400 block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full bg-[#0c0d0f] border border-[#1e222b] rounded-xl pl-3.5 pr-9 py-2 text-xs text-white focus:border-blue-500 outline-none font-mono"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-5 h-10 border border-neutral-800 hover:border-[#1e222b] text-neutral-200 hover:bg-[#12151c] font-semibold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors active:scale-98"
                >
                  {isChangingPass ? "Hashing and syncing..." : "Validate & Update Password"}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Terminal ID card */}
          {user && (
            <div className="bg-[#12151c]/30 border border-[#1e222b] p-6 rounded-2xl space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#4e5a70]">
                Identity Card
              </h4>
              <div className="flex flex-col items-center text-center py-4 space-y-3">
                {/* Profile for male solid bg with name first letter display */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-700 to-indigo-950 border border-blue-500/30 flex items-center justify-center font-bold text-white text-3xl tracking-wide select-none shadow-lg shadow-blue-500/15">
                  {(name || user.name || "M").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="font-bold text-white text-sm tracking-wide">{firstname || user.firstname} {lastname || user.lastname}</h5>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">@{username || user.username}</p>
                </div>
              </div>

              <div className="bg-neutral-900/60 p-4 rounded-xl border border-white/5 space-y-2 font-mono text-[11px] text-neutral-400">
                <div className="flex justify-between">
                  <span>Terminal Status:</span>
                  <span className="text-emerald-400 font-semibold">ONLINE</span>
                </div>
                <div className="flex justify-between">
                  <span>Database TVID:</span>
                  <span className="text-white">{(tvid || user.tvid) ? `@${tvid || user.tvid}` : 'NOT REGISTERED'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Telegram Contact:</span>
                  <span className="text-blue-400">{(telegramUserId) ? `@${telegramUserId.replace(/^@/, '')}` : 'NOT BOUND'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Telegram Chat ID:</span>
                  <span className="text-blue-300">{telegramChatId || 'NOT SET'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discord Username:</span>
                  <span className="text-indigo-400">{(discordUserId) ? `@${discordUserId.replace(/^@/, '')}` : 'NOT BOUND'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discord Chat ID:</span>
                  <span className="text-indigo-300">{discordChatId || 'NOT SET'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
export default SettingsPage;
