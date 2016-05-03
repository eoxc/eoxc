import babelWebpackBoilerplate from '../../src/eoxc';

describe('babelWebpackBoilerplate', () => {
    describe('Greet function', () => {
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
