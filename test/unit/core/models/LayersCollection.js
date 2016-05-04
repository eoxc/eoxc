import LayersCollection from '../../../../src/core/models/LayersCollection';
import LayerModel from '../../../../src/core/models/LayerModel';



describe('Layers', () => {
    describe('Layer inclusion', () => {
        let layers;
        let onAdded;
        beforeEach(() => {
            layers = new LayersCollection();
            onAdded = spy();

            layers.on("add", onAdded)

            layers.add({identifier: "id"});
        });

        it('onAdded should have been called', () => {
            expect(onAdded.called);
        });

        it('the layer shall be found with "getLayerById"', () => {
            expect(layers.getLayerById("id")).not.to.equal(new LayerModel({identifier: "id"}));
        });
    });
});
