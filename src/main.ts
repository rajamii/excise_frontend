import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const finishPreloader = () => {
  const progress = document.getElementById('app-preloader-progress') as HTMLElement | null;
  const preloader = document.getElementById('app-preloader');
  if (progress) progress.style.width = '100%';

  // Let users see the completed line briefly before the app replaces it.
  window.setTimeout(() => preloader?.remove(), 240);
};

bootstrapApplication(AppComponent, appConfig)
  .then(finishPreloader)
  .catch((err) => {
    finishPreloader();
    console.error(err);
  });
