import { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Ruler, 
  FileBox, 
  MapPin, 
  LogOut,
  Settings
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import CraftingStudio from './components/CraftingStudio';
import PropScaler from './components/PropScaler';
import BlueprintVault from './components/BlueprintVault';
import ProfileModal from './components/ProfileModal';
import LogoutModal from './components/LogoutModal';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ConCompanion from './components/ConCompanion';

// Brand logo asset
import coslifeLogo from './assets/cos_logo.png'; 

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // Controls 'login' vs 'register' view
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  // ✅ LOGGED IN WORKSPACE
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={coslifeLogo} alt="CosLife Logo" className="h-9 w-9 object-cover rounded-lg border border-rose-500/30" />
            <span className="font-extrabold text-lg text-white tracking-wider ml-1">
              Cos<span className="text-rose-500">Life</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
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

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        {activeTab === 'studio' && <CraftingStudio />}
        {activeTab === 'scaler' && <PropScaler />}
        {activeTab === 'vault' && <BlueprintVault />}
        {activeTab === 'companion' && <ConCompanion />}
      </main>

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