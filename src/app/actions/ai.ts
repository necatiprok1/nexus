"use server";

import {
  generatePostCaption,
  generateHashtags,
  moderateContent,
  analyzeSentiment,
  generateSuggestedReplies,
} from "@/lib/gemini";

export async function aiGenerateCaption(text: string): Promise<string> {
  return generatePostCaption(text);
}

export async function aiGenerateHashtags(text: string): Promise<string[]> {
  return generateHashtags(text, 5);
}

export async function aiModerateContent(text: string): Promise<{
  isClean: boolean;
  reason: string;
  severity: "safe" | "warning" | "blocked";
}> {
  return moderateContent(text);
}

export async function aiAnalyzeSentiment(text: string): Promise<{
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  emoji: string;
}> {
  return analyzeSentiment(text);
}

export async function aiGenerateReplies(comment: string, context?: string): Promise<string[]> {
  return generateSuggestedReplies(comment, context || "");
}
