import React, { useState } from "react";
import { UserProfile, GymGoal, RegionalCuisine } from "../types";
import { Dumbbell, Flame, TrendingUp, Sparkles, Flag } from "lucide-react";

interface OnboardingProps {
  initialProfile?: UserProfile | null;
  onSave: (profile: UserProfile) => void;
}

export default function Onboarding({ initialProfile, onSave }: OnboardingProps) {
  // Setup baseline states
  const [goal, setGoal] = useState<GymGoal>(initialProfile?.goal || "Muscle Gain");
  const [weight, setWeight] = useState<number>(initialProfile?.weightKg || 75);
  const [height, setHeight] = useState<number>(initialProfile?.heightCm || 178);
  const [trainingDays, setTrainingDays] = useState<number>(initialProfile?.trainingDaysPerWeek || 4);
  const [cuisine, setCuisine] = useState<RegionalCuisine>(initialProfile?.regionPreference || "Western/General");
  const [dietary, setDietary] = useState<string>(initialProfile?.dietaryPreference || "No Restrictions");

  // Dynamically calculate recommended macros based on bodyweight and goal
  // Muscle Gain: 2.2g Protein / kg, Surplus calories
  // Fat Loss: 2.0g Protein / kg, Deficit calories
  // Performance: 1.8g Protein / kg, Maintenance / moderate carbs
  const calculateTargets = () => {
    let protein = 0;
    let calories = 0;

    // Basal Metabolic Rate estimation (approximate Harris-Benedict)
    const bmr = 10 * weight + 6.25 * height - 5 * 25 + 5; // Assumed age 25 male average
    const activityFactor = 1.2 + (trainingDays * 0.1);
    const maintCal = Math.round(bmr * activityFactor);

    switch (goal) {
      case "Muscle Gain":
        protein = Math.round(weight * 2.2);
        calories = maintCal + 350;
        break;
      case "Fat Loss":
        protein = Math.round(weight * 2.0);
        calories = maintCal - 400;
        break;
      case "Athletic Performance":
        protein = Math.round(weight * 1.8);
        calories = maintCal + 100;
        break;
      case "Pure Healthy Eating":
        protein = Math.round(weight * 1.5);
        calories = maintCal;
        break;
    }

    return { calories, protein };
  };

  const { calories: recommendedCal, protein: recommendedProt } = calculateTargets();

  const handleComplete = () => {
    const updatedProfile: UserProfile = {
      goal,
      weightKg: weight,
      heightCm: height,
      trainingDaysPerWeek: trainingDays,
      dailyCalorieTarget: recommendedCal,
      dailyProteinTarget: recommendedProt,
      dietaryPreference: dietary,
      regionPreference: cuisine,
    };
    onSave(updatedProfile);
  };

  const goalCards: { type: GymGoal; label: string; desc: string; icon: any; color: string }[] = [
    {
      type: "Muscle Gain",
      label: "Muscle Gain",
      desc: "Maximize protein synthesis and support muscle recovery with a clean calorie surplus.",
      icon: Dumbbell,
      color: "border-emerald-500/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40",
    },
    {
      type: "Fat Loss",
      label: "Fat Loss & Cut",
      desc: "Promote metabolic rate while sustaining lean muscle mass with high protein and calorie deficits.",
      icon: Flame,
      color: "border-amber-500/50 text-amber-400 bg-amber-950/20 hover:bg-amber-950/40",
    },
    {
      type: "Athletic Performance",
      label: "Athletic Performance",
      desc: "Optimize physical energy, power, and cardiovascular pacing with balanced macronutrients.",
      icon: TrendingUp,
      color: "border-blue-500/50 text-blue-400 bg-blue-950/20 hover:bg-blue-950/40",
    },
    {
      type: "Pure Healthy Eating",
      label: "Balanced Health",
      desc: "Focus on micronutrient color diversity, organic freshness, and clean whole foods.",
      icon: Sparkles,
      color: "border-fuchsia-500/50 text-fuchsia-400 bg-fuchsia-950/20 hover:bg-fuchsia-950/40",
    },
  ];

  return (
    <div id="onboarding-card" className="max-w-4xl mx-auto bg-slate-800/80 border border-slate-700/60 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
      
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700/60 rounded-full text-xs text-slate-300 font-mono mb-3">
          <Flag className="w-3.5 h-3.5 text-emerald-400" />
          FITNESS & CORE DATA PROFILE
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-white mb-2">
          Tailor Your PlateSense AI
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          We use your physique metrics and training schedule to map macronutrient priorities, color alerts, and athletic feedback.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Goals */}
        <div>
          <label className="block text-sm font-mono text-slate-400 uppercase tracking-wider mb-3">
            1. Select Your Core Athletic Goal
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goalCards.map((card) => {
              const IconComp = card.icon;
              const isSelected = goal === card.type;
              return (
                <button
                  key={card.type}
                  id={`goal-btn-${card.type.replace(/\s+/g, "-")}`}
                  type="button"
                  onClick={() => setGoal(card.type)}
                  className={`flex items-start text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? `${card.color} border-2 scale-[1.02] ring-2 ring-emerald-500/30`
                      : "border-slate-700 hover:border-slate-600 bg-slate-900/30 hover:bg-slate-900/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg mr-3 ${isSelected ? `bg-slate-900/70` : `bg-slate-800`}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 font-display">{card.label}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{card.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-700/40">
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Body Weight (kg)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="metric-weight-input"
                type="range"
                min="40"
                max="150"
                value={weight}
                onChange={(e) => setWeight(parseInt(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-900 h-2 rounded-lg"
              />
              <span className="font-mono text-lg font-bold text-white w-16 text-right">{weight} kg</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Height (cm)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="metric-height-input"
                type="range"
                min="130"
                max="220"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-900 h-2 rounded-lg"
              />
              <span className="font-mono text-lg font-bold text-white w-16 text-right">{height} cm</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Gym / Training Frequency
            </label>
            <div className="flex items-center gap-3">
              <input
                id="metric-days-input"
                type="range"
                min="0"
                max="7"
                value={trainingDays}
                onChange={(e) => setTrainingDays(parseInt(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-900 h-2 rounded-lg"
              />
              <span className="font-mono text-lg font-bold text-white w-20 text-right">
                {trainingDays}d / wk
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-700/40">
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Regional Cuisine Hint (Deepens Vision Parsing)
            </label>
            <select
              id="region-select"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value as RegionalCuisine)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="Western/General">Western / General Gym Foods</option>
              <option value="Ethiopian">Traditional Ethiopian (Injera, Tibs, Shiro, etc.)</option>
              <option value="African">General African / Stews</option>
              <option value="Asian">Asian (Rice Bowls, Sushi, Noodles, Stir-fries)</option>
              <option value="Middle Eastern">Middle Eastern (Kabob, Hummus, Falafel)</option>
              <option value="Mediterranean">Mediterranean (Fish, Greens, Olive Oils)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Dietary Restrictions / Key Focus
            </label>
            <input
              id="dietary-input"
              type="text"
              placeholder="e.g. Vegetarian, Keto, Low Lactose, High Protein..."
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 text-slate-200 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Dynamic target estimation preview */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-200 font-display">Recommended Daily Targets</h4>
            <p className="text-xs text-slate-400 mt-1">
              Estimated targets for a {weight}kg bodyweight goal geared for **{goal}**.
            </p>
          </div>
          <div className="flex gap-4 font-mono text-sm">
            <div className="bg-emerald-950/40 border border-emerald-900/30 rounded-lg px-4 py-2 text-center min-w-[110px]">
              <span className="block text-xs text-emerald-400 mb-1">PROTEIN TARGET</span>
              <span className="text-lg font-bold text-emerald-300">{recommendedProt}g</span>
            </div>
            <div className="bg-amber-950/40 border border-amber-900/30 rounded-lg px-4 py-2 text-center min-w-[110px]">
              <span className="block text-xs text-amber-400 mb-1">CALORIE ACCURACY</span>
              <span className="text-lg font-bold text-amber-300">{recommendedCal} kcal</span>
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end pt-2">
          <button
            id="onboarding-save-btn"
            type="button"
            onClick={handleComplete}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold tracking-wide rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5 transition-all text-sm cursor-pointer"
          >
            CONFIRM PROFILE & START SCANNING
          </button>
        </div>
      </div>
    </div>
  );
}
