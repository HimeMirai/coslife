import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { Send, MessageSquare, User, ShieldCheck } from 'lucide-react';

export default function CosplayChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const currentUser = auth.currentUser;

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Query last 50 messages from Firestore ordered by timestamp
    const q = query(
      collection(db, 'chat_messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    // Real-time listener for instant message updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(fetchedMessages);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    try {
      await addDoc(collection(db, 'chat_messages'), {
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous Cosplayer',
        photoURL: currentUser.photoURL || '',
      });

      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Cosplayer Community Lounge</h2>
            <p className="text-xs text-slate-400">Connect, coordinate, and chat in real-time</p>
          </div>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <img 
              src={currentUser.photoURL || 'https://via.placeholder.com/30'} 
              alt="Avatar" 
              className="w-5 h-5 rounded-full"
            />
            <span className="text-xs text-slate-300 font-medium">{currentUser.displayName}</span>
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
        {!currentUser ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
            <ShieldCheck className="w-8 h-8 text-amber-500 mb-2" />
            Please sign in with Google to join the conversation.
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-10">
            No messages yet. Be the first cosplayer to say hi! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.uid === currentUser?.uid;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 max-w-[80%] ${
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                {msg.photoURL ? (
                  <img
                    src={msg.photoURL}
                    alt={msg.displayName}
                    className="w-7 h-7 rounded-full shrink-0 border border-slate-700 mt-1"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                )}

                {/* Bubble */}
                <div className="flex flex-col">
                  <span className={`text-[10px] text-slate-400 mb-0.5 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.displayName}
                  </span>
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs sm:text-sm break-words ${
                      isMe
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          disabled={!currentUser}
          placeholder={currentUser ? "Type a message..." : "Sign in to chat..."}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!currentUser || !newMessage.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}