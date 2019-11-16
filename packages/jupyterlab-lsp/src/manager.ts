import { ILanguageServerManager, IDocumentConnectionManager } from './tokens';
import { DocumentConnectionManager } from './connection_manager';

export class LanguageServerManger implements ILanguageServerManager {
  makeConnectionManager(): IDocumentConnectionManager {
    return new DocumentConnectionManager();
  }
}
