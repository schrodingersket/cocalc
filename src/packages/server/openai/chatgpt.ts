/*
Backend server side part of ChatGPT integration with CoCalc.
*/

import getPool from "@cocalc/database/pool";
import getLogger from "@cocalc/backend/logger";

import { Configuration, OpenAIApi } from "openai";

const log = getLogger("chatgpt");

async function getApiKey(): Promise<string> {
  log.debug("get API key");
  const pool = getPool("medium");
  const { rows } = await pool.query(
    "SELECT value FROM server_settings WHERE name='openai_api_key'"
  );
  if (rows.length == 0 || !rows[0].value) {
    log.debug("NO API key");
    throw Error("You must provide an OpenAI API Key.");
  }
  log.debug("got API key");
  return rows[0].value;
}

interface ChatOptions {
  input: string; // what user types
  system?: string; // extra setup that we add for relevance and context
  account_id?: string;
  project_id?: string;
  path?: string;
  analytics_cookie?: string;
}

export async function evaluate({
  input,
  system,
  account_id,
  project_id,
  path,
  analytics_cookie,
}: ChatOptions): Promise<string> {
  log.debug("evaluate", {
    input,
    system,
    account_id,
    analytics_cookie,
    project_id,
    path,
  });
  if (!account_id && !analytics_cookie) {
    // at least some amount of tracking.
    throw Error("account_id or analytics_cookie must be set");
  }
  const configuration = new Configuration({ apiKey: await getApiKey() });
  const openai = new OpenAIApi(configuration);
  const messages: { role: "system" | "user"; content: string }[] = [];
  if (system) {
    messages.push({ role: "system", content: system });
  }
  messages.push({ role: "user", content: input });
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages,
  });
  log.debug("response: ", completion.data);
  const output = (
    completion.data.choices[0].message?.content ?? "No Output"
  ).trim();
  const total_tokens = completion.data.usage?.total_tokens;
  saveResponse({
    input,
    system,
    output,
    account_id,
    analytics_cookie,
    project_id,
    path,
    total_tokens,
  });
  return output;
}

// Save mainly for analytics, metering, and to generally see how (or if)
// people use chatgpt in cocalc.
// Also, we could dedup identical inputs (?).
async function saveResponse({
  input,
  system,
  output,
  account_id,
  analytics_cookie,
  project_id,
  path,
  total_tokens,
}) {
  const pool = getPool();
  try {
    await pool.query(
      "INSERT INTO openai_chatgpt_log(time,input,system,output,account_id,analytics_cookie,project_id,path,total_tokens) VALUES(NOW(),$1,$2,$3,$4,$5,$6,$7,$8)",
      [
        input,
        system,
        output,
        account_id,
        analytics_cookie,
        project_id,
        path,
        total_tokens,
      ]
    );
  } catch (err) {
    log.warn("Failed to save ChatGPT log entry to database:", err);
  }
}