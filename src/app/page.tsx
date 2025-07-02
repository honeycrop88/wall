"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Button } from "./components/ui/button";
import { supabase } from "../lib/supabase";

const PLACEHOLDER_PHOTO = "/placeholder.jpg";
const BUCKET = "wall-photos";

interface Post {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
  photo_url: string | null;
}

export default function Wall() {
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large (max 5MB)');
      return null;
    }
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      console.error('Supabase upload error:', error);
      alert('Failed to upload photo: ' + error.message);
      return null;
    }
    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return publicUrlData?.publicUrl || null;
  }

  async function handleShare() {
    if (!message.trim()) return;
    setLoading(true);
    if (photoFile && photoFile.size > 5 * 1024 * 1024) {
      alert('File is too large (max 5MB)');
      setLoading(false);
      return;
    }
    let photoUrl: string | null = null;
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile);
      if (!photoUrl) {
        setLoading(false);
        return;
      }
    }
    const { error } = await supabase.from('posts').insert([
      {
        author_name: "Greg Wientjes",
        message: message.trim(),
        photo_url: photoUrl,
      },
    ]);
    if (error) {
      alert('Supabase error: ' + error.message);
    } else {
      setMessage("");
      setPhotoFile(null);
      setPhotoPreview(null);
      messageRef.current?.focus();
    }
    setLoading(false);
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
              className="w-full border-2 border-dashed border-blue-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 font-[Comic_Neue,sans-serif] bg-blue-50"
              placeholder="What's on your mind?"
              value={message}
              maxLength={280}
              rows={3}
              onChange={e => setMessage(e.target.value)}
              style={{fontFamily: 'Comic Neue, sans-serif'}}
            />
            <div className="text-xs text-gray-500 mt-1">{280 - message.length} characters remaining</div>
            <label className="block mt-4 cursor-pointer">
              <div className="w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center py-6 text-gray-400 hover:border-blue-400 transition-colors">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Preview" width={180} height={120} className="rounded-md object-contain max-h-40" />
                ) : (
                  <>
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span>Click to add photo (optional)</span>
                    <span className="text-xs text-gray-400">JPG, PNG, GIF up to 5MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
            </label>
            {photoFile && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                >
                  Remove photo
                </button>
              </div>
            )}
            <div className="flex justify-end mt-2">
              <Button
                className="bg-blue-500 hover:bg-blue-600 rounded-lg px-6 py-2 font-bold text-base shadow text-white border-b-4 border-blue-700"
                onClick={handleShare}
                disabled={(!message.trim() && !photoFile) || loading}
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
                {post.photo_url && (
                  <div className="mt-2">
                    <Image src={post.photo_url} alt="Post photo" width={320} height={240} className="rounded-md object-contain max-h-60" />
                  </div>
                )}
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
