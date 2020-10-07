import API from './api.server';
import Logo from './shared/logo';

(function main(): void {
  Logo.print();
  let api = new API();
      api.init();
})();
