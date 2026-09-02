import { Directive, ElementRef, OnInit, OnDestroy, Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appTeleportToBody]',
  standalone: true
})
export class TeleportToBodyDirective implements OnInit, OnDestroy {
  private isBrowser: boolean;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser && typeof document !== 'undefined' && document.body) {
      this.renderer.appendChild(document.body, this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.el.nativeElement && this.el.nativeElement.parentNode) {
      this.renderer.removeChild(this.el.nativeElement.parentNode, this.el.nativeElement);
    }
  }
}
