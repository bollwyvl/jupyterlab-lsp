import { expect } from 'chai';
import { TextMarker } from 'codemirror';
import { Diagnostics } from './diagnostics';
import { FeatureTestEnvironment } from '../testutils';

describe('CodeMirrorAdapterExtension', () => {
  let env: FeatureTestEnvironment;

  beforeEach(() => (env = new FeatureTestEnvironment()));
  afterEach(() => env.dispose());

  describe('Works with VirtualFileEditor', () => {
    let feature: Diagnostics;

    beforeEach(() => (feature = env.init_feature(Diagnostics)));
    afterEach(() => env.dispose_feature(feature));

    it('calls parent register()', () => {
      feature.register();
      expect(feature.is_registered).to.equal(true);
    });

    it('renders inspections', async () => {
      env.ce_editor.model.value.text = ' foo \n bar \n baz ';
      await env.virtual_editor.update_documents();

      let markers: TextMarker[];

      markers = env.ce_editor.editor.getDoc().getAllMarks();
      expect(markers.length).to.equal(0);

      feature.handleDiagnostic({
        uri: 'file://foo/dummy.py',
        diagnostics: [
          {
            range: {
              start: { line: 0, character: 1 },
              end: { line: 0, character: 4 }
            },
            message: 'Undefined symbol'
          }
        ]
      });

      let marks = env.ce_editor.editor.getDoc().getAllMarks();
      expect(marks.length).to.equal(1);
    });
  });
});
