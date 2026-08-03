export interface FileUploadValidationOptions {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
  label?: string;
  allowEmptyName?: boolean;
}

const DANGEROUS_EXTENSIONS = new Set([
  'asp', 'aspx', 'bat', 'cmd', 'com', 'cpl', 'dll', 'exe', 'hta',
  'jar', 'jsp', 'jse', 'msi', 'php', 'php3', 'php4', 'php5', 'phar',
  'phtml', 'ps1', 'sh', 'shtml', 'vbs', 'war'
]);

export function validateUploadedFile(file: File | null | undefined, options: FileUploadValidationOptions): string {
  const label = options.label || 'File';
  if (!file) {
    return `${label} is required.`;
  }

  const name = (file.name || '').trim();
  if (!name) {
    return `${label} must have a valid name.`;
  }

  if (file.size <= 0) {
    return `${label} cannot be empty.`;
  }

  if (file.size > options.maxFileSizeBytes) {
    return `${label} must be smaller than ${Math.floor(options.maxFileSizeBytes / (1024 * 1024))} MB.`;
  }

  const segments = name.split('.').filter(Boolean);
  if (segments.length < 2) {
    return `${label} must have a valid file extension.`;
  }

  const finalExtension = segments[segments.length - 1].toLowerCase();
  const allowedExtensions = options.allowedExtensions.map((ext) => ext.toLowerCase().replace(/^\./, ''));
  if (!allowedExtensions.includes(finalExtension)) {
    return `${label} has an unsupported file extension.`;
  }

  const blockedSegments = segments.slice(0, -1).map((segment) => segment.toLowerCase()).filter((segment) => DANGEROUS_EXTENSIONS.has(segment));
  if (blockedSegments.length > 0) {
    return `${label} contains a blocked extension.`;
  }

  if (file.type) {
    const mimeType = file.type.toLowerCase();
    const allowedMimeTypes = options.allowedMimeTypes.map((type) => type.toLowerCase());
    if (!allowedMimeTypes.includes(mimeType)) {
      return `${label} has an unsupported file type.`;
    }
  }

  return '';
}
