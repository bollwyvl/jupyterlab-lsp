import { ILanguageServerManager, IDocumentConnectionManager } from './tokens';
import { DocumentConnectionManager } from './connection_manager';
import { IInitParamsUpdater } from './connection';
import * as lsProtocol from 'vscode-languageserver-protocol';

export class LanguageServerManger implements ILanguageServerManager {
  private _init_params_updaters = new Set<IInitParamsUpdater>();

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
}
