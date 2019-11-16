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

import { ISymbolTreeTracker, ISymbolTree, NS } from './tokens';

import '../style/index.css';

function activate(
  lab: JupyterFrontEnd,
  settings: ISettingRegistry,
  commands: ICommandPalette,
  restorer: ILayoutRestorer
): ISymbolTreeTracker {
  const namespace = 'symbol-tree';
  const tracker = new WidgetTracker<MainAreaWidget<ISymbolTree.ISymbolTree>>({
    namespace
  });
  console.log(lab, settings, commands, restorer);
  return tracker;
}

const plugin: JupyterFrontEndPlugin<ISymbolTreeTracker> = {
  id: `${NS}:plugin`,
  provides: ISymbolTreeTracker,
  requires: [ISettingRegistry],
  optional: [ICommandPalette, ILayoutRestorer],
  autoStart: true,
  activate
};

export default plugin;
