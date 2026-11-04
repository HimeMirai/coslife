import { useState, useEffect } from 'react';
import characterArt from '../assets/char.png';
import logoArt from '../assets/cos_logo.png';
import './LoginForm.css';

export default function LoginForm({ onLogin, onGoogleSignIn, onRegisterClick }) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('COSPLAYER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2200); // Intro screen duration matching logo animation
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) {
      onLogin({ role, email, password });
    }
  };

  /* Initial Preloader Screen showing Logo Animation */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center relative overflow-hidden select-none">
        {/* Ambient Glow behind Logo */}
        <div className="absolute w-[400px] h-[400px] bg-rose-950/30 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Animated CosLife Logo */}
        <div className="relative z-10 flex flex-col items-center justify-center p-6 animate-logo-intro">
          <img 
            src={logoArt} 
            alt="CosLife Logo" 
            className="w-48 h-48 md:w-64 md:h-64 object-contain rounded-3xl"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center p-4 md:p-8 font-sans select-none relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-950/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container Wrapper */}
      <div className="max-w-4xl w-full relative">

        {/* Floating Unclipped Character Image */}
        <div className="character-wrapper animate-split-left">
          <img 
            src={characterArt} 
            alt="CosLife Character" 
            className="character-img"
          />
        </div>

        {/* Main Card Container */}
        <div className="w-full bg-[#f3f4f6] rounded-[32px] flex flex-col md:flex-row min-h-[580px] relative shadow-2xl overflow-hidden">
          
          {/* Left Side: Dark Red Banner - Slides from Left to Center */}
          <div 
            className="banner-clip md:w-[48%] bg-gradient-to-br from-[#800f29] via-[#590d22] to-[#2b0910] relative flex flex-col justify-between p-8 md:p-12 min-h-[380px] md:min-h-full z-10 overflow-hidden animate-split-left"
          >
            {/* Animated Light Sheen Overlay */}
            <div className="banner-shine" />

            {/* Mobile Fallback Character */}
            <div className="md:hidden absolute inset-0 pointer-events-none z-20">
              <img 
                src={characterArt} 
                alt="CosLife Character" 
                className="w-full h-full object-contain object-center scale-110"
              />
            </div>

            {/* Bottom Branding */}
            <div className="relative z-30 mt-auto pt-48">
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight text-glow">
               
              </h1>
              <p className="text-xs font-mono text-rose-200/90 tracking-widest uppercase mt-1 font-semibold">
                
              </p>
            </div>
          </div>

          {/* Right Side: White Form Panel - Slides from Right to Center */}
          <div className="md:w-[52%] bg-[#f3f4f6] p-6 md:p-10 flex flex-col justify-center items-center z-0 rounded-r-[32px] animate-split-right">
            <div className="w-full max-w-sm space-y-6">

              <h2 className="text-center font-bold text-slate-700 tracking-wider text-base uppercase animate-slide-1">
                COSLIFE AUTHENTICATION
              </h2>

              
              <div className="flex justify-center items-center gap-12 border-b border-slate-200/80 pb-3 animate-slide-1">

                <button
                  type="button"
                  onClick={() => setRole('COSPLAYER')}
                  className={`text-xs font-extrabold tracking-widest transition-colors relative pb-1 ${
                    role === 'COSPLAYER' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  COSPLAYER
                  {role === 'COSPLAYER' && (
                    <span className="absolute -bottom-[14px] left-0 right-0 h-[3px] bg-rose-500 rounded-full" />
                  )}
                </button>
              </div>

              {/* Input Fields */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-2" autoComplete="off">
                <div className="animate-slide-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="off"
                    className="w-full bg-[#e5e9f0] text-slate-800 placeholder-slate-400 font-medium rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition"
                  />
                </div>

                <div className="relative flex items-center animate-slide-3">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    className="w-full bg-[#e5e9f0] text-slate-800 placeholder-slate-400 font-medium rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 text-[11px] font-bold text-rose-500 uppercase hover:text-rose-600 transition tracking-wider"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0d0f12] hover:bg-slate-900 text-white font-black py-4 rounded-2xl text-xs tracking-widest uppercase transition active:scale-[0.99] shadow-md mt-3 animate-slide-4"
                >
                  LOGIN
                </button>
              </form>

              {/* Google Sign In with Centered "OR" Divider */}
              {onGoogleSignIn && (
                <div className="pt-1 animate-slide-4">
                  <div className="relative flex items-center justify-center my-4">
                    <div className="border-t border-slate-200/80 w-full" />
                    <span className="bg-[#f3f4f6] px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">OR</span>
                  </div>
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 py-3.5 px-4 rounded-2xl text-xs font-bold transition shadow-sm mt-6"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>
              )}

              <p className="text-center text-xs text-slate-400 font-medium pt-1 animate-slide-4">
                New here?{' '}
                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="font-extrabold text-rose-500 hover:underline"
                >
                  Register
                </button>
              </p>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}