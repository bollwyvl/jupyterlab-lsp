// Copyright (c) jupyterlab-lsp contributors
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';

export const NS = '@krassowski/jupyterlab-lsp';

/**
 * A class that tracks language servers.
 */
export interface ILanguageServerManager {}

/* tslint:disable */
/**
 * The language server manager token.
 */
export const ILanguageServerManager = new Token<ILanguageServerManager>(
  `${NS}:ILanguageServerManager`
);
/* tslint:enable */
