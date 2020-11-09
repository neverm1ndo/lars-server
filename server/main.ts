import API from './api.server';
// import Auth from './auth.server';
import Logo from './shared/logo';

(function main(): void {
  Logo.print();
  let api = new API(process.argv.includes('--first-launch'));
      api.init();
  // let auth = new Auth();
  //     auth.init();
})();
