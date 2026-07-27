export class WhatsCurrent {
  id?: number;
  title!: string;
  category!: 'act' | 'rule' | 'circular' | 'bullet' | 'license';
  message?: string;
  file?: string | File;
  date!: string; // YYYY-MM-DD
  isActive?: boolean;
}
