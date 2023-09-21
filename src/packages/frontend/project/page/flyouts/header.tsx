/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Button, Tooltip } from "antd";
import { useEffect, useState } from "react";

import { TourName } from "@cocalc/frontend/account/tours";
import { redux, useTypedRedux } from "@cocalc/frontend/app-framework";
import { Icon } from "@cocalc/frontend/components";
import { useProjectContext } from "@cocalc/frontend/project/context";
import { PathNavigator } from "@cocalc/frontend/project/explorer/path-navigator";
import track from "@cocalc/frontend/user-tracking";
import { capitalize } from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";
import { FIX_BORDER } from "../common";
import { FIXED_PROJECT_TABS, FixedTab } from "../file-tab";
import { FIXED_TABS_BG_COLOR } from "../tabs";
import { FLYOUT_PADDING } from "./consts";
import { LogHeader } from "./log";

const FLYOUT_FULLSCREEN_TOUR_NAME: TourName = "flyout-fullscreen";

interface Props {
  flyoutWidth: number;
  flyout: FixedTab;
  narrowerPX: number;
}

export function FlyoutHeader(_: Readonly<Props>) {
  const { flyout, flyoutWidth, narrowerPX = 0 } = _;
  const { actions, project_id, is_active } = useProjectContext();
  // the flyout fullscreen button explanation isn't an Antd tour, but has the same effect.
  const tours = useTypedRedux("account", "tours");
  const [highlightFullpage, setHighlightFullpage] = useState<boolean>(false);

  useEffect(() => {
    // we only want to show the highlight if the project page is in the front (active)
    // and the user has not seen the tour yet.
    const show =
      is_active && tours && !tours.includes(FLYOUT_FULLSCREEN_TOUR_NAME);
    setHighlightFullpage(show || false);
  }, [is_active]);

  function renderDefaultTitle() {
    const title = FIXED_PROJECT_TABS[flyout].flyoutTitle;
    if (title != null) {
      return title;
    } else {
      return capitalize(flyout);
    }
  }

  function renderIcon() {
    const iconName = FIXED_PROJECT_TABS[flyout].icon;
    if (iconName != null) {
      return <Icon name={iconName} />;
    } else {
      return null;
    }
  }

  function closeBtn() {
    return (
      <Tooltip title="Hide this panel" placement="bottom">
        <Icon
          name="times"
          className="cc-project-fixedtab-close"
          style={{
            marginRight: FLYOUT_PADDING,
            padding: FLYOUT_PADDING,
          }}
          onClick={() => actions?.toggleFlyout(flyout)}
        />
      </Tooltip>
    );
  }

  function renderFullpagePopupTitle() {
    return (
      <>
        <div>Open this flyout panel as a full page.</div>
        {highlightFullpage ? (
          <>
            <hr />
            <div>
              You can change the behavior of these buttons on the side via the
              vertical menu layout button selector at the bottom left.
            </div>
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <Button
                onClick={() => {
                  const actions = redux.getActions("account");
                  actions.setTourDone(FLYOUT_FULLSCREEN_TOUR_NAME);
                  setHighlightFullpage(false);
                }}
              >
                Don't show this again
              </Button>
            </div>
          </>
        ) : null}
      </>
    );
  }

  function fullPageBtn() {
    const style = {
      marginRight: FLYOUT_PADDING,
      padding: FLYOUT_PADDING,
      fontSize: "12px",
      ...(highlightFullpage
        ? { backgroundColor: COLORS.ANTD_ORANGE }
        : undefined),
    };

    // force the tooltip to be open if we're highlighting the full page button
    // using the tooltip or clicking on the "don't show this again" button,
    // will disable its forced open state.
    const extraProps = highlightFullpage ? { open: true } : {};
    return (
      <>
        <Tooltip
          title={renderFullpagePopupTitle()}
          placement="bottom"
          {...extraProps}
        >
          <Icon
            name="expand"
            className="cc-project-fixedtab-fullpage"
            style={style}
            onClick={() => {
              // flyouts and full pages share the same internal name
              actions?.set_active_tab(flyout);
              track("switch-to-fixed-tab", {
                project_id,
                flyout,
                how: "click-on-flyout-expand-button",
              });
              if (highlightFullpage) {
                const actions = redux.getActions("account");
                actions.setTourDone(FLYOUT_FULLSCREEN_TOUR_NAME);
                setHighlightFullpage(false);
              }
            }}
          />
        </Tooltip>
      </>
    );
  }

  function renderTitle() {
    switch (flyout) {
      case "files":
        return (
          <PathNavigator
            style={{ flex: 1 }}
            mode={"flyout"}
            project_id={project_id}
            className={"cc-project-flyout-path-navigator"}
          />
        );
      case "log":
        return <LogHeader project_id={project_id} />;
      case "search":
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontWeight: "bold",
            }}
          >
            <Icon
              name="search"
              style={{ fontSize: "120%", marginRight: "10px" }}
            />{" "}
            <PathNavigator
              style={{ flex: "1 0 auto" }}
              mode={"flyout"}
              project_id={project_id}
              className={"cc-project-flyout-path-navigator"}
            />
          </div>
        );
      default:
        return (
          <div style={{ flex: 1, fontWeight: "bold" }}>
            {renderIcon()} {renderDefaultTitle()}
          </div>
        );
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "start",
        borderRight: FIX_BORDER,
        borderTop: FIX_BORDER,
        borderLeft: FIX_BORDER,
        background: FIXED_TABS_BG_COLOR,
        borderRadius: "5px 5px 0 0",
        width: `${flyoutWidth - narrowerPX}px`,
        paddingLeft: "10px",
        paddingTop: "10px",
        fontSize: "1.2em",
        marginRight: FLYOUT_PADDING,
      }}
    >
      {renderTitle()}
      {fullPageBtn()}
      {closeBtn()}
    </div>
  );
}
