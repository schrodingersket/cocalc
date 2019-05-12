/*
Top-level react component for editing code.
*/

import { CodemirrorEditor } from "./codemirror-editor";
import { filename_extension, set } from "smc-util/misc2";
import { createEditor } from "../frame-tree/editor";
import { terminal } from "../terminal-editor/editor";

const FORMAT = set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "md",
  "css",
  "py",
  "r",
  "go",
  "yml",
  "yaml",
  "xml",
  "cml" /* that's xml */,
  "kml" /* geodata keyhole markup, also xml */,
  "c",
  "c++",
  "cc",
  "cpp",
  "h",
  "bib"
]);

export const SHELLS = {
  erl: "/usr/bin/erl",
  hrl: "/usr/bin/erl",
  py: "/usr/bin/python3",
  sage: "/ext/bin/sage"
};

export const cm = {
  short: "Code",
  name: "Source Code",
  icon: "code",
  component: CodemirrorEditor,
  buttons: function(path: string): any {
    const buttons: any = set([
      "print",
      "decrease_font_size",
      "increase_font_size",
      "save",
      "time_travel",
      "replace",
      "find",
      "goto_line",
      "cut",
      "paste",
      "copy",
      "undo",
      "redo"
    ]);
    const ext = filename_extension(path);
    if (FORMAT[ext]) {
      buttons.format = true;
    }
    if (SHELLS[ext]) {
      buttons.shell = true;
    }
    return buttons;
  }
};

const EDITOR_SPEC = {
  cm,
  terminal
};

export const Editor = createEditor({
  format_bar: false,
  editor_spec: EDITOR_SPEC,
  display_name: "CodeEditor"
});
