import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CartService } from '../../services/cart.service';
import { Gene, Transcript } from '../../interfaces';

@Component({
  selector: 'app-add-to-cart-button',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <button (click)="addToCart($event)"
            [matTooltip]="'Add to Cart'"
            class="add-to-cart-btn">
      <mat-icon>add_shopping_cart</mat-icon>
    </button>
  `,
  styles: [`
    .add-to-cart-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--accent-color, #9d3ce7ff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      min-width: 0;
      transition: transform 0.2s ease-in-out;
    }
    .add-to-cart-btn:hover {
      transform: scale(1.15);
    }
    .add-to-cart-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class AddToCartButtonComponent {
  private cartService = inject(CartService);

  id = input<string>();
  symbol = input<string>();
  entity = input<Gene | Transcript>();

  addToCart(event: MouseEvent) {
    event.stopPropagation();

    if (this.entity()) {
      this.cartService.add(this.entity()!);
      return;
    }

    const ensemblID = this.id();
    if (!ensemblID) return;

    const symbol = this.symbol();

    if (ensemblID.startsWith('ENSG')) {
      this.cartService.add({
        ensg_number: ensemblID,
        gene_symbol: symbol
      } as Gene);
    } else {
      this.cartService.add({
        enst_number: ensemblID,
        gene: { gene_symbol: symbol || ensemblID, ensg_number: '' }
      } as Transcript);
    }
  }
}
