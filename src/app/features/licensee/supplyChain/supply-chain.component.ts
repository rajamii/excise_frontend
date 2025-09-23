import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-supply-chain',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain.component.html',
  styleUrls: ['./supply-chain.component.scss']
})
export class SupplyChainComponent {
  title = 'Supply Chain Management - Live Development!';
  
  constructor() {
    console.log('Supply Chain Component initialized');
  }
}
