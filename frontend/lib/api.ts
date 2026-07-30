import type {
  ScenarioOut,
  StartSimulationResponse,
  RespondResponse,
  SessionResultsResponse,
  SessionStateResponse,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    throw new ApiError(
      "Could not reach the Mental Gym backend. Is it running on the configured API URL?",
      0
    );
  }

  if (!res.ok) {
    let detail = "Something went wrong.";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore parse errors, use default detail
    }
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; llm_provider: string; llm_model: string }>("/health"),

  listScenarios: () => request<ScenarioOut[]>("/scenarios"),

  getScenario: (id: string) => request<ScenarioOut>(`/scenarios/${id}`),

  getSession: (sessionId: string) => request<SessionStateResponse>(`/simulations/${sessionId}`),

  startSimulation: (scenarioId: string) =>
    request<StartSimulationResponse>("/simulations/start", {
      method: "POST",
      body: JSON.stringify({ scenario_id: scenarioId }),
    }),

  respond: (sessionId: string, userResponse: string) =>
    request<RespondResponse>(`/simulations/${sessionId}/respond`, {
      method: "POST",
      body: JSON.stringify({ user_response: userResponse }),
    }),

  completeSimulation: (sessionId: string) =>
    request<{ status: string; overall_score: number }>(
      `/simulations/${sessionId}/complete`,
      { method: "POST" }
    ),

  getResults: (sessionId: string) =>
    request<SessionResultsResponse>(`/simulations/${sessionId}/results`),
};

export { ApiError };
