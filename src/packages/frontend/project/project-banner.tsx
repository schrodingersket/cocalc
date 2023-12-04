/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import {
  React,
  useMemo,
  useStore,
  useTypedRedux,
} from "@cocalc/frontend/app-framework";
import { useProjectContext } from "./context";
import { NoInternetBanner } from "./no-internet-banner";
import { useRunQuota } from "./settings/run-quota/hooks";
import { TrialBanner } from "./trial-banner";

export const DOC_TRIAL = "https://doc.cocalc.com/trial.html";

export const ProjectWarningBanner: React.FC<{}> = React.memo(() => {
  const { isRunning: projectIsRunning, project_id } = useProjectContext();
  const other_settings = useTypedRedux("account", "other_settings");
  const is_anonymous = useTypedRedux("account", "is_anonymous");
  const project_map = useTypedRedux("projects", "project_map");
  const projects_store = useStore("projects");
  const runQuota = useRunQuota(project_id, null);
  const student_pay = useMemo(
    () => projects_store.date_when_course_payment_required(project_id),
    [project_map, project_id],
  );
  const is_commercial = useTypedRedux("customize", "is_commercial");
  const isSandbox = project_map?.getIn([project_id, "sandbox"]);

  const host: boolean = !runQuota?.member_host;
  const internet: boolean = !runQuota?.network;

  // fallback case for showBanner
  function showNoInternetBanner(): "no-internet" | null {
    if (projectIsRunning && internet) {
      return "no-internet";
    } else {
      return null;
    }
  }

  function showBanner(): "trial" | "no-internet" | null {
    // paying usres are allowed to have a setting to hide banner unconditionally
    if (other_settings?.get("no_free_warnings")) {
      return showNoInternetBanner();
    }
    if (!is_commercial) {
      return null;
    }
    if (is_anonymous) {
      // No need to provide all these warnings and scare anonymous users, who are just
      // playing around for the first time (and probably wouldn't read this, and should
      // assume strong limitations since they didn't even make an account).
      return null;
    }
    if (isSandbox) {
      // don't bother for sandbox project, since users can't upgrade it anyways.
      return null;
    }
    // we exclude students, but still show a warning about internet
    if (student_pay) {
      if (!internet) {
        return showNoInternetBanner();
      }
      return null;
    }
    if (!host && !internet) {
      return null;
    }
    if (!host && internet) {
      return showNoInternetBanner();
    }
    // if none of the above cases apply, we show the trial banner
    return "trial";
  }

  if (projectIsRunning == null) return null;

  switch (showBanner()) {
    case "trial":
      // list of all licenses applied to this project
      const projectSiteLicenses =
        project_map?.get(project_id)?.get("site_license")?.keySeq().toJS() ??
        [];

      return (
        <TrialBanner
          project_id={project_id}
          projectSiteLicenses={projectSiteLicenses}
          projectCreatedTS={project_map?.get(project_id)?.get("created")}
          host={host}
          internet={internet}
          projectIsRunning={projectIsRunning}
        />
      );

    case "no-internet":
      return (
        <NoInternetBanner
          project_id={project_id}
          projectSiteLicenses={projectSiteLicenses}
          student_pay={!!student_pay}
        />
      );
  }
  return null;
});
