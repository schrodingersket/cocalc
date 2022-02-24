/*
Displays selected element with a border around it.

NOTE that this is HTML and border width must be at least 1px.
Given our CSS scale before this, if the scale is bigger than 2
then the border will be too wide.  We'll probably have to redo
things to fix that later.
*/

import { Tooltip } from "antd";
import { ReactNode, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import {
  getAngle,
  getGroup,
  getOverlappingElements,
  getPosition,
  MAX_ELEMENTS,
} from "./math";
import { Icon } from "@cocalc/frontend/components/icon";
import { useFrameContext } from "./hooks";
import EditBar from "./tools/edit-bar";
import { Element } from "./types";
import DragHandle from "./focused-resize";
import EdgeCreate, {
  Position as EdgeCreatePosition,
} from "./focused-edge-create";
import Position from "./position";
import { isLocked } from "./tools/lock-button";
import { isHidden } from "./tools/hide-button";
import Cursors from "./cursors";

export const SELECTED_BORDER_COLOR = "#40a9ff";
export const SELECTED_BORDER_WIDTH = 1;
export const SELECTED_BORDER_TYPE = "solid";
const OFFSET = 50;
const rotateEps = 0.07;
const rotationSnaps: number[] = [];
for (let i = 0; i <= 8; i++) {
  rotationSnaps.push((i * Math.PI) / 4);
}

const ICON_STYLE = {
  opacity: 0.7,
  background: "white",
  fontSize: "24px",
};

interface Props {
  children: ReactNode;
  canvasScale: number;
  element: Element;
  selectedElements: Element[];
  allElements: Element[];
  transforms;
  readOnly?: boolean;
  cursors?: { [account_id: string]: any[] };
}

export default function Focused({
  children,
  canvasScale,
  element,
  selectedElements,
  transforms,
  allElements,
  readOnly,
  cursors,
}: Props) {
  const frame = useFrameContext();
  const rectRef = useRef<any>(null);
  const [offset, setOffset] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  }>({ x: 0, y: 0, w: 0, h: 0 });
  const [rotating, setRotating] = useState<number | undefined>(undefined);
  const [dragging, setDragging] = useState<boolean>(false);
  const pos = getPosition(element);
  const t = transforms.dataToWindowNoScale(pos.x, pos.y, pos.z);
  const isChanging =
    dragging || offset.x || offset.y || offset.w || offset.h || rotating;
  const locked = isLocked(selectedElements);
  const hidden = isHidden(selectedElements);

  const resizeHandles = useMemo(() => {
    if (locked || readOnly || hidden) return null;
    const v: ReactNode[] = [];
    for (const top of [true, false]) {
      for (const left of [true, false]) {
        v.push(
          <DragHandle
            key={`${top}-${left}`}
            top={top}
            left={left}
            canvasScale={canvasScale}
            element={element}
            selectedElements={selectedElements}
            setOffset={setOffset}
          />
        );
      }
    }
    return v;
  }, [element, canvasScale]);

  const edgeCreationPoints = useMemo(() => {
    if (selectedElements.length >= 2 || readOnly || hidden) return null;
    return ["top", "bottom", "left", "right"].map(
      (position: EdgeCreatePosition) => (
        <EdgeCreate
          key={position}
          position={position}
          canvasScale={canvasScale}
          element={element}
        />
      )
    );
  }, [element, canvasScale]);

  // useMemo is critical here because we don't want this
  // component to get re-rendered as a result of it calling
  // setRotating internally below to update the preview.
  const RotateControl = useMemo(() => {
    if (
      selectedElements.length > 1 ||
      element.type == "code" ||
      locked ||
      hidden ||
      readOnly
    ) {
      // TODO: implement a notion of rotate for multiple objects...?
      // Regarding code, codemirror doesn't work at all when
      // transformed...
      return null;
    }
    function computeAngle(data) {
      const rect = rectRef.current;
      if (!rect) return;
      const { height, width } = rect.getBoundingClientRect();
      const s = canvasScale;
      const start = {
        x: -OFFSET / s - width / 2,
        y: OFFSET / s + height / 2,
      };
      const stop = {
        x: start.x + data.x * canvasScale,
        y: start.y + data.y * canvasScale,
      };
      return getAngle(stop) - getAngle(start);
    }
    return (
      <Draggable
        key="rotate"
        position={{ x: 0, y: 0 }}
        scale={canvasScale}
        onDrag={(_, data) => {
          setRotating(computeAngle(data));
        }}
        onStop={(_, data) => {
          const angle = computeAngle(data);
          if (angle == null) return;
          let { id, rotate } = element;
          rotate = (rotate ?? 0) + angle;
          // heuristic to snap to some common rotations.
          for (const s of rotationSnaps) {
            if (Math.abs(rotate - s) < rotateEps) {
              rotate = s;
              break;
            }
          }
          setTimeout(() => {
            if (id == "selection") return; // todo
            frame.actions.setElement({ obj: { id, rotate }, cursors: [{}] });
            setRotating(undefined);
          }, 0);
        }}
      >
        <Tooltip title="Rotate">
          <Icon
            className="nodrag"
            style={{
              ...ICON_STYLE,
              cursor: locked || readOnly ? undefined : "grab",
              position: "absolute",
              bottom: `-${OFFSET / canvasScale}px`,
              left: `-${OFFSET / canvasScale}px`,
              transform: `scale(${1 / canvasScale})`,
              pointerEvents: "all",
            }}
            name="reload"
          />
        </Tooltip>
      </Draggable>
    );
  }, [element.rotate, canvasScale, selectedElements.length]);

  const moveHandle =
    locked || readOnly ? null : (
      <Tooltip key="move" title="Move">
        <Icon
          name="move"
          style={{
            ...ICON_STYLE,
            cursor: locked ? undefined : "grab",
            position: "absolute",
            top: `-${OFFSET / canvasScale}px`,
            left: `-${OFFSET / canvasScale}px`,
            visibility: isChanging ? "hidden" : undefined,
            transform: `scale(${1 / canvasScale})`,
            pointerEvents: "all",
          }}
        />
      </Tooltip>
    );

  const scale_x = element.w ? (element.w + offset.w) / element.w : 1;
  const scale_y = element.h ? (element.h + offset.h) / element.h : 1;

  return (
    <Position
      x={t.x}
      y={t.y}
      z={MAX_ELEMENTS + 1}
      w={pos.w}
      h={pos.h}
      style={
        selectedElements.length == 1 &&
        ["pen", "frame", "icon"].includes(selectedElements[0].type)
          ? {
              pointerEvents: "none", // otherwise entire element is blocked by this div
            }
          : undefined
      }
    >
      <div
        style={{
          visibility: isChanging ? "hidden" : undefined,
        }}
      >
        <Cursors cursors={cursors} canvasScale={canvasScale} />
        {RotateControl}
        <div
          style={{
            zIndex: MAX_ELEMENTS + 2,
            position: "absolute",
            width: "100%",
            height: "100%",
            ...(element.rotate
              ? {
                  transform: `rotate(${element.rotate}rad)`,
                  transformOrigin: "center",
                }
              : undefined),
            pointerEvents: "none", // otherwise entire element is blocked by this div
          }}
        >
          {resizeHandles}
          {edgeCreationPoints}
        </div>
        <div
          className="nodrag"
          style={{
            position: "absolute",
            bottom: `-${OFFSET / SELECTED_BORDER_WIDTH / canvasScale}px`,
            left: `${OFFSET / SELECTED_BORDER_WIDTH / canvasScale}px`,
            transform: `scale(${1 / canvasScale})`,
            transformOrigin: "top left",
            pointerEvents: "all",
          }}
        >
          <EditBar
            readOnly={readOnly}
            elements={selectedElements}
            allElements={allElements}
          />
        </div>
      </div>
      <Draggable
        disabled={locked || readOnly}
        cancel={".nodrag"}
        position={{ x: 0, y: 0 }}
        scale={canvasScale}
        onStart={() => {
          setDragging(true);
        }}
        onStop={(_, data) => {
          setDragging(false);
          const moved: Set<string> = new Set();
          for (const elt of selectedElements) {
            const { id } = elt;
            const x = elt.x + data.x;
            const y = elt.y + data.y;
            frame.actions.setElement({
              obj: { id, x, y },
              commit: false,
              cursors: [{}],
            });
            moved.add(id);
          }
          if (element.type == "frame") {
            // also move any element/group that touches the frame.  That's what
            // makes frames special.  (Except don't move other frames, or that
            // would make it impossible to separate them.)
            const overlapping = getOverlappingElements(allElements, element);
            for (const elt of overlapping) {
              if (moved.has(elt.id) || elt.type == "frame") continue;
              const x = elt.x + data.x;
              const y = elt.y + data.y;
              frame.actions.setElement({
                obj: { id: elt.id, x, y },
                commit: false,
              });
              moved.add(elt.id);
              if (elt.group) {
                // also have to move the rest of the group
                for (const elt2 of getGroup(allElements, elt.group)) {
                  if (moved.has(elt2.id) || elt2.type == "frame") continue;
                  const x = elt2.x + data.x;
                  const y = elt2.y + data.y;
                  frame.actions.setElement({
                    obj: { id: elt2.id, x, y },
                    commit: false,
                  });
                  moved.add(elt2.id);
                }
              }
            }
          }
          frame.actions.syncstring_commit();
        }}
      >
        <div
          ref={rectRef}
          style={{
            cursor: locked ? undefined : "grab",
            position: "relative",
            ...(rotating
              ? {
                  border: `${
                    SELECTED_BORDER_WIDTH / canvasScale
                  }px ${SELECTED_BORDER_TYPE} ${SELECTED_BORDER_COLOR}`,
                  marginLeft: `${
                    -SELECTED_BORDER_WIDTH / canvasScale + offset.x
                  }px`,
                  marginTop: `${
                    -SELECTED_BORDER_WIDTH / canvasScale + offset.y
                  }px`,
                }
              : {
                  marginLeft: `${offset.x}px`,
                  marginTop: `${offset.y}px`,
                }),
            width: isChanging ? `${pos.w + offset.w}px` : "100%",
            height: isChanging ? `${pos.h + offset.h}px` : "100%",
          }}
        >
          {moveHandle}
          <div
            style={{
              width: `${element.w}px`,
              height: `${element.h}px`,
              ...(scale_x != 1 || scale_y != 1
                ? {
                    transform: `scale(${scale_x},${scale_y})`,
                    transformOrigin: "top left",
                    opacity: 0.5,
                    background: "lightblue",
                  }
                : undefined),
            }}
          >
            <div
              style={{
                ...(rotating
                  ? {
                      transform: `rotate(${rotating}rad)`,
                      transformOrigin: "center",
                    }
                  : undefined),
                width: "100%",
                height: "100%",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </Draggable>
    </Position>
  );
}
