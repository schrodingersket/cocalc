/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// Authentication and SSO related utility functions or data shared between all packages

import { capitalize } from "@cocalc/util/misc";

export function ssoDispayedName({
  display,
  name, // name of strategy
}: {
  display?: string;
  name?: string;
}) {
  return display ?? (name === "github" ? "GitHub" : capitalize(name));
}
