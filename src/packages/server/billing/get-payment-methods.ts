import { isValidUUID } from "@cocalc/util/misc";

export default async function getPaymentMethods(
  account_id: string
): Promise<object[]> {
  if (!isValidUUID(account_id)) {
    throw Error("invalid uuid");
  }
  return [];
}
