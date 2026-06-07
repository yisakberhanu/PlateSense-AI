export type GymGoal = "Muscle Gain" | "Fat Loss" | "Athletic Performance" | "Pure Healthy Eating";

export type RegionalCuisine = "Western/General" | "Ethiopian" | "African" | "Asian" | "Middle Eastern" | "Mediterranean";

export interface UserProfile {
  goal: GymGoal;
  weightKg: number;
  heightCm: number;
  trainingDaysPerWeek: number;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dietaryPreference: string;
  regionPreference: RegionalCuisine;
}

export interface DetectedFood {
  name: string;
  visible_area_percent: number;
  portion_estimate: "Small" | "Medium" | "Large" | string;
  confidence: number;
  bbox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] coordinates from 0 to 100
}

export interface ColorAnalysis {
  dominant_colors: string[];
  color_diversity_score: number; // 0-100
  vegetable_color_score: number; // 0-100
  browning_fried_score: number;  // 0-100
  oil_shine_score: number;       // 0-100
  freshness_score: number;       // 0-100
}

export interface NutritionEstimate {
  calories_range: string;
  calories_mid: number;
  protein_g_range: string;
  protein_g_mid: number;
  carbs_g_range: string;
  carbs_g_mid: number;
  fat_g_range: string;
  fat_g_mid: number;
}

export interface GoalFeedback {
  fitness_note: string;
  muscle_gain_score: number;
  fat_loss_score: number;
  athletic_performance_score: number;
}

export interface MealAnalysisResult {
  meal_type: string;
  is_valid_image: boolean;
  invalid_reason?: string;
  detected_foods: DetectedFood[];
  color_analysis: ColorAnalysis;
  nutrition_estimate: NutritionEstimate;
  goal_feedback: GoalFeedback;
  confidence: "low" | "medium" | "high" | string;
  demo_placeholder?: boolean;
}

export interface SavedMeal {
  id: string;
  timestamp: string; // ISO String
  image?: string; // base64 representation of original
  isDrink: boolean;
  analysis: MealAnalysisResult;
  userCorrection?: {
    customCalories?: number;
    customProtein?: number;
    customCarbs?: number;
    customFat?: number;
    portionLabel?: string;
    customMealName?: string;
  };
  notes?: string;
}
