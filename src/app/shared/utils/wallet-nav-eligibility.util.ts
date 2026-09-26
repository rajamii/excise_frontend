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

function normalizeStageToken(raw: unknown): string {
  return str(raw).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Workflow stage gate for Wallet navigation.
 *
 * Wallet becomes available when the application reaches:
 * - `awaiting_payment` (Awaiting License Fee Payment), OR
 * - commissioner approval / final approved stage.
 */
export function isWalletEnabledStage(item: any): boolean {
  if (!item) {
    return false;
  }
  return true;
}

/**
 * Show Payment & Wallet when:
 * - User is a licensee, or
 * - A license exists (`license_id`), or
 * - An application exists (even if rejected, terminated, awaiting payment, or approved)
 *   so licensees can always inspect their wallet balances, recharge history, and security deposit deductions.
 */
export function isLicenseeWalletNavEligible(item: any): boolean {
  if (!item) {
    return false;
  }
  return true;
}

/**
 * Application rows: awaiting license fee stage and fee not marked paid.
 */
function applicationRowAwaitingFeeUnpaid(item: any): boolean {
  if (item?.license_id || item?.licenseId) {
    return false;
  }
  const stage = str(
    item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      ''
  ).toLowerCase();
  if (!(stage.includes('awaiting') && stage.includes('payment'))) {
    return false;
  }
  const paid = !!(item?.is_license_fee_paid ?? item?.isLicenseFeePaid);
  return !paid;
}

/**
 * Issued license (`/masters/license/me/`) can exist before license fee is paid. Those rows must
 * not enable ENA/transit/hologram until `is_license_fee_paid` is true on the source application.
 */
export function isAwaitingLicenseFeePaymentPending(item: any): boolean {
  const hasLic = !!(item?.license_id ?? item?.licenseId);
  if (hasLic) {
    const paid = item?.is_license_fee_paid ?? item?.isLicenseFeePaid;
    if (paid === true) {
      return false;
    }
    if (paid === false) {
      return true;
    }
    return false;
  }
  return applicationRowAwaitingFeeUnpaid(item);
}

export function parseDateToTimestamp(raw: any): number | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw.getTime();
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'N/A' || trimmed === 'null' || trimmed === 'undefined') return null;

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed + 'T23:59:59.999');
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3]);
    const d = new Date(year, month, day, 23, 59, 59, 999);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * Rows that may drive distillery/brewery supply chain sidebar (Bulk Spirit, Transit Permit, Hologram, Stock Inventory).
 * Strictly requires an active, issued license with valid_up_to in the future, fees paid, and not expired or suspended.
 */
export function filterRowsForSupplyChainSidebarMenus(rows: any[]): any[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter((item) => {
    if (!item) {
      return false;
    }

    const licId = str(item?.license_id ?? item?.licenseId ?? '');
    const hasLic = !!licId;

    // 1. Supply chain operational menus (Bulk Spirit, Transit, Hologram) require an issued license
    if (!hasLic) {
      const isApproved = item?.is_approved === true || item?.isApproved === true;
      const isLicenseFeePaid = item?.is_license_fee_paid === true || item?.isLicenseFeePaid === true;
      const isSecurityFeePaid = item?.is_security_fee_paid === true || item?.isSecurityFeePaid === true;
      const stage = str(
        item?.current_stage_name ??
        item?.currentStageName ??
        item?.current_stage ??
        item?.currentStage ??
        item?.status ??
        item?.statusGroup ??
        item?.status_group ??
        ''
      ).toLowerCase();

      // Unissued application must be completely approved and fees paid
      if (!isApproved || !isLicenseFeePaid || !isSecurityFeePaid || !stage.includes('approved')) {
        return false;
      }
    }

    // 2. Active status check
    const isActive = item?.is_active ?? item?.isActive;
    if (isActive === false) {
      return false;
    }

    const isValidNow = item?.is_valid_now ?? item?.isValidNow;
    if (isValidNow === false) {
      return false;
    }

    const canAccess = item?.can_access_supply_chain ?? item?.canAccessSupplyChain;
    if (canAccess === false) {
      return false;
    }

    const isRejected = item?.is_rejected ?? item?.isRejected;
    if (isRejected === true) {
      return false;
    }

    const isTerminated = item?.is_terminated ?? item?.isTerminated;
    if (isTerminated === true) {
      return false;
    }

    const stage = str(
      item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      item?.status ??
      item?.statusGroup ??
      item?.status_group ??
      ''
    ).toLowerCase();

    if (
      stage.includes('reject') ||
      stage.includes('terminat') ||
      stage.includes('cancel') ||
      stage.includes('expire') ||
      stage.includes('objection') ||
      stage.includes('draft') ||
      stage.includes('awaiting')
    ) {
      return false;
    }

    // 3. Fee payment check
    const licFeePaid = item?.is_license_fee_paid ?? item?.isLicenseFeePaid;
    if (licFeePaid === false) {
      return false;
    }

    const secFeePaid = item?.is_security_fee_paid ?? item?.isSecurityFeePaid;
    if (secFeePaid === false) {
      return false;
    }

    // 4. Expiry date check (valid_up_to / valid_upto)
    const rawExpiry =
      item?.valid_upto ??
      item?.validUpto ??
      item?.valid_up_to ??
      item?.validUpTo ??
      item?.valid_to ??
      item?.validTo ??
      item?.expiry_date ??
      item?.expiryDate ??
      item?.valid_until ??
      item?.validUntil ??
      item?.license_expiry_date ??
      item?.licenseExpiryDate;

    const expiryTimestamp = parseDateToTimestamp(rawExpiry);
    if (expiryTimestamp !== null && expiryTimestamp < Date.now()) {
      return false;
    }

    return true;
  });
}
