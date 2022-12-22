import { useEffect, useRef, useState } from "react";
import { Input, Tooltip } from "antd";
import { useEditableContext } from "./context";
import { render, RenderProps } from "./register";
import type { Text } from "@cocalc/util/db-schema/render-types";
import { Tag } from "./tags";

interface Props extends RenderProps {
  spec: Text;
  value?: string;
}

function Static({ field, obj, spec, value }: Props) {
  if (value == null) {
    value = obj[field];
  }
  if (!value?.trim()) return null;
  if (spec?.tag) {
    return (
      <Tag icon={obj["icon"]} color={obj["color"]}>
        {value}
      </Tag>
    );
  }
  return <>{value}</>;
}

render({ type: "text" }, Static);

render({ type: "text", ellipsis: true }, ({ field, obj, spec }: Props) => (
  <Tooltip title={obj[field]} placement="left">
    <Static field={field} obj={obj} spec={spec} />
  </Tooltip>
));

render({ type: "text", editable: true }, ({ field, obj, spec }: Props) => {
  const [value, setValue] = useState<string>(obj[field]);
  const ref = useRef<any>();
  const { save, saving, counter, edit, error, ClickToEdit } =
    useEditableContext<string>(field);

  useEffect(() => {
    setValue(obj[field]);
  }, [counter, obj[field]]);

  if (edit) {
    return (
      <>
        <Input
          style={{ width: "100%" }}
          maxLength={spec.maxLength}
          disabled={saving}
          ref={ref}
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onBlur={() => {
            setValue(ref.current.input.value);
            save(obj, ref.current.input.value);
          }}
          onPressEnter={() => {
            setValue(ref.current.input.value);
            save(obj, ref.current.input.value);
          }}
        />
        {error}
      </>
    );
  } else {
    return (
      <ClickToEdit empty={!value?.trim()}>
        {" "}
        <Static field={field} obj={obj} spec={spec} value={value} />
      </ClickToEdit>
    );
  }
});
