/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { CSSProperties, useEffect, useState } from "react";
import { Alert, Button, Card, Checkbox } from "antd";
import { Icon, Loading } from "@cocalc/frontend/components";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { PROJECT_UPGRADES } from "@cocalc/util/schema";
import QuotaRow from "./quota-row";
import { isEqual } from "lodash";
import Information from "./information";
import type { ProjectQuota } from "@cocalc/util/db-schema/purchase-quotas";
import { useRedux } from "@cocalc/frontend/app-framework";

// These correspond to dedicated RAM and dedicated CPU, and we
// found them too difficult to cost out, so exclude them (only
// admins can set them).
const EXCLUDE = new Set(["memory_request", "cpu_shares"]);

interface Props {
  project_id: string;
  style: CSSProperties;
}

export default function PayAsYouGoQuotaEditor({ project_id, style }: Props) {
  const project = useRedux(["projects", "project_map", project_id]);
  // Slightly subtle -- it's null if not loaded but {} or the thing if loaded, even
  // if there is no data yet in the database.
  const savedQuotaState: ProjectQuota | null =
    project == null
      ? null
      : project
          .getIn(["pay_as_you_go_quotas", webapp_client.account_id])
          ?.toJS() ?? {};
  const [editing, setEditing] = useState<boolean>(false);
  // one we are editing:
  const [quotaState, setQuotaState] = useState<ProjectQuota | null>(
    savedQuotaState
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (editing) {
      setQuotaState(savedQuotaState);
    }
  }, [editing]);

  async function handleSave(): Promise<void> {
    if (quotaState == null) return;
    try {
      setError("");
      await webapp_client.purchases_client.setPayAsYouGoProjectQuotas(
        project_id,
        quotaState
      );
    } catch (err) {
      setError(`${err}`);
    }
  }

  function handleCancel(): void {
    setEditing(false);
  }

  // Returns true if the admin inputs are valid, i.e.
  //    - at least one has changed
  //    - none are negative
  //    - none are empty
  function isModified(): boolean {
    return !isEqual(savedQuotaState, quotaState);
  }

  if (editing && (quotaState == null || savedQuotaState == null)) {
    return <Loading />;
  }

  return (
    <Card
      style={style}
      title={
        <>
          <div style={{ margin: "0 15px", float: "right" }}>
            {editing && (
              <>
                <Button style={{ marginRight: "8px" }} onClick={handleCancel}>
                  Close
                </Button>
                <Button
                  type="primary"
                  disabled={!isModified()}
                  onClick={handleSave}
                >
                  <Icon name="save" /> Save
                </Button>
              </>
            )}
            {!editing && (
              <Button onClick={() => setEditing(true)} type="text">
                <Icon name="pencil" /> Edit
              </Button>
            )}
          </div>
          <div style={{ marginTop: "5px" }}>
            <Icon name="compass" /> Quota Editor (pay as you go)
          </div>
        </>
      }
      type="inner"
      extra={<Information />}
    >
      {editing && (
        <>
          {error && <Alert type="error" showIcon description={error} />}
          <div>
            Quotas are increased to at least the following values upon project
            start, with charges incurred for usage beyond any licenses and
            upgrades.
          </div>
          {PROJECT_UPGRADES.field_order
            .filter((name) => !EXCLUDE.has(name))
            .map((name) => (
              <QuotaRow
                key={name}
                name={name}
                quotaState={quotaState}
                setQuotaState={setQuotaState}
              />
            ))}
          <Checkbox
            style={{ marginTop: "15px" }}
            checked={!quotaState?.allow_any}
            onChange={(e) =>
              setQuotaState({
                ...quotaState,
                allow_any: !e.target.checked ? 1 : 0,
              })
            }
          >
            Upgrade quotas only when I start this project
          </Checkbox>
        </>
      )}
    </Card>
  );
}
