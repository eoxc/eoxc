import Layers from '../../src/core/models/layers';

describe('Layers', () => {
    describe('Greet function', () => {
        let layers = new Layers();
        beforeEach(() => {
            spy(babelWebpackBoilerplate, 'greet');
            babelWebpackBoilerplate.greet();
        });

        it('should have been run once', () => {
            expect(babelWebpackBoilerplate.greet).to.have.been.calledOnce;
        });

        it('should have always returned hello', () => {
            expect(babelWebpackBoilerplate.greet).to.have.always.returned('hello');
        });
    });
});
