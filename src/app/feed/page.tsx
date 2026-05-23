"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  content: string;
  images?: string[];
  hashtags?: string[];
  likes: string[];
  comments?: any[];
  sentiment?: string;
  moderationScore?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export default function Feed() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  // Fetch posts
  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      try {
        setFeedLoading(true);
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"), limit(20));
        const snapshot = await getDocs(q);

        const fetchedPosts: Post[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          // Fetch author info
          const authorRef = doc(db, "users", data.authorId);
          const authorSnap = await getDoc(authorRef);
          const authorData = authorSnap.data();

          fetchedPosts.push({
            id: docSnap.id,
            authorId: data.authorId,
            authorName: authorData?.displayName || data.authorId,
            authorEmail: authorData?.email || "unknown",
            authorAvatar: authorData?.avatar,
            content: data.content,
            images: data.images || [],
            hashtags: data.hashtags || [],
            likes: data.likes || [],
            comments: data.comments || [],
            sentiment: data.sentiment,
            createdAt: data.createdAt,
          });
        }

        setPosts(fetchedPosts);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError("Failed to load posts");
      } finally {
        setFeedLoading(false);
      }
    };

    fetchPosts();
  }, [user]);

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const postRef = doc(db, "posts", postId);
      const post = posts.find((p) => p.id === postId);

      if (!post) return;

      if (post.likes.includes(user.uid)) {
        // Unlike
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
        });
        setPosts(
          posts.map((p) =>
            p.id === postId
              ? { ...p, likes: p.likes.filter((id) => id !== user.uid) }
              : p
          )
        );
      } else {
        // Like
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
        });
        setPosts(
          posts.map((p) =>
            p.id === postId
              ? { ...p, likes: [...p.likes, user.uid] }
              : p
          )
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleComment = async (postId: string, commentText: string) => {
    if (!user) return;

    try {
      const postRef = doc(db, "posts", postId);
      const newComment = {
        id: `${user.uid}-${Date.now()}`,
        authorId: user.uid,
        authorName: user.displayName || user.email,
        content: commentText,
        likes: [],
        createdAt: Timestamp.now(),
      };

      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
      });

      // Update local state
      setPosts(
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...(p.comments || []), newComment],
              }
            : p
        )
      );
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Your Feed</h1>
          <p className="text-gray-600">Stay updated with posts from people you follow</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {feedLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">No posts yet</p>
            <p className="text-gray-500">Start following people to see their posts</p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onComment={handleComment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
