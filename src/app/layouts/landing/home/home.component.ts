import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MaterialModule } from '../../../shared/material.module';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number; // 2D rotation angle
  vrx: number; // 2D rotation speed
  type: 'box' | 'barrel' | 'bottle' | 'glass' | 'can' | 'truck' | 'hologram' | 'number';
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
  imports: [MaterialModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  selectedLink: string = '';
  markdownContent: string = '';
  isBrowser: boolean;

  notifications = [
    {
      title: 'Circular Regarding Settlement of Excise License',
      date: '04/02/2025',
      link: 'https://example.com'
    },
    {
      title: 'DRY DAY NOTIFICATION',
      date: '23/12/2024',
      link: 'https://example.com'
    },
    {
      title: 'Office order no 226/Excise dated 11/09/2024 regarding Grievance cell',
      date: '11/09/2024',
      link: 'https://example.com'
    },
    {
      title: 'Gazette No 394 regarding suspension on issue of New Foreign Liquor Retail License',
      date: '14/08/2024',
      link: 'https://example.com'
    },
    {
      title: 'Notification No 01/Excise regarding License Renewal for FY 2024-25',
      date: '08/02/2024',
      link: 'https://example.com'
    },
    {
      title: 'DRY DAY NOTIFICATION 2024',
      date: '08/01/2024',
      link: 'https://example.com'
    }
  ];

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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadMarkdown();
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.init3DBackground();
  }

  ngOnDestroy(): void {
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
    this.http.get(`assets/content/department.md`, { responseType: 'text' })
      .subscribe({
        next: data => this.markdownContent = data,
        error: () => this.markdownContent = '*Content not available.*'
      });
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
      'rgba(16, 185, 129, '   // Bright Emerald Green
    ];

    const numbersList = ['0', '1', '100', '2026', '24/7', 'PROOF', '%', 'VOL', 'SIKKIM', 'EXCISE'];

    const particleTypes: ('box' | 'barrel' | 'bottle' | 'glass' | 'can' | 'truck' | 'hologram' | 'number')[] = [
      'box', 'barrel', 'bottle', 'glass', 'can', 'truck', 'hologram', 'number'
    ];

    // Generate particles: Exactly 4 followers (bottle, truck, glass, barrel) orbit smoothly
    const followerTypes: ('bottle' | 'truck' | 'glass' | 'barrel')[] = ['bottle', 'truck', 'glass', 'barrel'];
    const sharedOrbitSpeed = 0.006; // identical speed to keep 90 degree spacing stable
    const sharedOrbitRadius = 80;   // 80px distance around the cursor (not too near, not too far)
    for (let i = 0; i < followerTypes.length; i++) {
      const type = followerTypes[i];
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: 0, // Start close to center cursor
        y: 0,
        z: 200 + Math.random() * 150,
        vx: 0,
        vy: 0,
        vz: (Math.random() - 0.5) * 0.15,
        rx: Math.random() * Math.PI * 2,
        vrx: (Math.random() - 0.5) * 0.015,
        type: type,
        color: colorBase,
        scale: type === 'truck' ? 36 : 28,
        isFollower: true,
        orbitAngle: (i * Math.PI * 2) / 4, // Perfect 90 degree spacing
        orbitRadius: sharedOrbitRadius,
        orbitSpeed: sharedOrbitSpeed
      });
    }

    // Generate the remaining 66 regular background particles drifting freely
    const bgCount = 66;
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
        scale: type === 'truck' ? 36 : type === 'hologram' ? 32 : type === 'number' ? 1.0 : 28,
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

        if (p.isFollower) {
          // Increment the orbit angle slowly
          p.orbitAngle = (p.orbitAngle || 0) + (p.orbitSpeed || 0.005);

          // Cursor target in 3D world coordinates at the particle's depth p.z
          const cursorWorldX = (this.mouseXRaw - centerX) / projScale;
          const cursorWorldY = (this.mouseYRaw - centerY) / projScale;

          // Target is offset in a circle around the cursor
          const targetX = cursorWorldX + Math.cos(p.orbitAngle) * (p.orbitRadius || 80) / projScale;
          const targetY = cursorWorldY + Math.sin(p.orbitAngle) * (p.orbitRadius || 80) / projScale;

          // Smooth tracking (lerp divisor 0.035)
          p.x += (targetX - p.x) * 0.035;
          p.y += (targetY - p.y) * 0.035;

          p.z += p.vz;
          p.rx += p.vrx;

          // Slowly float Z-depth back and forth
          if (p.z < 200) p.vz = Math.abs(p.vz);
          if (p.z > 600) p.vz = -Math.abs(p.vz);
        } else {
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
        }

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
    case 'hologram': {
      // Holographic radar / target HUD icon
      ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-size * 0.6, 0); ctx.lineTo(-size * 0.35, 0);
      ctx.moveTo(size * 0.35, 0); ctx.lineTo(size * 0.6, 0);
      ctx.moveTo(0, -size * 0.6); ctx.lineTo(0, -size * 0.35);
      ctx.moveTo(0, size * 0.35); ctx.lineTo(0, size * 0.6);
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
