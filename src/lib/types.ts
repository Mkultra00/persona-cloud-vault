export interface PersonaIdentity {
  firstName: string;
  lastName: string;
  nickname?: string;
  age: number;
  gender: string;
  pronouns: string;
  ethnicity: string;
  nationality: string;
  city: string;
  state: string;
  country: string;
  occupation: string;
  employer?: string;
  educationLevel: string;
  almaMater?: string;
  maritalStatus: string;
  incomeRange: string;
  hobbies: string[];
  techSavviness: "low" | "moderate" | "high" | "expert";
  hairColor: string;
  eyeColor: string;
  height: string;
  distinguishingFeatures: string[];
}

export interface PersonaPsychology {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  communicationStyle: string;
  decisionMakingStyle: string;
  conflictStyle: string;
  trustLevel: number;
  patience: number;
  emotionalExpressiveness: number;
  primaryMotivation: string;
  secondaryMotivation: string;
  fears: string[];
  frustrations: string[];
  aspirations: string[];
  hiddenAgenda: string;
  deepSecrets: string[];
  embarrassingMoments: string[];
  mentalHealthChallenges: string[];
  physicalHealthChallenges: string[];
  internalBiases: string[];
  proactivityLevel: number;
  topicsTheyVolunteer: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  yearStarted: number;
  yearEnded: number | null;
  highlights: string[];
}

export interface OccupationEntry {
  title: string;
  employer: string;
  yearStarted: number;
  yearEnded: number | null;
  description: string;
}

export interface PersonaBackstory {
  lifeNarrative: string;
  keyLifeEvents: { event: string; age: number; impact: string }[];
  currentLifeSituation: string;
  recentExperiences: string[];
  educationHistory: EducationEntry[];
  occupationHistory: OccupationEntry[];
}

export interface Persona {
  id: string;
  created_by: string | null;
  status: string;
  generation_prompt: string;
  testing_purpose: string;
  variance_level: number;
  identity: PersonaIdentity;
  psychology: PersonaPsychology;
  backstory: PersonaBackstory;
  memory: any;
  portrait_url: string | null;
  portrait_prompt: string | null;
  total_interactions: number;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "persona";
  content: string;
  metadata: any;
  inner_thought: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  persona_id: string;
  user_id: string | null;
  status: string;
  session_summary: string | null;
  started_at: string;
  ended_at: string | null;
}

export const AI_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)", provider: "lovable" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanced)", provider: "lovable" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Best)", provider: "lovable" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro (Next-gen)", provider: "lovable" },
  { value: "openai/gpt-5", label: "GPT-5 (Powerful)", provider: "lovable" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Efficient)", provider: "lovable" },
  { value: "openai/gpt-5.2", label: "GPT-5.2 (Latest)", provider: "lovable" },
] as const;
