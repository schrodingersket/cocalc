/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

export interface Token {
  hidden?: boolean; // See https://markdown-it.github.io/markdown-it/#Token.prototype.hidden
  type: string;
  tag?: string;
  attrs?: [string, string][] | null;
  children?: Token[] | null;
  content: string;
  block?: boolean;
  markup?: string;
  checked?: boolean;
  info?: string;
  map?: [number, number] | null; // source map: pair of 0-based line numbers of source that produced this token.
  level: number;
}

export const Token: any = null; // webpack + TS es2020 modules need this
