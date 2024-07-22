/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
Frame that displays the log for a Jupyter Notebook
*/

import { Rendered, Component } from "../../app-framework";

interface Props {
  project_id: string;
  path: string;
  font_size: number;
}

export class Log extends Component<Props, {}> {
  render(): Rendered {
    return <div>Jupyter Kernel Log for {this.props.path}</div>;
  }
}
