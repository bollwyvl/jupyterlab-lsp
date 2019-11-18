import { SymbolTreeModel } from './model';

import * as protocol from 'vscode-languageserver-protocol';
import * as React from 'react';

import { VDomRenderer } from '@jupyterlab/apputils';
import { SymbolKind } from 'vscode-languageserver-types';

export class SymbolTreeView extends VDomRenderer<SymbolTreeModel> {
  constructor(options: SymbolTreeModel.IOptions) {
    super();
    this.model = new SymbolTreeModel(options);
  }
  protected render() {
    const m = this.model;
    const ds = m.symbols;

    const roots = Array.from(ds.keys()).map(key => (
      <ul>
        <li>
          <code>{key}</code>
          {renderSymbols(ds.get(key))}
        </li>
      </ul>
    ));

    if (!roots.length) {
      return [<p>No symbols yet</p>];
    }

    return roots;
  }
}

function renderKind(kind: SymbolKind) {
  let k: any;
  for (k in SymbolKind) {
    if (kind === (SymbolKind as any)[k]) {
      return <i>{k}</i>;
    }
  }
  return null;
}

function renderSymbols(ds: protocol.DocumentSymbol[]) {
  return <ul>{ds && ds.length ? ds.map(c => renderSymbol(c)) : []}</ul>;
}

function renderSymbol(ds: protocol.DocumentSymbol) {
  const { children } = ds;
  return (
    <li>
      <code>{ds.name}</code> {renderKind(ds.kind)}
      {children && children.length && renderSymbols(children)}
    </li>
  );
}
