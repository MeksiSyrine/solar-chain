import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({ providedIn: "root" })
export class UiStateService {
  readonly pendingTxCount$ = new BehaviorSubject<number>(0);
  readonly isTxPending$ = new BehaviorSubject<boolean>(false);

  beginTx() {
    const next = this.pendingTxCount$.value + 1;
    this.pendingTxCount$.next(next);
    this.isTxPending$.next(next > 0);
  }

  endTx() {
    const next = Math.max(0, this.pendingTxCount$.value - 1);
    this.pendingTxCount$.next(next);
    this.isTxPending$.next(next > 0);
  }
}
