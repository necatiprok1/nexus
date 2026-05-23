"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { aiAnalyzeSentiment, aiGenerateReplies } from "@/app/actions/ai";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";

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
  comments?: Comment[];
  sentiment?: string;
  moderationScore?: number;
  createdAt: Timestamp | number;
  updatedAt?: Timestamp | number;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  likes: string[];
  sentiment?: string;
  aiSuggestedReplies?: string[];
  createdAt: Timestamp | number;
}

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string, comment: string) => void;
}

export default function PostCard({ post, onLike, onComment }: PostCardProps) {
  const { user, userProfile } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isLiked = post.likes.includes(user?.uid || "");
  const likeCount = post.likes.length;
  const commentCount = post.comments?.length || 0;

  const handleLike = () => {
    onLike?.(post.id);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !onComment) return;

    setLoadingComment(true);
    try {
      onComment(post.id, newComment);
      setNewComment("");
      setSuggestedReplies([]);
      setShowSuggestions(false);
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!newComment.trim()) return;

    try {
      const suggestions = await aiGenerateReplies(
        newComment,
        post.content
      );
      setSuggestedReplies(suggestions);
      setShowSuggestions(!showSuggestions);
    } catch (error) {
      console.error("Failed to get suggestions:", error);
    }
  };

  const useSuggestion = (suggestion: string) => {
    setNewComment(suggestion);
    setShowSuggestions(false);
  };

  const formatDate = (date: Timestamp | number): string => {
    const d =
      date instanceof Timestamp
        ? date.toDate()
        : new Date(date as number);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
            {post.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link
              href={`/profile/${post.authorId}`}
              className="font-bold text-gray-900 hover:underline"
            >
              {post.authorName}
            </Link>
            <p className="text-gray-500 text-sm">@{post.authorEmail.split("@")[0]}</p>
            <p className="text-gray-400 text-xs">{formatDate(post.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-3">
        <p className="text-gray-900 text-base leading-normal">{post.content}</p>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2">
            {post.images.map((image, idx) => (
              <img
                key={idx}
                src={image}
                alt={`Post image ${idx + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            ))}
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {post.hashtags.map((tag) => (
              <span key={tag} className="text-blue-500 text-sm hover:underline cursor-pointer">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Sentiment */}
        {post.sentiment && (
          <div className="mt-2 inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
            Sentiment: {post.sentiment}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="flex gap-6 text-gray-500 mb-3 text-sm border-t border-b border-gray-100 py-2">
        <button
          onClick={() => setShowComments(!showComments)}
          className="hover:text-blue-500 transition-colors flex items-center gap-2"
        >
          <span>💬</span>
          <span>{commentCount}</span>
        </button>
        <button
          onClick={handleLike}
          className={`transition-colors flex items-center gap-2 ${
            isLiked ? "text-red-500" : "hover:text-red-500"
          }`}
        >
          <span>{isLiked ? "❤️" : "🤍"}</span>
          <span>{likeCount}</span>
        </button>
        <button className="hover:text-green-500 transition-colors flex items-center gap-2">
          <span>↗️</span>
          <span>0</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 space-y-3 bg-gray-50 p-3 rounded-lg">
          {/* Comment Form */}
          <form onSubmit={handleComment} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Reply to this post..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={loadingComment}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loadingComment || !newComment.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {loadingComment ? "..." : "Post"}
              </button>
            </div>

            {/* AI Suggestions */}
            <div>
              <button
                type="button"
                onClick={handleGetSuggestions}
                disabled={!newComment.trim()}
                className="text-xs text-blue-500 hover:underline disabled:opacity-50"
              >
                ✨ {showSuggestions ? "Hide" : "Show"} AI suggestions
              </button>

              {showSuggestions && suggestedReplies.length > 0 && (
                <div className="mt-2 space-y-1">
                  {suggestedReplies.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => useSuggestion(suggestion)}
                      className="block w-full text-left text-xs p-2 bg-blue-50 hover:bg-blue-100 rounded text-gray-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Existing Comments */}
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-2 mt-3 border-t pt-3">
              {post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="text-sm bg-white p-2 rounded border border-gray-200"
                >
                  <div className="flex justify-between">
                    <p className="font-semibold text-gray-900">
                      {comment.authorName}
                    </p>
                    {comment.sentiment && (
                      <span className="text-xs">{comment.sentiment}</span>
                    )}
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
