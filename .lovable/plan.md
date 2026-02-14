

# Persona Social Room - Design Document

## Overview

A new Lovable application where AI personas (imported from the Persona Maker app) interact with each other in virtual meeting rooms. An admin defines the room scenario, purpose, and selects which personas participate. Users can observe, moderate, or facilitate the conversation.

---

## Core Concepts

### Persona Import
- Accept the existing unified JSON export format (identity, psychology, backstory, memory, portrait base64, chat history)
- Store imported personas in a `room_personas` table with all profile data restored
- Portrait images uploaded to storage and linked

### Meeting Rooms
- Admin creates a room by defining:
  - **Room Name** - descriptive title
  - **Scenario** - the situational context (e.g., "Product design review", "Conflict resolution workshop", "Customer focus group")
  - **Purpose** - the goal of the meeting (e.g., "Reach consensus on feature priorities")
  - **Admitted Personas** - which imported personas participate
  - **User Role** - Observer / Moderator / Facilitator

### User Roles

| Role | Capabilities |
|------|-------------|
| **Observer** | Read-only view of the conversation. Cannot send messages. Can view inner thoughts of each persona. |
| **Moderator** | Can pause/resume conversation, inject directives (e.g., "Let's move to the next topic"), remove a persona mid-session, end the meeting. |
| **Facilitator** | Can send messages as themselves into the room. Personas treat facilitator as a human participant. Can steer discussion with questions. |

### AI-Powered Conversation Engine
- Each persona takes turns responding based on their full profile (identity, psychology, backstory, memory)
- The system prompt for each persona includes their complete character sheet plus the room scenario/purpose
- Turn order is managed by a backend edge function that cycles through admitted personas
- Each persona "sees" the full conversation history and responds in character
- Inner thoughts are generated alongside each response (visible to observers/moderators)
- Uses Lovable AI (no API keys needed)

---

## Data Model

```text
+------------------+       +-------------------+       +------------------+
|  room_personas   |       |   meeting_rooms   |       |  room_messages   |
+------------------+       +-------------------+       +------------------+
| id (uuid, PK)   |       | id (uuid, PK)     |       | id (uuid, PK)   |
| identity (jsonb) |       | name (text)       |       | room_id (uuid)   |
| psychology(jsonb)|       | scenario (text)   |       | persona_id (uuid)|
| backstory (jsonb)|       | purpose (text)    |       | role (text)      |
| memory (jsonb)   |       | status (text)     |       | content (text)   |
| portrait_url     |       | user_role (text)  |       | inner_thought    |
| source_export    |       | created_by (uuid) |       | created_at       |
| created_at       |       | created_at        |       +------------------+
+------------------+       | ended_at          |
                           +-------------------+
                                    |
                           +-------------------+
                           | room_participants |
                           +-------------------+
                           | id (uuid, PK)     |
                           | room_id (uuid)    |
                           | persona_id (uuid) |
                           | admitted_at       |
                           | removed_at        |
                           +-------------------+
```

**room_personas** - Imported personas available for meetings
**meeting_rooms** - Room definitions with scenario, purpose, and user role
**room_participants** - Join table linking personas to rooms
**room_messages** - All messages in a room (from personas, facilitator, or system/moderator directives)

---

## Application Pages

### 1. Dashboard (Home)
- Grid of imported personas (cards with portrait, name, occupation, traits summary)
- Import button accepting the Persona Maker JSON format
- Stats: total personas, total rooms, total conversations
- Quick access to active and past meeting rooms

### 2. Persona Detail View
- Full profile display (identity, psychology, backstory) matching the Persona Maker layout
- List of rooms this persona has participated in
- Summary of their contributions across meetings

### 3. Create Meeting Room
- Form with: Room Name, Scenario (textarea), Purpose (textarea)
- Persona selector: checkboxes or drag-and-drop to admit personas (min 2)
- Role selector: Observer / Moderator / Facilitator
- "Start Meeting" button

### 4. Meeting Room (Live View)
- Chat-style interface showing persona messages with portraits and names
- Inner thought toggle (expand/collapse per message)
- Role-specific controls:
  - **Observer**: read-only, inner thought visibility toggle
  - **Moderator**: pause/resume, inject directive, remove persona, end meeting
  - **Facilitator**: message input to participate in conversation
- Typing indicator showing which persona is "thinking"
- Auto-scroll with conversation history

### 5. Meeting History
- List of past meetings with scenario, purpose, participants, duration
- Click to view full transcript
- Per-persona message summary (auto-generated after meeting ends)
- Export meeting transcript as JSON

---

## Conversation Flow (Edge Function)

```text
1. Admin creates room + admits personas + starts meeting
2. System message sets the scene (scenario + purpose)
3. Edge function "room-conversation" orchestrates turns:
   a. Select next persona (round-robin or AI-chosen based on context)
   b. Build system prompt with persona's full profile + scenario + purpose
   c. Include full conversation history
   d. Call Lovable AI to generate response + inner thought
   e. Save message to room_messages
   f. Broadcast via Realtime to the live view
   g. Repeat until paused or ended
4. Facilitator messages are injected into the history for all personas to see
5. Moderator directives appear as system messages
6. On meeting end: generate per-persona summary via AI
```

### Turn Management
- Default: round-robin cycling through admitted personas
- Optional: AI-selected next speaker (the edge function asks the LLM "who would most naturally speak next?" given conversation context)
- Configurable delay between turns (e.g., 2-5 seconds) for readability

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `room-conversation` | Main orchestrator: generates next persona response, manages turns, handles facilitator/moderator inputs |
| `room-summary` | Generates per-persona meeting summaries when a room ends |
| `import-room-persona` | (Optional) Server-side persona import with portrait processing |

---

## Realtime

- `room_messages` table added to Supabase Realtime publication
- Client subscribes to changes filtered by `room_id`
- Enables live message streaming in the Meeting Room view

---

## Technical Details

### Tech Stack
- React + Vite + TypeScript + Tailwind CSS (standard Lovable stack)
- Lovable Cloud for database, storage, edge functions, auth
- Lovable AI for all LLM calls (no external API keys)
- Supabase Realtime for live message streaming

### AI Model Selection
- Persona responses: `google/gemini-2.5-flash` (good balance of quality and speed for multi-turn conversation)
- Meeting summaries: `google/gemini-2.5-pro` (higher quality for synthesis)

### Key Considerations
- **Rate limiting**: Add configurable delay between persona turns to avoid overwhelming the AI gateway
- **Context window**: For long meetings, implement a sliding window or summarization of older messages to stay within token limits
- **Meeting transcript export**: Reuse the same JSON export pattern from Persona Maker for consistency
- **Persona immutability**: Imported personas are read-only copies; edits to the original in Persona Maker do not propagate

---

## Summary

This application extends the Persona Maker ecosystem by providing a "stage" where personas come to life together. The admin defines the scene, selects the cast, and chooses their own role. The AI engine drives authentic multi-persona conversations while the user watches, guides, or participates.

