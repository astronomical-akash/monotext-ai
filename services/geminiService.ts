import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const formatTextWithGemini = async (htmlContent: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key is missing. Please configure it.");

  const prompt = `
    You are an expert technical editor.
    Your task is to FORMAT the provided HTML content to be visually structured and mathematically correct, while strictly PRESERVING the original text content and language.

    ### CRITICAL CONSTRAINTS (DO NOT VIOLATE)
    1. **PRESERVE LANGUAGE**: If the input is in Bengali, Hindi, English, or any other language, **KEEP IT IN THAT LANGUAGE**. DO NOT TRANSLATE.
    2. **PRESERVE CONTENT**: Do NOT rewrite sentences, do NOT summarize, do NOT change the meaning. Keep the tone exactly as is.
    3. **ONLY FIX**:
       - HTML Structure (headings, lists, paragraphs).
       - Mathematical Formatting (LaTeX).
       - Minor typos and spelling errors.

    ### MATHEMATICAL FORMATTING RULES (STRICT)
    1. **Inline Math**: Enclose ALL variables, constants, and short expressions in single dollar signs ($...$).
       - Example: "charge q" -> "charge $q$"
       - Example: "q = ne" -> "$q = ne$"
       - Example: "x" -> "$x$"
       - Example: "1/3" -> "$\\frac{1}{3}$"
    2. **Block Math**: Enclose complex equations in double dollar signs ($$...$$).
    3. **Variables**: Even single letters representing variables (e.g., n, x, y, e) MUST be formatted as math ($n$).

    ### HTML FORMATTING
    1. Use <h1>, <h2>, <p>, <ul>, <li>, <strong>, <em> to structure the document.
    2. **Images**: PRESERVE all <img> tags exactly as they appear.
    3. **Output**: Return ONLY the raw HTML body content. Do not output markdown blocks.

    ### INPUT CONTENT:
    ${htmlContent}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text || "";
    // Cleanup if the model wraps it in markdown blocks despite instructions
    text = text.replace(/^```html\s*/, '').replace(/```$/, '');
    return text.trim();
  } catch (error) {
    console.error("Error formatting text with Gemini:", error);
    throw error;
  }
};

export const suggestTopics = async (existingTopics: string[]): Promise<string[]> => {
    const ai = getAiClient();
    if (!ai) return [];

    const prompt = `
      Based on this list of existing topics: ${existingTopics.join(", ")},
      suggest 3 new, relevant, high-level topics for organizing a personal knowledge base.
      Return them as a JSON array of strings.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const generateContextualContent = async (
  query: string,
  contextText: string,
  length: 'short' | 'medium' | 'long'
): Promise<string> => {
    const ai = getAiClient();
    if (!ai) throw new Error("API Key is missing.");

    const lengthPrompt = {
        short: "Keep it very brief, 1-2 sentences maximum.",
        medium: "Write a standard paragraph, about 50-80 words.",
        long: "Write a detailed explanation, 2-3 paragraphs."
    }[length];

    const prompt = `
        You are a technical assistant helping to write a document.
        
        Context: The user is writing a document with the following content:
        "${contextText.substring(0, 1000)}..." (truncated)

        Task: The user wants to insert content clarifying/explaining: "${query}".
        
        ### REQUIREMENTS:
        1. **Language**: Respond in the SAME LANGUAGE as the Context provided above.
        2. Match the tone and style of the provided context.
        3. ${lengthPrompt}
        4. Return ONLY valid HTML tags (like <p>, <ul>, <strong>, <em>).
        5. Do NOT wrap in markdown code blocks (no \`\`\`html).
        
        ### STRICT MATHEMATICAL FORMATTING:
        - If the content involves math, physics formulas, or variables, YOU MUST USE LaTeX.
        - **Inline**: Use $...$ (e.g., $F=ma$, $x$, $y$).
        - **Block**: Use $$...$$ for main equations.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let text = response.text || "";
        text = text.replace(/^```html\s*/, '').replace(/```$/, '');
        return text.trim();
    } catch (error) {
        console.error("Error generating content:", error);
        throw error;
    }
};

export const generateLatexFromText = async (text: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key is missing.");

  const prompt = `
    You are a mathematical typesetting assistant.
    Convert the selected text into proper LaTeX syntax.

    Rules:
    1. **Inline Math**: If the input is a short expression (like "1/3", "x^2", "alpha"), you MUST wrap it in single dollar signs: $...$ (e.g., $\\frac{1}{3}$).
    2. **Block Math**: If it's a complex equation, use double dollar signs: $$...$$.
    3. **Mixed Text**: If the input contains text AND math (e.g., "The fraction is 1/3" or "১/৩ অংশ"), preserve the text and only format the math parts into LaTeX (e.g., "The fraction is $\\frac{1}{3}$").
    4. **Language**: Preserve any non-English text (e.g., Bengali, Hindi) exactly as is.
    5. **Idempotency**: If the text is already formatted as LaTeX (e.g. enclosed in $...$), ensure it is correct but do not add extra dollar signs.
    6. Return ONLY the result string. No markdown code blocks.

    Input: "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    let result = response.text || "";
    // Clean up potential markdown
    return result.replace(/^```(latex|tex)?/i, '').replace(/```$/, '').trim();
  } catch (error) {
    console.error("Error generating LaTeX:", error);
    throw error;
  }
};