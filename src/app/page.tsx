"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Button } from "./components/ui/button";
import { supabase } from "../lib/supabase";

const PLACEHOLDER_PHOTO = "/placeholder.jpg";

interface Post {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
  photo_url: string;
}

export default function Wall() {
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);

  // Fetch posts from Supabase on mount
  useEffect(() => {
    fetchPosts();
    // Subscribe to new posts in realtime
    const channel = supabase
      .channel('realtime:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        setPosts(prev => [payload.new as Post, ...prev].slice(0, 50));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setPosts(data as Post[]);
    setLoading(false);
  }

  async function handleShare() {
    if (!message.trim()) return;
    const { error } = await supabase.from('posts').insert([
      {
        author_name: "Greg Wientjes",
        message: message.trim(),
        photo_url: PLACEHOLDER_PHOTO,
      },
    ]);
    if (error) {
      alert('Supabase error: ' + error.message);
    } else {
      setMessage("");
      messageRef.current?.focus();
      // No need to manually update posts, realtime will handle it
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-[Comic_Neue,sans-serif]">
      {/* Header */}
      <div className="w-full bg-blue-500 text-white text-xl font-bold px-6 py-2 rounded-t-lg shadow flex items-center" style={{fontFamily: 'Comic Neue, sans-serif'}}>
        This is test project.
      </div>
      <div className="flex flex-col md:flex-row max-w-4xl mx-auto bg-white rounded-b-lg shadow-lg overflow-hidden">
        {/* Sidebar */}
        <aside className="md:w-1/3 w-full bg-white flex flex-col items-center p-6 border-r border-gray-200">
          <Image
            src={PLACEHOLDER_PHOTO}
            alt="Profile photo"
            width={140}
            height={140}
            className="rounded-lg object-cover border-4 border-white shadow mb-4"
          />
          <div className="text-2xl font-bold mb-2" style={{fontFamily: 'Comic Neue, sans-serif'}}>Greg Wientjes</div>
          <div className="text-lg text-gray-700 mb-6">Wall</div>
          <div className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 mb-2">
            <div className="font-bold text-xs mb-1">Information</div>
            <div className="text-xs mb-2">Networks<br/><span className="font-normal">Stanford Alum</span></div>
            <div className="text-xs">Current City<br/><span className="font-normal">Palo Alto, CA</span></div>
          </div>
        </aside>
        {/* Wall */}
        <main className="flex-1 p-6 flex flex-col gap-6">
          {/* Input */}
          <div className="mb-2">
            <textarea
              ref={messageRef}
              className="w-full border-2 border-dashed border-blue-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 font-[Comic_Neue,sans-serif]"
              placeholder="Write something..."
              value={message}
              maxLength={280}
              rows={3}
              onChange={e => setMessage(e.target.value)}
              style={{fontFamily: 'Comic Neue, sans-serif'}}
            />
            <div className="flex justify-end mt-2">
              <Button
                className="bg-blue-500 hover:bg-blue-600 rounded-lg px-6 py-2 font-bold text-base shadow text-white border-b-4 border-blue-700"
                onClick={handleShare}
                disabled={!message.trim() || loading}
                style={{fontFamily: 'Comic Neue, sans-serif'}}
              >
                {loading ? "Sharing..." : "Share"}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {posts.length === 0 && !loading && (
              <div className="text-center text-gray-400">No posts yet. Be the first!</div>
            )}
            {posts.map((post, idx) => (
              <div key={post.id}>
                <div className="mb-1">
                  <span className="font-bold" style={{fontFamily: 'Comic Neue, sans-serif'}}>{post.author_name}</span>
                </div>
                <div className="text-gray-800 whitespace-pre-line break-words break-all" style={{fontFamily: 'Comic Neue, sans-serif'}}>{post.message}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(post.created_at).toLocaleString()}</div>
                {idx !== posts.length - 1 && <hr className="my-4 border-t-2 border-gray-200" />}
              </div>
            ))}
            {loading && <div className="text-center text-gray-400">Loading...</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
