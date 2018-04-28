import { Injectable } from '@angular/core';
import { ChartData } from './app.component';
import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/map';


export enum Trend {
  WAIT = 0,
  LONG = 1,
  SHORT = 2
}
export enum OrderStatus {
  CLOSE = 0,
  ACTIVE = 1
}

export class Position {
  open: number;
  close: number;
  profit: number;
  count: number;
  trend: Trend;
  status: OrderStatus;
  group: number;
  constructor(data) {
    this.open = data.open;
    this.close = data.close;
    this.profit = data.profit || 0;
    this.count = data.count || 0;
    this.trend = data.trend || Trend.WAIT;
    this.status = data.status;
    this.group = data.group;
  }
}

@Injectable()
export class AppService {
  public chartData: ChartData[];

  private positions: Position[] = [
    new Position({group: 1}),
    new Position({group: 2}),
  ];
  constructor(
    public http: HttpClient
  ) { }

  getAllPosition(group: number): Position[] {
    return this.positions.filter(val => val.group === group);
  }

  getCurrentPosition(group: number): Position {
    return this.positions.filter(val => val.group === group)[0];
  }

  getSumOpenPosition(group: number): number {
    const arr = this.positions
      .filter(val => val.trend !== Trend.WAIT)
      .filter(val => val.group === group)
      .filter(val => val.status === OrderStatus.ACTIVE)
      .map(val => val.count);

    return arr.length ? arr.reduce((acc, curr, i) => acc + curr) : 0;
  }

  trendIsLong(group: number): boolean {
    return !!this.positions
      .filter(val => val.trend !== Trend.WAIT)
      .filter(val => val.status === OrderStatus.ACTIVE)
      .filter(val => val.group === group)
      .filter(val => val.trend === Trend.LONG).length;
  }

  trendIsShort(group: number): boolean {
    return !!this.positions
      .filter(val => val.trend !== Trend.WAIT)
      .filter(val => val.status === OrderStatus.ACTIVE)
      .filter(val => val.group === group)
      .filter(val => val.trend === Trend.SHORT).length;
  }

  getFirstLong(group: number): Position {
    return this.positions
      .filter(val => val.trend === Trend.LONG)
      .filter(val => val.group === group)
      .filter(val => val.status === OrderStatus.ACTIVE).slice(-1)[0];
  }

  getFirstShort(group: number): Position {
    return this.positions
      .filter(val => val.trend === Trend.SHORT)
      .filter(val => val.group === group)
      .filter(val => val.status === OrderStatus.ACTIVE).slice(-1)[0];
  }

  getProfit(group: number): number {
    return this.positions
      .filter(val => val.group === group)
      .map(val => val.profit)
      .reduce((acc, curr, i) => acc + curr) || 0;
  }



  charts(): Observable<ChartData[]> {
    return this.http.get('assets/data/public_xmr_from_16.json')
      .map((val: ChartData[]) => this.chartData = val) as Observable<ChartData[]>;
  }

  openPosition(price, count, trend: Trend, group: number): void {
    this.positions.unshift(
      new Position({
        open: price,
        count, trend,
        status: OrderStatus.ACTIVE,
        group
      })
    );
  }

  closePosition(order: Position, price) {
    order.status = OrderStatus.CLOSE;
    order.close = price;
    const multiply = order.trend === Trend.LONG ? 1 : -1;
    order.profit = (order.close - order.open) * multiply;

    this.positions.unshift(
      new Position({
        open: price,
        status: OrderStatus.CLOSE
      })
    );
  }

}
