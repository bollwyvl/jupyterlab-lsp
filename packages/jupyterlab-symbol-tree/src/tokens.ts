// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@phosphor/widgets';

import { Token } from '@phosphor/coreutils';

import { IWidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';

export const NS = '@krassowski/jupyterlab-symbol-tree';

/**
 * A class that tracks editor widgets.
 */
export interface ISymbolTreeTracker
  extends IWidgetTracker<MainAreaWidget<ISymbolTree.ISymbolTree>> {}

/* tslint:disable */
/**
 * The editor tracker token.
 */
export const ISymbolTreeTracker = new Token<ISymbolTreeTracker>(
  `${NS}:ISymbolTreeTracker`
);
/* tslint:enable */

/**
 * The namespace for symbol trees. Separated from the widget so it can be lazy
 * loaded.
 */
export namespace ISymbolTree {
  export interface ISymbolTree extends Widget {}
  /**
   * Options for the symbol tree widget.
   */
  export interface IOptions {}

  /**
   * The default options used for creating symbol tree.
   */
  export const defaultOptions: IOptions = {};
}
