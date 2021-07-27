/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Layout as AntdLayout } from "antd";

import Link from "next/link";
import Head from "next/head";

import SiteName from "components/site-name";
import Analytics from "components/analytics";
import Footer from "components/footer";
import Header from "components/header";

export function Layout({ children }) {
  return (
    <>
      <Head>
        <title>
          <SiteName />
        </title>
        <meta name="description" content="CoCalc Share Server" />
        <link
          rel="icon"
          href={`${process.env.BASE_PATH ?? ""}/../webapp/favicon.ico`}
        />
        <Analytics />
      </Head>
      <AntdLayout>
        <Header />
        <AntdLayout.Content>
          <div
            style={{
              color: "#555",
              margin: "0 auto",
              maxWidth: "1200px",
              fontSize: "11pt",
              padding: "15px",
            }}
          >
            {children}
          </div>
        </AntdLayout.Content>
        <Footer />
      </AntdLayout>
    </>
  );
}

export function Embed({ children }) {
  return (
    <>
      <Head>
        <title>
          <SiteName />
        </title>
        <link rel="icon" href={`${process.env.basePath ?? ""}/favicon.ico`} />
        <Analytics />
      </Head>
      <main>{children}</main>
    </>
  );
}
