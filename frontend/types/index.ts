export interface CharacterOut {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatar: string;
  initial_emotion: Record<string, number | string>;
}

export interface ScenarioOut {
  id: string;
  slug: string;
  title: string;
  description: string;
  context: string;
  objective: string;
  difficulty: string;
  opening_line: string;
  total_questions: number;
  evaluation_criteria: string[];
  character: CharacterOut;
}

export interface EmotionOut {
  primary_emotion: string;
  intensity: number;
  anger: number;
  frustration: number;
  trust: number;
  calmness: number;
}

export interface StartSimulationResponse {
  session_id: string;
  scenario: ScenarioOut;
  mode: string;
  opening_line: string;
  first_question: string;
  emotion: EmotionOut;
  question_index: number;
  total_questions: number;
}

export interface RespondResponse {
  is_relevant: boolean;
  relevance_reason: string;
  detected_user_emotion: string;
  empathy_score: number;
  communication_score: number;
  active_listening_score: number;
  deescalation_score: number;
  character_response: string;
  next_question: string | null;
  emotion: EmotionOut;
  should_continue: boolean;
  question_index: number;
  total_questions: number;
  mode: string;
}

export interface TranscriptMessage {
  sender: "ai" | "user";
  message: string;
  emotion?: string | null;
  timestamp: string;
}

export interface EmotionHistoryPoint {
  message_index: number;
  primary_emotion: string;
  intensity: number;
  anger: number;
  frustration: number;
  trust: number;
  calmness: number;
}

export interface EvaluationOut {
  empathy_score: number;
  communication_score: number;
  active_listening_score: number;
  emotional_awareness_score: number;
  conflict_resolution_score: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
}

export interface SessionResultsResponse {
  session_id: string;
  scenario_title: string;
  status: string;
  mode: string;
  transcript: TranscriptMessage[];
  emotion_journey: EmotionHistoryPoint[];
  evaluation: EvaluationOut | null;
}

export type MicState =
  | "idle"
  | "ready"
  | "listening"
  | "processing"
  | "complete"
  | "error";

export type SimulationState =
  | "idle"
  | "ai_speaking"
  | "waiting_for_user"
  | "listening"
  | "user_review"
  | "submitting"
  | "ai_analyzing"
  | "completed";
