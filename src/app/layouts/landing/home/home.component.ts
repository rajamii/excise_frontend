import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MaterialModule } from '../../../shared/material.module';
import { MarkdownModule } from 'ngx-markdown';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WhatsCurrentService } from '../../../core/services/whats-current.service';
import { InfoPagesService } from '../../../core/services/info-pages.service';
import { PreventiveRaidsService } from '../../../core/services/preventive-raids.service';
import { PreventiveRaid } from '../../../core/models/preventive-raids.model';
import { environment } from '../../../../environments/environment';

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number; // 2D rotation angle
  vrx: number; // 2D rotation speed
  type: 'box' | 'barrel' | 'bottle' | 'glass' | 'can' | 'truck' | 'rupee' | 'number';
  color: string;
  scale: number;
  textVal?: string;
  isFollower?: boolean;
  orbitAngle?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
}

@Component({
  selector: 'app-home',
  imports: [MaterialModule, MarkdownModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pillsScroll') pillsScroll!: ElementRef<HTMLDivElement>;

  selectedLink: string = '';
  markdownContent: string = '';
  aboutUsRecords: { title: string; content: string }[] = [];
  aboutUsIndex: number = 0;
  isBrowser: boolean;
  selectedHomeCategory: string = 'all';
  allNotifications: any[] = [];
  bulletNotifications: any[] = []; // marquee ticker items
  preventiveRaids: PreventiveRaid[] = [];
  selectedRaidIndex = 0;
  currentImageIndex = 0;
  slideshowInterval: any;
  revenueData: any[] = [];
  showLicenseBanner = false;
  latestLicenseInfo: any = null;
  activeLicenseInfos: any[] = [];
  currentLicenseInfoIndex = 0;

  truncateWords(text: string, limit: number): string {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= limit) return text;
    return words.slice(0, limit).join(' ') + '...';
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  renderBold(text: string): SafeHtml {
    if (!text) return '';
    // Escape HTML first to prevent XSS, then convert **...** to <b>...</b>
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Replace complete **...** pairs, strip leftover lone ** markers, then newlines → <br>
    const html = escaped
      .replace(/\*\*(.+?)\*\*/gs, '<b>$1</b>')
      .replace(/\*\*/g, '')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Truncate by plain-text length then render bold — avoids cutting inside ** markers
  renderBoldTruncated(text: string, maxLength: number): SafeHtml {
    if (!text) return '';
    // Step 1: escape HTML
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Step 2: convert ALL complete **...** pairs first (before truncating), then newlines → <br>
    const withBold = escaped.replace(/\*\*(.+?)\*\*/gs, '<b>$1</b>').replace(/\*\*/g, '').replace(/\n/g, '<br>');
    // Step 3: strip HTML tags to measure plain-text length, then truncate the HTML
    const plainText = withBold.replace(/<[^>]*>/g, '');
    if (plainText.length <= maxLength) {
      return this.sanitizer.bypassSecurityTrustHtml(withBold);
    }
    // Truncate by walking the HTML and counting only visible characters
    let count = 0;
    let result = '';
    let inTag = false;
    for (let i = 0; i < withBold.length; i++) {
      const ch = withBold[i];
      if (ch === '<') { inTag = true; }
      if (!inTag) { count++; }
      result += ch;
      if (ch === '>') { inTag = false; }
      if (count >= maxLength) { result += '...'; break; }
    }
    // Close any unclosed <b> tags
    const openBolds = (result.match(/<b>/g) || []).length;
    const closeBolds = (result.match(/<\/b>/g) || []).length;
    if (openBolds > closeBolds) { result += '</b>'; }
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  // 3D/Parallax Canvas engine properties
  private animationFrameId?: number;
  private resizeListener?: () => void;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseXRaw: number = 0;
  private mouseYRaw: number = 0;
  private particles: Particle3D[] = [];

  constructor(
    private router: Router, 
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private whatsCurrentService: WhatsCurrentService,
    private infoPagesService: InfoPagesService,
    private raidsService: PreventiveRaidsService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadMarkdown();
    this.loadNotifications();
    this.loadRaids();
    this.loadRevenueData();
  }

  get displayedNotifications(): any[] {
    let items: any[];

    if (this.selectedHomeCategory === 'all') {
      items = [...this.allNotifications];
    } else {
      items = this.allNotifications.filter(item => item.category === this.selectedHomeCategory);
    }

    return items.slice(0, 6);
  }

  filterHomeCategory(cat: string): void {
    this.selectedHomeCategory = cat;
  }

  loadNotifications(): void {
    this.whatsCurrentService.getWhatsCurrent().subscribe({
      next: (data) => {
        const activeData = (data || []).filter(item => item.isActive !== false);
        // Sort by ID or date to show first entered items first
        const sortedData = activeData.sort((a, b) => {
          // Primary: sort by ID (ascending)
          if (a.id && b.id) return a.id - b.id;
          // Secondary: sort by date (ascending - oldest first)
          if (a.date && b.date) {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          }
          return 0;
        });
        
        const mapped = sortedData.map(item => ({
          title: item.title,
          date: item.date,
          category: item.category,
          message: item.message,
          link: item.file ? (String(item.file).startsWith('http') ? item.file : `${environment.apiBaseUrl}${item.file}`) : ''
        }));
        
        // Extract bullet notifications and truncate to 300 words
        this.bulletNotifications = mapped.filter(i => i.category === 'bullet').map(item => {
          if (item.message) {
            item.message = this.truncateWords(item.message, 300);
          }
          if (item.title) {
            item.title = this.truncateWords(item.title, 300);
          }
          return item;
        });

        // Store other notifications (already sorted)
        this.allNotifications = mapped.filter(i => i.category !== 'bullet');

        // Extract the active License Info updates for the landing banner slider
        const licenseRecords = (data || []).filter(item => item.category === 'license' && item.isActive !== false);
        if (licenseRecords && licenseRecords.length > 0) {
          const sortedLicense = [...licenseRecords].sort((a, b) => {
            // ascending by ID → first entered record shows first
            if (a.id && b.id) return a.id - b.id;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });
          
          this.activeLicenseInfos = sortedLicense.map(item => ({
            id: item.id,
            title: item.title,
            date: item.date,
            message: item.message,
            link: item.file ? (String(item.file).startsWith('http') ? item.file : `${environment.apiBaseUrl}${item.file}`) : ''
          }));
          
          this.currentLicenseInfoIndex = 0;
          const latest = this.activeLicenseInfos[0];
          this.latestLicenseInfo = latest;

          // Check if this specific notification was already dismissed using sessionStorage
          const dismissedId = sessionStorage.getItem('dismissedLicenseBanner');
          // Show banner only if it hasn't been dismissed in this browser session
          if (!dismissedId || dismissedId !== String(latest.id)) {
            this.showLicenseBanner = true;
          }
        }
      },
      error: (err) => {
        console.error('Failed to load notifications dynamically:', err);
      }
    });
  }

  scrollPills(amount: number): void {
    if (this.pillsScroll) {
      this.pillsScroll.nativeElement.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  closeLicenseBanner(): void {
    this.showLicenseBanner = false;
    // Store the dismissed notification ID of the most recent item in sessionStorage
    const latestId = this.activeLicenseInfos?.[0]?.id || this.latestLicenseInfo?.id;
    if (latestId) {
      sessionStorage.setItem('dismissedLicenseBanner', String(latestId));
    } else {
      sessionStorage.setItem('dismissedLicenseBanner', 'dismissed');
    }
  }

  prevLicenseInfo(event?: Event): void {
    event?.stopPropagation();
    if (this.activeLicenseInfos.length <= 1) return;
    this.currentLicenseInfoIndex = (this.currentLicenseInfoIndex - 1 + this.activeLicenseInfos.length) % this.activeLicenseInfos.length;
    this.latestLicenseInfo = this.activeLicenseInfos[this.currentLicenseInfoIndex];
  }

  nextLicenseInfo(event?: Event): void {
    event?.stopPropagation();
    if (this.activeLicenseInfos.length <= 1) return;
    this.currentLicenseInfoIndex = (this.currentLicenseInfoIndex + 1) % this.activeLicenseInfos.length;
    this.latestLicenseInfo = this.activeLicenseInfos[this.currentLicenseInfoIndex];
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.init3DBackground();
  }

  ngOnDestroy(): void {
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
    }
    if (!this.isBrowser) return;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.mouseMoveListener) {
      window.removeEventListener('mousemove', this.mouseMoveListener);
    }
  }

  loadMarkdown(): void {
    this.infoPagesService.getAboutUs().subscribe({
      next: (records) => {
        this.aboutUsRecords = (records || [])
          .filter(r => r.content)
          .sort((a, b) => {
            // Sort by ID (ascending) to show first entered record first
            // If no ID, sort by title
            if (a.id && b.id) return a.id - b.id;
            return (a.title || '').localeCompare(b.title || '');
          })
          .map(r => ({ title: r.title || 'About Us', content: r.content }));

        if (this.aboutUsRecords.length > 0) {
          this.aboutUsIndex = 0;
          this.markdownContent = this.aboutUsRecords[0].content;
        } else {
          this.markdownContent = '*Content not available.*';
        }
      },
      error: () => {
        this.markdownContent = '*Content not available.*';
      }
    });
  }

  prevAboutUs(): void {
    if (this.aboutUsIndex > 0) {
      this.aboutUsIndex--;
      this.markdownContent = this.aboutUsRecords[this.aboutUsIndex].content;
    }
  }

  nextAboutUs(): void {
    if (this.aboutUsIndex < this.aboutUsRecords.length - 1) {
      this.aboutUsIndex++;
      this.markdownContent = this.aboutUsRecords[this.aboutUsIndex].content;
    }
  }

  navigateToExternal(url: string) {
    window.location.href = url;
  }  

  navigateTo(page: string) {
    this.router.navigate(['/home', page]);
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  private init3DBackground(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle canvas sizing
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    this.resizeListener = () => resize();
    window.addEventListener('resize', this.resizeListener);
    resize();

    // Initialize raw mouse coordinates to center of screen
    this.mouseXRaw = canvas.width / 2;
    this.mouseYRaw = canvas.height / 2;

    // Track mouse coordinates for parallax and attraction
    this.mouseMoveListener = (e: MouseEvent) => {
      this.mouseXRaw = e.clientX;
      this.mouseYRaw = e.clientY;
    };
    window.addEventListener('mousemove', this.mouseMoveListener);

    // Highly visible glowing colors (neon HSL palettes)
    const colors = [
      'rgba(40, 60, 240, ',   // Vibrant Electric Blue
      'rgba(245, 110, 11, ',  // Bright Glowing Orange
      'rgba(99, 102, 241, ',  // Neon Violet/Indigo
      'rgba(6, 182, 212, ',   // Glowing Teal/Cyan
      'rgba(16, 185, 129, ',
      'rgba(234, 179, 8, ',    // Bright Gold   // Bright Emerald Green
    ];

    const numbersList = ['QUARTER', 'ML', 'SPIRIT', 'ML', 'BL', 'GOV', 'BARREL', 'VOL', 'SIKKIM', 'EXCISE'];

    const particleTypes: ('box' | 'barrel' | 'bottle' | 'glass' | 'can' | 'truck' | 'rupee' | 'number')[] = [
      'box', 'barrel', 'bottle', 'glass', 'can', 'truck', 'rupee', 'number'
    ];

    // Generate the remaining 125 regular background particles drifting freely
    const bgCount = 125;
    for (let i = 0; i < bgCount; i++) {
      const type = particleTypes[i % particleTypes.length];
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      const particle: Particle3D = {
        x: (Math.random() - 0.5) * canvas.width * 1.5,
        y: (Math.random() - 0.5) * canvas.height * 1.5,
        z: Math.random() * 600 + 150,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        vz: (Math.random() - 0.5) * 0.25,
        rx: Math.random() * Math.PI * 2,
        vrx: (Math.random() - 0.5) * 0.015,
        type: type,
        color: colorBase,
        scale: type === 'truck' ? 36 : type === 'rupee' ? 32 : type === 'number' ? 1.0 : 28,
        isFollower: false
      };

      if (type === 'number') {
        particle.textVal = numbersList[Math.floor(Math.random() * numbersList.length)];
        particle.scale = 14 + Math.random() * 8;
      }

      this.particles.push(particle);
    }

    const focalLength = 350;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Sort particles by Z-depth (painters algorithm) so back elements render first
      this.particles.sort((a, b) => b.z - a.z);

      for (const p of this.particles) {
        const depthRatio = 1 - (p.z - 150) / 600;
        const projScale = focalLength / p.z;

        // Regular background particles drift freely
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.rx += p.vrx;

        // Wrap around screen boundaries
        const xLimit = canvas.width * 0.75 + 100;
        const yLimit = canvas.height * 0.75 + 100;

        if (p.x < -xLimit) p.x = xLimit;
        if (p.x > xLimit) p.x = -xLimit;
        if (p.y < -yLimit) p.y = yLimit;
        if (p.y > yLimit) p.y = -yLimit;
        if (p.z < 150) p.z = 750;
        if (p.z > 750) p.z = 150;

        // Project center of object to screen (no camera parallax offsets!)
        const wx = p.x;
        const wy = p.y;
        const wz = p.z;

        if (wz <= 50) continue; 

        const screenCenterX = centerX + wx * projScale;
        const screenCenterY = centerY + wy * projScale;

        // Fades out only at the extreme top/bottom edges of the window to look clean
        let edgeFade = 1.0;
        if (screenCenterY < 60) {
          edgeFade = Math.max(0, screenCenterY / 60);
        } else if (screenCenterY > canvas.height - 60) {
          edgeFade = Math.max(0, (canvas.height - screenCenterY) / 60);
        }

        const opacity = (0.24 + depthRatio * 0.46) * edgeFade;
        if (opacity <= 0.01) continue;

        const colorWithAlpha = p.color + opacity.toFixed(3) + ')';
        const solidShadowColor = p.color.replace('rgba', 'rgb').split(',').slice(0, 3).join(',') + ')';

        // Draw 2D Vector Icon
        ctx.save();
        ctx.translate(screenCenterX, screenCenterY);
        ctx.rotate(p.rx);

        ctx.strokeStyle = colorWithAlpha;
        ctx.lineWidth = 1.8 + depthRatio * 1.8;
        ctx.shadowColor = solidShadowColor;
        ctx.shadowBlur = 10 * depthRatio;

        if (p.type === 'number') {
          ctx.rotate(-p.rx); // keep text upright
          const fontSize = Math.max(9, p.scale * projScale);
          ctx.font = `900 ${fontSize.toFixed(1)}px 'Outfit', 'Segoe UI', Roboto, sans-serif`;
          ctx.fillStyle = colorWithAlpha;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.textVal!, 0, 0);
        } else {
          draw2DIcon(ctx, p.type, p.scale * projScale);
        }

        ctx.restore();
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  loadRaids(): void {
    this.raidsService.getPreventiveRaids().subscribe({
      next: (data) => {
        // Sort by ID (ascending) to show first entered raid first
        this.preventiveRaids = (data || []).sort((a, b) => {
          if (a.id && b.id) return a.id - b.id;
          // If no ID, sort by date
          if (a.created_at && b.created_at) {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
          return (a.title || '').localeCompare(b.title || '');
        });
        this.selectedRaidIndex = 0;
        this.startSlideshow();
      },
      error: (err) => {
        console.error('Failed to load preventive raids:', err);
      }
    });
  }

  startSlideshow(): void {
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
    }
    this.slideshowInterval = setInterval(() => {
      this.nextSlide();
    }, 6000);
  }

  nextSlide(): void {
    const activeRaid = this.preventiveRaids[this.selectedRaidIndex];
    if (activeRaid && activeRaid.images && activeRaid.images.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % activeRaid.images.length;
    }
  }

  prevSlide(): void {
    const activeRaid = this.preventiveRaids[this.selectedRaidIndex];
    if (activeRaid && activeRaid.images && activeRaid.images.length > 0) {
      this.currentImageIndex = (this.currentImageIndex - 1 + activeRaid.images.length) % activeRaid.images.length;
    }
  }

  selectRaid(index: number): void {
    this.selectedRaidIndex = index;
    this.currentImageIndex = 0;
    this.startSlideshow();
  }

  getRaidImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http') || imagePath.startsWith('assets/')) {
      return imagePath;
    }
    return `${environment.apiBaseUrl}${imagePath}`;
  }

  loadRevenueData(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/transactional/payment-gateway/revenue-receipts/`).subscribe({
      next: (data) => {
        this.revenueData = data;
      },
      error: (err) => {
        console.error('Failed to load revenue data:', err);
      }
    });
  }

  selectedUnit: 'crores' | 'lakhs' = 'crores';
  currentChartPageIndex = 0;

  public getVisibleRevenueData(): any[] {
    const pageSize = 4;
    const start = this.currentChartPageIndex * pageSize;
    return this.revenueData ? this.revenueData.slice(start, start + pageSize) : [];
  }

  public hasPrevChartPage(): boolean {
    return this.currentChartPageIndex > 0;
  }

  public hasNextChartPage(): boolean {
    const pageSize = 4;
    return this.revenueData ? (this.currentChartPageIndex + 1) * pageSize < this.revenueData.length : false;
  }

  public prevChartPage(): void {
    if (this.hasPrevChartPage()) {
      this.currentChartPageIndex--;
    }
  }

  public nextChartPage(): void {
    if (this.hasNextChartPage()) {
      this.currentChartPageIndex++;
    }
  }

  public getDisplayValue(val: number): number {
    const divisor = this.selectedUnit === 'lakhs' ? 100000.0 : 10000000.0;
    return Math.round((val / divisor) * 100) / 100;
  }

  public getChartMaxLimit(): number {
    if (!this.revenueData || this.revenueData.length === 0) {
      return 300;
    }
    const maxAmount = Math.max(...this.revenueData.map(d => d.amount || 0));
    const divisor = this.selectedUnit === 'lakhs' ? 100000.0 : 10000000.0;
    const maxVal = maxAmount / divisor;
    
    // Round up to next multiple of 50 or 2 depending on unit
    if (this.selectedUnit === 'lakhs') {
      const limit = Math.ceil((maxVal + 50) / 50) * 50;
      return Math.max(1000, limit); // Minimum 1000 Lakhs (10 Crores)
    } else {
      const limit = Math.ceil((maxVal + 2) / 2) * 2;
      return Math.max(10, limit); // Minimum 10 Crores
    }
  }

  public getYAxisLabels(): string[] {
    const limit = this.getChartMaxLimit();
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      let val = limit * (i / 6);
      labels.push(Math.round(val).toLocaleString('en-IN'));
    }
    return labels;
  }

  public getBarHeightPercentage(amount: number): number {
    const limit = this.getChartMaxLimit();
    const divisor = this.selectedUnit === 'lakhs' ? 100000.0 : 10000000.0;
    const val = amount / divisor;
    return (val / limit) * 100;
  }

  public getPaginationPages(): number[] {
    if (!this.revenueData) return [];
    const totalPages = Math.ceil(this.revenueData.length / 4);
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  public getMathCeil(val: number): number {
    return Math.ceil(val);
  }
}

// 2D Vector Icon Path drawer
function draw2DIcon(ctx: CanvasRenderingContext2D, type: string, size: number): void {
  ctx.beginPath();
  switch (type) {
    case 'bottle': {
      // Bottle outline
      ctx.moveTo(-size * 0.2, -size * 0.65);
      ctx.lineTo(size * 0.2, -size * 0.65);
      ctx.lineTo(size * 0.2, -size * 0.52);
      ctx.lineTo(size * 0.1, -size * 0.52);
      ctx.lineTo(size * 0.1, -size * 0.22);
      ctx.lineTo(size * 0.35, -size * 0.02);
      ctx.lineTo(size * 0.35, size * 0.6);
      ctx.quadraticCurveTo(size * 0.35, size * 0.68, size * 0.25, size * 0.68);
      ctx.lineTo(-size * 0.25, size * 0.68);
      ctx.quadraticCurveTo(-size * 0.35, size * 0.68, -size * 0.35, size * 0.6);
      ctx.lineTo(-size * 0.35, -size * 0.02);
      ctx.lineTo(-size * 0.1, -size * 0.22);
      ctx.lineTo(-size * 0.1, -size * 0.52);
      ctx.lineTo(-size * 0.2, -size * 0.52);
      ctx.closePath();
      ctx.stroke();
      
      // Label outline
      ctx.beginPath();
      ctx.rect(-size * 0.25, size * 0.08, size * 0.5, size * 0.38);
      ctx.stroke();
      break;
    }
    case 'barrel': {
      // Wood barrel
      ctx.moveTo(-size * 0.28, -size * 0.65);
      ctx.lineTo(size * 0.28, -size * 0.65);
      ctx.bezierCurveTo(size * 0.52, -size * 0.32, size * 0.52, size * 0.32, size * 0.28, size * 0.65);
      ctx.lineTo(-size * 0.28, size * 0.65);
      ctx.bezierCurveTo(-size * 0.52, size * 0.32, -size * 0.52, -size * 0.32, -size * 0.28, -size * 0.65);
      ctx.closePath();
      ctx.stroke();

      // Top oval rim
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.65, size * 0.28, size * 0.07, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Hoops
      ctx.beginPath();
      ctx.moveTo(-size * 0.38, -size * 0.32);
      ctx.quadraticCurveTo(0, -size * 0.22, size * 0.38, -size * 0.32);
      
      ctx.moveTo(-size * 0.44, 0);
      ctx.quadraticCurveTo(0, size * 0.08, size * 0.44, 0);

      ctx.moveTo(-size * 0.38, size * 0.32);
      ctx.quadraticCurveTo(0, size * 0.42, size * 0.38, size * 0.32);
      ctx.stroke();
      break;
    }
    case 'glass': {
      // Wine/chalice glass
      ctx.moveTo(-size * 0.35, -size * 0.55);
      ctx.lineTo(size * 0.35, -size * 0.55);
      ctx.bezierCurveTo(size * 0.35, -size * 0.05, size * 0.22, size * 0.18, 0, size * 0.18);
      ctx.bezierCurveTo(-size * 0.22, size * 0.18, -size * 0.35, -size * 0.05, -size * 0.35, -size * 0.55);
      ctx.closePath();
      ctx.stroke();

      // Stem & base
      ctx.beginPath();
      ctx.moveTo(0, size * 0.18);
      ctx.lineTo(0, size * 0.6);
      ctx.moveTo(-size * 0.25, size * 0.6);
      ctx.lineTo(size * 0.25, size * 0.6);
      ctx.stroke();
      break;
    }
    case 'box': {
      // Cardboard box - clean isometric line vector
      ctx.moveTo(0, -size * 0.45);
      ctx.lineTo(size * 0.45, -size * 0.22);
      ctx.lineTo(0, 0);
      ctx.lineTo(-size * 0.45, -size * 0.22);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-size * 0.45, -size * 0.22);
      ctx.lineTo(-size * 0.45, size * 0.22);
      ctx.lineTo(0, size * 0.45);
      ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(size * 0.45, -size * 0.22);
      ctx.lineTo(size * 0.45, size * 0.22);
      ctx.lineTo(0, size * 0.45);
      ctx.lineTo(0, 0);
      ctx.stroke();
      
      // Top tape line
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.45);
      ctx.lineTo(0, 0);
      ctx.stroke();
      break;
    }
    case 'rupee': {
      // Indian Rupee symbol (₹)
      // Top bar
      ctx.moveTo(-size * 0.28, -size * 0.42);
      ctx.lineTo(size * 0.28, -size * 0.42);
      
      // Middle bar
      ctx.moveTo(-size * 0.28, -size * 0.18);
      ctx.lineTo(size * 0.18, -size * 0.18);
      
      // Curve and leg
      ctx.moveTo(-size * 0.08, -size * 0.42);
      ctx.bezierCurveTo(size * 0.28, -size * 0.42, size * 0.28, size * 0.08, -size * 0.08, size * 0.08);
      ctx.lineTo(size * 0.22, size * 0.48);
      ctx.stroke();
      break;
    }
    case 'truck': {
      // Truck icon - recognizable silhouette outline
      ctx.rect(-size * 0.5, -size * 0.28, size * 0.62, size * 0.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(size * 0.12, -size * 0.08);
      ctx.lineTo(size * 0.38, -size * 0.08);
      ctx.lineTo(size * 0.5, size * 0.15);
      ctx.lineTo(size * 0.5, size * 0.32);
      ctx.lineTo(size * 0.12, size * 0.32);
      ctx.closePath();
      ctx.stroke();

      // Window
      ctx.beginPath();
      ctx.moveTo(size * 0.18, -size * 0.02);
      ctx.lineTo(size * 0.35, -size * 0.02);
      ctx.lineTo(size * 0.44, size * 0.15);
      ctx.lineTo(size * 0.18, size * 0.15);
      ctx.closePath();
      ctx.stroke();

      // Wheels
      ctx.beginPath();
      ctx.arc(-size * 0.26, size * 0.36, size * 0.13, 0, Math.PI * 2);
      ctx.arc(size * 0.32, size * 0.36, size * 0.13, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'can': {
      // Soda/beer can icon
      ctx.moveTo(-size * 0.28, -size * 0.5);
      ctx.lineTo(size * 0.28, -size * 0.5);
      ctx.lineTo(size * 0.28, size * 0.5);
      ctx.lineTo(-size * 0.28, size * 0.5);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, -size * 0.5, size * 0.28, size * 0.07, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, size * 0.5, size * 0.28, size * 0.07, 0, 0, Math.PI);
      ctx.stroke();
      break;
    }
  }
}
