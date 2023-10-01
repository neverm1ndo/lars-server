export namespace Statsman {
  
  export interface CurrentMetricsSnapshot {
    [key: string]: number;
  }
  
  export abstract class Metric {

    constructor() {
      this.onInit();
    }
    
    public snapshot: CurrentMetricsSnapshot = {};
   
    get nowTime(): Date {
      return new Date();
    }
    
    public inc(key: string): void {
      this.snapshot[key]++;
    };
    
    public dec(key: string): void {
      if (this.snapshot[key] <= 0) return;
      this.snapshot[key]--;
    }

    public onInit() {}
  }
}

export default Statsman;
