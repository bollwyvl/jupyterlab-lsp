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
import { JupyterLabWidgetAdapter } from '@krassowski/jupyterlab-lsp/lib/adapters/jupyterlab/jl_adapter';

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
  palette: ICommandPalette,
  restorer: ILayoutRestorer
): ISymbolTreeTracker {
  const { commands, shell } = lab;
  const namespace = 'symbol-tree';
  const tracker = new WidgetTracker<MainAreaWidget<ISymbolTree.ISymbolTree>>({
    namespace
  });
  console.log(lab, settings, palette, restorer);

  manager.registerInitParamsUpdater(params => {
    const { capabilities } = params;
    const { textDocument } = capabilities;
    textDocument.documentSymbol = {
      ...(textDocument.documentSymbol || {}),
      hierarchicalDocumentSymbolSupport: true
    };
    return params;
  });

  commands.addCommand(CommandIDs.show, {
    label: 'Show Symbol Tree',
    isVisible: () => !!manager.widgetAdapter(shell.currentWidget),
    execute: async args => {
      const adapter: JupyterLabWidgetAdapter =
        (args as any)?.adapter || manager.widgetAdapter(shell.currentWidget);
      const widgets = await import('./widget');
      const content = new widgets.SymbolTreeView({ adapter });
      content.title.label = adapter.document_path.split('/').slice(-1)[0];
      const widget = new MainAreaWidget({ content });
      shell.add(widget, 'main');
    }
  });

  palette.addItem({
    category: 'Languge Server',
    command: CommandIDs.show
  });

  return tracker;
}

export default plugin;

/**
 * The command IDs used by the symbol tree plugin.
 */
namespace CommandIDs {
  export const show = 'symbol-tree:show';
  export const refresh = 'symbol-tree:refresh';
}
