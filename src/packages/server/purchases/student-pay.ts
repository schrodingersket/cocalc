import { getTransactionClient } from "@cocalc/database/pool";
import getLogger from "@cocalc/backend/logger";
import { compute_cost } from "@cocalc/util/licenses/purchase/compute-cost";
import { DEFAULT_PURCHASE_INFO } from "@cocalc/util/licenses/purchase/student-pay";
import type { CourseInfo } from "@cocalc/util/db-schema/projects";
import type { PurchaseInfo } from "@cocalc/util/licenses/purchase/types";
import createPurchase from "@cocalc/server/purchases/create-purchase";
import createLicense from "@cocalc/server/licenses/purchase/create-license";
import { assertPurchaseAllowed } from "./is-purchase-allowed";
import setCourseInfo from "@cocalc/server/projects/course/set-course-info";
import { addLicenseToProjectAndRestart } from "@cocalc/server/purchases/purchase-shopping-cart-item";

const logger = getLogger("purchases:student-pay");

interface Options {
  account_id: string;
  project_id: string;
}

export default async function studentPay({
  account_id,
  project_id,
}: Options): Promise<{ purchase_id: number }> {
  logger.debug({ account_id, project_id });
  const client = await getTransactionClient();
  try {
    // start atomic transaction:
    // Creating the license and the purchase and recording that student paid all happen as a single PostgreSQL atomic transaction.
    
    // Get current value of course field of this project
    const { rows } = await client.query(
      "SELECT course, title, description FROM projects WHERE project_id=$1",
      [project_id]
    );
    if (rows.length == 0) {
      throw Error("no such project");
    }
    const currentCourse: CourseInfo | undefined = rows[0].course;
    // ensure account_id matches the student; this also ensures that currentCourse is not null.
    if (currentCourse?.account_id != account_id) {
      throw Error(`only ${account_id} can pay the course fee`);
    }
    if (currentCourse.paid) {
      throw Error("course fee already paid");
    }
    const { title, description } = rows[0];
    const purchaseInfo = {
      ...(currentCourse.payInfo ?? DEFAULT_PURCHASE_INFO),
      title,
      description,
    };
    const cost = getCost(purchaseInfo);
    await assertPurchaseAllowed({ account_id, service: "license", cost, client });

    // Create the license
    const license_id = await createLicense(account_id, purchaseInfo, client);

    addLicenseToProjectAndRestart(project_id, license_id, client);

    // Create the purchase
    const purchase_id = await createPurchase({
      account_id,
      service: "license",
      cost,
      description: {
        type: "license",
        license_id,
        info: purchaseInfo,
        course: currentCourse,
      },
      client,
    });

    // Change purchaseInfo to indicate that purchase is done
    currentCourse.paid = new Date().toISOString();
    await setCourseInfo({
      project_id,
      account_id,
      course: currentCourse,
      noCheck: true,
      client,
    });

    return { purchase_id };
  } catch (err) {
    logger.debug("error -- reverting transaction", err);
    await client.query("ROLLBACK");
    throw err;
  } finally {
    // end atomic transaction
    client.release();
  }
}

export function getCost(purchaseInfo: PurchaseInfo): number {
  const cost = purchaseInfo?.cost;
  if (cost == null) {
    return compute_cost(purchaseInfo).discounted_cost;
  }
  if (typeof cost == "number") {
    // should never happen
    return cost;
  }
  return cost.discounted_cost;
}