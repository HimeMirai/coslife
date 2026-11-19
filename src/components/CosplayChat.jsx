import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Send, 
  MessageSquare, 
  User, 
  ShieldCheck, 
  Smile, 
  Users, 
  ArrowLeft, 
  Circle, 
  Sticker,
  ImagePlus,
  MapPin,
  ExternalLink,
  X,
  Navigation
} from 'lucide-react';

const COMMON_EMOJIS = ['👋', '✨', '💖', '🔥', '🎉', '⚔️', '🎭', '📸', '💯', '🙏', '👍', '😊'];

const COSPLAY_STICKERS = [
  { id: 'crunch', icon: '🧵', label: 'Con Crunch!', bg: 'from-rose-500/20 to-amber-500/20 border-rose-500/40 text-rose-200' },
  { id: 'wip', icon: '🛠️', label: 'WIP Mode', bg: 'from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-200' },
  { id: 'shoot', icon: '📸', label: 'Photoshoot?', bg: 'from-sky-500/20 to-indigo-500/20 border-sky-500/40 text-sky-200' },
  { id: 'slay', icon: '👑', label: 'SLAY!!', bg: 'from-fuchsia-500/20 to-purple-500/20 border-fuchsia-500/40 text-fuchsia-200' },
  { id: 'prop', icon: '⚔️', label: 'Prop Ready', bg: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-200' },
  { id: 'budget', icon: '💸', label: 'RIP Wallet', bg: 'from-red-500/20 to-orange-500/20 border-red-500/40 text-red-200' },
];

// Helper to compress images so they fit cleanly within Firestore's 1MB document limit
const compressImage = (file, maxWidth = 720, quality = 0.7) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function CosplayChat() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji');
  const [showOnlineList, setShowOnlineList] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueNotes, setVenueNotes] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // DM state: null = Global Chat, otherwise target user object { uid, displayName, photoURL }
  const [activeDMUser, setActiveDMUser] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const latestDMIdsRef = useRef({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Track Firebase Auth state reliably
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // Helper function to switch channels cleanly without cascading state issues
  const handleSelectUserDM = (userToDM) => {
    setMessages([]);
    setActiveDMUser(userToDM);
    setShowOnlineList(false);
    if (userToDM?.uid) {
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[userToDM.uid];
        return updated;
      });
    }
  };

  // 1. Presence System + Automatic Offline Cleanup
  useEffect(() => {
    if (!currentUser) return;

    const userPresenceRef = doc(db, 'online_users', currentUser.uid);

    const markOnline = () => {
      setDoc(userPresenceRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous Cosplayer',
        photoURL: currentUser.photoURL || '',
        online: true,
        lastSeen: serverTimestamp()
      }, { merge: true });
    };

    const markOffline = () => {
      deleteDoc(userPresenceRef).catch(() => {});
    };

    markOnline();
    const heartbeat = setInterval(markOnline, 30000);
    window.addEventListener('beforeunload', markOffline);

    const qOnline = query(collection(db, 'online_users'));
    const unsubscribeOnline = onSnapshot(qOnline, (snapshot) => {
      const users = snapshot.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => u.uid && u.displayName);
      setOnlineUsers(users);
    });

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', markOffline);
      markOffline();
      unsubscribeOnline();
    };
  }, [currentUser]);

  // 2. Unread DM Listener
  useEffect(() => {
    if (!currentUser || onlineUsers.length === 0) return;

    const unsubscribers = onlineUsers
      .filter((u) => u.uid !== currentUser.uid)
      .map((otherUser) => {
        const dmChannelId = [currentUser.uid, otherUser.uid].sort().join('_');
        const qLatest = query(
          collection(db, `direct_messages/${dmChannelId}/messages`),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        return onSnapshot(qLatest, (snapshot) => {
          if (snapshot.empty) return;
          const latestDoc = snapshot.docs[0];
          const data = latestDoc.data();

          if (latestDMIdsRef.current[otherUser.uid] === latestDoc.id) return;

          const isFirstLoad = !(otherUser.uid in latestDMIdsRef.current);
          latestDMIdsRef.current[otherUser.uid] = latestDoc.id;

          if (!isFirstLoad && data.uid !== currentUser.uid && activeDMUser?.uid !== otherUser.uid) {
            setUnreadCounts((prev) => ({
              ...prev,
              [otherUser.uid]: (prev[otherUser.uid] || 0) + 1,
            }));
          }
        });
      });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [currentUser, onlineUsers, activeDMUser]);

  // 3. Real-time Messages Listener (Global Chat vs. DM Channel)
  useEffect(() => {
    let q;
    if (activeDMUser && currentUser) {
      const dmChannelId = [currentUser.uid, activeDMUser.uid].sort().join('_');
      q = query(
        collection(db, `direct_messages/${dmChannelId}/messages`),
        orderBy('createdAt', 'asc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'chat_messages'),
        orderBy('createdAt', 'asc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(fetched);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [activeDMUser, currentUser]);

  const sendPayload = async (payload) => {
    if (!currentUser) return;
    const targetCollection = activeDMUser
      ? collection(db, `direct_messages/${[currentUser.uid, activeDMUser.uid].sort().join('_')}/messages`)
      : collection(db, 'chat_messages');

    await addDoc(targetCollection, {
      ...payload,
      createdAt: serverTimestamp(),
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'Anonymous Cosplayer',
      photoURL: currentUser.photoURL || '',
    });
    scrollToBottom();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    if (!messageText || !currentUser) return;

    setNewMessage('');
    setShowEmojiPicker(false);

    try {
      await sendPayload({ type: 'text', text: messageText });
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    }
  };

  const handleSendSticker = async (sticker) => {
    if (!currentUser) return;
    setShowEmojiPicker(false);

    try {
      await sendPayload({
        type: 'sticker',
        stickerId: sticker.id,
        text: `${sticker.icon} ${sticker.label}`,
      });
    } catch (error) {
      console.error('Error sending sticker:', error);
    }
  };

  // Handle Photo or Video Upload
  const handleMediaSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    e.target.value = ''; // Reset input so same file can be chosen again

    setIsUploadingMedia(true);
    try {
      if (file.type.startsWith('image/')) {
        const compressedDataUrl = await compressImage(file);
        await sendPayload({
          type: 'image',
          mediaUrl: compressedDataUrl,
          text: '📷 Shared a photo',
        });
      } else if (file.type.startsWith('video/')) {
        // Keep video files under ~700KB for direct Firestore storage
        if (file.size > 700 * 1024) {
          alert('Please select a short video clip under 700KB (or paste a YouTube/video link in the chat).');
          setIsUploadingMedia(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = async (ev) => {
          await sendPayload({
            type: 'video',
            mediaUrl: ev.target.result,
            text: '🎥 Shared a video',
          });
          setIsUploadingMedia(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Failed to send media. Please try a smaller file.');
    }
    setIsUploadingMedia(false);
  };

  // Send Venue Location (Manual or GPS)
  const handleSendVenueLocation = async (e) => {
    e.preventDefault();
    if (!venueName.trim() || !currentUser) return;

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName.trim())}`;
    try {
      await sendPayload({
        type: 'location',
        venueName: venueName.trim(),
        venueNotes: venueNotes.trim(),
        mapsUrl,
        text: `📍 Venue: ${venueName.trim()}`,
      });
      setVenueName('');
      setVenueNotes('');
      setShowLocationModal(false);
    } catch (error) {
      console.error('Error sharing location:', error);
    }
  };

  const handleShareCurrentGPS = () => {
    if (!navigator.geolocation || !currentUser) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        try {
          await sendPayload({
            type: 'location',
            venueName: venueName.trim() || 'Live Meetup Pin',
            venueNotes: venueNotes.trim() || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            mapsUrl,
            text: `📍 Shared live location`,
          });
          setVenueName('');
          setVenueNotes('');
          setShowLocationModal(false);
        } catch (error) {
          console.error('Error sending GPS location:', error);
        }
        setIsLocating(false);
      },
      () => {
        alert('Unable to get your GPS location. You can type the venue name instead!');
        setIsLocating(false);
      }
    );
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage((prev) => prev + emoji);
  };

  const formatMessageTime = (createdAt) => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col justify-between overflow-hidden relative">
      {/* Top Main Header */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        {activeDMUser ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectUserDM(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Return to Community Lounge"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img
              src={activeDMUser.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosplayer1'}
              alt="Avatar"
              className="w-5 h-5 rounded-full object-cover border border-amber-500/50"
            />
            <div>
              <h2 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                {activeDMUser.displayName}
              </h2>
              <p className="text-[9px] text-amber-400 font-semibold">Private DM</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h2 className="text-xs font-bold text-slate-100">Community Lounge</h2>
              <p className="text-[10px] text-slate-400">Chat & coordinate in real-time</p>
            </div>
          </div>
        )}

        {/* Online Status Toggle */}
        <button
          onClick={() => setShowOnlineList(!showOnlineList)}
          className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800 hover:border-amber-500/50 transition text-slate-300 hover:text-amber-400"
          title="Toggle online members"
        >
          <Circle className="w-2 h-2 text-emerald-400 fill-emerald-400 animate-pulse" />
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold">{onlineUsers.length}</span>
          {totalUnread > 0 && (
            <span className="ml-1 bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1.5 rounded-full animate-bounce">
              {totalUnread} new
            </span>
          )}
        </button>
      </div>

      {/* ONLINE MEMBERS CAROUSEL / LIST BAR */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-3 py-1.5 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Circle className="w-1.5 h-1.5 text-emerald-400 fill-emerald-400" /> Online:
        </span>
        {onlineUsers.length === 0 ? (
          <span className="text-[10px] text-slate-500">No other cosplayers online</span>
        ) : (
          onlineUsers.map((u) => {
            const isMe = u.uid === currentUser?.uid;
            const unread = unreadCounts[u.uid] || 0;
            return (
              <button
                key={u.uid}
                disabled={isMe}
                onClick={() => handleSelectUserDM(u)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition shrink-0 ${
                  activeDMUser?.uid === u.uid
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : isMe
                    ? 'bg-slate-900/50 border-slate-800 text-slate-400 cursor-default'
                    : unread > 0
                    ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/50 hover:text-white'
                }`}
                title={!isMe ? `Start DM with ${u.displayName}` : 'You'}
              >
                <img
                  src={u.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosplayer1'}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className="text-[10px] font-medium truncate max-w-[90px]">
                  {u.displayName} {isMe && '(You)'}
                </span>
                {unread > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1.5 rounded-full">
                    {unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900/50">
        {!currentUser ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
            <ShieldCheck className="w-8 h-8 text-amber-500 mb-2" />
            Please sign in to join the conversation.
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-10">
            {activeDMUser 
              ? `This is the start of your private conversation with ${activeDMUser.displayName}. 👋` 
              : 'No messages yet. Say hi to the community! 👋'}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.uid === currentUser?.uid;
            const stickerObj = msg.type === 'sticker'
              ? COSPLAY_STICKERS.find((s) => s.id === msg.stickerId)
              : null;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-1.5 max-w-[85%] ${
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar with DM action */}
                <button
                  disabled={isMe}
                  onClick={() => handleSelectUserDM({ uid: msg.uid, displayName: msg.displayName, photoURL: msg.photoURL })}
                  className={`relative shrink-0 ${!isMe ? 'hover:opacity-80 transition cursor-pointer' : 'cursor-default'}`}
                  title={!isMe ? `Open DM with ${msg.displayName}` : ''}
                >
                  {msg.photoURL ? (
                    <img
                      src={msg.photoURL}
                      alt={msg.displayName}
                      className="w-6 h-6 rounded-full border border-slate-700 mt-1 object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center mt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </button>

                {/* Message Bubble / Sticker / Image / Video / Venue Location */}
                <div className="flex flex-col">
                  <span className={`text-[9px] text-slate-400 mb-0.5 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.displayName}
                  </span>

                  {stickerObj ? (
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl border bg-gradient-to-br ${stickerObj.bg} flex flex-col items-center justify-center shadow-md`}
                    >
                      <span className="text-2xl leading-none mb-1">{stickerObj.icon}</span>
                      <span className="text-[10px] font-extrabold tracking-wide uppercase">
                        {stickerObj.label}
                      </span>
                    </div>
                  ) : msg.type === 'image' && msg.mediaUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 max-w-[210px] shadow-md">
                      <img
                        src={msg.mediaUrl}
                        alt="Shared cosplay"
                        className="w-full h-auto max-h-48 object-cover cursor-pointer"
                        onClick={() => window.open(msg.mediaUrl, '_blank')}
                      />
                    </div>
                  ) : msg.type === 'video' && msg.mediaUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 max-w-[220px] shadow-md">
                      <video
                        src={msg.mediaUrl}
                        controls
                        className="w-full max-h-48 object-cover"
                      />
                    </div>
                  ) : msg.type === 'location' ? (
                    <a
                      href={msg.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-amber-500/40 transition max-w-[220px] shadow-md group"
                    >
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-100 truncate flex items-center gap-1">
                            {msg.venueName}
                            <ExternalLink className="w-3 h-3 text-amber-400 shrink-0 opacity-80 group-hover:opacity-100" />
                          </p>
                          {msg.venueNotes && (
                            <p className="text-[9px] text-slate-400 truncate mt-0.5">{msg.venueNotes}</p>
                          )}
                          <span className="inline-block text-[9px] text-amber-400 font-semibold mt-1">
                            Open in Google Maps →
                          </span>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div
                      className={`px-3 py-1.5 rounded-2xl text-xs break-words ${
                        isMe
                          ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {msg.createdAt && (
                    <span className={`text-[8px] text-slate-500 mt-0.5 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Venue Location Modal */}
      {showLocationModal && (
        <div className="absolute inset-x-2 bottom-12 z-30 bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Share Venue / Meetup Spot
            </span>
            <button
              type="button"
              onClick={() => setShowLocationModal(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleSendVenueLocation} className="space-y-2">
            <input
              type="text"
              placeholder="Venue name (e.g., SMX Hall 2, Ayala Cebu)"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="Meetup notes (e.g., Near main entrance at 2 PM)"
              value={venueNotes}
              onChange={(e) => setVenueNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleShareCurrentGPS}
                disabled={isLocating}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
              >
                <Navigation className="w-3 h-3 text-emerald-400" />
                {isLocating ? 'Locating...' : 'Share Live GPS'}
              </button>
              <button
                type="submit"
                disabled={!venueName.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-1.5 px-2 rounded-lg text-[10px] font-bold transition disabled:opacity-50"
              >
                Send Venue Pin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Emoji & Sticker Picker Window */}
      {showEmojiPicker && (
        <div className="absolute bottom-12 left-2 z-30 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl w-[245px]">
          <div className="flex items-center gap-1 mb-2 pb-1.5 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setPickerTab('emoji')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                pickerTab === 'emoji' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Smile className="w-3 h-3" /> Emojis
            </button>
            <button
              type="button"
              onClick={() => setPickerTab('sticker')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                pickerTab === 'sticker' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Sticker className="w-3 h-3" /> Stickers
            </button>
          </div>

          {pickerTab === 'emoji' ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-base p-1 hover:bg-slate-800 rounded-lg transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {COSPLAY_STICKERS.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => handleSendSticker(sticker)}
                  className={`p-2 rounded-xl border bg-gradient-to-br ${sticker.bg} hover:scale-[1.03] transition flex flex-col items-center justify-center`}
                >
                  <span className="text-xl mb-0.5">{sticker.icon}</span>
                  <span className="text-[9px] font-bold uppercase">{sticker.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input for Photos & Videos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleMediaSelect}
        className="hidden"
      />

      {/* Message Input Bar */}
      <form onSubmit={handleSendMessage} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-1">
        <button
          type="button"
          disabled={!currentUser}
          onClick={() => {
            setShowEmojiPicker(!showEmojiPicker);
            setShowLocationModal(false);
          }}
          className="text-slate-400 hover:text-amber-400 p-1.5 hover:bg-slate-800 rounded-xl transition shrink-0 disabled:opacity-50"
          title="Emojis & Stickers"
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={!currentUser || isUploadingMedia}
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-400 hover:text-amber-400 p-1.5 hover:bg-slate-800 rounded-xl transition shrink-0 disabled:opacity-50"
          title="Send Photo or Short Video"
        >
          <ImagePlus className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={!currentUser}
          onClick={() => {
            setShowLocationModal(!showLocationModal);
            setShowEmojiPicker(false);
          }}
          className="text-slate-400 hover:text-amber-400 p-1.5 hover:bg-slate-800 rounded-xl transition shrink-0 disabled:opacity-50"
          title="Share Venue Location"
        >
          <MapPin className="w-4 h-4" />
        </button>

        <input
          type="text"
          disabled={!currentUser}
          placeholder={
            isUploadingMedia
              ? "Uploading media..."
              : !currentUser 
              ? "Sign in to chat..." 
              : activeDMUser 
              ? `DMing ${activeDMUser.displayName}...` 
              : "Type a message..."
          }
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!currentUser || !newMessage.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center transition disabled:opacity-50 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}