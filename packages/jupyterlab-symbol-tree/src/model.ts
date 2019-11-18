import { JupyterLabWidgetAdapter } from '@krassowski/jupyterlab-lsp/lib/adapters/jupyterlab/jl_adapter';
import { MessageConnection } from 'vscode-ws-jsonrpc';
import * as protocol from 'vscode-languageserver-protocol';

import { VDomModel } from '@jupyterlab/apputils';

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
    console.log('connections', connections);
    const keys = Array.from(connections.keys());

    const symbols = await Promise.all(
      keys.map(async key => {
        const connection = connections.get(key);
        const raw: MessageConnection = (connection as any).connection;
        const response = await (raw.sendRequest<protocol.DocumentSymbol>(
          'textDocument/documentSymbol',
          {
            textDocument: { uri: connection.getDocumentUri() }
          } as protocol.DocumentSymbolParams
        ) as Promise<protocol.DocumentSymbol>);

        let langSymbols: protocol.DocumentSymbol[] = Array.isArray(response)
          ? response
          : [response];

        return { key, symbols: langSymbols };
      })
    );

    this.symbols = symbols.reduce((m, v) => {
      m.set(v.key, v.symbols);
      return m;
    }, new Map() as SymbolTreeModel.TSymbolMap);
  }
}

export namespace SymbolTreeModel {
  export interface IOptions {
    adapter: JupyterLabWidgetAdapter;
  }
  export type TSymbolMap = Map<string, protocol.DocumentSymbol[]>;
}
