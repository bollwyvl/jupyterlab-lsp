// Copyright (c) jupyterlab-lsp contributors
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';
import { Widget } from '@phosphor/widgets';
import { Signal } from '@phosphor/signaling';
import { VirtualDocument } from './virtual/document';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IEditorTracker } from '@jupyterlab/fileeditor';

import * as lsProtocol from 'vscode-languageserver-protocol';

import {
  IDocumentConnectionData,
  ISocketConnectionOptions
} from './connection_manager';

import { JupyterLabWidgetAdapter } from './adapters/jupyterlab/jl_adapter';

import { LSPConnection, IInitParamsUpdater } from './connection';

export const NS = '@krassowski/jupyterlab-lsp';

/**
 * A class that tracks language servers.
 */
export interface ILanguageServerManager {
  makeConnectionManager(): IDocumentConnectionManager;
  registerInitParamsUpdater(updater: IInitParamsUpdater): void;
  unregisterInitParamsUpdater(updater: IInitParamsUpdater): void;
  updateInitParams(
    params: lsProtocol.InitializeParams
  ): lsProtocol.InitializeParams;
  widgetAdapter(widget: Widget): JupyterLabWidgetAdapter;
}

export namespace ILanguageServerManager {
  export interface IOptions {
    app: JupyterFrontEnd;
    notebooks: INotebookTracker;
    file_editors: IEditorTracker;
  }
}

/* tslint:disable */
/**
 * The language server manager token.
 */
export const ILanguageServerManager = new Token<ILanguageServerManager>(
  `${NS}:ILanguageServerManager`
);
/* tslint:enable */

export interface IDocumentConnectionManager {
  connections: Map<VirtualDocument.id_path, LSPConnection>;
  documents: Map<VirtualDocument.id_path, VirtualDocument>;
  initialized: Signal<IDocumentConnectionManager, IDocumentConnectionData>;
  connected: Signal<IDocumentConnectionManager, IDocumentConnectionData>;
  disconnected: Signal<IDocumentConnectionManager, IDocumentConnectionData>;
  closed: Signal<IDocumentConnectionManager, IDocumentConnectionData>;
  documents_changed: Signal<
    IDocumentConnectionManager,
    Map<VirtualDocument.id_path, VirtualDocument>
  >;
  connect_document_signals(virtual_document: VirtualDocument): void;
  retry_to_connect(
    options: ISocketConnectionOptions,
    reconnect_delay: number,
    retrials_left?: number
  ): Promise<void>;
  close_all(): void;
  connect(options: ISocketConnectionOptions): Promise<LSPConnection>;
}

export namespace IDocumentConnectionManager {
  export interface IOptions {
    lsp_manager: ILanguageServerManager;
  }
}
