import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class CarouselComponent {
  slides = [
    {
      webp: 'assets/images/carousel/carousel2.webp',
      src: 'assets/images/carousel/carousel2.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
    {
      webp: 'assets/images/carousel/carousel4.webp',
      src: 'assets/images/carousel/carousel4.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
    {
      webp: 'assets/images/carousel/carousel5.webp',
      src: 'assets/images/carousel/carousel5.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
    {
      webp: 'assets/images/carousel/carousel6.webp',
      src: 'assets/images/carousel/carousel6.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
    {
      webp: 'assets/images/carousel/carousel8.webp',
      src: 'assets/images/carousel/carousel8.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
  ];
}
