import { MessageConnection } from 'vscode-ws-jsonrpc';
import * as protocol from 'vscode-languageserver-protocol';

import { VDomModel } from '@jupyterlab/apputils';

import { JupyterLabWidgetAdapter } from '@krassowski/jupyterlab-lsp/lib/adapters/jupyterlab/jl_adapter';

export class SymbolTreeModel extends VDomModel {
  private _adapter: JupyterLabWidgetAdapter;
  private _symbols: SymbolTreeModel.TSymbolMap = new Map();

  constructor(options: SymbolTreeModel.IOptions) {
    super();
    this.adapter = options.adapter;
  }

  get adapter() {
    return this._adapter;
  }

  set adapter(adapter) {
    this._adapter = adapter;
    this.stateChanged.emit(void 0);
    this.refresh()
      .then()
      .catch(console.warn);
  }

  get symbols() {
    return this._symbols;
  }

  set symbols(symbols) {
    this._symbols = symbols;
    this.stateChanged.emit(void 0);
  }

  async refresh() {
    const connections = this._adapter.connection_manager.connections;
    const keys = Array.from(connections.keys());
    const symbols = (this.symbols = new Map() as SymbolTreeModel.TSymbolMap);

    await Promise.all(
      keys.map(async key => {
        const connection = connections.get(key);
        const raw: MessageConnection = (connection as any).connection;
        let response: protocol.DocumentSymbol;

        try {
          response = await (raw.sendRequest<protocol.DocumentSymbol>(
            'textDocument/documentSymbol',
            {
              textDocument: { uri: connection.getDocumentUri() }
            } as protocol.DocumentSymbolParams
          ) as Promise<protocol.DocumentSymbol>);
          console.log(response);
          let langSymbols: protocol.DocumentSymbol[] = Array.isArray(response)
            ? response
            : [response];

          symbols.set(key, langSymbols);
          this.symbols = symbols;
        } catch (err) {
          console.warn(err);
        }
      })
    );

    this.symbols = symbols;
  }
}

export namespace SymbolTreeModel {
  export interface IOptions {
    adapter: JupyterLabWidgetAdapter;
  }
  export type TSymbolMap = Map<string, protocol.DocumentSymbol[]>;
}
