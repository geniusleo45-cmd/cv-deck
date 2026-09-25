"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, MessageSquare, RefreshCw, Search, Store, Briefcase, Users } from "lucide-react";

interface ChatUser { id: string; name: string; avatar?: string | null; role: string; }
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  sender: ChatUser;
  receiver: ChatUser;
}

interface Conversation {
  id: string;
  subject?: string;
  updatedAt: string;
  messages: Message[];
}
interface Contact { id: string; name: string | null; email: string; role: string; avatar?: string | null; vendorProfile?: { businessName: string } | null; recruiterProfile?: { companyName: string; industry?: string | null } | null; }

export function ChatWindow({ initialReceiverId, initialConversationId }: { initialReceiverId?: string; initialConversationId?: string }) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [newRecipient, setNewRecipient] = useState<Contact | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0) setSelectedConversation((current) => current ?? (initialConversationId ? data.find((conversation: Conversation) => conversation.id === initialConversationId) ?? null : initialReceiverId ? data.find((conversation: Conversation) => conversation.messages[0]?.senderId === initialReceiverId || conversation.messages[0]?.receiverId === initialReceiverId) ?? null : data[0]));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [initialConversationId, initialReceiverId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!initialConversationId) return;
    const conversation = conversations.find((item) => item.id === initialConversationId);
    if (conversation) setSelectedConversation(conversation);
  }, [conversations, initialConversationId]);

  useEffect(() => {
    const query = contactQuery.trim();
    if (query.length < 2) { setContacts([]); setSearchingContacts(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => { try { setSearchingContacts(true); const response = await fetch(`/api/messages/contacts?query=${encodeURIComponent(query)}`, { signal: controller.signal }); if (response.ok) setContacts(await response.json()); } catch (error) { if ((error as Error).name !== "AbortError") console.error(error); } finally { if (!controller.signal.aborted) setSearchingContacts(false); } }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [contactQuery]);

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const interval = setInterval(() => fetchMessages(selectedConversation.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !session?.user) return;

    try {
      setSending(true);
      if (selectedConversation) {
        // Reply to selected conversation
        const lastMsg = selectedConversation.messages[0];
        const otherUserId = lastMsg.senderId === session.user.id ? lastMsg.receiverId : lastMsg.senderId;

        const res = await fetch(`/api/messages/${selectedConversation.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: inputText,
            receiverId: otherUserId,
          }),
        });

        if (res.ok) {
          setInputText("");
          fetchMessages(selectedConversation.id);
          fetchConversations();
        }
      } else if (newRecipient || initialReceiverId) {
        // Start new conversation
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: newRecipient?.id || initialReceiverId,
            content: inputText,
          }),
        });

        if (res.ok) {
          const message = await res.json();
          setInputText("");
          setSelectedConversation({ id: message.conversationId, subject: "Computer Village Inquiry", updatedAt: new Date().toISOString(), messages: [message] });
          setNewRecipient(null);
          fetchConversations();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const activeMessage = selectedConversation?.messages[0];
  const activeParticipant = activeMessage
    ? activeMessage.senderId === session?.user?.id ? activeMessage.receiver : activeMessage.sender
    : newRecipient;

  return (
    <div className="flex h-[600px] w-full rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      {/* Left List of Conversations */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" /> Messages
          </h3>
          <Button variant="ghost" size="icon" onClick={fetchConversations} className="h-8 w-8">
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="border-b p-3 space-y-2"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="Find people on CV Deck" className="h-9 pl-9 text-xs" /></label>{contactQuery.trim().length >= 2 && <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border bg-white p-1 dark:bg-gray-900">{searchingContacts ? <p className="px-2 py-2 text-xs text-gray-500">Searching contacts...</p> : contacts.length ? contacts.map((contact) => { const detail = contact.vendorProfile?.businessName || contact.recruiterProfile?.companyName || contact.email; const Icon = contact.role === "VENDOR" ? Store : contact.role === "RECRUITER" ? Briefcase : Users; return <button key={contact.id} type="button" onClick={() => { setNewRecipient(contact); setSelectedConversation(null); setMessages([]); setContactQuery(""); setContacts([]); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30"><Avatar className="h-8 w-8 shrink-0"><AvatarImage src={contact.avatar || ""} alt={contact.name || "CV Deck user"} /><AvatarFallback className="bg-blue-100 text-xs font-bold text-blue-700">{contact.name?.slice(0, 2).toUpperCase() || "CV"}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-gray-900 dark:text-white">{contact.name || "CV Deck user"}</span><span className="block truncate text-[10px] text-gray-500">{detail}</span></span><Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" /></button>; }) : <p className="px-2 py-2 text-xs text-gray-500">No contacts found.</p>}</div>}</div>

        <div className="flex-1 overflow-y-auto divide-y">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">
              No active message threads yet. Start a conversation with a vendor!
            </div>
          ) : (
            conversations.map((conv) => {
              const lastMsg = conv.messages[0] as any;
              const otherUser = lastMsg?.senderId === session?.user?.id ? lastMsg?.receiver : lastMsg?.sender;
              const isSelected = selectedConversation?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-3.5 cursor-pointer transition-colors flex items-center gap-3 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-600"
                      : "hover:bg-gray-100/80 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <Avatar className="h-9 w-9 shrink-0"><AvatarImage src={otherUser?.avatar || ""} alt={otherUser?.name || "Marketplace user"} /><AvatarFallback className="bg-blue-100 text-xs font-bold text-blue-700">{otherUser?.name ? otherUser.name.slice(0, 2).toUpperCase() : "CV"}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-900 dark:text-gray-100">
                      <span className="truncate">{otherUser?.name || "Marketplace User"}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {new Date(conv.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {lastMsg?.content || "No messages"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Thread View */}
      <div className="flex-1 flex flex-col justify-between bg-white dark:bg-gray-900">
        {selectedConversation || newRecipient || initialReceiverId ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50/30 dark:bg-gray-900/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9"><AvatarImage src={activeParticipant?.avatar || ""} alt={activeParticipant?.name || "Conversation"} /><AvatarFallback className="bg-blue-600 text-xs font-bold text-white">{activeParticipant?.name?.slice(0, 2).toUpperCase() || <User className="h-4 w-4" />}</AvatarFallback></Avatar>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {activeParticipant?.name || selectedConversation?.subject || "New conversation"}
                  </h4>
                  <span className="text-[11px] text-gray-500">{newRecipient ? `${newRecipient.role.toLowerCase()} · ${newRecipient.vendorProfile?.businessName || newRecipient.recruiterProfile?.companyName || newRecipient.email}` : "Direct message"}</span>
                </div>
              </div>
            </div>

            {/* Message Bubble List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {selectedConversation ? messages.map((msg) => {
                const isMe = msg.senderId === session?.user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-sm ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              }) : <p className="py-8 text-center text-sm text-gray-500">Send a message to start this conversation.</p>}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSend} className="p-3 border-t flex items-center gap-2">
              <Input
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="text-sm rounded-xl"
              />
              <Button type="submit" disabled={sending || !inputText.trim()} size="icon" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3">
            <MessageSquare className="h-12 w-12 text-gray-300" />
            <p className="font-medium text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
