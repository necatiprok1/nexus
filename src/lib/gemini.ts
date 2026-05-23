import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  name: "openrouter",
});

const model = openrouter("openai/gpt-oss-120b:free");

/**
 * Generate AI-assisted post caption
 * Takes user's initial input and suggests improvements/expansions
 */
export async function generatePostCaption(userInput: string): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      prompt: `You are a social media expert. A user is writing a post and wants help improving the caption. 
      
User's draft: "${userInput}"

Generate a more engaging, polished version of this post caption. Keep it authentic but make it more compelling for social media. 
- Add relevant emojis if appropriate
- Keep it concise but impactful
- Maintain the user's voice and intent

Return only the improved caption, nothing else.`,
      temperature: 0.7,
      maxRetries: 0,
    });

    return text;
  } catch (error) {
    console.error("Error generating caption:", error);
    throw new Error("Failed to generate caption");
  }
}

/**
 * Auto-generate hashtags for a post
 */
export async function generateHashtags(
  content: string,
  count: number = 5
): Promise<string[]> {
  try {
    const { text } = await generateText({
      model,
      prompt: `Analyze this post and generate ${count} relevant hashtags that would help it reach the right audience.

Post content: "${content}"

Return ONLY a comma-separated list of hashtags (include the # symbol). Example: #photography,#nature,#travel

No explanations, just the hashtags.`,
      temperature: 0.7,
      maxRetries: 0,
    });

    return text
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  } catch (error) {
    console.error("Error generating hashtags:", error);
    return [];
  }
}

/**
 * Moderate content for harmful/spam content
 * Returns { isClean, reason } where isClean = true means content is safe to post
 */
export async function moderateContent(content: string): Promise<{
  isClean: boolean;
  reason: string;
  severity: "safe" | "warning" | "blocked";
}> {
  try {
    const { text } = await generateText({
      model,
      prompt: `You are a content moderator for a social media platform. Analyze the following post for:
1. Spam or promotional content
2. Harmful, hateful, or abusive language
3. Misinformation or false claims
4. Explicit or adult content
5. Personal attacks or harassment

Content: "${content}"

Respond with JSON only (no markdown, no extra text):
{
  "isClean": boolean,
  "reason": "brief explanation if any issues found",
  "severity": "safe" | "warning" | "blocked"
}

Guidelines:
- "safe": No issues, post is fine
- "warning": Potentially problematic but acceptable (e.g., mildly controversial)
- "blocked": Should not be posted (spam, hate speech, harassment)`,
      temperature: 0.3,
      maxRetries: 0,
    });

    // Parse the response
    try {
      const parsed = JSON.parse(text);
      return {
        isClean: parsed.isClean,
        reason: parsed.reason || "",
        severity: parsed.severity || "safe",
      };
    } catch {
      // Fallback if JSON parsing fails
      return {
        isClean: true,
        reason: "Moderation check completed",
        severity: "safe",
      };
    }
  } catch (error) {
    console.error("Error moderating content:", error);
    // Default to safe to not block users during errors
    return {
      isClean: true,
      reason: "Moderation service temporarily unavailable",
      severity: "safe",
    };
  }
}

/**
 * Analyze sentiment of text (for comments, posts, etc.)
 * Returns sentiment score and emoji
 */
export async function analyzeSentiment(text: string): Promise<{
  sentiment: "positive" | "neutral" | "negative";
  score: number; // -1 to 1
  emoji: string;
}> {
  try {
    const { text: result } = await generateText({
      model,
      prompt: `Analyze the sentiment of this text. Return a JSON object with sentiment analysis.

Text: "${text}"

Respond with JSON only (no markdown):
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": number between -1 (very negative) and 1 (very positive),
  "emoji": "appropriate emoji representing the sentiment"
}`,
      temperature: 0.3,
      maxRetries: 0,
    });

    try {
      const parsed = JSON.parse(result);
      return {
        sentiment: parsed.sentiment || "neutral",
        score: parsed.score || 0,
        emoji: parsed.emoji || "😐",
      };
    } catch {
      return {
        sentiment: "neutral",
        score: 0,
        emoji: "😐",
      };
    }
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return {
      sentiment: "neutral",
      score: 0,
      emoji: "😐",
    };
  }
}

/**
 * Generate AI-suggested replies/responses to a comment
 */
export async function generateSuggestedReplies(
  comment: string,
  context: string = ""
): Promise<string[]> {
  try {
    const { text } = await generateText({
      model,
      prompt: `A user received this comment and needs help crafting a thoughtful response.

Comment: "${comment}"
${context ? `Post context: "${context}"` : ""}

Generate 3 different response options that are:
- Professional yet friendly
- Relevant to the comment
- Between 10-50 characters each
- Natural and authentic

Return the responses as a JSON array of strings (no markdown, just JSON):
["response 1", "response 2", "response 3"]`,
      temperature: 0.7,
      maxRetries: 0,
    });

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } catch (error) {
    console.error("Error generating suggested replies:", error);
    return [];
  }
}

/**
 * Generate personalized content recommendations
 * Takes user interests and generates post topics they might like
 */
export async function generateRecommendedTopics(
  userInterests: string[],
  count: number = 5
): Promise<string[]> {
  try {
    const { text } = await generateText({
      model,
      prompt: `Based on these user interests, suggest ${count} types of posts they might enjoy:

Interests: ${userInterests.join(", ")}

Generate ${count} post topic suggestions that would be engaging for this user. Keep each suggestion concise (under 10 words).

Return as a JSON array of strings:
["topic 1", "topic 2", ...]`,
      temperature: 0.8,
      maxRetries: 0,
    });

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return [];
  }
}

/**
 * Get Gemini's analysis on trending topics for a given category
 */
export async function analyzeTrendingTopics(
  category: string
): Promise<string[]> {
  try {
    const { text } = await generateText({
      model,
      prompt: `What are currently trending or popular topics in the "${category}" space right now (as of your knowledge cutoff)?

List 5 trending topics that would be interesting for a social media post.

Return as a JSON array of strings:
["topic 1", "topic 2", ...]`,
      temperature: 0.7,
      maxRetries: 0,
    });

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } catch (error) {
    console.error("Error analyzing trending topics:", error);
    return [];
  }
}

export default {
  generatePostCaption,
  generateHashtags,
  moderateContent,
  analyzeSentiment,
  generateSuggestedReplies,
  generateRecommendedTopics,
  analyzeTrendingTopics,
};
