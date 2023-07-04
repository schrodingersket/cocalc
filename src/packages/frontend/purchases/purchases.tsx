import { useEffect, useState } from "react";
import {
  Alert,
  Checkbox,
  Button,
  Popover,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { useTypedRedux } from "@cocalc/frontend/app-framework";
import { SettingBox } from "@cocalc/frontend/components/setting-box";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import type { Service } from "@cocalc/util/db-schema/purchase-quotas";
import type { Purchase, Description } from "@cocalc/util/db-schema/purchases";
import { ProjectTitle } from "@cocalc/frontend/projects/project-title";
import { TimeAgo } from "@cocalc/frontend/components/time-ago";
import { Icon } from "@cocalc/frontend/components/icon";
import ServiceTag from "./service";
import { capitalize, plural } from "@cocalc/util/misc";
import { SiteLicensePublicInfo as License } from "@cocalc/frontend/site-licenses/site-license-public-info-component";
import Next from "@cocalc/frontend/components/next";
import { open_new_tab } from "@cocalc/frontend/misc/open-browser-tab";
import { currency } from "./util";
import DynamicallyUpdatingCost from "./pay-as-you-go/dynamically-updating-cost";
import type { ProjectQuota } from "@cocalc/util/db-schema/purchase-quotas";
import { load_target } from "@cocalc/frontend/history";
import { describeQuotaFromInfo } from "@cocalc/util/licenses/describe-quota";
import type { PurchaseInfo } from "@cocalc/util/licenses/purchase/types";

const DEFAULT_LIMIT = 100;

interface Props {
  project_id?: string; // if given, restrict to only purchases that are for things in this project
  group?: boolean; // default
}

export default function Purchases(props: Props) {
  const is_commercial = useTypedRedux("customize", "is_commercial");
  if (!is_commercial) {
    return null;
  }
  return <Purchases0 {...props} />;
}

function Purchases0({ project_id, group: group0 }: Props) {
  const [purchases, setPurchases] = useState<Partial<Purchase>[] | null>(null);
  const [group, setGroup] = useState<boolean>(!!group0);
  const [service /*, setService*/] = useState<Service | undefined>(undefined);
  const [error, setError] = useState<string>("");
  const [limit /*, setLimit*/] = useState<number>(DEFAULT_LIMIT);
  const [offset, setOffset] = useState<number>(0);
  const [thisMonth, setThisMonth] = useState<boolean>(true);
  const [total, setTotal] = useState<number | null>(null);

  const handleGroupChange = (checked: boolean) => {
    setTotal(null);
    setPurchases(null);
    setGroup(checked);
  };

  const handleThisMonthChange = (checked: boolean) => {
    setTotal(null);
    setPurchases(null);
    setThisMonth(checked);
  };

  const getNextPage = () => {
    setOffset((prevOffset) => prevOffset + limit);
  };

  const getPrevPage = () => {
    setOffset((prevOffset) => Math.max(prevOffset - limit, 0));
  };

  const getPurchases = async () => {
    try {
      setTotal(null);
      setPurchases(null);
      const x = await webapp_client.purchases_client.getPurchases({
        thisMonth, // if true used instead of limit/offset
        limit,
        offset,
        group,
        service,
        project_id,
      });
      setPurchases(x);
      let t = 0;
      for (const row of x) {
        t += row["sum"] ?? row["cost"] ?? 0;
      }
      setTotal(t);
    } catch (err) {
      setError(`${err}`);
    }
  };
  useEffect(() => {
    getPurchases();
  }, [limit, offset, group, service, project_id, thisMonth]);

  return (
    <SettingBox
      title={
        <>
          <Button
            style={{ marginRight: "15px", float: "right" }}
            onClick={() => {
              getPurchases();
            }}
          >
            <Icon name="refresh" /> Refresh
          </Button>
          {project_id ? (
            <span>
              {project_id ? (
                <a onClick={() => load_target("settings/purchases")}>
                  Purchases
                </a>
              ) : (
                "Purchases"
              )}{" "}
              in <ProjectTitle project_id={project_id} trunc={30} />
            </span>
          ) : (
            <span>
              <Icon name="table" /> Transactions
            </span>
          )}
        </>
      }
    >
      {error && (
        <Alert
          type="error"
          description={error}
          onClose={getPurchases}
          closable
        />
      )}
      <Next
        style={{ float: "right", fontSize: "11pt" }}
        href={"billing/receipts"}
      >
        <Button type="link" style={{ float: "right" }}>
          <Icon name="external-link" /> Receipts
        </Button>
      </Next>
      <Checkbox
        checked={group}
        onChange={(e) => handleGroupChange(e.target.checked)}
      >
        Group transactions
      </Checkbox>
      <Checkbox
        checked={thisMonth}
        onChange={(e) => handleThisMonthChange(e.target.checked)}
      >
        Current billing month
      </Checkbox>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        {purchases &&
          !thisMonth &&
          purchases.length > 0 &&
          (purchases.length >= limit || offset > 0) && (
            <div style={{ marginRight: "10px" }}>
              Page {Math.floor(offset / limit) + 1}
            </div>
          )}
        {!thisMonth && offset > 0 && (
          <Button type="default" onClick={getPrevPage}>
            Previous
          </Button>
        )}
        {!thisMonth && purchases && purchases.length >= limit && (
          <Button type="default" onClick={getNextPage}>
            Next
          </Button>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: "15px" }}>
        {!group && <DetailedPurchaseTable purchases={purchases} />}
        {group && <GroupedPurchaseTable purchases={purchases} />}
      </div>
      {total != null && (
        <div style={{ fontSize: "12pt", marginTop: "15px" }}>
          Total of Displayed Costs: ${total.toFixed(2)}
        </div>
      )}
    </SettingBox>
  );
}

function GroupedPurchaseTable({ purchases }) {
  if (purchases == null) {
    return <Spin size="large" delay={500} />;
  }
  return (
    <div style={{ overflow: "auto" }}>
      <div style={{ minWidth: "600px" }}>
        <Table
          scroll={{ y: 400 }}
          pagination={false}
          dataSource={purchases}
          rowKey={({ service, project_id }) => `${service}-${project_id}`}
          columns={[
            {
              title: "Service",
              dataIndex: "service",
              key: "service",
              sorter: (a, b) =>
                (a.service ?? "").localeCompare(b.service ?? "") ?? -1,
              sortDirections: ["ascend", "descend"],
              render: (service) => <ServiceTag service={service} />,
            },
            {
              title: "Amount (USD)",
              dataIndex: "sum",
              key: "sum",
              render: (amount) =>
                currency(amount, Math.abs(amount) < 0.1 ? 3 : 2),
              sorter: (a: any, b: any) => (a.sum ?? 0) - (b.sum ?? 0),
              sortDirections: ["ascend", "descend"],
            },

            {
              title: "Items",
              dataIndex: "count",
              key: "count",
              sorter: (a: any, b: any) => (a.count ?? 0) - (b.count ?? 0),
              sortDirections: ["ascend", "descend"],
            },
            {
              title: "Project",
              dataIndex: "project_id",
              key: "project_id",
              render: (project_id) =>
                project_id ? (
                  <ProjectTitle project_id={project_id} trunc={30} />
                ) : (
                  "-"
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function DetailedPurchaseTable({ purchases }) {
  if (purchases == null) {
    return <Spin size="large" delay={500} />;
  }
  return (
    <div style={{ overflow: "auto" }}>
      <div style={{ minWidth: "1000px" }}>
        <Table
          scroll={{ y: 400 }}
          pagination={false}
          dataSource={purchases}
          rowKey="id"
          columns={[
            {
              title: "Id",
              dataIndex: "id",
              key: "id",
            },
            {
              title: "Time",
              dataIndex: "time",
              key: "time",
              render: (text, record) => {
                if (record.service == "project-upgrade") {
                  let minutes;
                  if (
                    record.description?.stop != null &&
                    record.description?.start != null
                  ) {
                    minutes = Math.ceil(
                      (record.description.stop - record.description.start) /
                        1000 /
                        60
                    );
                  } else {
                    minutes = null;
                  }
                  return (
                    <span>
                      <TimeAgo date={text} />
                      {record.description?.stop != null ? (
                        <>
                          {" "}
                          to <TimeAgo date={record.description?.stop} />
                        </>
                      ) : null}
                      {minutes != null ? (
                        <div>
                          Total: {minutes} {plural(minutes, "minute")}
                        </div>
                      ) : null}
                    </span>
                  );
                }
                return <TimeAgo date={text} />;
              },
              sorter: (a, b) =>
                new Date(a.time ?? 0).getTime() -
                new Date(b.time ?? 0).getTime(),
              sortDirections: ["ascend", "descend"],
            },
            {
              title: "Service",
              dataIndex: "service",
              key: "service",
              sorter: (a, b) =>
                (a.service ?? "").localeCompare(b.service ?? ""),
              sortDirections: ["ascend", "descend"],
              render: (service) => <ServiceTag service={service} />,
            },
            {
              title: "Amount (USD)",
              dataIndex: "cost",
              key: "cost",
              render: (amount, record) => {
                if (
                  amount == null &&
                  record.period_start != null &&
                  record.cost_per_hour != null
                ) {
                  return (
                    <Space>
                      <DynamicallyUpdatingCost
                        costPerHour={record.cost_per_hour}
                        start={new Date(record.period_start).valueOf()}
                      />
                      <Tag color="green">Active</Tag>
                    </Space>
                  );
                }
                if (amount != null) {
                  return currency(amount, Math.abs(amount) < 0.1 ? 3 : 2);
                }
                return "-";
              },
              sorter: (a, b) => (a.cost ?? 0) - (b.cost ?? 0),
              sortDirections: ["ascend", "descend"],
            },

            {
              title: "Description",
              dataIndex: "description",
              key: "description",
              width: 250,
              render: (_, record) => (
                <Description description={record.description} />
              ),
            },
            {
              title: "Project",
              dataIndex: "project_id",
              key: "project_id",
              render: (project_id) =>
                project_id ? (
                  <ProjectTitle project_id={project_id} trunc={20} />
                ) : null,
            },
            {
              title: "Invoice",
              dataIndex: "invoice_id",
              key: "invoice_id",
              sorter: (a, b) =>
                (a.invoice_id ?? "").localeCompare(b.invoice_id ?? "") ?? -1,
              sortDirections: ["ascend", "descend"],
              render: (invoice_id) => {
                if (!invoice_id) return null;
                return <InvoiceLink invoice_id={invoice_id} />;
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

// "credit" | "openai-gpt-4" | "project-upgrade" | "license" | "edit-license"

function Description({ description }: { description?: Description }) {
  if (description == null) {
    return null;
  }
  if (description.type == "openai-gpt-4") {
    return (
      <Tooltip
        title={() => (
          <div>
            Prompt tokens: {description.prompt_tokens}
            <br />
            Completion tokens: {description.completion_tokens}
          </div>
        )}
      >
        GPT-4
      </Tooltip>
    );
  }
  //             <pre>{JSON.stringify(description, undefined, 2)}</pre>
  if (description.type == "license") {
    return (
      <Popover
        title="License"
        content={() => (
          <>
            {description.license_id && (
              <License license_id={description.license_id} />
            )}
          </>
        )}
      >
        License
      </Popover>
    );
  }
  if (description.type == "credit") {
    return <Tooltip title="Thank you!">Credit</Tooltip>;
  }
  if (description.type == "project-upgrade") {
    const quota = description?.quota ?? {};
    return <DisplayProjectQuota quota={quota} />;
  }
  if (description.type == "edit-license") {
    return (
      <Popover
        title={
          <div style={{ fontSize: "13pt" }}>
            <Icon name="pencil" /> Change License
          </div>
        }
        content={() => (
          <div style={{ width: "500px" }}>
            <b>From:</b> {describeQuotaFromInfo(description.origInfo)}{" "}
            <LicenseDates info={description.origInfo} />
            <br />
            <br />
            <b>To:</b> {describeQuotaFromInfo(description.modifiedInfo)}{" "}
            <LicenseDates info={description.modifiedInfo} />
          </div>
        )}
      >
        {describeQuotaFromInfo(description.modifiedInfo)}{" "}
        <LicenseDates info={description.modifiedInfo} />
      </Popover>
    );
  }
  // generic fallback...
  return (
    <>
      <Popover
        title={() => <pre>{JSON.stringify(description, undefined, 2)}</pre>}
      >
        {capitalize(description.type)}
      </Popover>
    </>
  );
}

function LicenseDates({ info }: { info: PurchaseInfo }) {
  if (info.type == "vouchers") {
    return null;
  }
  return (
    <span>
      (<TimeAgo date={info.start} /> to{" "}
      {info.end ? <TimeAgo date={info.end} /> : "-"})
    </span>
  );
}

/*
{
  "type": "edit-license",
  "origInfo": {
    "end": "2023-07-04T06:59:59.999Z",
    "type": "vm",
    "start": "2023-06-29T07:00:00.000Z",
    "quantity": 1,
    "account_id": "8e138678-9264-431c-8dc6-5c4f6efe66d8",
    "dedicated_vm": {
      "machine": "n2-highmem-8"
    },
    "subscription": "no"
  },
  "license_id": "0b7b03a4-d13a-4187-b907-0cae6f591f8a",
  "modifiedInfo": {
    "end": "2023-07-07T06:59:59.999Z",
    "type": "vm",
    "start": "2023-06-30T23:29:22.413Z",
    "quantity": 1,
    "account_id": "8e138678-9264-431c-8dc6-5c4f6efe66d8",
    "dedicated_vm": {
      "machine": "n2-highmem-8"
    },
    "subscription": "no"
  }
}
*/

export function DisplayProjectQuota({ quota }: { quota: ProjectQuota }) {
  const v: string[] = [];
  if (quota.disk_quota) {
    v.push(`${quota.disk_quota / 1000} GB disk`);
  }
  if (quota.memory) {
    v.push(`${quota.memory / 1000} GB RAM`);
  }
  if (quota.cores) {
    v.push(`${quota.cores} ${plural(quota.cores, "core")}`);
  }
  if (quota.always_running) {
    v.push("always running");
  }
  if (quota.member_host) {
    v.push("member hosting");
  }
  if (quota.network) {
    v.push("network");
  }
  if (quota.cost) {
    v.push(`${currency(quota.cost)} / hour`);
  }
  return <span>{v.join(", ")}</span>;
}

function InvoiceLink({ invoice_id }) {
  const [loading, setLoading] = useState<boolean>(false);
  return (
    <Button
      type="link"
      onClick={async () => {
        try {
          setLoading(true);
          const invoiceUrl = (
            await webapp_client.purchases_client.getInvoice(invoice_id)
          ).hosted_invoice_url;
          open_new_tab(invoiceUrl, false);
        } finally {
          setLoading(false);
        }
      }}
    >
      <Icon name="external-link" /> Invoice
      {loading && <Spin style={{ marginLeft: "30px" }} />}
    </Button>
  );
}
