import { TestBed } from '@angular/core/testing';
import { TrendSparkComponent } from './trend-spark.component';

function render(values: number[], max: number | null = null) {
  const fixture = TestBed.createComponent(TrendSparkComponent);
  fixture.componentRef.setInput('values', values);
  fixture.componentRef.setInput('max', max);
  fixture.detectChanges();
  return { fixture, spark: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('TrendSparkComponent', () => {
  it('dibuja la línea con un punto en el último valor, de 0 al mayor', () => {
    const { spark, el } = render([0, 5, 10]);

    expect(el.querySelector('[data-testid="spark-line"]')?.getAttribute('d')).toMatch(/^M/);
    expect(spark.points()[0].y).toBe(35);
    expect(spark.last()!.y).toBe(5);
    expect(spark.area()).toMatch(/Z$/);
    expect(el.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('con un máximo dado no se sale de la escala', () => {
    const { spark } = render([0.5, 2], 1);

    expect(spark.points()[0].y).toBe(20);
    expect(spark.points()[1].y).toBe(5);
  });

  it('con menos de dos valores no dibuja nada; todo en cero queda en la base', () => {
    expect(render([3]).el.querySelector('svg')).toBeNull();
    expect(render([0, 0]).spark.points().map((p) => p.y)).toEqual([35, 35]);
    expect(render([]).spark.last()).toBeNull();
    expect(render([1, 2]).spark.css('')).toBeNull();
  });
});
