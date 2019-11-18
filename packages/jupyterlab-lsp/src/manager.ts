import * as lsProtocol from 'vscode-languageserver-protocol';

import { Widget } from '@phosphor/widgets';

// import { JupyterFrontEnd } from '@jupyterlab/application';

import { ILanguageServerManager, IDocumentConnectionManager } from './tokens';
import { DocumentConnectionManager } from './connection_manager';
import { IInitParamsUpdater } from './connection';
import { JupyterLabWidgetAdapter } from './adapters/jupyterlab/jl_adapter';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry/lib/registry';

import { file_editor_adapters, notebook_adapters } from './command_manager';

export class LanguageServerManager implements ILanguageServerManager {
  private _init_params_updaters = new Set<IInitParamsUpdater>();
  // private _app: JupyterFrontEnd;
  private _notebooks: INotebookTracker;
  private _file_editors: IEditorTracker;

  constructor(options: ILanguageServerManager.IOptions) {
    // this._app = options.app;
    this._notebooks = options.notebooks;
    this._file_editors = options.file_editors;
  }

  makeConnectionManager(): IDocumentConnectionManager {
    return new DocumentConnectionManager({
      lsp_manager: this
    });
  }

  registerInitParamsUpdater(updater: IInitParamsUpdater): void {
    this._init_params_updaters.add(updater);
  }

  unregisterInitParamsUpdater(updater: IInitParamsUpdater): void {
    this._init_params_updaters.delete(updater);
  }

  updateInitParams(
    params: lsProtocol.InitializeParams
  ): lsProtocol.InitializeParams {
    for (const updater of this._init_params_updaters) {
      params = updater(params);
    }
    return params;
  }

  widgetAdapter(widget: Widget): JupyterLabWidgetAdapter {
    if (this._notebooks.has(widget)) {
      return notebook_adapters.get((widget as NotebookPanel).id);
    }

    if (this._file_editors.has(widget)) {
      return file_editor_adapters.get(
        (widget as IDocumentWidget<FileEditor>).content.id
      );
    }

    return null;
  }
}
