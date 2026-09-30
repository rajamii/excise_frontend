import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-footer',
  imports: [MatButtonModule, MatMenuModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  selectedLink: string = '';

  constructor(private router: Router) {}

  navigateTo(page: string) {
    this.router.navigate(['/info', page]);
  }
}
