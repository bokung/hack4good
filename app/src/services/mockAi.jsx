import OpenAI from "openai";

/**
 * A mock AI service that returns a "summary" for an email chain.
 * Replace this with a real request to an LLM or other text analysis API.
 */
export async function generateSummary(emailThread) {
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true
  });
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    store: true,
    messages: [
      {
        "role": "user",
        "content": `Summarize this email thread in 30 words or less: ${emailThread}`
      },
    ],
  });

  const summary = completion.choices[0]?.message?.content || "No summary available.";
  return summary;
}

/**
 * A new function to parse meeting requests from an email body.
 * If the email is not about scheduling, returns "{None}".
 * Otherwise, returns a JSON-like string in the specified format:
 * { Day: 19, Month: 1, Year: 2024, Time: 20:10, Task: "Something" }
 */
export async function parseMeetingRequest(emailBody) {
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt = `
    You are a system that strictly extracts date and time information from emails related to scheduling or meetings. Your output must always be a single text block in the following format:
    { Day: 19, Month: 1, Year: 2024, Time: 20:10, Task: "Buy some books" }
    If the email includes a clear date/time for a meeting or scheduled task, parse and return it with the above JSON keys. The Task field should describe the primary action (e.g., "Meet me", "Buy books", etc.).
    The Time should always be formatted as HH:MM (24-hour time).
    If the email does not mention scheduling a task/meeting, return:
    {None}
    Return nothing else—no explanations or extra text.
    Do not return code blocks, output in plain text.
    Email Content:
    ${emailBody}
  `.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    store: true,
    messages: [
      { "role": "user", "content": prompt }
    ],
  });

  // Raw output could be a string like "{ Day: 19, Month: 1, ... }" or "{None}"
  const parsedOutput = completion.choices[0]?.message?.content || "{None}";
  return parsedOutput;
}
