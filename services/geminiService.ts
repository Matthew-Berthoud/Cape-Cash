import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CATEGORIES } from "../constants";
import { ParsedReceiptData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const receiptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description: "The date of the transaction in YYYY-MM-DD format.",
    },
    amount: {
      type: Type.NUMBER,
      description: "The total amount of the transaction.",
    },
    category: {
      type: Type.STRING,
      enum: CATEGORIES,
      description: "The most appropriate category from the allowed list.",
    },
    description: {
      type: Type.STRING,
      description: "A short, concise description of the expense item (e.g., 'Team Lunch', 'Office Keyboard', 'Uber to Airport').",
    },
  },
  required: ["date", "amount", "category", "description"],
};

export const analyzeReceipt = async (base64Data: string, mimeType: string): Promise<ParsedReceiptData> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `Analyze this receipt. 
            Extract the date, total amount, write a short description, and determine the best category from the provided schema enum.
            
            Context clues for categorization:
            - Grocery receipts are usually "9080 Employee Morale"
            - Parking receipts are "8197 G&A Office parking/tolls"
            - Computer peripherals/electronics are "8190 G&A Office supplies"
            - Meals should be "8321 G&A Business meals" or "5500 Direct Meals and Incidental" depending on context, default to 8321 if unsure.
            - Travel expenses like flights/trains are "8320 G&A Travel".
            
            Return JSON only.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as ParsedReceiptData;
    return data;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Return safe fallback values if AI fails, so user can edit manually
    return {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: CATEGORIES[0],
      description: ''
    };
  }
};