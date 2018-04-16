import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/interval';
import { AppService, OrderStatus, Position, Trend } from './app.service';
import { isUndefined } from 'util';


export class ChartData {
  date: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  quoteVolume: number;
  weightedAverage: number;
}



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public money = 10000;
  // public listTE = this.service.getAllPosition(1);
  // public listMA = this.service.getAllPosition(2);
  public profit: number;
  public maxPosa = 0;
  public MA: number;

  private params = {
    step: 3,
    spread: .3,
    tax: .5,
    limit: 10,
    MA: 156,
  };

  public candle: ChartData = new ChartData();

  constructor(
    private service: AppService
  ) {}

  get listTE() {
    return this.service.getAllPosition(1);
  }
  get listMA() {
    return this.service.getAllPosition(2);
  }
  get chart(): ChartData[] {
    return this.service.chartData;
  }
  get chartDate() {
    return new Date().setTime(this.candle.date * 1000);
  }

  sumAllPositions(group: number): number {
    return this.service.getSumOpenPosition(group);
  }

  getPosa(group: number): Position {
    return this.service.getCurrentPosition(group);
  }

  ngOnInit() {
    let i = 0;
    this.service.charts().subscribe(val => {
      Observable.interval(0).subscribe(() => {
        this.cycle(this.candle = val[++i], i);
      });
    });
  }


  cycle(candle: ChartData, i: number) {
    this.profit = this.service.profit;
    if (!this.service.getSumOpenPosition(1)) {
      if (isUndefined(this.getPosa(1).open)) {
        this.getPosa(1).open = candle.close;
        this.getPosa(1).status = OrderStatus.CLOSE;

        this.getPosa(2).open = candle.close;
        this.getPosa(2).status = OrderStatus.CLOSE;

        return;
      }
    }
    this.MA = this.getAverageByCandle(i, this.params.MA);
    this.viewDirection(candle, i);
  }

  viewDirection(candle: ChartData, i: number) {
    const isLong: boolean = this.service.trendIsLong(1);
    if (this.sumAllPositions(1) > this.maxPosa) this.maxPosa = this.sumAllPositions(1);

    if (''.length) {
      if (this.more(candle, isLong)) {
        if (isLong && !!this.service.getSumOpenPosition(1)) {
          return this.service.closePosition(
            this.service.getFirstLong(1),
            this.priceToOpen(true, true),
          );
        } else {
          if (this.sumAllPositions(1) < this.params.limit) {
            return this.service.openPosition(
              this.priceToOpen(true, false),
              1,
              Trend.SHORT,
              1
            );
          } else {
            return this.service.openPosition(
              this.priceToOpen(true, false),
              1,
              Trend.WAIT,
              1
            );
          }
        }
      }

      if (this.less(candle, isLong)) {
        if (!isLong && !!this.service.getSumOpenPosition(1)) {
          return this.service.closePosition(
            this.service.getFirstShort(1),
            this.priceToOpen(false, true),
          );
        } else {

          if (this.sumAllPositions(1) < this.params.limit) {
            return this.service.openPosition(
              this.priceToOpen(false, false),
              1,
              Trend.LONG,
              1
            );
          } else {
            return this.service.openPosition(
              this.priceToOpen(false, false),
              1,
              Trend.WAIT,
              1
            );
          }

        }
      }
    }



    // For Moving Average
    const isLongMA: boolean = this.service.trendIsLong(2);
    const isShortMA: boolean = this.service.trendIsShort(2);

    if (this.upOfAverage(candle, i)) {
      if (!this.sumAllPositions(2)) {
        return this.service.openPosition(
          candle.open,
          10,
          Trend.LONG,
          2
        );
      }
      if (isShortMA) {
        this.service.closePosition(
          this.service.getFirstShort(2),
          candle.open
        );
        this.service.openPosition(
          candle.open,
          10,
          Trend.LONG,
          2
        );
      }
    }
    if (this.downOfAverage(candle, i)) {
      if (!this.sumAllPositions(2)) {
        return this.service.openPosition(
          candle.open,
          10,
          Trend.SHORT,
          2
        );
      }
      if (isLongMA) {
        this.service.closePosition(
          this.service.getFirstLong(2),
          candle.open
        );
        this.service.openPosition(
          candle.open,
          10,
          Trend.SHORT,
          2
        );
      }
    }
  }


  private more(candle: ChartData, split: boolean): boolean {
    return this.priceToOpen(true, split) < candle.high + this.spread(this.priceToOpen(true, split));
  }

  private less(candle: ChartData, split: boolean): boolean {
    return this.priceToOpen(false, split) > candle.low + this.spread(this.priceToOpen(false, split));
  }

  private priceToOpen(more: boolean, split: boolean): number {
    const multiply = more ? 1 : -1;
    return this.getPosa(1).open + (this.difference(this.getPosa(1).open, split) * multiply);
  }


  private difference(price: number, split: boolean): number {
    const multiply = split ? 1 : 1;

    return price / 100 * (this.params.step / multiply);
  }

  private spread(price: number): number {
    return price / 100 * this.params.spread;
  }

  private upOfAverage(candle: ChartData, i: number): boolean {
    if (this.getAverageByCandle(i, this.params.MA) === 0) return;
    return this.getAverageByCandle(i, 36) > this.getAverageByCandle(i, this.params.MA);
  }

  private downOfAverage(candle: ChartData, i: number): boolean {
    if (this.getAverageByCandle(i, this.params.MA) === 0) return;
    return this.getAverageByCandle(i, 36) < this.getAverageByCandle(i, this.params.MA);
  }

  private getAverageByCandle(to: number, candle: number): number {
    const data = this.chart.slice((to - candle), to).map(val => val.close);

    return data.length ? data.reduce((acc, curr, i) => acc + curr) / candle : 0;
  }
}
