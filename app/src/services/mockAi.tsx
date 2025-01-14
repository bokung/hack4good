import OpenAI from "openai";

/**
 * A mock AI service that returns a "summary" for an email chain.
 * Replace this with a real request to an LLM or other text analysis API.
 */
export async function generateSummary(emailThread: string): Promise<string> {
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true
  });
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    store: true,
    messages: [
      {"role": "user", "content": `Summarize this email thread: ${emailThread}`},
    ],
  });

  const summary = completion.choices[0]?.message?.content || "No summary available.";
  return summary;
}