import LayerModel from '../../../../src/core/models/LayerModel';


describe('LayerModel', () => {
    describe('Defaults', () => {
        let layer;
        beforeEach(() => {
            layer = new LayerModel();
        });

        it('shall have the expected default values', () => {
            expect();
        });
    });


    describe('Validation', () => {
        let layer;
        let onInvalid;
        beforeEach(() => {
            layer = new LayerModel({
                identifier: "id",
                displayName: "name"
            });
            onInvalid = spy();

            layer.on("invalid", onInvalid)

        });

        it('should fail on invalid identifier', () => {
            layer.set({identifier: null});
            expect(onInvalid.called);
        });
    });
});
