"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  aiGenerateCaption,
  aiGenerateHashtags,
  aiModerateContent,
} from "@/app/actions/ai";
import Navbar from "@/components/Navbar";

export default function Compose() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestedCaption, setSuggestedCaption] = useState<string | null>(null);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);

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
    router.push("/auth/signin");
    return null;
  }

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 4) {
      setError("Maximum 4 images allowed");
      return;
    }

    setImages([...images, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreviews((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // Get AI caption suggestion
  const handleGetCaptionSuggestion = async () => {
    if (!content.trim()) {
      setError("Write something first");
      return;
    }

    setAiLoading(true);
    try {
      const suggestion = await aiGenerateCaption(content);
      setSuggestedCaption(suggestion);
    } catch (err) {
      console.error("Error getting caption suggestion:", err);
      setError("Failed to get AI suggestion");
    } finally {
      setAiLoading(false);
    }
  };

  // Get hashtag suggestions
  const handleGetHashtagSuggestion = async () => {
    if (!content.trim()) {
      setError("Write something first");
      return;
    }

    setAiLoading(true);
    try {
      const hashtags = await aiGenerateHashtags(content);
      setSuggestedHashtags(hashtags);
    } catch (err) {
      console.error("Error getting hashtag suggestion:", err);
      setError("Failed to get hashtag suggestions");
    } finally {
      setAiLoading(false);
    }
  };

  // Check content moderation
  const handleCheckModeration = async () => {
    if (!content.trim()) {
      setError("Write something first");
      return;
    }

    setAiLoading(true);
    try {
      const result = await aiModerateContent(content);
      if (!result.isClean) {
        setModerationWarning(
          `⚠️ ${result.severity === "blocked" ? "This post may not be allowed" : "This post may be flagged"}: ${result.reason}`
        );
      } else {
        setModerationWarning(null);
      }
    } catch (err) {
      console.error("Error checking moderation:", err);
      setError("Failed to check moderation");
    } finally {
      setAiLoading(false);
    }
  };

  // Apply suggested caption
  const applySuggestedCaption = () => {
    if (suggestedCaption) {
      setContent(suggestedCaption);
      setSuggestedCaption(null);
    }
  };

  // Add suggested hashtag
  const addHashtag = (hashtag: string) => {
    if (!content.endsWith(" ")) {
      setContent(content + " " + hashtag);
    } else {
      setContent(content + hashtag);
    }
  };

  // Submit post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Write something to post");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload images to Firebase Storage
      const imageUrls: string[] = [];
      for (const image of images) {
        const storageRef = ref(
          storage,
          `posts/${user.uid}/${Date.now()}-${image.name}`
        );
        const snapshot = await uploadBytes(storageRef, image);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      // Extract hashtags from content
      const hashtags = content.match(/#\w+/g) || [];

      // Create post document
      await addDoc(collection(db, "posts"), {
        authorId: user.uid,
        content,
        images: imageUrls,
        hashtags,
        likes: [],
        comments: [],
        sentiment: null,
        moderationScore: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setSuccess(true);
      setContent("");
      setImages([]);
      setImagePreviews([]);
      setSuggestedCaption(null);
      setSuggestedHashtags([]);
      setModerationWarning(null);

      setTimeout(() => {
        setSuccess(false);
        router.push("/feed");
      }, 2000);
    } catch (err) {
      console.error("Error creating post:", err);
      setError("Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Post</h1>
          <p className="text-gray-600">Share your thoughts with the world</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
              {userProfile?.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{userProfile?.displayName}</p>
              <p className="text-gray-500 text-sm">@{user.email?.split("@")[0]}</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
              ✅ Post created successfully! Redirecting...
            </div>
          )}

          {/* Moderation Warning */}
          {moderationWarning && (
            <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg text-sm">
              {moderationWarning}
            </div>
          )}

          {/* Content Textarea */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={uploading}
              placeholder="What's on your mind? #hashtags supported"
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">{content.length} characters</p>
          </div>

          {/* AI Tools */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleGetCaptionSuggestion}
              disabled={aiLoading || uploading || !content.trim()}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              ✨ {aiLoading ? "..." : "Caption"}
            </button>
            <button
              type="button"
              onClick={handleGetHashtagSuggestion}
              disabled={aiLoading || uploading || !content.trim()}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              #️⃣ {aiLoading ? "..." : "Tags"}
            </button>
            <button
              type="button"
              onClick={handleCheckModeration}
              disabled={aiLoading || uploading || !content.trim()}
              className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              🛡️ {aiLoading ? "..." : "Check"}
            </button>
          </div>

          {/* Suggested Caption */}
          {suggestedCaption && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">AI Suggested Caption:</p>
              <p className="text-sm text-blue-800 mb-2">{suggestedCaption}</p>
              <button
                type="button"
                onClick={applySuggestedCaption}
                className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Use This
              </button>
            </div>
          )}

          {/* Suggested Hashtags */}
          {suggestedHashtags.length > 0 && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm font-medium text-purple-900 mb-2">Suggested Hashtags:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedHashtags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addHashtag(tag)}
                    className="text-xs px-3 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images (max 4)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-gray-600 text-sm">
                📸 Click to upload images or drag and drop
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                disabled={uploading || images.length >= 4}
                className="hidden"
              />
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${idx}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={uploading || !content.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {uploading ? "Publishing..." : "Publish Post"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={uploading}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
