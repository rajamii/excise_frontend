
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.scss',
  standalone: true,
  imports: [ CommonModule ]
})

export class CarouselComponent{
  
  slides = [
    {
      src: 'assets/images/carousel/carousel2.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
    {
      src: 'assets/images/carousel/carousel4.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
    {
      src: 'assets/images/carousel/carousel5.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
    {
      src: 'assets/images/carousel/carousel6.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
    {
      src: 'assets/images/carousel/carousel8.jpg',
      title: 'State Excise',
      subtitle: 'Ensuring Public Health through Regulation and Intelligence, Enforcement Measures'
    },
  ];

}
