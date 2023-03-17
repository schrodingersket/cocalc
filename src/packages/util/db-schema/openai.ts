import { Table } from "./types";
import { CREATED_BY, ID } from "./crm";
import { SCHEMA as schema } from "./index";

export interface ChatGPTLogEntry {
  id: number;
  time: Date;
  input: string;
  output: string;
  total_tokens: number;
  analytics_cookie?: string; // at least one of analytics_cookie or account_id will be set
  account_id?: string;
  project_id?: string;
  path?: string;
}

Table({
  name: "openai_chatgpt_log",
  fields: {
    id: ID,
    time: { type: "timestamp", desc: "When this particular chat happened." },
    analytics_cookie: {
      title: "Analytics Cookie",
      type: "string",
      desc: "The analytics cookie for the user that asked this question.",
    },
    account_id: CREATED_BY,
    system: {
      title: "System Context",
      type: "string",
      desc: "System context prompt.",
      render: {
        type: "markdown",
      },
    },
    input: {
      title: "Input",
      type: "string",
      desc: "Input text that was sent to chatgpt",
      render: {
        type: "markdown",
      },
    },
    output: {
      title: "Output",
      type: "string",
      desc: "Output text that was returned from chatgpt",
      render: {
        type: "markdown",
      },
    },
    total_tokens: {
      type: "integer",
      desc: "The total number of tokens involved in this API call.",
    },
    project_id: {
      type: "uuid",
      render: { type: "project_link" },
    },
    path: {
      type: "string",
    },
  },
  rules: {
    desc: "OpenAI ChatGPT Log",
    primary_key: "id",
    user_query: {
      get: {
        pg_where: [{ "account_id = $::UUID": "account_id" }],
        fields: {
          id: null,
          time: null,
          account_id: null,
          input: null,
          system: null,
          output: null,
          total_tokens: null,
          project_id: null,
          path: null,
        },
      },
    },
  },
});

Table({
  name: "crm_openai_chatgpt_log",
  rules: {
    virtual: "openai_chatgpt_log",
    primary_key: "id",
    user_query: {
      get: {
        pg_where: [],
        admin: true,
        fields: {
          id: null,
          time: null,
          account_id: null,
          analytics_cookie: null,
          input: null,
          system: null,
          output: null,
          total_tokens: null,
          project_id: null,
          path: null,
        },
      },
    },
  },
  fields: schema.openai_chatgpt_log.fields,
});