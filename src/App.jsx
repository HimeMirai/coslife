import { useState, useEffect, useRef } from 'react';
import { 
  FolderKanban, 
  Ruler, 
  FileBox, 
  MapPin, 
  MessageSquare,
  LogOut,
  Settings,
  X,
  Palette
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, orderBy, limit } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import CraftingStudio from './components/CraftingStudio';
import PropScaler from './components/PropScaler';
import BlueprintVault from './components/BlueprintVault';
import ProfileModal from './components/ProfileModal';
import LogoutModal from './components/LogoutModal';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ConCompanion from './components/ConCompanion';
import CosplayChat from './components/CosplayChat';
import DashboardThemeModal from './components/DashboardThemeModal';

// Brand logo asset
import coslifeLogo from './assets/cos_logo.png'; 

const DEFAULT_THEME = {
  bgType: 'color',
  bgValue: '#020617',
  overlayOpacity: 0.65,
};

// Synthesize a gentle notification chime using Web Audio API (no external MP3 required)
const playNotificationSound = (type = 'global') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq, startOffset, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);

      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.14, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    if (type === 'dm') {
      // Two-note bright chime for Private DMs
      playTone(660, 0, 0.16);
      playTone(880, 0.12, 0.24);
    } else {
      // Soft single pop chime for Community Lounge
      playTone(587.33, 0, 0.2);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore autoplay restrictions before first user interaction
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // Controls 'login' vs 'register' view
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  // State for the Chat Pop-up Modal & Chat Heads
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadGlobalCount, setUnreadGlobalCount] = useState(0);
  // [{ id, channel: 'global' | 'dm', uid, displayName, photoURL, count, lastText }]
  const [chatHeads, setChatHeads] = useState([]);
  const [selectedChatHeadUser, setSelectedChatHeadUser] = useState(null);
  const seenMsgIdsRef = useRef({});

  // Dashboard Background Theme State
  const [dashboardTheme, setDashboardTheme] = useState(DEFAULT_THEME);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load user's saved dashboard background preferences from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'user_preferences', user.uid), (snap) => {
      if (snap.exists()) {
        setDashboardTheme((prev) => ({ ...prev, ...snap.data() }));
      } else {
        setDashboardTheme(DEFAULT_THEME);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Listen for new Global & DM messages to play sound, show Chat Heads & Unread Dot
  useEffect(() => {
    if (!user?.uid) return;

    // 1. Watch latest global community message
    const qGlobal = query(
      collection(db, 'chat_messages'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsubGlobal = onSnapshot(qGlobal, (snapshot) => {
      if (snapshot.empty) return;
      const latest = snapshot.docs[0];
      const data = latest.data();

      if (seenMsgIdsRef.current.global === latest.id) return;
      const isFirstLoad = !('global' in seenMsgIdsRef.current);
      seenMsgIdsRef.current.global = latest.id;

      if (!isFirstLoad && data.uid !== user.uid) {
        playNotificationSound('global');

        if (!isChatOpen) {
          setUnreadGlobalCount((prev) => prev + 1);
          setChatHeads((prev) => {
            const existing = prev.find((h) => h.id === 'global');
            const previewText = `${data.displayName || 'Cosplayer'}: ${data.text || 'Sent media'}`;
            if (existing) {
              return prev.map((h) =>
                h.id === 'global'
                  ? {
                      ...h,
                      photoURL: data.photoURL || h.photoURL,
                      count: h.count + 1,
                      lastText: previewText,
                    }
                  : h
              );
            }
            return [
              ...prev,
              {
                id: 'global',
                channel: 'global',
                uid: data.uid,
                displayName: 'Community Lounge',
                photoURL: data.photoURL || '',
                count: 1,
                lastText: previewText,
              },
            ];
          });
        }
      }
    });

    // 2. Watch online users' DM channels for incoming private messages
    const dmUnsubs = {};
    const unsubOnline = onSnapshot(collection(db, 'online_users'), (onlineSnap) => {
      onlineSnap.docs.forEach((uDoc) => {
        const otherUser = { uid: uDoc.id, ...uDoc.data() };
        if (otherUser.uid === user.uid || dmUnsubs[otherUser.uid]) return;

        const dmChannelId = [user.uid, otherUser.uid].sort().join('_');
        const qDM = query(
          collection(db, `direct_messages/${dmChannelId}/messages`),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        dmUnsubs[otherUser.uid] = onSnapshot(qDM, (dmSnap) => {
          if (dmSnap.empty) return;
          const latestDM = dmSnap.docs[0];
          const dmData = latestDM.data();

          if (seenMsgIdsRef.current[otherUser.uid] === latestDM.id) return;
          const isFirstDM = !(otherUser.uid in seenMsgIdsRef.current);
          seenMsgIdsRef.current[otherUser.uid] = latestDM.id;

          if (!isFirstDM && dmData.uid !== user.uid) {
            playNotificationSound('dm');

            if (!isChatOpen) {
              setChatHeads((prev) => {
                const existing = prev.find((h) => h.id === otherUser.uid);
                if (existing) {
                  return prev.map((h) =>
                    h.id === otherUser.uid
                      ? {
                          ...h,
                          displayName: dmData.displayName || otherUser.displayName || h.displayName,
                          photoURL: dmData.photoURL || otherUser.photoURL || h.photoURL,
                          count: h.count + 1,
                          lastText: dmData.text || 'New message',
                        }
                      : h
                  );
                }
                return [
                  ...prev,
                  {
                    id: otherUser.uid,
                    channel: 'dm',
                    uid: otherUser.uid,
                    displayName: dmData.displayName || otherUser.displayName || 'Cosplayer',
                    photoURL: dmData.photoURL || otherUser.photoURL || '',
                    count: 1,
                    lastText: dmData.text || 'New message',
                  },
                ];
              });
            }
          }
        });
      });
    });

    return () => {
      unsubGlobal();
      unsubOnline();
      Object.values(dmUnsubs).forEach((fn) => fn());
    };
  }, [user?.uid, isChatOpen]);

  const handleOpenChatFromButton = () => {
    setSelectedChatHeadUser(null);
    setUnreadGlobalCount(0);
    setChatHeads((prev) => prev.filter((h) => h.channel !== 'global'));
    setIsChatOpen(true);
  };

  const handleOpenChatHead = (head) => {
    if (head.channel === 'global') {
      setSelectedChatHeadUser(null);
      setUnreadGlobalCount(0);
    } else {
      setSelectedChatHeadUser({
        uid: head.uid,
        displayName: head.displayName,
        photoURL: head.photoURL,
      });
    }
    setChatHeads((prev) => prev.filter((h) => h.id !== head.id));
    setIsChatOpen(true);
  };

  const handleDismissChatHead = (e, headId) => {
    e.stopPropagation();
    if (headId === 'global') setUnreadGlobalCount(0);
    setChatHeads((prev) => prev.filter((h) => h.id !== headId));
  };

  const handleGoogleSignIn = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in error:", error.message);
    }
  };

  const handleEmailLogin = ({ role, email }) => {
    setUser({
      displayName: email.split('@')[0],
      email: email,
      role: role,
      photoURL: ''
    });
  };

  const handleRegister = ({ role, fullName, email }) => {
    setUser({
      displayName: fullName || email.split('@')[0],
      email: email,
      role: role,
      photoURL: ''
    });
  };

  const handleSaveAndLogout = async () => {
    window.dispatchEvent(new CustomEvent('coslife_force_save'));
    try {
      await signOut(auth);
      setUser(null);
      setDashboardTheme(DEFAULT_THEME);
      setChatHeads([]);
      setUnreadGlobalCount(0);
      setView('login');
      setIsLogoutModalOpen(false);
    } catch (error) {
      console.error("Sign out error:", error.message);
    }
  };

  const handleDiscardAndLogout = async () => {
    window.dispatchEvent(new CustomEvent('coslife_revert_changes'));
    try {
      await signOut(auth);
      setUser(null);
      setDashboardTheme(DEFAULT_THEME);
      setChatHeads([]);
      setUnreadGlobalCount(0);
      setView('login');
      setIsLogoutModalOpen(false);
    } catch (error) {
      console.error("Sign out error:", error.message);
    }
  };

  const handleUpdateProfile = async ({ displayName, photoURL }) => {
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName, photoURL });
        await setDoc(
          doc(db, 'online_users', auth.currentUser.uid),
          { displayName, photoURL },
          { merge: true }
        );
        setUser({ ...auth.currentUser, displayName, photoURL });
      } catch (error) {
        console.error("Profile update error:", error);
      }
    } else {
      setUser({ ...user, displayName, photoURL });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <img src={coslifeLogo} alt="CosLife Logo" className="w-16 h-16 animate-pulse mb-3 object-contain rounded-xl" />
        <p className="text-sm font-medium text-slate-400">Loading CosLife Workspace...</p>
      </div>
    );
  }

  // 🔒 AUTH GATE: Login & Registration Screens
  if (!user) {
    if (view === 'register') {
      return (
        <RegisterForm 
          onRegister={handleRegister}
          onLoginClick={() => setView('login')}
          onGoogleSignUp={handleGoogleSignIn}
        />
      );
    }

    return (
      <LoginForm 
        onLogin={handleEmailLogin}
        onGoogleSignIn={handleGoogleSignIn}
        onRegisterClick={() => setView('register')}
      />
    );
  }

  const wrapperStyle =
    dashboardTheme.bgType === 'image'
      ? {
          backgroundImage: `linear-gradient(rgba(2, 6, 23, ${dashboardTheme.overlayOpacity ?? 0.65}), rgba(2, 6, 23, ${dashboardTheme.overlayOpacity ?? 0.65})), url("${dashboardTheme.bgValue}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }
      : { background: dashboardTheme.bgValue };

  const totalBadgeCount =
    unreadGlobalCount +
    chatHeads
      .filter((h) => h.channel === 'dm')
      .reduce((sum, h) => sum + h.count, 0);

  // ✅ LOGGED IN WORKSPACE
  return (
    <div style={wrapperStyle} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative transition-all duration-300">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={coslifeLogo} alt="CosLife Logo" className="h-9 w-9 object-cover rounded-lg border border-rose-500/30" />
            <span className="font-extrabold text-lg text-white tracking-wider ml-1">
              Cos<span className="text-rose-500">Life</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-xs font-medium text-slate-200 hover:text-amber-400 transition"
              title="Customize Dashboard Background"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Theme</span>
            </button>

            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 hover:opacity-80 transition group"
              title="Customize Profile"
            >
              <img 
                src={user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosplayer1'} 
                alt={user.displayName} 
                className="w-8 h-8 rounded-full border border-amber-500/50 object-cover"
              />
              <span className="text-sm font-medium hidden sm:inline group-hover:text-amber-400 transition">
                {user.displayName}
              </span>
              <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </button>
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition ml-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto gap-2 py-2">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'studio'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderKanban className="w-4 h-4" /> Crafting Studio
          </button>
          <button
            onClick={() => setActiveTab('scaler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'scaler'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Ruler className="w-4 h-4" /> Prop Scaler
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'vault'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileBox className="w-4 h-4" /> Blueprint Vault
          </button>
          <button
            onClick={() => setActiveTab('companion')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'companion'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MapPin className="w-4 h-4" /> Con Companion
          </button>
        </div>
      </nav>

      {/* Active Tab View */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        {activeTab === 'studio' && <CraftingStudio />}
        {activeTab === 'scaler' && <PropScaler />}
        {activeTab === 'vault' && <BlueprintVault />}
        {activeTab === 'companion' && <ConCompanion />}
      </main>

      {/* 💬 FLOATING CHAT HEADS & MESSAGING BUTTON (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
        {!isChatOpen ? (
          <>
            {/* Floating Community & DM Chat Heads Stack */}
            {chatHeads.map((head) => (
              <div
                key={head.id}
                onClick={() => handleOpenChatHead(head)}
                className="relative flex items-center gap-2 cursor-pointer group animate-bounce"
                title={`${head.displayName}: ${head.lastText}`}
              >
                {/* Message Preview Pill */}
                <div className="flex flex-col items-end bg-slate-950/95 border border-slate-700 px-3 py-1.5 rounded-xl shadow-xl max-w-[200px]">
                  <span className="text-[11px] font-bold text-amber-400 truncate max-w-full">
                    {head.displayName}
                  </span>
                  <span className="text-[10px] text-slate-300 truncate max-w-full">
                    {head.lastText}
                  </span>
                </div>

                {/* Circular Avatar Bubble */}
                <div className="relative shrink-0">
                  <img
                    src={head.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosplayer1'}
                    alt={head.displayName}
                    className={`w-12 h-12 rounded-full object-cover border-2 shadow-2xl bg-slate-900 group-hover:scale-105 transition-transform ${
                      head.channel === 'global' ? 'border-sky-400' : 'border-amber-400'
                    }`}
                  />
                  {/* Unread Count Badge */}
                  <span className="absolute -bottom-1 -left-1 bg-rose-500 text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-slate-950 shadow">
                    {head.count}
                  </span>
                  {/* Dismiss Chat Head 'X' Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDismissChatHead(e, head.id)}
                    className="absolute -top-1 -right-1 bg-slate-800 hover:bg-rose-500 text-slate-200 hover:text-white w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    title="Dismiss chat head"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Main Floating Chat Button with Unread Dot/Counter */}
            <button
              onClick={handleOpenChatFromButton}
              className="relative bg-amber-500 hover:bg-amber-400 text-slate-950 p-3.5 sm:p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center group"
              title="Open Cosplayer Community Chat"
            >
              <MessageSquare className="w-6 h-6" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-bold pl-0 group-hover:pl-2">
                Community Chat
              </span>

              {/* Pulsing Unread Dot / Badge */}
              {totalBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex items-center justify-center bg-rose-500 text-white text-[10px] font-extrabold min-w-[20px] h-5 px-1.5 rounded-full border-2 border-slate-950">
                    {totalBadgeCount}
                  </span>
                </span>
              )}
            </button>
          </>
        ) : (
          /* POPUP CHAT WINDOW */
          <div className="w-[90vw] sm:w-[400px] h-[520px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* Pop-up Close Bar */}
            <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Cosplayer Lounge
              </span>
              <button
                onClick={() => {
                  setIsChatOpen(false);
                  setSelectedChatHeadUser(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Embedded CosplayChat Component */}
            <div className="flex-1 overflow-hidden">
              <CosplayChat initialDMUser={selectedChatHeadUser} />
            </div>
          </div>
        )}
      </div>

      {isThemeModalOpen && (
        <DashboardThemeModal
          currentTheme={dashboardTheme}
          onPreviewChange={setDashboardTheme}
          onClose={() => setIsThemeModalOpen(false)}
        />
      )}

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateProfile={handleUpdateProfile}
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirmSaveAndLogout={handleSaveAndLogout}
        onConfirmLogoutNoSave={handleDiscardAndLogout}
      />
    </div>
  );
}