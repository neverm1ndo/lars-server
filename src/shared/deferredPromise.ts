export class DeferredPromise {
    public promise: Promise<any>;
    public resolve: any;
    public reject: any;
  
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      });
    }
  }