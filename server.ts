import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set high limit for base64 image upload
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini Client Lazily to prevent startup crashes if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Core API endpoint to analyze a food image
app.post("/api/analyze", async (req, res) => {
  try {
    const { image, goal, plateSize, cuisine, isDrink, isSweetened } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image base64 data provided." });
    }

    // Strip out base64 padding/headers if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("No GEMINI_API_KEY found, returning premium high-quality simulated demo data for UI testing.");
      return res.json(createSimulatedData(goal, plateSize, cuisine, isDrink, isSweetened));
    }

    const ai = getGeminiClient();

    // Frame the prompt based on goal and user inputs
    const promptText = `
      You are an elite athletic nutrition specialist and food visual analyst.
      Analyze the attached image of a ${isDrink ? "beverage" : "meal"} and extract its visual color properties and macronutrient estimations.

      Consider the following user context to customize the advice:
      - Gym/Fitness Goal: ${goal || "Muscle Gain"}
      - Plate/Serving Size: ${plateSize || "Medium"}
      - Regional Cuisine Hint: ${cuisine || "General/Western"}
      ${isDrink ? `- Unsweetened or sweetened hint: ${isSweetened ? "Sweetened" : "Unsweetened"}` : ""}

      Visual Analysis Rules:
      1. Determine if the image is valid (has detectable food/beverage, is not blurry or too dark). If false, set is_valid_image to false and explain why.
      2. Identify separate food items / ingredients and provide bounding box coordinates in percentage terms: [ymin, xmin, ymax, xmax] from 0 to 100. Write bounding boxes that outline where those food items visually reside on the plate.
      3. Rate visual color diversity (presence of multi-colored vegetables, fruits: green, red, yellow).
      4. Estimate the "browning/fried level" (golden, dark brown, charred, carbonized) - higher value means deep fried or burnt.
      5. Estimate "oil/shine level" (glossiness, greasy appearance, visible liquid fat) - higher value means more hidden sauces/oils.
      6. Estimate "freshness_score" (bright crisp greens, raw fruits, visually clean vs gray/withered).
      7. Provide realistic ESTIMATED macro ranges (not precise values) for each identified item and for the overall plate. Show your healthy caution by highlighting standard estimation confidence ranges.
      8. Formulate a highly targeted fitness recommendation aligned explicitly with their selected goal: "${goal || "Muscle Gain"}". Provide realistic and helpful gym-focused plate feedback.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        },
        { text: promptText },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meal_type: { type: Type.STRING, description: "e.g., breakfast, lunch, dinner, snack, or drink" },
            is_valid_image: { type: Type.BOOLEAN, description: "false if the image is blurry, too dark, or contains no detectable food or beverage. Otherwise true." },
            invalid_reason: { type: Type.STRING, description: "Explanation if is_valid_image is false." },
            detected_foods: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Item name (e.g. Rice, Grilled Salmon, Salad, Shiro, Injera)" },
                  visible_area_percent: { type: Type.INTEGER, description: "Percent layout space (0-100)" },
                  portion_estimate: { type: Type.STRING, description: "Small, Medium, or Large" },
                  confidence: { type: Type.NUMBER, description: "Score from 0.0 to 1.0" },
                  bbox: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: "Bounding box for segmentation: [ymin, xmin, ymax, xmax] normalized from 0 to 100"
                  }
                },
                required: ["name", "visible_area_percent", "portion_estimate", "confidence", "bbox"]
              },
            },
            color_analysis: {
              type: Type.OBJECT,
              properties: {
                dominant_colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                color_diversity_score: { type: Type.INTEGER },
                vegetable_color_score: { type: Type.INTEGER },
                browning_fried_score: { type: Type.INTEGER },
                oil_shine_score: { type: Type.INTEGER },
                freshness_score: { type: Type.INTEGER }
              },
              required: ["dominant_colors", "color_diversity_score", "vegetable_color_score", "browning_fried_score", "oil_shine_score", "freshness_score"]
            },
            nutrition_estimate: {
              type: Type.OBJECT,
              properties: {
                calories_range: { type: Type.STRING },
                calories_mid: { type: Type.INTEGER },
                protein_g_range: { type: Type.STRING },
                protein_g_mid: { type: Type.INTEGER },
                carbs_g_range: { type: Type.STRING },
                carbs_g_mid: { type: Type.INTEGER },
                fat_g_range: { type: Type.STRING },
                fat_g_mid: { type: Type.INTEGER }
              },
              required: ["calories_range", "calories_mid", "protein_g_range", "protein_g_mid", "carbs_g_range", "carbs_g_mid", "fat_g_range", "fat_g_mid"]
            },
            goal_feedback: {
              type: Type.OBJECT,
              properties: {
                fitness_note: { type: Type.STRING },
                muscle_gain_score: { type: Type.INTEGER },
                fat_loss_score: { type: Type.INTEGER },
                athletic_performance_score: { type: Type.INTEGER }
              },
              required: ["fitness_note", "muscle_gain_score", "fat_loss_score", "athletic_performance_score"]
            },
            confidence: { type: Type.STRING }
          },
          required: ["meal_type", "is_valid_image", "detected_foods", "color_analysis", "nutrition_estimate", "goal_feedback", "confidence"]
        },
      },
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    res.json(parsedResponse);
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({ error: error.message || "Internal analysis failure." });
  }
});

// Seed mock simulation helper if Gemini API isn't active
function createSimulatedData(goal: string, plateSize: string, cuisine: string, isDrink?: boolean, isSweetened?: boolean) {
  const isEthiopian = cuisine?.toLowerCase().includes("ethiop") || cuisine?.toLowerCase().includes("african");

  if (isDrink) {
    const isMockSweetened = isSweetened !== undefined ? isSweetened : true;
    return {
      meal_type: "drink",
      is_valid_image: true,
      detected_foods: [
        {
          name: isEthiopian ? "Avocado & Mango Layered Juice" : "Berry Protein Smoothie",
          visible_area_percent: 80,
          portion_estimate: plateSize || "Medium",
          confidence: 0.95,
          bbox: [10, 20, 90, 80]
        },
        {
          name: "Organic Honey/Sugars",
          visible_area_percent: 20,
          portion_estimate: "Small",
          confidence: 0.82,
          bbox: [30, 40, 50, 60]
        }
      ],
      color_analysis: {
        dominant_colors: isEthiopian ? ["Green", "Yellow", "Orange"] : ["Purple", "Red", "White"],
        color_diversity_score: isEthiopian ? 85 : 70,
        vegetable_color_score: isEthiopian ? 30 : 20,
        browning_fried_score: 5,
        oil_shine_score: 5,
        freshness_score: 90
      },
      nutrition_estimate: {
        calories_range: isMockSweetened ? "280-350" : "150-190",
        calories_mid: isMockSweetened ? 315 : 170,
        protein_g_range: isEthiopian ? "4-8" : "15-22",
        protein_g_mid: isEthiopian ? 6 : 18,
        carbs_g_range: isMockSweetened ? "50-65" : "18-25",
        carbs_g_mid: isMockSweetened ? 58 : 22,
        fat_g_range: "8-14",
        fat_g_mid: 11
      },
      goal_feedback: {
        fitness_note: `This refreshing drink looks vibrant and high in micronutrients! For your "${goal || "Muscle Gain"}" goal, the sugars are slightly elevated ${isMockSweetened ? "(sweetened profile)" : ""}. If focusing on fat loss, prioritize unsweetened whole-fruit entries or add a scoop of whey protein.`,
        muscle_gain_score: goal === "Muscle Gain" ? 82 : 65,
        fat_loss_score: goal === "Fat Loss" ? 45 : 70,
        athletic_performance_score: 80
      },
      confidence: "medium",
      demo_placeholder: true
    };
  }

  // Solid food simulations
  const foods = isEthiopian
    ? [
        { name: "Injera (Sourdough Flatbread)", visible_area_percent: 50, portion_estimate: "Medium", confidence: 0.92, bbox: [5, 5, 95, 95] },
        { name: "Sautéed Beef Tibs", visible_area_percent: 25, portion_estimate: "Medium", confidence: 0.88, bbox: [20, 30, 60, 70] },
        { name: "Misir Wot (Spiced Red Lentils)", visible_area_percent: 25, portion_estimate: "Small", confidence: 0.85, bbox: [40, 50, 80, 90] }
      ]
    : [
        { name: "Brown Rice", visible_area_percent: 40, portion_estimate: plateSize || "Medium", confidence: 0.94, bbox: [15, 10, 80, 50] },
        { name: "Grilled Chicken Breast", visible_area_percent: 35, portion_estimate: plateSize || "Medium", confidence: 0.96, bbox: [20, 50, 70, 90] },
        { name: "Stir-fried Broccoli & Peppers", visible_area_percent: 25, portion_estimate: "Small", confidence: 0.89, bbox: [60, 30, 90, 75] }
      ];

  const calorieMid = isEthiopian ? 680 : 540;
  const proteinMid = isEthiopian ? 34 : 45;
  const carbsMid = isEthiopian ? 95 : 55;
  const fatMid = isEthiopian ? 20 : 12;

  const browning = isEthiopian ? 45 : 30;
  const oil = isEthiopian ? 55 : 20;

  return {
    meal_type: "lunch",
    is_valid_image: true,
    detected_foods: foods,
    color_analysis: {
      dominant_colors: isEthiopian ? ["Brown", "Red", "Grey", "Yellow"] : ["Brown", "White", "Green", "Red"],
      color_diversity_score: isEthiopian ? 75 : 82,
      vegetable_color_score: isEthiopian ? 35 : 65,
      browning_fried_score: browning,
      oil_shine_score: oil,
      freshness_score: isEthiopian ? 60 : 85
    },
    nutrition_estimate: {
      calories_range: `${calorieMid - 70}-${calorieMid + 70}`,
      calories_mid: calorieMid,
      protein_g_range: `${proteinMid - 5}-${proteinMid + 5}`,
      protein_g_mid: proteinMid,
      carbs_g_range: `${carbsMid - 10}-${carbsMid + 10}`,
      carbs_g_mid: carbsMid,
      fat_g_range: `${fatMid - 4}-${fatMid + 5}`,
      fat_g_mid: fatMid
    },
    goal_feedback: {
      fitness_note: isEthiopian
        ? `This traditional Ethiopian plate provides rich complex carbs through Injera, and a decent protein intake with sautéed Tibs. Visually, the oil/shine is estimated at ${oil}% (medium), which contributes heavily to fats. For "${goal || "Muscle Gain"}", ensure you maintain sufficient protein density while tracking cooking oils.`
        : `An exceptionally clear and balanced sports performance plate! The grilled chicken offers lean protein suitable for high muscle protein synthesis. Browning level is perfectly moderate (${browning}/100) and freshness remains brilliant (${85}/100). Outstanding choice for "${goal || "Muscle Gain"}".`,
      muscle_gain_score: goal === "Muscle Gain" ? 90 : 75,
      fat_loss_score: goal === "Fat Loss" ? (isEthiopian ? 62 : 88) : 70,
      athletic_performance_score: 85
    },
    confidence: "high",
    demo_placeholder: true
  };
}

// 2. Main Entry Setup: Vite integration for full-stack dev/server execution
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Use Vite's connect instance as middleware
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static frontend assets
    app.use(express.static(distPath));
    
    // Fallback for SPA routers
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PlateSense AI Server] up and running on http://localhost:${PORT}`);
  });
}

startServer();
