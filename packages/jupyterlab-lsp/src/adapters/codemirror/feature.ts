import { VirtualDocument } from '../../virtual/document';
import { CodeMirrorHandler, VirtualEditor } from '../../virtual/editor';
import { LSPConnection } from '../../connection';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition
} from '../../positioning';
import { IJupyterLabComponentsManager } from '../jupyterlab/jl_adapter';

/// <reference path="../../../node_modules/@types/events/index.d.ts"/>
// this appears to break when @types/node is around
// import { Listener } from 'events';
import * as lsProtocol from 'vscode-languageserver-protocol';
import { PositionConverter } from '../../converter';
import * as CodeMirror from 'codemirror';
import { ICommandContext } from '../../command_manager';

export enum CommandEntryPoint {
  CellContextMenu,
  FileEditorContextMenu
}

function toDocumentChanges(changes: {
  [uri: string]: lsProtocol.TextEdit[];
}): lsProtocol.TextDocumentEdit[] {
  let documentChanges = [];
  for (let uri of Object.keys(changes)) {
    documentChanges.push({
      textDocument: { uri },
      edits: changes[uri]
    } as lsProtocol.TextDocumentEdit);
  }
  return documentChanges;
}

export interface IFeatureCommand {
  /**
   * The command id; it will be prepended with 'lsp' prefix.
   * To support multiple attachment points, multiple actual commands will be created,
   * identified by an attachment-point-specific suffix.
   */
  id: string;
  execute: (context: ICommandContext) => void;
  is_enabled: (context: ICommandContext) => boolean;
  label: string;
  /**
   * Default infinity (unassigned) if absolute, otherwise 0 (for relative ranks)
   */
  rank?: number;
  /**
   * Does the rank represent relative position in the LSP commands group? (default: true)
   */
  is_rank_relative?: boolean;
  /**
   * By default the command will be attached to the cell and file editor context menus.
   */
  attach_to?: Set<CommandEntryPoint>;
}

export interface ILSPFeature {
  is_registered: boolean;

  virtual_editor: VirtualEditor;
  virtual_document: VirtualDocument;
  connection: LSPConnection;
  jupyterlab_components: IJupyterLabComponentsManager;
  /**
   * Connect event handlers to the editor, virtual document and connection(s)
   */
  register(): void;
  /**
   * Will allow the user to disable specific functions
   */
  isEnabled(): boolean;
  /**
   * Remove event handlers on destruction
   */
  remove(): void;
  afterChange(
    change: CodeMirror.EditorChange, // TODO: provide an editor-diagnostic abstraction layer for EditorChange
    root_position: IRootPosition
  ): void;
}

export interface IEditorRange {
  start: IEditorPosition;
  end: IEditorPosition;
  editor: CodeMirror.Editor;
}

export class CodeMirrorLSPFeature implements ILSPFeature {
  public is_registered: boolean;
  protected readonly editor_handlers: Map<string, CodeMirrorHandler>;
  protected readonly connection_handlers: Map<string, any>;
  protected readonly wrapper_handlers: Map<string, any>;
  protected wrapper: HTMLElement;

  constructor(
    public virtual_editor: VirtualEditor,
    public virtual_document: VirtualDocument,
    public connection: LSPConnection,
    public jupyterlab_components: IJupyterLabComponentsManager
  ) {
    this.editor_handlers = new Map();
    this.connection_handlers = new Map();
    this.wrapper_handlers = new Map();
    this.is_registered = false;
  }

  register(): void {
    // register editor handlers
    for (let [event_name, handler] of this.editor_handlers) {
      this.virtual_editor.on(event_name, handler);
    }
    // register connection handlers
    for (let [event_name, handler] of this.connection_handlers) {
      this.connection.on(event_name, handler);
    }
    // register editor wrapper handlers
    this.wrapper = this.virtual_editor.getWrapperElement();
    for (let [event_name, handler] of this.wrapper_handlers) {
      this.wrapper.addEventListener(event_name, handler);
    }
    this.is_registered = true;
  }

  isEnabled() {
    // TODO - use settings
    return true;
  }

  /** Return JupyterLab commands to be registered;
   * intended for single-use in index.ts (during extension registration)
   */
  static readonly commands = new Array<IFeatureCommand>();

  /* Just a safeguard to enforce static commands in sub-classes */
  // @ts-ignore
  private commands: any;

  remove(): void {
    // unregister editor handlers
    for (let [event_name, handler] of this.editor_handlers) {
      this.virtual_editor.off(event_name, handler);
    }
    // unregister connection handlers
    for (let [event_name, handler] of this.connection_handlers) {
      this.connection.off(event_name, handler);
    }
    // unregister editor wrapper handlers
    for (let [event_name, handler] of this.wrapper_handlers) {
      this.wrapper.removeEventListener(event_name, handler);
    }
  }

  afterChange(
    change: CodeMirror.EditorChange,
    root_position: IRootPosition
  ): void {
    // nothing here, yet
  }

  protected range_to_editor_range(
    range: lsProtocol.Range,
    cm_editor?: CodeMirror.Editor
  ): IEditorRange {
    let start = PositionConverter.lsp_to_cm(range.start) as IVirtualPosition;
    let end = PositionConverter.lsp_to_cm(range.end) as IVirtualPosition;

    if (typeof cm_editor === 'undefined') {
      let start_in_root = this.transform_virtual_position_to_root_position(
        start
      );
      cm_editor = this.virtual_editor.get_editor_at_root_position(
        start_in_root
      );
    }

    return {
      start: this.virtual_document.transform_virtual_to_editor(start),
      end: this.virtual_document.transform_virtual_to_editor(end),
      editor: cm_editor
    };
  }

  protected position_from_mouse(event: MouseEvent): IRootPosition {
    return this.virtual_editor.coordsChar(
      {
        left: event.clientX,
        top: event.clientY
      },
      'window'
    ) as IRootPosition;
  }

  protected transform_virtual_position_to_root_position(
    start: IVirtualPosition
  ): IRootPosition {
    let cm_editor = this.virtual_document.virtual_lines.get(start.line).editor;
    let editor_position = this.virtual_document.transform_virtual_to_editor(
      start
    );
    return this.virtual_editor.transform_editor_to_root(
      cm_editor,
      editor_position
    );
  }

  protected get_cm_editor(position: IRootPosition) {
    return this.virtual_editor.get_cm_editor(position);
  }

  protected get_language_at(
    position: IEditorPosition,
    editor: CodeMirror.Editor
  ) {
    return editor.getModeAt(position).name;
  }

  protected extract_last_character(change: CodeMirror.EditorChange): string {
    if (change.origin === 'paste') {
      return change.text[0][change.text.length - 1];
    } else {
      return change.text[0][0];
    }
  }

  protected highlight_range(
    range: IEditorRange,
    class_name: string
  ): CodeMirror.TextMarker {
    return range.editor
      .getDoc()
      .markText(range.start, range.end, { className: class_name });
  }

  protected apply_edit(workspaceEdit: lsProtocol.WorkspaceEdit) {
    console.log(workspaceEdit);
    let current_uri = this.connection.getDocumentUri();
    // Specs: documentChanges are preferred over changes
    let changes = workspaceEdit.documentChanges
      ? workspaceEdit.documentChanges.map(
          change => change as lsProtocol.TextDocumentEdit
        )
      : toDocumentChanges(workspaceEdit.changes);
    for (let change of changes) {
      let uri = change.textDocument.uri;
      if (uri !== current_uri) {
        console.warn('Workspace-wide edits not implemented yet');
      } else {
        // TODO: show "Renamed X to Y in {change.edits.length} places" in statusbar;
        for (let edit of change.edits) {
          let start = PositionConverter.lsp_to_cm(edit.range.start);
          let end = PositionConverter.lsp_to_cm(edit.range.end);

          let start_editor = this.virtual_document.get_editor_at_virtual_line(
            start as IVirtualPosition
          );
          let end_editor = this.virtual_document.get_editor_at_virtual_line(
            end as IVirtualPosition
          );
          if (start_editor !== end_editor) {
            console.log('Edits not implemented for notebooks yet');
          } else {
            let doc = start_editor.getDoc();
            doc.replaceRange(edit.newText, start, end);
          }
        }
      }
    }
  }
}
