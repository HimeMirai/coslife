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
import { Send, MessageSquare, User, ShieldCheck, Smile, Users, ArrowLeft, Circle, Sticker } from 'lucide-react';

const COMMON_EMOJIS = ['👋', '✨', '💖', '🔥', '🎉', '⚔️', '🎭', '📸', '💯', '🙏', '👍', '😊'];

const COSPLAY_STICKERS = [
  { id: 'crunch', icon: '🧵', label: 'Con Crunch!', bg: 'from-rose-500/20 to-amber-500/20 border-rose-500/40 text-rose-200' },
  { id: 'wip', icon: '🛠️', label: 'WIP Mode', bg: 'from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-200' },
  { id: 'shoot', icon: '📸', label: 'Photoshoot?', bg: 'from-sky-500/20 to-indigo-500/20 border-sky-500/40 text-sky-200' },
  { id: 'slay', icon: '👑', label: 'SLAY!!', bg: 'from-fuchsia-500/20 to-purple-500/20 border-fuchsia-500/40 text-fuchsia-200' },
  { id: 'prop', icon: '⚔️', label: 'Prop Ready', bg: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-200' },
  { id: 'budget', icon: '💸', label: 'RIP Wallet', bg: 'from-red-500/20 to-orange-500/20 border-red-500/40 text-red-200' },
];

export default function CosplayChat() {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji');
  const [showOnlineList, setShowOnlineList] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // DM state: null = Global Chat, otherwise target user object { uid, displayName, photoURL }
  const [activeDMUser, setActiveDMUser] = useState(null);

  const messagesEndRef = useRef(null);
  const latestDMIdsRef = useRef({});
  const currentUser = auth.currentUser;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
        lastSeen: serverTimestamp()
      }, { merge: true });
    };

    const markOffline = () => {
      deleteDoc(userPresenceRef).catch(() => {});
    };

    markOnline();
    const heartbeat = setInterval(markOnline, 60000);
    window.addEventListener('beforeunload', markOffline);

    // Listen for online users & filter stale sessions (> 5 mins)
    const qOnline = query(collection(db, 'online_users'));
    const unsubscribeOnline = onSnapshot(qOnline, (snapshot) => {
      const now = Date.now();
      const users = snapshot.docs
        .map((d) => d.data())
        .filter((u) => {
          if (u.uid === currentUser.uid) return true;
          if (!u.lastSeen) return true;
          const lastSeenMs = u.lastSeen.toMillis ? u.lastSeen.toMillis() : now;
          return now - lastSeenMs < 5 * 60 * 1000;
        });
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
      // Direct message channel key (alphabetical order of UIDs)
      const dmChannelId = [currentUser.uid, activeDMUser.uid].sort().join('_');
      q = query(
        collection(db, `direct_messages/${dmChannelId}/messages`),
        orderBy('createdAt', 'asc'),
        limit(50)
      );
    } else {
      // Global Lounge Chat
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    if (!messageText || !currentUser) return;

    // Clear input immediately
    setNewMessage('');
    setShowEmojiPicker(false);

    try {
      if (activeDMUser) {
        // Send Direct Message
        const dmChannelId = [currentUser.uid, activeDMUser.uid].sort().join('_');
        await addDoc(collection(db, `direct_messages/${dmChannelId}/messages`), {
          type: 'text',
          text: messageText,
          createdAt: serverTimestamp(),
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Anonymous Cosplayer',
          photoURL: currentUser.photoURL || '',
        });
      } else {
        // Send Global Message
        await addDoc(collection(db, 'chat_messages'), {
          type: 'text',
          text: messageText,
          createdAt: serverTimestamp(),
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Anonymous Cosplayer',
          photoURL: currentUser.photoURL || '',
        });
      }
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    }
  };

  const handleSendSticker = async (sticker) => {
    if (!currentUser) return;
    setShowEmojiPicker(false);

    try {
      const targetCollection = activeDMUser
        ? collection(db, `direct_messages/${[currentUser.uid, activeDMUser.uid].sort().join('_')}/messages`)
        : collection(db, 'chat_messages');

      await addDoc(targetCollection, {
        type: 'sticker',
        stickerId: sticker.id,
        text: `${sticker.icon} ${sticker.label}`,
        createdAt: serverTimestamp(),
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous Cosplayer',
        photoURL: currentUser.photoURL || '',
      });
      scrollToBottom();
    } catch (error) {
      console.error('Error sending sticker:', error);
    }
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
          /* Private DM Header */
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
          /* Public Lounge Header */
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

                {/* Message Bubble or Sticker Card */}
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

      {/* Message Input Bar */}
      <form onSubmit={handleSendMessage} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-slate-400 hover:text-amber-400 p-1.5 hover:bg-slate-800 rounded-xl transition shrink-0"
          title="Emojis & Stickers"
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          type="text"
          disabled={!currentUser}
          placeholder={
            !currentUser 
              ? "Sign in to chat..." 
              : activeDMUser 
              ? `DMing ${activeDMUser.displayName}...` 
              : "Type a message..."
          }
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!currentUser || !newMessage.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center transition disabled:opacity-50 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}