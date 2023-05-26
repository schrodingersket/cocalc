import { apiKey } from "@cocalc/backend/data";
import { dynamicImport } from "tsimportlib";
import { siteUrl } from "./urls";
import { join } from "path";

export async function apiCall(endpoint: string, params: object): Promise<any> {
  const got = (await dynamicImport("got", module))
    .default as typeof import("got").default;
  const url = siteUrl(join("api", endpoint));
  const response = (await got
    .post(url, { username: apiKey, json: params })
    .json()) as any;
  if (response?.event == "error") {
    throw Error(response.error ?? "error");
  }
  delete response.id;
  delete response.event;
  return response;
}
