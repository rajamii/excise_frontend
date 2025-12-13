import { Injectable } from '@angular/core';

/**
 * FormDataBuilder Utility
 * Location: src/app/shared/utils/form-data.util.ts
 *
 * SAFE, ROBUST & DJANGO-READY FormData builder
 * - Converts camelCase → snake_case
 * - Converts boolean/int/float/date
 * - Skips invalid {} objects (prevents TS2769)
 * - Handles File objects correctly
 * - Handles arrays
 * - Handles nested objects safely
 */
@Injectable({
  providedIn: 'root',
})
export class FormDataBuilder {

  private static camelToSnake(key: string): string {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  private static readonly FIELD_MAP: Record<string, string> = {
    applicantMobileNumber: 'mobile_number',
    applicantEmail: 'email',
    applicantName: 'applicant_name',
    maritalStatus: 'status',

    passPhoto: 'pass_photo',
    panCard: 'pan_card',
    sikkimCertificate: 'sikkim_certificate',
    dobProof: 'dob_proof',
    nocLandlord: 'noc_landlord',

    siteDistrictCode: 'site_district',
    siteSubdivisionCode: 'site_subdivision',
    policeStationCode: 'police_station',

    companyPhoneNumber: 'company_phone_number',
    companyEmail: 'company_email',
  };

  private static readonly BOOLEAN_FIELDS = [
    'site_owned',
    'noc_obtained',
    'trade_license_covered',
    'has_sikkim_certificate',
    'has_excise_license',
    'family_excise_license',
    'criminal_conviction',
    'is_approved'
  ];

  private static readonly INTEGER_FIELDS = [
    'license_type',
    'license_category',
    'license_sub_category',
    'pin_code',
    'print_count'
  ];

  private static readonly FLOAT_FIELDS = [
    'length',
    'breadth',
    'latitude',
    'longitude'
  ];

  /**
   * Get backend key name
   */
  private static getBackendFieldName(key: string): string {
    return this.FIELD_MAP[key] || this.camelToSnake(key);
  }

  /**
   * Convert each field safely
   */
  private static convertValue(key: string, value: any): any {
    const snakeKey = this.getBackendFieldName(key);

    if (value === null || value === undefined) return null;

    // File upload
    if (value instanceof File) return value;

    // Date object
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    // Boolean conversion
    if (this.BOOLEAN_FIELDS.includes(snakeKey)) {
      if (typeof value === 'string') {
        return ['yes', 'true', '1'].includes(value.toLowerCase());
      }
      return Boolean(value);
    }

    // Integer conversion
    if (this.INTEGER_FIELDS.includes(snakeKey)) {
      const num = parseInt(String(value), 10);
      return isNaN(num) ? null : num;
    }

    // Float conversion
    if (this.FLOAT_FIELDS.includes(snakeKey)) {
      const num = parseFloat(String(value));
      return isNaN(num) ? null : num;
    }

    // String date format YYYY-MM-DD
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.split('T')[0];
    }

    // Reject {} or any object (prevents TS2769 error)
    if (typeof value === 'object') {
      console.warn(`⚠️ Skipping invalid object for key "${key}":`, value);
      return null;
    }

    return value;
  }

  /**
   * Build safe FormData
   */
  static build(data: Record<string, any>, skipNull = true): FormData {
    const formData = new FormData();

    Object.entries(data).forEach(([key, rawValue]) => {

      // Skip null values
      if (skipNull && (rawValue === null || rawValue === undefined)) return;

      // Arrays → handle each element
      if (Array.isArray(rawValue)) {
        rawValue.forEach((item, index) => {
          const converted = this.convertValue(`${key}[${index}]`, item);
          if (converted instanceof File) {
            formData.append(this.getBackendFieldName(key), converted, converted.name);
          } else if (converted !== null) {
            formData.append(this.getBackendFieldName(key), String(converted));
          }
        });
        return;
      }

      const convertedValue = this.convertValue(key, rawValue);

      if (skipNull && convertedValue === null) return;

      const backendKey = this.getBackendFieldName(key);

      if (convertedValue instanceof File) {
        formData.append(backendKey, convertedValue, convertedValue.name);
      } else if (typeof convertedValue === 'boolean') {
        formData.append(backendKey, convertedValue ? 'true' : 'false');
      } else {
        formData.append(backendKey, String(convertedValue));
      }
    });

    return formData;
  }

  /**
   * Build from sessionStorage keys
   */
  static buildFromSessionStorage(keys: string[]): FormData {
    const combined: Record<string, any> = {};

    keys.forEach(key => {
      try {
        const data = sessionStorage.getItem(key);
        if (data) Object.assign(combined, JSON.parse(data));
      } catch (err) {
        console.error(`Failed to parse session key: ${key}`, err);
      }
    });

    return this.build(combined, true);
  }

  /**
   * Validate FormData
   */
  static validate(formData: FormData, requiredFields: string[]) {
    const missing = requiredFields.filter(f => !Array.from(formData.keys()).includes(f));
    return { valid: missing.length === 0, missing };
  }

  /**
   * Debug helper
   */
  static logFormData(formData: FormData, label = 'FormData') {
    console.group(`📋 ${label}`);
    formData.forEach((value, key) => {
      if (value instanceof File) {
        console.log(`${key}: [File ${value.name}, ${value.size} bytes]`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
    console.groupEnd();
  }

  static toTitleCase(text: string | null | undefined): string {
    if (!text) return '';
    return text.split(/[_\s]/)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
      .join(' ');
  }

  static buildFormData(data: Record<string, any>): FormData {
    return this.build(data, true);
  }
}

/** For backward compatibility */
export class FormDataUtil extends FormDataBuilder { }
