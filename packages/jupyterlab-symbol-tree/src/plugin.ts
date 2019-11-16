import { ISettingRegistry } from '@jupyterlab/coreutils';

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import { ILanguageServerManager } from '@krassowski/jupyterlab-lsp/lib/tokens';

import { ISymbolTreeTracker, ISymbolTree, NS } from './tokens';

import '../style/index.css';

const plugin: JupyterFrontEndPlugin<ISymbolTreeTracker> = {
  id: `${NS}:plugin`,
  provides: ISymbolTreeTracker,
  requires: [ILanguageServerManager, ISettingRegistry],
  optional: [ICommandPalette, ILayoutRestorer],
  autoStart: true,
  activate
};

function activate(
  lab: JupyterFrontEnd,
  manager: ILanguageServerManager,
  settings: ISettingRegistry,
  commands: ICommandPalette,
  restorer: ILayoutRestorer
): ISymbolTreeTracker {
  const namespace = 'symbol-tree';
  const tracker = new WidgetTracker<MainAreaWidget<ISymbolTree.ISymbolTree>>({
    namespace
  });
  console.log(lab, settings, commands, restorer, manager);
  return tracker;
}

export default plugin;
