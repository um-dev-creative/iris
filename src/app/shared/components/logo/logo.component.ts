import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Marca de Iris: un ojo que también es un globo de mensaje, porque la plataforma vigila campañas de mensajería. El aro
 * del iris tiene un tramo abierto que, con `animated`, gira despacio como un barrido de radar. Toma el color de
 * `currentColor`, así que quien la usa decide el fondo y el tono. Es decorativa: el nombre siempre acompaña en texto.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
      class="block"
      [attr.width]="size()"
      [attr.height]="size()">
      <path
        stroke-width="2"
        stroke-linejoin="round"
        d="M2.5 14.5C6.5 8 11 5.5 16 5.5s9.5 2.5 13.5 9c-4 6.5-8.5 9-13.5 9-1.9 0-3.7-.4-5.4-1.1L5.5 27l.8-6.6c-1.4-1.5-2.6-3.5-3.8-5.9Z" />
      <g transform="rotate(-20 16 14.5)">
        <circle
          class="iris-sweep"
          [class.iris-sweep--on]="animated()"
          cx="16"
          cy="14.5"
          r="4.6"
          stroke-width="1.9"
          stroke-dasharray="21.5 7.4" />
      </g>
      <circle cx="16" cy="14.5" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .iris-sweep--on {
      transform-origin: 16px 14.5px;
      animation: iris-sweep 12s linear infinite;
    }
    @keyframes iris-sweep {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .iris-sweep--on {
        animation: none;
      }
    }
  `,
})
export class AppLogoComponent {
  readonly size = input(24);
  readonly animated = input(false);
}
