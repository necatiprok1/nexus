"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followers: string[];
  following: string[];
  createdAt: number;
  updatedAt: number;
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  images?: string[];
  hashtags?: string[];
  likes: string[];
  comments?: any[];
  createdAt: Timestamp;
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editBio, setEditBio] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  // Fetch profile
  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        setPageLoading(true);
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setError("User not found");
          return;
        }

        const profileData = userSnap.data() as UserProfile;
        setProfile(profileData);
        setEditBio(profileData.bio || "");
        setIsOwnProfile(user?.uid === userId);

        if (user?.uid !== userId) {
          setIsFollowing(profileData.followers.includes(user?.uid || ""));
        }

        // Fetch user's posts
        const postsRef = collection(db, "posts");
        const q = query(
          postsRef,
          where("authorId", "==", userId)
        );
        const postsSnap = await getDocs(q);
        const postsData: Post[] = [];

        postsSnap.forEach((doc) => {
          postsData.push({
            id: doc.id,
            authorId: doc.data().authorId,
            authorName: profileData.displayName,
            authorEmail: profileData.email,
            content: doc.data().content,
            images: doc.data().images || [],
            hashtags: doc.data().hashtags || [],
            likes: doc.data().likes || [],
            comments: doc.data().comments || [],
            createdAt: doc.data().createdAt,
          });
        });

        setPosts(
          postsData.sort(
            (a, b) =>
              b.createdAt.toMillis() - a.createdAt.toMillis()
          )
        );
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile");
      } finally {
        setPageLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user?.uid]);

  const handleFollow = async () => {
    if (!user || !profile) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const profileRef = doc(db, "users", userId);

      if (isFollowing) {
        // Unfollow
        await updateDoc(userRef, {
          following: arrayRemove(userId),
        });
        await updateDoc(profileRef, {
          followers: arrayRemove(user.uid),
        });
        setIsFollowing(false);
      } else {
        // Follow
        await updateDoc(userRef, {
          following: arrayUnion(userId),
        });
        await updateDoc(profileRef, {
          followers: arrayUnion(user.uid),
        });
        setIsFollowing(true);
      }

      // Update profile
      if (profile) {
        const updatedFollowers = isFollowing
          ? profile.followers.filter((id) => id !== user.uid)
          : [...profile.followers, user.uid];
        setProfile({ ...profile, followers: updatedFollowers });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        bio: editBio,
        updatedAt: Date.now(),
      });

      if (profile) {
        setProfile({ ...profile, bio: editBio });
      }
      setEditMode(false);
    } catch (error) {
      console.error("Error updating bio:", error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const postRef = doc(db, "posts", postId);

      if (post.likes.includes(user.uid)) {
        // Unlike - we need to use updateDoc
        await updateDoc(postRef, {
          likes: post.likes.filter((id) => id !== user.uid),
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
          likes: [...post.likes, user.uid],
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

      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      await updateDoc(postRef, {
        comments: [...(post.comments || []), newComment],
      });

      setPosts(
        posts.map((p) =>
          p.id === postId
            ? { ...p, comments: [...(p.comments || []), newComment] }
            : p
        )
      );
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-3xl">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.displayName}
                  </h1>
                  <p className="text-gray-500">@{profile.email.split("@")[0]}</p>
                </div>

                {/* Follow Button */}
                {!isOwnProfile && (
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${
                      isFollowing
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 mt-4 text-sm">
                <div>
                  <span className="font-bold text-gray-900">{posts.length}</span>
                  <p className="text-gray-500">Posts</p>
                </div>
                <div>
                  <span className="font-bold text-gray-900">
                    {profile.followers.length}
                  </span>
                  <p className="text-gray-500">Followers</p>
                </div>
                <div>
                  <span className="font-bold text-gray-900">
                    {profile.following.length}
                  </span>
                  <p className="text-gray-500">Following</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mt-6 pt-6 border-t">
            {editMode && isOwnProfile ? (
              <div className="space-y-3">
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveBio}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditBio(profile.bio || "");
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <p className="text-gray-700">
                  {profile.bio || (isOwnProfile ? "No bio yet. Click Edit to add one." : "")}
                </p>
                {isOwnProfile && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-blue-500 hover:underline text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Posts Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Posts</h2>
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-600">No posts yet</p>
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
    </div>
  );
}
