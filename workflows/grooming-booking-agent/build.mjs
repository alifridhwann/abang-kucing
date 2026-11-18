// Builds workflow.json for Kapso from system-prompt.md.
// Run: node workflows/grooming-booking-agent/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(join(here, "system-prompt.md"), "utf8").trim();

// Kapso provider model IDs (from list_provider_models, 18 Nov 2026).
const MODELS = {
  "claude-opus-5-5": "818ca9b6-89c8-4e9f-b0f1-3587bff82fb7",
  "claude-sonnet-5-5": "1caa3ea4-b319-462b-abae-025bcfdd8cf1",
  "claude-haiku-5-5": "7c2cc054-60af-4ca8-aa15-030db79ce9db",
};
const MODEL = "claude-opus-5-5";

// Sandbox number for testing. Live number (+60 13-223 7553) is 402007446322268:
// switch only after testing is signed off.
const SANDBOX_PHONE_NUMBER_ID = "597907523413541";

const workflow = {
  name: "Abang Kucing – Grooming Booking Agent",
  slug: "grooming-booking-agent",
  description:
    "AI assistant (Claude) that answers grooming questions in Bahasa Melayu, collects booking details and hands a summary to staff to confirm.",
  status: "draft",
  message_debounce_seconds: 5,
  inbound_message_read_mode: "disabled",
  definition: {
    nodes: [
      {
        id: "start",
        position: { x: 120, y: 120 },
        data: { node_type: "start", display_name: "Mesej masuk", config: {} },
      },
      {
        id: "agent_1795000000000",
        position: { x: 120, y: 320 },
        data: {
          node_type: "agent",
          display_name: "Pembantu tempahan grooming",
          config: {
            system_prompt: systemPrompt,
            provider_model_id: MODELS[MODEL],
            reasoning_effort: "low",
            max_iterations: 60,
            prompt_cache_ttl: "5m",
            message_delivery_mode: "auto_send_assistant_text",
            enabled_default_tools: [
              "complete_task",
              "handoff_to_human",
              "get_current_datetime",
              "get_whatsapp_context",
              "save_variable",
            ],
          },
        },
      },
      {
        id: "handoff_1795000000001",
        position: { x: 120, y: 520 },
        data: {
          node_type: "handoff",
          display_name: "Staf sahkan tempahan",
          config: {},
        },
      },
    ],
    edges: [
      { id: "edge_start_agent", source: "start", target: "agent_1795000000000", label: "next" },
      { id: "edge_agent_handoff", source: "agent_1795000000000", target: "handoff_1795000000001", label: "next" },
    ],
  },
  triggers: [
    {
      trigger_type: "inbound_message",
      phone_number_id: SANDBOX_PHONE_NUMBER_ID,
      active: false,
    },
  ],
};

writeFileSync(join(here, "workflow.json"), JSON.stringify(workflow, null, 2) + "\n");
writeFileSync(join(here, "definition.json"), JSON.stringify(workflow.definition, null, 2) + "\n");
console.log(`Built workflow.json and definition.json (model ${MODEL}, ${systemPrompt.length} prompt chars).`);
