import { SymbolTreeModel } from './model';

import * as protocol from 'vscode-languageserver-protocol';
import * as React from 'react';

import { VDomRenderer } from '@jupyterlab/apputils';
import { SymbolKind } from 'vscode-languageserver-types';

import { PositionConverter } from '@krassowski/jupyterlab-lsp/lib/converter';

export class SymbolTreeView extends VDomRenderer<SymbolTreeModel> {
  constructor(options: SymbolTreeModel.IOptions) {
    super();
    this.model = new SymbolTreeModel(options);
    this.addClass('jp-LSP-SymbolTree');
  }
  protected render() {
    const m = this.model;
    const ds = m.symbols;

    const roots = Array.from(ds.keys()).map(key => (
      <ul>
        <li>
          <code>{key}</code>
          {renderSymbols(ds.get(key), m)}
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
      return <sup>{`${k}`.toLowerCase()}</sup>;
    }
  }
  return null;
}

function renderSymbols(ds: protocol.DocumentSymbol[], m: SymbolTreeModel) {
  return <ul>{ds && ds.length ? ds.map(c => renderSymbol(c, m)) : []}</ul>;
}

function selectSymbol(ds: protocol.DocumentSymbol, m: SymbolTreeModel) {
  console.warn('TODO: figure out how to execute jump command with', ds);
  let range: protocol.Range = (ds as any).location?.range || ds.selectionRange;
  m.adapter.virtual_editor
    .getDoc()
    .setSelection(
      PositionConverter.lsp_to_cm(range.start),
      PositionConverter.lsp_to_cm(range.end),
      { scroll: true }
    );
}

function renderSymbol(ds: protocol.DocumentSymbol, m: SymbolTreeModel) {
  const { children } = ds;
  const onClick = () => selectSymbol(ds, m);
  return (
    <li>
      <button onFocus={onClick} onMouseOver={onClick}>
        <code title={ds.detail || ''}>{ds.name}</code> {renderKind(ds.kind)}
      </button>
      {children && children.length ? renderSymbols(children, m) : ''}
    </li>
  );
}
