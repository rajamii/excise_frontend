/**
 * Wallet sidebar eligibility for licensees.
 * Uses category + subcategory from the new-license flow (master IDs or display fields)
 * so any combination from masters works without hardcoding category names.
 */

function str(v: unknown): string {
  return String(v ?? '').trim();
}

/** Category: PK, nested object, or display string from /me/ or application serializers. */
export function extractLicenseCategoryKey(item: any): string {
  if (!item) {
    return '';
  }
  const nested = item.license_category ?? item.licenseCategory;
  const idRaw =
    item.license_category_id ??
    item.licenseCategoryId ??
    (nested && typeof nested === 'object' ? (nested as any).id : null) ??
    (typeof nested === 'number' ? nested : null);
  const id = str(idRaw);
  if (id) {
    return id;
  }
  const name = str(
    item.license_category_name ??
      item.licenseCategoryName ??
      (typeof nested === 'string' ? nested : '') ??
      (nested && typeof nested === 'object'
        ? (nested as any).license_category ?? (nested as any).licenseCategory ?? ''
        : '')
  );
  return name;
}

/** Subcategory: PK, nested object, description string, or name fields. */
export function extractLicenseSubcategoryKey(item: any): string {
  if (!item) {
    return '';
  }
  const nested = item.license_sub_category ?? item.licenseSubCategory;
  const idRaw =
    item.license_sub_category_id ??
    item.licenseSubCategoryId ??
    (nested && typeof nested === 'object' ? (nested as any).id : null) ??
    (typeof nested === 'number' ? nested : null);
  const id = str(idRaw);
  if (id) {
    return id;
  }
  return str(
    item.license_sub_category_name ??
      item.licenseSubCategoryName ??
      item.license_sub_category ??
      item.licenseSubCategory ??
      (nested && typeof nested === 'object'
        ? (nested as any).description ?? (nested as any).name ?? ''
        : '')
  );
}

/** True when the application / license row reflects a chosen category and subcategory (master tabs). */
export function hasLicenseCategoryAndSubcategorySelected(item: any): boolean {
  return !!extractLicenseCategoryKey(item) && !!extractLicenseSubcategoryKey(item);
}

export function isApprovedOrAwaitingLicensePaymentStage(item: any): boolean {
  const stage = str(
    item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      ''
  ).toLowerCase();
  if (stage.includes('approved')) {
    return true;
  }
  return stage.includes('awaiting') && stage.includes('payment');
}

/**
 * Show Payment & Wallet when:
 * - A license has been issued (`license_id`), or
 * - The new-license application is approved / awaiting payment **and** has category + subcategory
 *   from the user's selection (works for Joint Commissioner → Commissioner forward stages).
 */
export function isLicenseeWalletNavEligible(item: any): boolean {
  const hasLicenseId = !!(item?.license_id || item?.licenseId);
  if (hasLicenseId) {
    return true;
  }
  if (!isApprovedOrAwaitingLicensePaymentStage(item)) {
    return false;
  }
  return hasLicenseCategoryAndSubcategorySelected(item);
}
