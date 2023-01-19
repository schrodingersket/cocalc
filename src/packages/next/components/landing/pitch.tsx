/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Row, Col } from "antd";
import { ReactNode } from "react";

import A from "components/misc/A";
import Code from "./code";
import { CSS, Paragraph } from "components/misc";

export const STYLE_PITCH: CSS = {
  padding: "30px 10%",
  backgroundColor: "white",
} as const;

interface Props {
  col1: ReactNode;
  col2: ReactNode;
  ext?: string;
}

export default function Pitch(props: Props) {
  const { col1, col2, ext } = props;
  return (
    <div style={STYLE_PITCH}>
      <Row gutter={20}>
        <Col lg={12}>{col1}</Col>
        <Col lg={12}>{col2}</Col>
      </Row>
      {ext && <CallToAction ext={ext} />}
    </div>
  );
}

const STYLE_CALL: CSS = {
  textAlign: "center",
  padding: "30px 0",
  fontSize: "14pt",
} as const;

function CallToAction(props: { ext: string }) {
  const { ext } = props;
  return (
    <Paragraph style={STYLE_CALL}>
      <strong>Ready out of the box</strong>:{" "}
      <A href="https://doc.cocalc.com/getting-started.html">
        Sign up, create a project
      </A>
      , create or <A href="https://doc.cocalc.com/howto/upload.html">upload</A>{" "}
      your {ext && <Code>*.{ext}</Code>} file, and you're ready to go!
    </Paragraph>
  );
}
