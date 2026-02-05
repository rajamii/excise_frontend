import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-unified-supply-chain-view',
    standalone: true,
    imports: [CommonModule],
    template: `<div>Test Component</div>`,
    styleUrls: ['./unified-supply-chain-view.component.scss']
})
export class UnifiedSupplyChainViewComponent implements OnInit {
    ngOnInit(): void {
        console.log('Component initialized');
    }
}