"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/portal/AppContext';
import { API } from '@/portal/api';
import { Course, Indicator, Bot, Lesson, Transaction } from '@/types/portal';
import { 
  BookOpen, 
  LineChart, 
  Zap,
  Clock, 
  Calendar, 
  Play, 
  Video, 
  ExternalLink, 
  RefreshCw, 
  Plus,
  CreditCard, 
  CheckCircle2, 
  Activity, 
  Download, 
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Search,
  LayoutGrid,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Reusable Countdown Timer Component for Courses That Aren't Started Yet
const CourseCountdown: React.FC<{ scheduledAt: string; title: string }> = ({ scheduledAt }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(scheduledAt) - +new Date();
      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [scheduledAt]);

  const startDay = new Date(scheduledAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const startTime = new Date(scheduledAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  if (!timeLeft) {
    return (
      <div className="flex flex-col gap-1 items-start bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 text-emerald-400">
        <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Broadcaster Signal Active</span>
        <span className="text-[11.5px]">Masterclass has officially commenced! Refresh page or see lesson panel below.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-[#12151c] border border-[#1e222b] rounded-xl p-4 select-none">
      <div className="flex items-center gap-2 text-blue-400">
        <Clock className="w-4 h-4" />
        <span className="text-[11px] font-mono tracking-widest uppercase font-bold">Commencing Transmission In:</span>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-[#07080a] border border-[#1e222b] py-1.5 px-2 rounded-lg">
          <div className="text-sm font-mono font-black text-white">{timeLeft.days}</div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Days</div>
        </div>
        <div className="bg-[#07080a] border border-[#1e222b] py-1.5 px-2 rounded-lg">
          <div className="text-sm font-mono font-black text-white">
            {timeLeft.hours.toString().padStart(2, '0')}
          </div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Hrs</div>
        </div>
        <div className="bg-[#07080a] border border-[#1e222b] py-1.5 px-2 rounded-lg">
          <div className="text-sm font-mono font-black text-white">
            {timeLeft.minutes.toString().padStart(2, '0')}
          </div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Min</div>
        </div>
        <div className="bg-[#07080a] border border-[#1e222b] py-1.5 px-2 rounded-lg">
          <div className="text-sm font-mono font-black text-rose-400 animate-pulse">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Sec</div>
        </div>
      </div>

      <div className="pt-2 border-t border-[#1e222b]/50 flex items-center justify-between text-[11px]">
        <span className="text-neutral-500">Live Date:</span>
        <span className="font-mono text-white text-right">{startDay} at {startTime}</span>
      </div>
    </div>
  );
};

export const LibraryPage: React.FC = () => {
  const { library, addToast, user, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'indicators' | 'bots'>('all');
  
  // Track expanded/collapsed state for course lessons (collapsed by default)
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  
  // Track expanded/collapsed state for licenses (collapsed by default)
  const [expandedIndicators, setExpandedIndicators] = useState<Record<string, boolean>>({});
  const [expandedBots, setExpandedBots] = useState<Record<string, boolean>>({});
  
  // Expiration State
  const [expirations, setExpirations] = useState<Record<string, string>>({});

  // Lessons State
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Loading sub-indicators
  const [loading, setLoading] = useState(true);
  
  // Modal renewal states
  const [renewingProduct, setRenewingProduct] = useState<{ id: string; title: string; price: number; section: "Indicator" | "Bot" } | null>(null);

  // Discord support extension states
  const [renewingDiscordCourse, setRenewingDiscordCourse] = useState<Course | null>(null);
  const [discordSupportDaysLeft, setDiscordSupportDaysLeft] = useState<Record<string, number>>({});

  // Admin simulation state

  // History states
  const [historySearch, setHistorySearch] = useState('');

  const fetchLibraryDetails = async () => {
    try {
      setLoading(true);
      const exps = await API.getExpirations();
      const less = await API.getLessons();
      const txs = await API.getTransactions();
      
      setExpirations(exps);
      setLessons(less);
      setTransactions(txs);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch detailed library indexes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryDetails();
  }, [library]);

  // Initialize Discord support days from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dealdeck_discord_days');
    const parsed = saved ? JSON.parse(saved) : {};
    
    if (library.courses.length > 0) {
      setDiscordSupportDaysLeft(prev => {
        const next = { ...parsed, ...prev };
        library.courses.forEach(c => {
          if (next[c.id] === undefined) {
            next[c.id] = 365; // 1 year starting days
          }
        });
        localStorage.setItem('dealdeck_discord_days', JSON.stringify(next));
        return next;
      });
    }
  }, [library.courses]);

  // Handle License renewal (Bots & Indicators — 1 year)
  const handleRenewLicense = async () => {
    if (!renewingProduct) return;
    try {
      const price = renewingProduct.price;
      const durationDays = 365;

      addToast(`Processing ₹${price.toLocaleString('en-IN')} license extension for "${renewingProduct.title}"...`, "info");
      
      const res = await API.renewProduct(renewingProduct.id, price, durationDays, renewingProduct.section);
      
      if (res.success) {
        addToast(`Subscription successfully extended! License synced to your account.`, "success");
        setRenewingProduct(null);
        fetchLibraryDetails(); // reload transaction list and expirations
      }
    } catch (e) {
      addToast("Renewal failed. Verify your settings.", "error");
    }
  };

  // Handle Discord support renewal (real backend)
  const handleRenewDiscord = async () => {
    if (!renewingDiscordCourse) return;
    try {
      const price = renewingDiscordCourse.discord_renewal_price ?? Math.round(renewingDiscordCourse.price * 2);
      addToast(`Processing ₹${price.toLocaleString('en-IN')} invoice for Discord support 1-Year renewal...`, "info");

      const res = await API.renewDiscord(renewingDiscordCourse.id, price);
      
      if (res.success) {
        addNotification(
          "Discord Support Extension Confirmed",
          `Your Discord Support for "${renewingDiscordCourse.title}" has been successfully extended for another 365 days! Access token is synced.`,
          "lesson",
          "/library"
        );

        addToast(`Successfully extended Discord Support! +365 Days Access Added.`, "success");
        setRenewingDiscordCourse(null);
        fetchLibraryDetails();
      }
    } catch (e) {
      addToast("Discord support extension failed.", "error");
    }
  };

  // Handle Admin Simulation
  // Render Tabs list
  const tabItems = [
    { id: 'all', label: 'All Items', count: library.courses.length + library.indicators.length + library.bots.length, icon: LayoutGrid },
    { id: 'courses', label: 'My Courses', count: library.courses.length, icon: BookOpen },
    { id: 'indicators', label: 'My Indicators', count: library.indicators.length, icon: LineChart },
    { id: 'bots', label: 'My Bots', count: library.bots.length, icon: Zap }
  ] as const;

  const isAllEmpty = library.courses.length === 0 && library.indicators.length === 0 && library.bots.length === 0;

  // Filter dynamic transactions based on search query
  const filteredTransactions = transactions.filter(tx => 
    tx.productTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
    tx.id.toLowerCase().includes(historySearch.toLowerCase()) ||
    tx.type.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="flex-1 h-[calc(100vh-80px)] overflow-y-auto split-scroll p-6 md:p-8 space-y-8 bg-[#07080a] scroll-smooth">
      {/* Top Welcome Title Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1e222b] pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">Client Inventory System</span>
          </div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-white">
            My Secure Library
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Access your licensed indicators, live trading masterclass video rooms, execution bots, and billing records.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#1e222b] overflow-x-auto scrollbar-none">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-6 py-4 border-b-2 text-xs font-semibold tracking-wider font-sans transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'border-blue-500 text-blue-400 bg-blue-950/10' 
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-neutral-500'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-blue-900/40 text-blue-300 border border-blue-500/20' : 'bg-[#12151c] text-neutral-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 select-none">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Calling Client Inventory Records...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* ALL VIEW EMPTY STATE */}
          {activeTab === 'all' && isAllEmpty && (
            <div className="text-center py-16 bg-[#12151c]/10 border border-[#1e222b] rounded-2xl max-w-lg mx-auto p-6">
              <LayoutGrid className="w-10 h-10 text-[#4e5a70] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No Licensed Material Yet</h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                You do not have any subscribed indicators, automated trading bots, or masterclass rooms. Explore our lists to unlock.
              </p>
            </div>
          )}
          
          {/* TAB 1: COURSES SECTION */}
          {(activeTab === 'courses' || (activeTab === 'all' && library.courses.length > 0)) && (() => {
            const activeCourses = library.courses.filter(c => c.status !== 'completed');
            const completedCourses = library.courses.filter(c => c.status === 'completed');
            return (
          <div className="space-y-6 pb-12">
            {activeTab === 'all' && (activeCourses.length > 0 || completedCourses.length > 0) && (
              <div className="flex items-center gap-2 pb-2 border-b border-[#1e222b]/40">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4e5a70]">
                  Masterclasses ({library.courses.length})
                </h3>
              </div>
            )}
            {library.courses.length === 0 ? (
              activeTab === 'courses' && (
                <div className="text-center py-16 bg-[#12151c]/10 border border-dashed border-[#1e222b] rounded-2xl max-w-lg mx-auto p-6">
                  <BookOpen className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white">No Masterclasses Found</h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    You haven't enrolled or checked out any masterclasses. Register in the masterclass page to unlock dynamic lesson transcripts.
                  </p>
                </div>
              )
            ) : (
              <>
              {/* ACTIVE / UPCOMING COURSES */}
              {activeCourses.length > 0 && (
              <div className="space-y-4">
                {activeTab === 'all' && (
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                    </span>
                    <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">Active Masterclasses ({activeCourses.length})</h4>
                  </div>
                )}
              <div className="grid grid-cols-1 gap-8">
                {activeCourses.map((course, index) => {
                  const scheduledDate = course.scheduled_at;
                  const isStarted = scheduledDate ? new Date(scheduledDate) <= new Date() : true;
                  const courseLessons = lessons.filter(l => l.batch_id === course.batch_id);
                  const isExpanded = !!expandedCourses[course.id];
                  const toggleExpand = () => {
                    setExpandedCourses(prev => ({
                      ...prev,
                      [course.id]: !prev[course.id]
                    }));
                  };

                  return (
                    <div 
                      key={`${course.id}-${index}`} 
                      className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl overflow-hidden shadow-lg transition-transform duration-200 hover:border-neutral-800"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12">
                        
                        {/* Course Left Thumbnail Image Column */}
                        <div className="lg:col-span-4 relative min-h-[160px] max-h-[220px] lg:max-h-none overflow-hidden">
                          <img 
                            src={course.image} 
                            alt={course.title} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          {/* Staged Tag Overlay */}
                          <div className="absolute top-3 left-3 bg-[#07080a]/90 backdrop-blur border border-[#1e222b] px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-widest text-[#4e5a70] uppercase">
                            {course.category}
                          </div>
                        </div>

                        {/* Course Metadata Content Column */}
                        <div className="lg:col-span-8 p-5 md:p-6 lg:p-7 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <span className="font-mono text-[10px] uppercase font-semibold text-[#4e5a70]">
                                Instructor: {course.lecturer}
                              </span>
                              <span className={`self-start sm:self-auto text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                                course.difficulty === 'Advanced' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                                course.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {course.difficulty} Difficulty
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white tracking-wide mt-2">
                              {course.title}
                            </h3>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed max-w-2xl">
                              {course.description}
                            </p>
                          </div>

                          {/* Status Segment Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#1e222b]/50">
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Live Masterclass Room State:</span>
                              <div className="mt-1.5 flex items-center gap-2">
                                {isStarted ? (
                                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-bold">
                                    <span className="flex h-1.5 w-1.5 relative">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                                    </span>
                                    <span>COURSE STARTED & ACTIVE</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-blue-400 text-xs font-mono font-bold">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>NOT STARTED YET</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Target / Countdown Info */}
                            <div>
                              {!isStarted && scheduledDate ? (
                                <CourseCountdown scheduledAt={scheduledDate} title={course.title} />
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Video Content:</span>
                                  <p className="text-xs text-white font-semibold">
                                    {courseLessons.length} Operational Lecture Links Published!
                                  </p>
                                  <div className="flex flex-col gap-0.5 text-[10px] text-neutral-400 font-mono mt-0.5">
                                    <span>Duration: {course.duration}</span>
                                    {scheduledDate && (
                                      <span>
                                        Started On: {new Date(scheduledDate).toLocaleDateString('en-US', {
                                          weekday: 'long',
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Premium Discord Lounge Integration */}
                          {isStarted && (
                          <div className="pt-4 border-t border-[#1e222b]/50">
                            <div className="bg-indigo-950/15 border border-indigo-500/15 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                  <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-indigo-400">Premium Discord Support Portal</span>
                                  <span className="text-[8px] px-2 py-0.5 bg-indigo-600 font-mono text-white rounded font-bold uppercase select-none">
                                    {Math.max(0, discordSupportDaysLeft[course.id] ?? 365)} Days Left
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans max-w-xl">
                                  Access private trade setup lounges, dynamic scripts, and immediate instructor Q&A. This premium support continues for 1 full year even after the 1-month course ends.
                                </p>
                                <div className="flex items-center gap-3 text-[9.5px] font-mono text-neutral-500 flex-wrap">
                                  <span>•</span>
                                  <span>Discord Access: <span className="text-emerald-400 font-semibold">1 Year Included & Expandable</span></span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto select-none">
                                <a 
                                  href="https://discord.gg/dealdeck" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white rounded-lg text-[10.5px] font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-all select-none shadow-md shadow-indigo-950/20 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Join Discord</span>
                                </a>
                                
                                <button
                                  type="button"
                                  onClick={() => setRenewingDiscordCourse(course)}
                                  className="px-3 py-1.5 bg-[#12151c] hover:bg-neutral-800 border border-[#1e222b] hover:border-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[10.5px] font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-all cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3 text-neutral-400" />
                                  <span>Extend +1 Yr</span>
                                </button>
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      </div>

                      {/* RENDER LESSONS LIST (If Course commenced) */}
                      {isStarted && (
                        <div className="border-t border-[#1e222b] bg-[#090b0e]">
                          {/* Toggle Expand/Collapse Button Bar */}
                          <div className="flex justify-center p-3 border-b border-[#1e222b]/30">
                            <button
                              onClick={toggleExpand}
                              type="button"
                              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 hover:text-white bg-[#12151c] hover:bg-[#181d26] border border-[#1e222b] hover:border-neutral-700 transition-all cursor-pointer shadow-md transform active:scale-[0.98] duration-150"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4 text-rose-400" />
                                  <span>Hide Lessons</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 text-emerald-400 animate-bounce translate-y-0.5" />
                                  <span>Expand Lessons ({courseLessons.length})</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Lessons Grid Wrapper */}
                          {isExpanded && (
                            <div className="p-5 md:p-6 space-y-6">
                              <div className="flex items-center justify-between border-b border-[#1e222b]/40 pb-3">
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4 text-emerald-400" />
                                  <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4e5a70]">
                                    Lecture & Broadcast Terminal ({courseLessons.length})
                                  </h4>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Instant Sync Terminal</span>
                              </div>

                              {courseLessons.length === 0 ? (
                                <div id="no-lessons-disclaimer" className="text-center py-6 text-xs text-neutral-500">
                                  No lessons uploaded for this semester yet. Use the Admin console at the top to instantly publish one!
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  {/* Live Google Meet Sessions Segment */}
                                  {(() => {
                                    const meetLessons = courseLessons.filter(l => l.type === 'meet');
                                    if (meetLessons.length === 0) return null;
                                    return (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-1.5 border-b border-[#131720] pb-2">
                                          <Video className="w-3.5 h-3.5 text-teal-400" />
                                          <h5 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider font-mono">Live Google Meet Sessions ({meetLessons.length})</h5>
                                        </div>
                                        {meetLessons.length === 0 ? null : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {meetLessons.map((lesson, idx) => {
                                              const formattedStartTime = lesson.startTime 
                                                ? new Date(lesson.startTime).toLocaleString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                  })
                                                : undefined;

                                              return (
                                                <div 
                                                  key={`${lesson.id}-${idx}`} 
                                                  className="bg-[#12151c] hover:bg-[#12151c]/90 border border-[#1e222b] rounded-xl p-4 flex flex-col justify-between space-y-4"
                                                >
                                                  <div>
                                                    <div className="flex items-center justify-between gap-2">
                                                      <span className="px-2 py-0.5 bg-teal-500/10 text-[9px] font-mono text-teal-400 font-bold tracking-wider rounded uppercase">
                                                        Google Meet Room
                                                      </span>
                                                      <span className="text-[10px] text-neutral-500 font-mono font-medium">
                                                        {lesson.duration || "Live"}
                                                      </span>
                                                    </div>
                                                    <h5 className="text-[13px] font-bold text-white tracking-wide mt-2">
                                                      {lesson.title}
                                                    </h5>

                                                    <div className="mt-3 bg-neutral-950/40 border border-[#1e222b]/50 rounded-lg p-2.5 flex items-start gap-2">
                                                      <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 animate-pulse" />
                                                      <div>
                                                        <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider font-mono block">Meeting Start Time</span>
                                                        <span className="text-[11px] text-amber-400 font-mono font-semibold">
                                                          {formattedStartTime || "No start time set"}
                                                        </span>
                                                      </div>
                                                    </div>

                                                    <p className="text-[10px] font-mono text-[#4e5a70] mt-2">
                                                      Created: {new Date(lesson.addedAt).toLocaleDateString()}
                                                    </p>
                                                  </div>

                                                  <a
                                                    href={lesson.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-2 px-3.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-950/20"
                                                  >
                                                    <Video className="w-3.5 h-3.5 text-white" />
                                                    <span>Join Google Meet Session</span>
                                                    <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                                                  </a>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Live Zoom Sessions Segment */}
                                  {(() => {
                                    const zoomLessons = courseLessons.filter(l => l.type === 'zoom');
                                    if (zoomLessons.length === 0) return null;
                                    return (
                                      <div className="space-y-3 pt-3 border-t border-[#1e222b]/30">
                                        <div className="flex items-center gap-1.5 border-b border-[#131720] pb-2">
                                          <Video className="w-3.5 h-3.5 text-blue-400" />
                                          <h5 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider font-mono">Live Zoom Sessions ({zoomLessons.length})</h5>
                                        </div>
                                        {zoomLessons.length === 0 ? null : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {zoomLessons.map((lesson, idx) => {
                                              const formattedStartTime = lesson.startTime 
                                                ? new Date(lesson.startTime).toLocaleString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                  })
                                                : undefined;

                                              return (
                                                <div 
                                                  key={`${lesson.id}-${idx}`} 
                                                  className="bg-[#12151c] hover:bg-[#12151c]/90 border border-[#1e222b] rounded-xl p-4 flex flex-col justify-between space-y-4"
                                                >
                                                  <div>
                                                    <div className="flex items-center justify-between gap-2">
                                                      <span className="px-2 py-0.5 bg-blue-500/10 text-[9px] font-mono text-blue-400 font-bold tracking-wider rounded uppercase">
                                                        Live Zoom Stream
                                                      </span>
                                                      <span className="text-[10px] text-neutral-500 font-mono font-medium">
                                                        {lesson.duration || "Live"}
                                                      </span>
                                                    </div>
                                                    <h5 className="text-[13px] font-bold text-white tracking-wide mt-2">
                                                      {lesson.title}
                                                    </h5>

                                                    <div className="mt-3 bg-neutral-950/40 border border-[#1e222b]/50 rounded-lg p-2.5 flex items-start gap-2">
                                                      <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 animate-pulse" />
                                                      <div>
                                                        <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider font-mono block">Meeting Start Time</span>
                                                        <span className="text-[11px] text-amber-400 font-mono font-semibold">
                                                          {formattedStartTime || "No start time set"}
                                                        </span>
                                                      </div>
                                                    </div>

                                                    <p className="text-[10px] font-mono text-[#4e5a70] mt-2">
                                                      Created: {new Date(lesson.addedAt).toLocaleDateString()}
                                                    </p>
                                                  </div>

                                                  <a
                                                    href={lesson.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-2 px-3.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/20"
                                                  >
                                                    <Video className="w-3.5 h-3.5 text-white" />
                                                    <span>Enter Live Zoom Webinar</span>
                                                    <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                                                  </a>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Recorded YouTube Classes Segment */}
                                  {(() => {
                                    const youtubeLessons = courseLessons.filter(l => l.type === 'youtube');
                                    if (youtubeLessons.length === 0) return null;
                                    return (
                                      <div className="space-y-3 pt-3 border-t border-[#1e222b]/30">
                                        <div className="flex items-center gap-1.5 border-b border-[#131720] pb-2">
                                          <Play className="w-3 text-rose-500 fill-rose-500" />
                                          <h5 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider font-mono">Recorded Lectures ({youtubeLessons.length})</h5>
                                        </div>
                                        {youtubeLessons.length === 0 ? null : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {youtubeLessons.map((lesson, idx) => (
                                              <div 
                                                key={`${lesson.id}-${idx}`} 
                                                className="bg-[#12151c] hover:bg-[#12151c]/90 border border-[#1e222b] rounded-xl p-4 flex flex-col justify-between space-y-4"
                                              >
                                                <div>
                                                  <div className="flex items-center justify-between gap-2">
                                                    <span className="px-2 py-0.5 bg-rose-500/10 text-[9px] font-mono text-rose-400 font-bold tracking-wider rounded uppercase">
                                                      YouTube Video
                                                    </span>
                                                    <span className="text-[10px] text-neutral-500 font-mono font-medium">
                                                      {lesson.duration || "Recorded"}
                                                    </span>
                                                  </div>
                                                  <h5 className="text-[13px] font-bold text-white tracking-wide mt-2">
                                                    {lesson.title}
                                                  </h5>
                                                  <p className="text-[10px] font-mono text-[#4e5a70] mt-1">
                                                    Published: {new Date(lesson.addedAt).toLocaleDateString()}
                                                  </p>
                                                </div>

                                                <a
                                                  href={lesson.link}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="w-full py-2 px-3.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/20"
                                                >
                                                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                                                  <span>Stream Recorded Video</span>
                                                  <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                                                </a>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
              )}

              {/* COMPLETED COURSES */}
              {completedCourses.length > 0 && (
              <div className="space-y-4">
                {activeTab === 'all' && (
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" />
                    <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">Completed Masterclasses ({completedCourses.length})</h4>
                  </div>
                )}
              <div className="grid grid-cols-1 gap-8">
                {completedCourses.map((course, index) => {
                  const scheduledDate = course.scheduled_at;
                  const courseLessons = lessons.filter(l => l.batch_id === course.batch_id);

                  return (
                    <div 
                      key={`${course.id}-${index}`} 
                      className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl overflow-hidden shadow-lg opacity-80"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12">
                        {/* Course Left Thumbnail Image Column */}
                        <div className="lg:col-span-4 relative min-h-[160px] max-h-[220px] lg:max-h-none overflow-hidden">
                          <img 
                            src={course.image} 
                            alt={course.title} 
                            className="absolute inset-0 w-full h-full object-cover grayscale-[30%]"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-3 left-3 bg-[#07080a]/90 backdrop-blur border border-[#1e222b] px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-widest text-[#4e5a70] uppercase">
                            {course.category}
                          </div>
                          <div className="absolute top-3 right-3 bg-emerald-900/80 backdrop-blur border border-emerald-500/30 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-widest text-emerald-300 uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </div>
                        </div>

                        {/* Course Metadata Content Column */}
                        <div className="lg:col-span-8 p-5 md:p-6 lg:p-7 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <span className="font-mono text-[10px] uppercase font-semibold text-[#4e5a70]">
                                Instructor: {course.lecturer}
                              </span>
                              <span className={`self-start sm:self-auto text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                                course.difficulty === 'Advanced' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                                course.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {course.difficulty} Difficulty
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white tracking-wide mt-2">
                              {course.title}
                            </h3>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed max-w-2xl">
                              {course.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#1e222b]/50">
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Status:</span>
                              <div className="mt-1.5 flex items-center gap-1.5 text-neutral-500 text-xs font-mono font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>COURSE COMPLETED</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Content:</span>
                              <p className="text-xs text-neutral-400 font-semibold">
                                {courseLessons.length} Total Lectures
                              </p>
                              <div className="flex flex-col gap-0.5 text-[10px] text-neutral-400 font-mono mt-0.5">
                                <span>Duration: {course.duration}</span>
                                {scheduledDate && (
                                  <span>
                                    Started On: {new Date(scheduledDate).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Discord Support for Completed Courses */}
                          <div className="pt-4 border-t border-[#1e222b]/50">
                            <div className="bg-indigo-950/15 border border-indigo-500/15 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                  <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-indigo-400">Premium Discord Support Portal</span>
                                  <span className="text-[8px] px-2 py-0.5 bg-indigo-600 font-mono text-white rounded font-bold uppercase select-none">
                                    {Math.max(0, discordSupportDaysLeft[course.id] ?? 0)} Days Left
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans max-w-xl">
                                  Course has ended but Discord access continues for 1 full year from purchase date. Extend your support anytime.
                                </p>
                                <div className="flex items-center gap-3 text-[9.5px] font-mono text-neutral-500 flex-wrap">
                                  <span>•</span>
                                  <span>Discord Access: <span className="text-emerald-400 font-semibold">Active & Expandable</span></span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto select-none">
                                <a 
                                  href="https://discord.gg/dealdeck" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white rounded-lg text-[10.5px] font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-all select-none shadow-md shadow-indigo-950/20 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Join Discord</span>
                                </a>
                                
                                <button
                                  type="button"
                                  onClick={() => setRenewingDiscordCourse(course)}
                                  className="px-3 py-1.5 bg-[#12151c] hover:bg-neutral-800 border border-[#1e222b] hover:border-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[10.5px] font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-all cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3 text-neutral-400" />
                                  <span>Extend +1 Yr</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
              )}
              </>
            )}
            </div>
            );
          })()}

          {/* TAB 2: INDICATORS SECTION */}
          {(activeTab === 'indicators' || (activeTab === 'all' && library.indicators.length > 0)) && (
            <div className="space-y-6 pb-12">
              {activeTab === 'all' && (
                <div className="flex items-center gap-2 pt-4 pb-2 border-b border-[#1e222b]/40">
                  <LineChart className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4e5a70]">
                    Licensed Script Indicators ({library.indicators.length})
                  </h3>
                </div>
              )}
              {library.indicators.length === 0 ? (
                activeTab === 'indicators' && (
                  <div className="text-center py-16 bg-[#12151c]/10 border border-dashed border-[#1e222b] rounded-2xl max-w-lg mx-auto p-6">
                    <LineChart className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-white">No Indicators Found</h3>
                    <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                      You haven't purchased or compiled any TradingView indicator scripts. Visit the scripts page to secure premium indicators.
                    </p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {library.indicators.map((ind, index) => {
                    const expiry = expirations[ind.id];
                    const isLifetime = !expiry;
                    const daysRemaining = expiry ? Math.ceil((+new Date(expiry) - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                    const isExpired = expiry && daysRemaining <= 0;

                    const isIndExpanded = !!expandedIndicators[ind.id];
                    const toggleIndExpand = () => {
                      setExpandedIndicators(prev => ({
                        ...prev,
                        [ind.id]: !prev[ind.id]
                      }));
                    };

                    return (
                      <div 
                        key={`${ind.id}-${index}`} 
                        className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl overflow-hidden p-5 flex flex-col justify-between space-y-5"
                      >
                        <div className="space-y-4">
                          <div className="relative h-44 overflow-hidden rounded-xl border border-[#1e222b]">
                            <img 
                              src={ind.image} 
                              alt={ind.title} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-blue-900/90 text-[9px] font-mono rounded font-bold text-blue-300">
                              {ind.scriptType}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="text-base font-bold text-white tracking-wide">
                              {ind.title}
                            </h3>
                            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                              {ind.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 py-2 border-y border-[#1e222b]/50 text-xs font-mono">
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Timeframes:</span>
                              <span className="text-white font-medium">{ind.timeframe || "All"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Calculated Accuracy:</span>
                              <span className="text-blue-400 font-semibold">{ind.accuracy || "N/A"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Toggle license detail button */}
                        <div className="flex justify-center pt-1">
                          <button
                            type="button"
                            onClick={toggleIndExpand}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 hover:text-white bg-[#12151c]/60 hover:bg-[#181d26] border border-[#1e222b] hover:border-neutral-700 transition-all cursor-pointer shadow-sm transform active:scale-[0.98] duration-150"
                          >
                            {isIndExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5 text-rose-400" />
                                <span>Hide License Access</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-400 animate-bounce translate-y-0.5" />
                                <span>Expand License Access</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* EXPIRY DETAILS AND RENEWAL ACTION */}
                        {isIndExpanded && (
                          <div className="bg-[#12151c]/60 border border-[#1e222b] rounded-xl p-3.5 space-y-3.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className={`w-4 h-4 ${isExpired ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
                                <span className="text-neutral-400 font-medium">License Expiry status:</span>
                              </div>
                              <span className={`font-mono text-[10.5px] uppercase tracking-wider font-semibold ${
                                isExpired ? 'text-rose-400' : daysRemaining <= 5 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {isExpired ? 'Expired' : 'Active License'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center bg-[#07080a]/50 p-2.5 rounded-lg border border-[#1e222b]/40 text-xs">
                              <span className="text-neutral-500">Details:</span>
                              <span className="font-mono text-white text-right">
                                {isLifetime ? (
                                  <span className="text-blue-400 font-bold">LIFETIME VIP</span>
                                ) : isExpired ? (
                                  <span className="text-rose-400 font-bold">EXPIRED {Math.abs(daysRemaining)} DAYS AGO</span>
                                ) : (
                                  <span>{new Date(expiry).toLocaleDateString()} ({daysRemaining} days left)</span>
                                )}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setRenewingProduct({ id: ind.id, title: ind.title, price: ind.price, section: "Indicator" })}
                              className="w-full py-2 bg-[#12151c] hover:bg-blue-600 border border-[#1e222b] hover:border-blue-500 text-neutral-300 hover:text-white rounded-lg text-xs font-mono font-bold uppercase transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Renew Script Subscription</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BOTS SECTION */}
          {(activeTab === 'bots' || (activeTab === 'all' && library.bots.length > 0)) && (
            <div className="space-y-6 pb-12">
              {activeTab === 'all' && (
                <div className="flex items-center gap-2 pt-4 pb-2 border-b border-[#1e222b]/40">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4e5a70]">
                    Execution Trading Bots ({library.bots.length})
                  </h3>
                </div>
              )}
              {library.bots.length === 0 ? (
                activeTab === 'bots' && (
                  <div className="text-center py-16 bg-[#12151c]/10 border border-dashed border-[#1e222b] rounded-2xl max-w-lg mx-auto p-6">
                    <Zap className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-white">No Automated Bots Configured</h3>
                    <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                      You haven't purchased or bound any algorithmic systematic execution bots. Visit the Automated Bots tab to get started.
                    </p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {library.bots.map((bot, index) => {
                    const expiry = expirations[bot.id];
                    const isLifetime = !expiry;
                    const daysRemaining = expiry ? Math.ceil((+new Date(expiry) - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                    const isExpired = expiry && daysRemaining <= 0;

                    const isBotExpanded = !!expandedBots[bot.id];
                    const toggleBotExpand = () => {
                      setExpandedBots(prev => ({
                        ...prev,
                        [bot.id]: !prev[bot.id]
                      }));
                    };

                    return (
                      <div 
                        key={`${bot.id}-${index}`} 
                        className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl overflow-hidden p-5 flex flex-col justify-between space-y-5"
                      >
                        <div className="space-y-4">
                          <div className="relative h-44 overflow-hidden rounded-xl border border-[#1e222b]">
                            <img 
                              src={bot.image} 
                              alt={bot.title} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-blue-900/90 text-[9px] font-mono rounded font-bold text-blue-300">
                              API Bound: {bot.exchange}
                            </div>
                            
                            {/* APY indicator */}
                            <div className="absolute bottom-2.5 left-2.5 bg-emerald-950/90 backdrop-blur text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono text-xs font-bold flex items-center gap-1">
                              <Activity className="w-3 h-3 text-emerald-400" />
                              <span>{bot.apy} APY</span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="text-base font-bold text-white tracking-wide">
                              {bot.title}
                            </h3>
                            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                              {bot.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 py-2 border-y border-[#1e222b]/50 text-xs font-mono">
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Connection Server:</span>
                              <span className="text-white font-medium">AWS US-East</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Operation Status:</span>
                              <span className={`font-semibold ${bot.status === 'Running' ? 'text-emerald-400' : 'text-neutral-400'}`}>{bot.status || "Idle"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Toggle license detail button */}
                        <div className="flex justify-center pt-1">
                          <button
                            type="button"
                            onClick={toggleBotExpand}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 hover:text-white bg-[#12151c]/60 hover:bg-[#181d26] border border-[#1e222b] hover:border-neutral-700 transition-all cursor-pointer shadow-sm transform active:scale-[0.98] duration-150"
                          >
                            {isBotExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5 text-rose-400" />
                                <span>Hide Operation License</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-400 animate-bounce translate-y-0.5" />
                                <span>Expand Operation License</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* LICENSING EXPIRY & RENEW BUTTON */}
                        {isBotExpanded && (
                          <div className="bg-[#12151c]/60 border border-[#1e222b] rounded-xl p-3.5 space-y-3.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className={`w-4 h-4 ${isExpired ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
                                <span className="text-neutral-400 font-medium">Licensed Operation Limit:</span>
                              </div>
                              <span className={`font-mono text-[10.5px] uppercase tracking-wider font-semibold ${
                                isExpired ? 'text-rose-400' : daysRemaining <= 5 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {isExpired ? 'Expired' : 'Active License'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center bg-[#07080a]/50 p-2.5 rounded-lg border border-[#1e222b]/40 text-xs">
                              <span className="text-neutral-500">Details:</span>
                              <span className="font-mono text-white text-right">
                                {isLifetime ? (
                                  <span className="text-blue-400 font-bold">LIFETIME PRIVATE VIP</span>
                                ) : isExpired ? (
                                  <span className="text-rose-400 font-bold">EXPIRED {Math.abs(daysRemaining)} DAYS AGO</span>
                                ) : (
                                  <span>{new Date(expiry).toLocaleDateString()} ({daysRemaining} days remaining)</span>
                                )}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setRenewingProduct({ id: bot.id, title: bot.title, price: bot.price, section: "Bot" })}
                              className="w-full py-2 bg-[#12151c] hover:bg-blue-600 border border-[#1e222b] hover:border-blue-500 text-neutral-300 hover:text-white rounded-lg text-xs font-mono font-bold uppercase transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Renew Bot License</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}



      {/* RENEWAL MODAL DIALOG OVERLAY */}
      {renewingProduct && (() => {
        const price = renewingProduct.price;
        return (
        <div className="fixed inset-0 bg-[#07080a]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-blue-400">
              <RefreshCw className="w-4.5 h-4.5 text-blue-400 animate-spin" />
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Extend Product License Subscription
              </h3>
            </div>
            
            <p className="text-xs text-neutral-400 leading-relaxed">
              Renew subscription and synchronized binaries for <span className="text-white font-bold font-sans">"{renewingProduct.title}"</span>. Extensions apply instantly to your account.
            </p>

            <div className="p-3 bg-[#12151c] rounded-xl border border-[#1e222b] flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] text-blue-400 font-mono font-bold block uppercase tracking-wide">RENEWAL PERIOD</span>
                <span className="text-neutral-300 font-sans">1 Year License Extension</span>
              </div>
              <span className="font-mono font-black text-blue-400 text-sm">₹{price.toLocaleString('en-IN')}</span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRenewingProduct(null)}
                className="py-2.5 bg-[#12151c] hover:bg-[#1e222b] border border-[#1e222b] text-neutral-400 hover:text-white rounded-xl text-xs font-mono font-bold tracking-wider uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenewLicense}
                className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 rounded-xl text-xs font-mono font-semibold tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pay & Renew</span>
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* DISCORD SUPPORT RENEWAL MODAL */}
      {renewingDiscordCourse && (() => {
        const discordPrice = renewingDiscordCourse.discord_renewal_price ?? Math.round(renewingDiscordCourse.price * 2);
        return (
        <div className="fixed inset-0 bg-[#07080a]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-indigo-400">
              <svg className="w-5 h-5 text-indigo-400 animate-pulse fill-indigo-400" viewBox="0 0 127.14 96.36">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.8.69,1.63,1.38,2.51,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.58-18.83C129.24,47.88,123.36,25,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
              </svg>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Extend Discord Lounge Access
              </h3>
            </div>
            
            <p className="text-xs text-neutral-400 leading-relaxed">
              Unlock or expand private support logs for <span className="text-white font-bold font-sans">"{renewingDiscordCourse.title}"</span>. Extensions add 1 full year (+365 Days) to your lounge token immediately.
            </p>

            <div className="p-3 bg-indigo-950/25 rounded-xl border border-indigo-500/10 flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] text-indigo-400 font-mono font-bold block uppercase tracking-wide">SUPPORT RENEWAL TICKET</span>
                <span className="text-neutral-300 font-sans">12 Months (Full Coverage)</span>
              </div>
              <span className="font-mono font-black text-indigo-400 text-sm">₹{discordPrice.toLocaleString('en-IN')} INR</span>
            </div>

            <p className="text-[10px] text-neutral-500 font-mono leading-normal text-center bg-[#07080a] p-2 rounded-lg border border-[#1e222b]">
              Your TradingView ID <span className="text-emerald-400 font-semibold">[{user?.tvid || "Not Logged"}]</span> will retain permission tags in Discord even if the 1-year course materials conclude!
            </p>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRenewingDiscordCourse(null)}
                className="py-2.5 bg-[#12151c] hover:bg-[#1e222b] border border-[#1e222b] text-neutral-400 hover:text-white rounded-xl text-xs font-mono font-bold tracking-wider uppercase cursor-pointer"
              >
                Hold Cancel
              </button>
              <button
                type="button"
                onClick={handleRenewDiscord}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 rounded-xl text-xs font-mono font-semibold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Extend Support</span>
              </button>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
};

export default LibraryPage;
