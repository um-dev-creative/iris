// Complementa la configuración de `@angular/build:unit-test` (ver angular.json): solo lo que el builder no expone.
export default {
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/frontend',
    },
  },
};
