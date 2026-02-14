export interface RoomPersona {
  id: string;
  identity: any;
  psychology: any;
  backstory: any;
  memory: any;
  portrait_url: string | null;
  source_export: any;
  created_by: string | null;
  created_at: string;
}

export interface MeetingRoom {
  id: string;
  name: string;
  scenario: string;
  purpose: string;
  status: "pending" | "active" | "paused" | "ended";
  user_role: "observer" | "moderator" | "facilitator";
  created_by: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  persona_id: string;
  admitted_at: string;
  removed_at: string | null;
}

export interface RoomMessage {
  id: string;
  room_id: string;
  persona_id: string | null;
  role: "system" | "persona" | "facilitator" | "moderator";
  content: string;
  inner_thought: string | null;
  created_at: string;
}
