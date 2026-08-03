import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';
import { BrandWarehouseService } from '../../services/brand-warehouse.service';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';
import { forkJoin, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { secureRandomToken } from '../../../../../core/utils/secure-random';


interface RollRange {
  fromSerial: string;
  toSerial: string;
  quantity: number;
  isValid?: boolean;
  errorMessage?: string;
}

interface BrandEntry {
  id: string;
  brandName: string;
  bottleSize: string;
  issuedRanges: RollRange[];
  wastageRanges: RollRange[];
  issuedQty: number;
  wastageQty: number;
  damageReason: string;
  colorIndex: number;
}

interface LeftoverUsageHistory {
  brandDetails: string;
  bottleSize: string;
  originalRange: string;
  usedRange: string;
  usedQty: number;
  damagedRange?: string;
  damagedQty?: number;
  remainingRange?: string;
  remainingQty?: number;
  timestamp: string;
}

interface RollInput {
  cartoonNumber: string;
  rangeId?: string;
  displayName?: string;
  rangeIndex?: number;
  availableCount: number;
  serialRange: string;
  fromSerial: string;
  toSerial: string;
  issuedRanges: RollRange[];
  wastageRanges: RollRange[];
  issuedQty: number;
  wastageQty: number;
  leftOver: number;
  damageReason: string;
  brandDetails: string | { brandName: string;[key: string]: any };
  bottleSize: string;
  brands?: BrandEntry[]; // Support for multiple brands from single roll
  isLeftoverReuse?: boolean;
  leftoverUsageHistory?: LeftoverUsageHistory[];
  parentRollId?: string;
  allocatedFromSerial?: string;
  allocatedToSerial?: string;
  isNotInUse?: boolean;
}

interface RegisterEntry {
  id: string;
  requestId?: number; // Optional link to original request
  licenseId?: string;
  referenceNo: string;
  rollRange: string;
  dates: {
    submission: string;
    usage: string;
  };
  brandDetails: string | { brandName: string;[key: string]: any };
  bottleSize: string;
  rollsAssigned: string[];
  hologramQty: number;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  issuedFrom: string;
  issuedTo: string;
  issuedQty: number;
  wastageFrom: string;
  wastageTo: string;
  wastageQty: number;
  leftOver: number;
  total: number;
  damageReason: string;
  isFixed: boolean;
  currentRollSelection?: {
    selectedRoll: string;
    rollInput: RollInput;
    isLocked: boolean;
  };
  lockedRolls?: RollInput[];
  cartoonNumber?: string;
  utilizedQuantity?: number;
  originalHologramQty?: number;
  allocatedRanges?: Array<{
    cartoonNumber: string;
    fromSerial: string;
    toSerial: string;
    quantity: number;
    procurementRef?: string;
  }>;
  status?: string;
}

@Component({
  selector: 'app-oicdailyhologramregister',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oicdailyhologramregister.component.html',
  styleUrl: './oicdailyhologramregister.component.scss'
})
export class OicdailyhologramregisterComponent implements OnInit, OnDestroy {
  Math = Math;
  selectedMonth = 'nov';
  selectedYear = '2025';
  selectedDate = new Date().toISOString().split('T')[0];
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';

  entries: RegisterEntry[] = [];
  filteredEntries: RegisterEntry[] = [];

  pageSize = 10;
  currentPage = 1;

  // For rolls view section above table
  selectedEntryForRollsView: RegisterEntry | null = null;

  // For usage details modal
  selectedEntryForDetails: RegisterEntry | null = null;
  selectedRollTabIndex: number = 0;

  // View state management
  private viewDetailsState: { [key: string]: boolean } = {};
  private readonly VIEW_STATE_KEY = 'hologramViewState';
  private readonly INPUT_STATE_KEY = 'hologramInputState';

  // Subscription management
  private requestUpdateSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private lastLoadTime: number = 0;

  // Loading state to prevent double-click submissions
  isSaving: boolean = false;
  savingEntryId: string | null = null;

  // Liquor brands and sizes for dropdowns
  liquorBrands: Array<{ brandName: string, sizes: number[] }> = [];
  availableBottleSizesMap: Map<string, number[]> = new Map();
  private currentScopedLicenseId: string = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private hologramService: HologramDataService,
    private brandWarehouseService: BrandWarehouseService,
    private supplyChainProfileService: SupplyChainProfileService
  ) { }

  ngOnInit(): void {
    console.log('🔵 Daily Register Component: ngOnInit called');
	    this.currentScopedLicenseId = this.resolveCurrentScopedLicenseId();
	    this.loadViewState();
	    this.resolveProfileScopedLicenseId();
	    this.loadApprovedEntries();
	    this.loadLiquorBrandsData();

    // Subscribe to request updates from other components (e.g., when officer approves a request)
    this.requestUpdateSubscription = this.hologramService.requestUpdate$.subscribe(() => {
      console.log('📢 Daily Register: Received request update notification - reloading entries');
      this.loadApprovedEntries();
      // Force change detection
      this.cdr.detectChanges();
    });

    // CRITICAL: Also reload when navigating to this component
    // This ensures fresh data when user switches tabs/pages
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Check if we're navigating to this component's route
        if (event.url.includes('daily-hologram-register') || event.url.includes('oicdailyhologramregister')) {
          const now = Date.now();
          // Only reload if more than 2 seconds have passed since last load (prevent duplicate loads)
          if (now - this.lastLoadTime > 2000) {
            console.log('🔄 Daily Register: Navigation detected, reloading entries');
            this.loadApprovedEntries();
          }
        }
      });

    // CRITICAL: Reload when page becomes visible (user switches back to this tab)
    // This catches the case where approval happens in another tab/window
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    console.log('✅ Daily Register: Subscribed to requestUpdate$, router events, and visibility changes');

    // CRITICAL FIX: Recalculate Available Hologram Data from Rolls data
    // This fixes any existing data that was calculated with the old (wrong) logic


    // Listen for storage changes to auto-refresh

  }

  private handleVisibilityChange = () => {
    if (!document.hidden) {
      const now = Date.now();
      // Only reload if more than 3 seconds have passed since last load
      if (now - this.lastLoadTime > 3000) {
        console.log('👁️ Daily Register: Page became visible, reloading entries');
        // CRITICAL FIX: Save current input state before reloading
        this.saveInputState();
        this.loadApprovedEntries();
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.requestUpdateSubscription) {
      this.requestUpdateSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    // Remove visibility change listener
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Recalculate Available Hologram Data from Rolls data
   * This ensures consistency between Rolls tab and Available Hologram Data tab
   * Fixes any data that was calculated with old (incorrect) logic
   */


  // Cache for procurements to use in dropdowns
  private procurementCache: any[] = [];

  loadApprovedEntries(): void {
    // Track load time to prevent duplicate loads
    this.lastLoadTime = Date.now();
    console.log('🔄 Loading approved entries at:', new Date().toLocaleTimeString());

    // Load from Backend API - Fetch all hologram_request entries AND procurements
    // Requests have basic info, Procurements have the source of truth for Carton Ranges



    // Fetch Requests, Procurements, AND saved Daily Register entries
    forkJoin({
      requests: this.hologramService.getRequests(),
      procurements: this.hologramService.getProcurements(),
      dailyRegister: this.hologramService.getDailyRegisterEntries()
    }).subscribe({
      next: ({ requests, procurements, dailyRegister }) => {
        // MEGA DEBUG - Very visible
        console.warn('🔔🔔🔔🔔🔔 FRESH CODE v2 - dailyRegister RAW:', dailyRegister);
        console.warn('🔔🔔🔔🔔🔔 dailyRegister is array?', Array.isArray(dailyRegister));
        console.warn('🔔🔔🔔🔔🔔 dailyRegister count:', Array.isArray(dailyRegister) ? dailyRegister.length : (dailyRegister as any)?.results?.length || 0);

        console.log('✅ Loaded data from API (Raw):', {
          requestsType: typeof requests,
          procurementsType: typeof procurements,
          procurementsIsArray: Array.isArray(procurements)
        });

        // Handle pagination (if response has 'results' property)
        let rawProcurements: any[] = [];
        if (Array.isArray(procurements)) {
          rawProcurements = procurements;
        } else if ((procurements as any).results && Array.isArray((procurements as any).results)) {
          console.log('⚠️ Detected paginated response for procurements');
          rawProcurements = (procurements as any).results;
        } else {
          console.log('⚠️ Unknown procurement response format, defaulting to empty array', procurements);
          rawProcurements = [];
        }

        // Save procurements to cache for dropdown fallback
        this.procurementCache = rawProcurements;

        console.log('✅ Procurement Cache Size:', this.procurementCache.length);

        // 1. Build Procurement Map: CartonNumber -> CartonDetail (with ranges)
        const procurementMap = new Map<string, any>();

        rawProcurements.forEach((p: any) => {
          // Check all possible keys for carton details
          const details = p.carton_details || p.cartonDetails || p.cartoons || p.cartoon_details || [];
          if (Array.isArray(details)) {
            details.forEach((c: any) => {
              // Normalize keys if needed
              const cNo = c.cartoonNumber || c.cartoon_number || c.carton_number || '';
              if (cNo) {
                procurementMap.set(cNo, {
                  ...c,
                  // Ensure we have from/to serials
                  fromSerial: c.fromSerial || c.from_serial || '',
                  toSerial: c.toSerial || c.to_serial || ''
                });
              }
            });
          }
        });

        console.log('✅ Built Procurement Map with', procurementMap.size, 'cartons');

        // 2. Build map of saved daily register entries by reference_no
        // This allows us to restore isFixed status and lockedRolls after page refresh
        const savedEntriesMap = new Map<string, any[]>();
        const rawDailyRegister = Array.isArray(dailyRegister)
          ? dailyRegister
          : (dailyRegister as any)?.results || [];

        console.warn('📁📁📁 Daily Register entries loaded:', rawDailyRegister.length, 'from API');

        // Debug: Log raw entries for matching analysis
        if (rawDailyRegister.length > 0) {
          console.warn('🔍🔍🔍 DEBUG SAMPLE SAVED ENTRY:', JSON.stringify(rawDailyRegister[0]));
        }

        rawDailyRegister.forEach((entry: any) => {
          const refNo = (entry.reference_no || entry.referenceNo || '').trim();
          if (refNo) {
            // Use normalized key for matching (case-insensitive)
            const normalizedKey = refNo.toUpperCase();
            if (!savedEntriesMap.has(normalizedKey)) {
              savedEntriesMap.set(normalizedKey, []);
            }
            savedEntriesMap.get(normalizedKey)!.push(entry);
          }
        });

        console.warn('✅ SAVED ENTRIES MAP KEYS:', Array.from(savedEntriesMap.keys()));

        // 3. Map Requests to RegisterEntry, enriching with Procurement Map data
        // CRITICAL FIX: Only show requests that have been ALLOCATED (IN_USE, APPROVED, COMPLETED)
        // This prevents "Submitted" requests from appearing before allocation
        const allocatedRequests = requests.filter((req: any) => {
          const s = (req.status || '').toUpperCase().replace(/\s+/g, '_');
          // We include APPROVED for legacy compatibility, but new flow uses IN_USE
          return ['IN_USE', 'APPROVED', 'COMPLETED'].includes(s);
        });

        console.log(`✅ FILTERED REQUESTS: ${allocatedRequests.length} requests passed status filter`);
        if (allocatedRequests.length > 0) {
          console.log('🔍 First filtered request:', allocatedRequests[0]);
        }

        const apiEntries = allocatedRequests.map((req: any) => {
          console.log('🔍 RAW REQUEST FULL:', req);
          console.log('🔍 rolls_assigned variations:', {
            rollsAssigned: req.rollsAssigned,
            rolls_assigned: req.rolls_assigned,
            keys: Object.keys(req)
          });
          // Map available_cartons from procurement to allocatedRanges format
          // PRIMARY: Use map enrichment for accurate ranges if available
          let allocatedRanges = (req.available_cartons || []).map((carton: any) => {
            const cNo = carton.cartoonNumber || carton.cartoon_number || '';
            const procDetail = procurementMap.get(cNo);

            return {
              cartoonNumber: cNo,
              fromSerial: carton.fromSerial || carton.from_serial || (procDetail ? procDetail.fromSerial : ''),
              toSerial: carton.toSerial || carton.to_serial || (procDetail ? procDetail.toSerial : ''),
              quantity: carton.quantity || carton.totalCount || 0,
              procurementRef: carton.procurement_ref || ''
            };
          });

          // PREDICTIVE FIX: If allocatedRanges is empty, try to match Procurement by Reference Number
          if (!allocatedRanges || allocatedRanges.length === 0) {
            const reqRef = req.ref_no || req.refNo || req.referenceNo;
            if (reqRef) {
              const matchingProc = rawProcurements.find(p => {
                const pRef = p.ref_no || p.refNo || p.referenceNo;
                return pRef === reqRef;
              });

              if (matchingProc) {
                console.log(`✅ Found matching procurement for ${reqRef} via Reference No match`);
                const details = matchingProc.carton_details || matchingProc.cartonDetails || matchingProc.cartoons || matchingProc.cartoon_details || [];

                if (Array.isArray(details) && details.length > 0) {
                  allocatedRanges = details.map((c: any) => ({
                    cartoonNumber: c.cartoonNumber || c.cartoon_number || c.carton_number || '',
                    fromSerial: c.fromSerial || c.from_serial || '',
                    toSerial: c.toSerial || c.to_serial || '',
                    quantity: c.quantity || c.totalCount || 0,
                    procurementRef: ''
                  }));
                  console.log(`📦 Populated allocatedRanges from matching procurement: ${allocatedRanges.length} items`);
                }
              }
            }
          }

          // CRITICAL FIX: Use rolls_assigned instead of issued_assets (HTTP interceptor safe)
          const rollsAssigned = (req.rollsAssigned || req.rolls_assigned || []).map((asset: any) => ({
            cartoonNumber: asset.cartoonNumber || asset.cartoon_number || '',
            fromSerial: asset.fromSerial || asset.from_serial || '',
            toSerial: asset.toSerial || asset.to_serial || '',
            quantity: asset.quantity || 0
          }));

          // CRITICAL FIX: Check if this request has saved daily register entries
          const reqRef = (req.ref_no || req.refNo || req.reference_no || req.referenceNo || '').trim();
          const normalizedReqRef = reqRef.toUpperCase();

          // Debug: Log matching attempt
          console.warn(`🔎 MATCHING: reqRef='${reqRef}', normalized='${normalizedReqRef}'`);
          console.warn(`🔎 Available keys in savedEntriesMap:`, Array.from(savedEntriesMap.keys()));

          const savedForRequest = savedEntriesMap.get(normalizedReqRef) || [];
          const hasSavedEntries = savedForRequest.length > 0;

          // FIX: If there are ANY saved entries in the database, mark as saved
          // The presence of saved entries means data has been saved to the database
          // This is the key fix: having saved entries = entry is fixed/saved, regardless of is_fixed field value
          const isSaved = hasSavedEntries;

          console.warn(`   → RESULT: ${savedForRequest.length} matches, isSaved=${isSaved}`);

          // Build lockedRolls from saved entries to restore state after refresh
          const lockedRolls = savedForRequest.map((saved: any, index: number) => {
            // Debug: Log first saved entry to see actual field names
            if (index === 0) {
              console.warn('🔍 DEBUG: First saved entry from database:', saved);
              console.warn('🔍 Available keys in saved entry:', Object.keys(saved));
            }

            // Handle both snake_case (backend) and camelCase (frontend) field names
            const savedRollRange = saved.roll_range || saved.rollRange || '';
            const brandDetails = saved.brand_details || saved.brandDetails || '';
            const bottleSize = saved.bottle_size || saved.bottleSize || '';
            const hologramQty = saved.hologram_qty || saved.hologramQty || 0;
            const issuedFrom = saved.issued_from || saved.issuedFrom || '';
            const issuedTo = saved.issued_to || saved.issuedTo || '';
            const issuedQty = saved.issued_qty || saved.issuedQty || 0;
            const wastageFrom = saved.wastage_from || saved.wastageFrom || '';
            const wastageTo = saved.wastage_to || saved.wastageTo || '';
            const wastageQty = saved.wastage_qty || saved.wastageQty || 0;
            const damageReason = saved.damage_reason || saved.damageReason || '';
            const issuedRangesField = saved.issued_ranges || saved.issuedRanges;
            const wastageRangesField = saved.wastage_ranges || saved.wastageRanges;

            // Find the allocated range for this roll from allocatedRanges
            const allocatedRange = allocatedRanges.find((ar: any) =>
            (ar.cartoonNumber && savedRollRange &&
              (ar.cartoonNumber === savedRollRange ||
                ar.cartoonNumber?.toUpperCase() === savedRollRange.toUpperCase()))
            );

            // Use allocated range for serialRange display, fallback to issued range if not found
            const allocatedFromSerial = allocatedRange?.fromSerial || '';
            const allocatedToSerial = allocatedRange?.toSerial || '';
            const displaySerialRange = (allocatedFromSerial && allocatedToSerial)
              ? `${allocatedFromSerial} - ${allocatedToSerial}`
              : (issuedFrom && issuedTo
                ? `${issuedFrom} - ${issuedTo}`
                : '-');

            // Parse issued_ranges and wastage_ranges - handle both JSON strings and arrays
            let issuedRanges: any[] = [];
            let wastageRanges: any[] = [];

            if (issuedRangesField) {
              if (typeof issuedRangesField === 'string') {
                try {
                  issuedRanges = JSON.parse(issuedRangesField);
                } catch (e) {
                  console.warn('Failed to parse issued_ranges:', e);
                  issuedRanges = [];
                }
              } else if (Array.isArray(issuedRangesField)) {
                issuedRanges = issuedRangesField;
              }
            }

            // If issued_ranges is empty but we have issued_from/issued_to, create a range entry
            if (issuedRanges.length === 0 && issuedFrom && issuedTo && issuedQty) {
              issuedRanges = [{
                fromSerial: issuedFrom,
                toSerial: issuedTo,
                quantity: issuedQty || 0
              }];
            }

            if (wastageRangesField) {
              if (typeof wastageRangesField === 'string') {
                try {
                  wastageRanges = JSON.parse(wastageRangesField);
                } catch (e) {
                  console.warn('Failed to parse wastage_ranges:', e);
                  wastageRanges = [];
                }
              } else if (Array.isArray(wastageRangesField)) {
                wastageRanges = wastageRangesField;
              }
            }

            // If wastage_ranges is empty but we have wastage_from/wastage_to, create a range entry
            if (wastageRanges.length === 0 && wastageFrom && wastageTo && wastageQty) {
              wastageRanges = [{
                fromSerial: wastageFrom,
                toSerial: wastageTo,
                quantity: wastageQty || 0
              }];
            }

            // Create unique ID for tracking (use saved entry ID if available, otherwise use index)
            const uniqueId = saved.id || saved.Id || `${reqRef}_${index}_${Date.now()}`;

            // Determine if this roll was marked as "Not In Use"
            // If issued and wastage are both 0, and it's a saved entry, it's effectively "Not In Use"
            const isNotInUse = issuedQty === 0 && wastageQty === 0;

            return {
              id: uniqueId, // Add unique ID for tracking
              cartoonNumber: savedRollRange || `ROLL_${index}`, // Fallback to prevent empty string
              rangeId: savedRollRange || uniqueId,
              displayName: savedRollRange || `Roll ${index + 1}`,
              brandDetails: brandDetails,
              bottleSize: bottleSize,
              availableCount: hologramQty,
              serialRange: displaySerialRange, // Use allocated range for display
              allocatedFromSerial: allocatedFromSerial, // Store allocated range
              allocatedToSerial: allocatedToSerial,
              // CRITICAL FIX: Use allocated range for leftover calculation, NOT the issued range
              // This ensures getLeftoverRanges() uses the full allocated range to calculate what's left
              fromSerial: allocatedFromSerial, // Use allocated range (not issued range)
              toSerial: allocatedToSerial,     // Use allocated range (not issued range)
              issuedQty: issuedQty,
              wastageQty: wastageQty,
              leftOver: hologramQty - issuedQty - wastageQty,
              issuedRanges: issuedRanges, // Properly parsed issued ranges
              wastageRanges: wastageRanges, // Properly parsed wastage ranges
              damageReason: damageReason,
              isLocked: true,
              isNotInUse: isNotInUse // Restore "Not In Use" status based on zero usage
            };
          });

          // Calculate total issued/wastage from all locked rolls
          const totalIssuedQty = lockedRolls.reduce((sum: number, r: any) => sum + (r.issuedQty || 0), 0);
          const totalWastageQty = lockedRolls.reduce((sum: number, r: any) => sum + (r.wastageQty || 0), 0);

          // Get aggregated display values from all saved entries
          // Handle both snake_case (backend) and camelCase (frontend) field names
          const allIssuedFroms = savedForRequest.map((s: any) => s.issued_from || s.issuedFrom).filter(Boolean);
          const allIssuedTos = savedForRequest.map((s: any) => s.issued_to || s.issuedTo).filter(Boolean);
          const allWastageFroms = savedForRequest.map((s: any) => s.wastage_from || s.wastageFrom).filter(Boolean);
          const allWastageTos = savedForRequest.map((s: any) => s.wastage_to || s.wastageTo).filter(Boolean);

          const aggregatedIssuedFrom = allIssuedFroms.length > 0 ? allIssuedFroms[0] : '';
          const aggregatedIssuedTo = allIssuedTos.length > 0 ? allIssuedTos[allIssuedTos.length - 1] : '';
          const aggregatedWastageFrom = allWastageFroms.length > 0 ? allWastageFroms[0] : '';
          const aggregatedWastageTo = allWastageTos.length > 0 ? allWastageTos[allWastageTos.length - 1] : '';

          // Get the first saved entry for other fields
          const firstSavedEntry = savedForRequest.length > 0 ? savedForRequest[0] : null;
          const aggregatedDamageReason = firstSavedEntry?.damage_reason || firstSavedEntry?.damageReason || '';

          if (hasSavedEntries) {
            const hologramType = (req.hologram_type || req.hologramType || 'LOCAL').toString().toUpperCase();
            console.log(`✅ Found ${savedForRequest.length} saved entries for ${reqRef}, isFixed=${isSaved}, Type=${hologramType}`);
            console.log(`📦 Restored ${lockedRolls.length} locked rolls with data:`, lockedRolls.map(r => ({
              cartoonNumber: r.cartoonNumber,
              brandDetails: r.brandDetails,
              bottleSize: r.bottleSize,
              serialRange: r.serialRange,
              issuedQty: r.issuedQty,
              wastageQty: r.wastageQty,
              issuedRangesCount: r.issuedRanges?.length || 0,
              wastageRangesCount: r.wastageRanges?.length || 0
            })));
          }

          // Debug: Log hologram type for all entries
          const hologramType = (req.hologram_type || req.hologramType || 'LOCAL').toString().toUpperCase();
          console.log(`🔍 Entry ${reqRef}: hologram_type=${req.hologram_type}, hologramType=${req.hologramType}, finalType=${hologramType}`);

          return {
            id: req.id,
            requestId: req.id, // CRITICAL: Populate requestId for backend linking
            licenseId: String(req.license_id || req.licenseId || req.licensee_id || req.licenseeId || '').trim(),
            // Robust mapping for Reference Number: try all common variations
            referenceNo: reqRef || `REQ-${req.id}` || 'N/A',
            rollRange: allocatedRanges.map((r: any) => r.cartoonNumber).join(', '),
            dates: {
              // Backend endpoints are inconsistent: some return snake_case, others camelCase.
              // Daily Register API (OIC) uses `submissionDate`/`usageDate` (camelCase).
              submission: req.submission_date || req.submissionDate || firstSavedEntry?.submission_date || firstSavedEntry?.submissionDate || new Date().toISOString().split('T')[0],
              usage: req.usage_date || req.usageDate || firstSavedEntry?.usage_date || firstSavedEntry?.usageDate || req.submission_date || req.submissionDate || new Date().toISOString().split('T')[0]
            },
            brandDetails: hasSavedEntries && (firstSavedEntry?.brand_details || firstSavedEntry?.brandDetails)
              ? (firstSavedEntry.brand_details || firstSavedEntry.brandDetails)
              : (req.brand_id || req.brandId || 'N/A'),
            bottleSize: hasSavedEntries && (firstSavedEntry?.bottle_size || firstSavedEntry?.bottleSize)
              ? (firstSavedEntry.bottle_size || firstSavedEntry.bottleSize)
              : (req.bottle_size || req.bottleSize || '750ml'),
            hologramQty: req.quantity || 0,
            // CRITICAL: Get hologram type from request - handle both snake_case and camelCase
            // Also check if saved entry has type info (via related hologram_request)
            hologramType: (req.hologram_type || req.hologramType || 'LOCAL').toString().toUpperCase() as 'LOCAL' | 'EXPORT' | 'DEFENCE',
            isFixed: isSaved, // CRITICAL: Restore saved status from database - if saved entries exist, mark as saved
            allocatedRanges: allocatedRanges,
            rollsAssigned: rollsAssigned,
            lockedRolls: lockedRolls, // Restore locked rolls from database
            issuedFrom: hasSavedEntries ? aggregatedIssuedFrom : '',
            issuedTo: hasSavedEntries ? aggregatedIssuedTo : '',
            issuedQty: totalIssuedQty,
            wastageFrom: hasSavedEntries ? aggregatedWastageFrom : '',
            wastageTo: hasSavedEntries ? aggregatedWastageTo : '',
            wastageQty: totalWastageQty,
            leftOver: (req.quantity || 0) - totalIssuedQty - totalWastageQty,
            total: totalIssuedQty + totalWastageQty + ((req.quantity || 0) - totalIssuedQty - totalWastageQty),
            damageReason: hasSavedEntries ? aggregatedDamageReason : '',
            cartoonNumber: allocatedRanges.map((r: any) => r.cartoonNumber).join(', '),
            utilizedQuantity: totalIssuedQty,
            originalHologramQty: req.quantity || 0,
            status: req.status || ''
          };
        });

        console.log('✅ Mapped API entries:', apiEntries.length);

        // CRITICAL FIX: Also include standalone saved daily register entries
        // These are entries that were saved but may not have a matching request in the filtered list
        const standaloneEntries: any[] = [];
        const processedRefs = new Set(apiEntries.map((e: any) => e.referenceNo?.toUpperCase()));

        // Process saved entries that don't have a matching request entry
        savedEntriesMap.forEach((savedEntries, refKey) => {
          if (!processedRefs.has(refKey)) {
            console.log(`📋 Found standalone saved entries for ${refKey} (no matching request in filtered list)`);

            // Group saved entries by reference_no to create a single display entry
            const firstSaved = savedEntries[0];

            // Build lockedRolls from all saved entries for this reference
            const lockedRolls = savedEntries.map((saved: any) => {
              const savedRollRange = saved.roll_range || saved.rollRange || '';
              const brandDetails = saved.brand_details || saved.brandDetails || '';
              const bottleSize = saved.bottle_size || saved.bottleSize || '';
              const hologramQty = saved.hologram_qty || saved.hologramQty || 0;
              const issuedFrom = saved.issued_from || saved.issuedFrom || '';
              const issuedTo = saved.issued_to || saved.issuedTo || '';
              const issuedQty = saved.issued_qty || saved.issuedQty || 0;
              const wastageFrom = saved.wastage_from || saved.wastageFrom || '';
              const wastageTo = saved.wastage_to || saved.wastageTo || '';
              const wastageQty = saved.wastage_qty || saved.wastageQty || 0;
              const damageReason = saved.damage_reason || saved.damageReason || '';

              // Parse ranges
              let issuedRanges: any[] = [];
              let wastageRanges: any[] = [];

              const issuedRangesField = saved.issued_ranges || saved.issuedRanges;
              if (issuedRangesField) {
                if (typeof issuedRangesField === 'string') {
                  try { issuedRanges = JSON.parse(issuedRangesField); } catch (e) { }
                } else if (Array.isArray(issuedRangesField)) {
                  issuedRanges = issuedRangesField;
                }
              }
              if (issuedRanges.length === 0 && issuedFrom && issuedTo && issuedQty) {
                issuedRanges = [{ fromSerial: issuedFrom, toSerial: issuedTo, quantity: issuedQty }];
              }

              const wastageRangesField = saved.wastage_ranges || saved.wastageRanges;
              if (wastageRangesField) {
                if (typeof wastageRangesField === 'string') {
                  try { wastageRanges = JSON.parse(wastageRangesField); } catch (e) { }
                } else if (Array.isArray(wastageRangesField)) {
                  wastageRanges = wastageRangesField;
                }
              }
              if (wastageRanges.length === 0 && wastageFrom && wastageTo && wastageQty) {
                wastageRanges = [{ fromSerial: wastageFrom, toSerial: wastageTo, quantity: wastageQty }];
              }

              return {
                cartoonNumber: savedRollRange,
                displayName: savedRollRange,
                brandDetails: brandDetails,
                bottleSize: bottleSize,
                availableCount: hologramQty,
                serialRange: issuedFrom && issuedTo ? `${issuedFrom} - ${issuedTo}` : '-',
                fromSerial: issuedFrom,
                toSerial: issuedTo,
                issuedQty: issuedQty,
                wastageQty: wastageQty,
                leftOver: hologramQty - issuedQty - wastageQty,
                issuedRanges: issuedRanges,
                wastageRanges: wastageRanges,
                damageReason: damageReason,
                isLocked: true
              };
            });

            // Calculate totals
            const totalIssuedQty = lockedRolls.reduce((sum: number, r: any) => sum + (r.issuedQty || 0), 0);
            const totalWastageQty = lockedRolls.reduce((sum: number, r: any) => sum + (r.wastageQty || 0), 0);
            const totalHologramQty = lockedRolls.reduce((sum: number, r: any) => sum + (r.availableCount || 0), 0);

            // Get hologram type from saved entry or default to LOCAL
            const hologramType = (firstSaved.hologram_type || 'LOCAL').toString().toUpperCase();

            standaloneEntries.push({
              id: firstSaved.id || `standalone_${refKey}`,
              requestId: firstSaved.hologram_request || null,
              licenseId: String(firstSaved.license_id || firstSaved.licenseId || firstSaved.licensee_id || firstSaved.licenseeId || '').trim(),
              referenceNo: firstSaved.reference_no || firstSaved.referenceNo || refKey,
              rollRange: lockedRolls.map((r: any) => r.cartoonNumber).join(', '),
              dates: {
                submission: firstSaved.submission_date || firstSaved.submissionDate || new Date().toISOString().split('T')[0],
                usage: firstSaved.usage_date || firstSaved.usageDate || new Date().toISOString().split('T')[0]
              },
              brandDetails: firstSaved.brand_details || firstSaved.brandDetails || 'N/A',
              bottleSize: firstSaved.bottle_size || firstSaved.bottleSize || '750ml',
              hologramQty: totalHologramQty,
              hologramType: hologramType as 'LOCAL' | 'EXPORT' | 'DEFENCE',
              isFixed: true, // Saved entries are always fixed
              lockedRolls: lockedRolls,
              issuedFrom: lockedRolls.length > 0 ? lockedRolls[0].fromSerial : '',
              issuedTo: lockedRolls.length > 0 ? lockedRolls[lockedRolls.length - 1].toSerial : '',
              issuedQty: totalIssuedQty,
              wastageFrom: lockedRolls.length > 0 && lockedRolls[0].wastageRanges?.length > 0 ? lockedRolls[0].wastageRanges[0].fromSerial : '',
              wastageTo: lockedRolls.length > 0 && lockedRolls[lockedRolls.length - 1].wastageRanges?.length > 0 ? lockedRolls[lockedRolls.length - 1].wastageRanges[lockedRolls[lockedRolls.length - 1].wastageRanges.length - 1].toSerial : '',
              wastageQty: totalWastageQty,
              leftOver: totalHologramQty - totalIssuedQty - totalWastageQty,
              total: totalHologramQty,
              damageReason: firstSaved.damage_reason || firstSaved.damageReason || '',
              cartoonNumber: lockedRolls.map((r: any) => r.cartoonNumber).join(', '),
              utilizedQuantity: totalIssuedQty,
              originalHologramQty: totalHologramQty,
              allocatedRanges: [],
              rollsAssigned: []
            });
          }
        });

        console.log(`✅ Found ${standaloneEntries.length} standalone saved entries`);

        // Merge API entries with standalone saved entries
        const allEntries = [...apiEntries, ...standaloneEntries];
        console.log('✅ Total entries after merge:', allEntries.length);

        this.entries = allEntries.map((entry: any) => ({
          id: entry.id,
          referenceNo: entry.referenceNo || 'N/A',
          rollRange: entry.rollRange || '',
          dates: entry.dates || { submission: null, usage: null },
          brandDetails: entry.brandDetails || 'N/A',
          bottleSize: entry.bottleSize || '750ml',
          hologramQty: entry.hologramQty || entry.utilizedQuantity || 0,
          hologramType: (entry.hologramType || 'LOCAL').toString().toUpperCase() as 'LOCAL' | 'EXPORT' | 'DEFENCE',
          issuedFrom: entry.issuedFrom || '',
          issuedTo: entry.issuedTo || '',
          issuedQty: entry.issuedQty || 0,
          wastageFrom: entry.wastageFrom || '',
          wastageTo: entry.wastageTo || '',
          wastageQty: entry.wastageQty || 0,
          leftOver: entry.leftOver || 0,
          total: entry.total || 0,
          damageReason: entry.damageReason || '',
          isFixed: entry.isFixed || false,
          cartoonNumber: entry.cartoonNumber || '',
          utilizedQuantity: entry.utilizedQuantity || 0,
          originalHologramQty: entry.originalHologramQty || entry.hologramQty || 0,
          currentRollSelection: entry.currentRollSelection,
          lockedRolls: entry.lockedRolls || [],
          allocatedRanges: entry.allocatedRanges || [],
          rollsAssigned: entry.rollsAssigned || [] // CRITICAL FIX: Use rolls_assigned from database
        }));

        console.log('✅ Final entries:', this.entries.length);

        // CRITICAL FIX: Restore input state after loading entries
        this.restoreInputState();

        // Refresh filtering
        this.loadFilteredData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error fetching requests/procurements:', err);
        // Fallback to local storage only
        this.loadApprovedEntriesLegacy();
      }
    });
  }

  // Legacy load method for fallback
  loadApprovedEntriesLegacy(): void {
    const approvedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    const savedEntries = JSON.parse(localStorage.getItem('oicDailyRegisterEntries') || '[]');

    // (Existing logic copied for fallback)
    const savedReferenceNos = new Set<string>();
    savedEntries.forEach((entry: any) => {
      if (entry.referenceNo) savedReferenceNos.add(entry.referenceNo);
    });

    const filteredApprovedEntries = approvedEntries.filter((entry: any) => {
      return !(entry.referenceNo && savedReferenceNos.has(entry.referenceNo));
    });

    const allEntries = [...savedEntries, ...filteredApprovedEntries];

    this.entries = allEntries.map((entry: any) => ({
      id: entry.id,
      referenceNo: entry.referenceNo || 'N/A',
      rollRange: entry.rollRange || '',
      dates: {
        submission: entry.submissionDate || entry.dates?.submission || entry.date,
        usage: entry.dates?.usage || entry.date || new Date().toISOString().split('T')[0]
      },
      brandDetails: entry.brandDetails?.brandName || entry.brandDetails || 'N/A',
      bottleSize: entry.bottleSize || '750ml',
      rollsAssigned: entry.rollsAssigned || [],
      hologramQty: entry.hologramQty || entry.utilizedQuantity || 0,
      hologramType: (entry.hologramType || 'LOCAL').toUpperCase(),
      issuedFrom: entry.issuedFromSerial || entry.issuedFrom || '',
      issuedTo: entry.issuedToSerial || entry.issuedTo || '',
      issuedQty: entry.issuedQty || entry.issuedQuantity || 0,
      wastageFrom: entry.wastageFromSerial || entry.wastageFrom || '',
      wastageTo: entry.wastageToSerial || entry.wastageTo || '',
      wastageQty: entry.wastageQty || entry.wastageQuantity || 0,
      leftOver: entry.leftOver || entry.leftOverQuantity || 0,
      total: entry.total || entry.utilizedQuantity || entry.hologramQty || 0,
      damageReason: entry.damageReason || '',
      isFixed: entry.isFixed || false,
      cartoonNumber: entry.cartoonNumber,
      utilizedQuantity: entry.utilizedQuantity || entry.hologramQty || 0,
      originalHologramQty: entry.originalHologramQty || entry.utilizedQuantity || entry.hologramQty || 0,
      currentRollSelection: entry.currentRollSelection,
      lockedRolls: entry.lockedRolls || []
    }));
    this.loadFilteredData();
    this.cdr.detectChanges();
  }

  /**
   * Load liquor brands and sizes from the backend API
   * Fetches Sikkim distillery brands for dropdown population
   */
  loadLiquorBrandsData(licenseIdOverride?: string): void {
    const scopedLicense = String(
      licenseIdOverride ||
      this.selectedEntryForRollsView?.licenseId ||
      this.currentScopedLicenseId ||
      ''
    ).trim();
    this.brandWarehouseService.getBrandWarehouses().subscribe({
      next: (rows) => {
        // If scoped license is available, narrow client-side with aliases.
        // If not, trust backend auth scoping and use returned rows as-is.
        const allowedLicenses = new Set(this.expandLicenseAliases(scopedLicense));
        const scopedRows = !scopedLicense
          ? (rows || [])
          : (rows || []).filter((row: any) => {
            const rowLicense = String(row.license_id || row.licenseId || '').trim();
            if (!rowLicense) return false;
            return this.expandLicenseAliases(rowLicense).some((alias) => allowedLicenses.has(alias));
          });

        const effectiveRows = scopedRows.length > 0 ? scopedRows : (rows || []);
        const selectedType = this.normalizeHologramTypeToken(this.selectedHologramType);
        const typeFilteredRows = effectiveRows.filter((row: any) => {
          const rowType = this.normalizeHologramTypeToken(row.brand_type || row.brandType || '');
          return rowType === selectedType;
        });

        const grouped = new Map<string, Set<number>>();
        typeFilteredRows.forEach((row: any) => {
          const brandName = String(
            row.brand_name ||
            row.brandName ||
            row.liquor_data_details?.brand_name ||
            row.liquorDataDetails?.brandName ||
            ''
          ).trim();
          const rawSize = row.capacity_size ?? row.capacitySize;
          const size = Number(rawSize);
          if (!brandName || Number.isNaN(size) || size <= 0) return;

          if (!grouped.has(brandName)) grouped.set(brandName, new Set<number>());
          grouped.get(brandName)!.add(size);
        });

        const brands = Array.from(grouped.entries())
          .map(([brandName, sizes]) => ({
            brandName,
            sizes: Array.from(sizes).sort((a, b) => a - b)
          }))
          .sort((a, b) => a.brandName.localeCompare(b.brandName));

        this.liquorBrands = brands;
        this.availableBottleSizesMap.clear();
        brands.forEach((brand) => this.availableBottleSizesMap.set(brand.brandName, brand.sizes));
        console.log('? Loaded license-scoped brand warehouse brands:', this.liquorBrands.length, 'for', scopedLicense, 'type', selectedType);
      },
      error: (err) => {
        console.error('? Error loading license-scoped brand warehouse brands:', err);
        this.liquorBrands = [];
        this.availableBottleSizesMap.clear();
      }
    });
  }

  private resolveCurrentScopedLicenseId(): string {
    if (typeof window === 'undefined') return '';

    const sources = [
      sessionStorage.getItem('currentUser'),
      localStorage.getItem('currentUser'),
      sessionStorage.getItem('user'),
      localStorage.getItem('user')
    ];

    for (const raw of sources) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const resolved = this.extractLicenseId(parsed);
        if (resolved) return resolved;
      } catch {
        // Ignore non-JSON payloads
      }
    }
    return '';
  }

  private extractLicenseId(payload: any): string {
    if (!payload || typeof payload !== 'object') return '';

    const direct = this.pickFirstNonEmpty(payload, [
      'license_id', 'licenseId',
      'licensee_id', 'licenseeId'
    ]);
    if (direct) return direct;

    const nestedCandidates = [
      payload.user,
      payload.profile,
      payload.supply_chain_profile,
      payload.supplyChainProfile,
      payload.oic_assignment,
      payload.oicAssignment,
      payload.assignment
    ];
    for (const nested of nestedCandidates) {
      const nestedId = this.extractLicenseId(nested);
      if (nestedId) return nestedId;
    }

    return '';
  }

  private pickFirstNonEmpty(source: any, keys: string[]): string {
    for (const key of keys) {
      const value = source?.[key];
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return '';
  }

  private resolveProfileScopedLicenseId(): void {
    this.supplyChainProfileService.getProfile().subscribe({
      next: (profileResponse: any) => {
        const profileData = profileResponse?.data || {};
        const fromProfile = String(
          profileData?.licenseeId ||
          profileData?.licensee_id ||
          profileData?.licenseId ||
          profileData?.license_id ||
          ''
        ).trim();
        if (fromProfile && fromProfile !== this.currentScopedLicenseId) {
          this.currentScopedLicenseId = fromProfile;
          this.loadLiquorBrandsData(fromProfile);
        }
      },
      error: () => {
        // Keep storage/request-based fallback
      }
    });
  }

  private expandLicenseAliases(licenseId: string): string[] {
    const normalized = String(licenseId || '').trim();
    if (!normalized) return [];

    const aliases = [normalized];
    if (normalized.startsWith('NLI/')) aliases.push(`NA/${normalized.slice(4)}`);
    if (normalized.startsWith('NA/')) aliases.push(`NLI/${normalized.slice(3)}`);
    return aliases;
  }

  private normalizeHologramTypeToken(value: string): 'LOCAL' | 'EXPORT' | 'DEFENCE' {
    const token = String(value || '').trim().toUpperCase();
    if (token === 'DEFENSE') return 'DEFENCE';
    if (token === 'EXPORT') return 'EXPORT';
    if (token === 'DEFENCE') return 'DEFENCE';
    return 'LOCAL';
  }

  getBottleSizesForBrand(brandDetails: string | { brandName: string;[key: string]: any }): number[] {
    // Extract brand name from either string or object
    const brandName = typeof brandDetails === 'string'
      ? brandDetails
      : brandDetails?.brandName || '';

    return this.availableBottleSizesMap.get(brandName) || [];
  }

  /**
   * Format bottle size for display (e.g., 750 -> "750ml")
   */
  formatBottleSize(size: number): string {
    return `${size}ml`;
  }

  loadFilteredData(): void {
    const monthNumber = this.getMonthNumber(this.selectedMonth);
    const datePrefix = `${this.selectedYear}-${monthNumber}`;

    console.log(`🔍 Filtering Data: Month=${this.selectedMonth} (${monthNumber}), Year=${this.selectedYear}, Type=${this.selectedHologramType}`);
    console.log(`📊 Total entries before filtering: ${this.entries.length}`);
    console.log(`📊 Entry types breakdown:`, this.entries.map(e => ({ ref: e.referenceNo, type: e.hologramType })));

    this.filteredEntries = this.entries.filter(entry => {
      // Ensure dates exists
      const usageDate = entry.dates?.usage;
      const submissionDate = entry.dates?.submission;

      // CRITICAL: Filter by hologram type (LOCAL, EXPORT, DEFENCE)
      // Normalize both to uppercase for comparison to handle any case variations
      const entryType = (entry.hologramType || 'LOCAL').toString().toUpperCase();
      const selectedType = this.selectedHologramType.toString().toUpperCase();
      const typeMatch = entryType === selectedType;

      if (!typeMatch) {
        console.log(`  ❌ Type mismatch: Entry ${entry.referenceNo} has type "${entryType}" but selected is "${selectedType}"`);
        return false;
      }

      // Filter by date
      let dateMatch = false;

      if (!entry.isFixed) {
        // PENDING ENTRIES LOGIC:
        // ALWAYS SHOW pending entries for the selected type, regardless of date filter.
        // This ensures the Officer never misses a task (Action Queue behavior).
        dateMatch = true;

        // Debugging Pending Entries
        // console.log(`  Keeping Pending Entry: ${entry.referenceNo} (Always Visible)`);
      } else {
        // FIXED (Saved) ENTRIES LOGIC:
        // Strict matching on usage date
        if (!usageDate) {
          dateMatch = false;
        } else if (this.selectedDate) {
          dateMatch = usageDate === this.selectedDate;
        } else {
          dateMatch = usageDate.startsWith(datePrefix);
        }
      }

      return dateMatch;
    });

    // CRITICAL: Sort entries in CHRONOLOGICAL ORDER (oldest to newest, top to bottom)
    // This shows the flow of operations: Arrival → Utilization → Arrival → Utilization
    // Users can see how the balance changes with each transaction
    this.filteredEntries.sort((a, b) => {
      // Sort by usage date in ASCENDING order (oldest first)
      // This creates a timeline view where earlier tasks appear at the top
      const dateA = new Date(a.dates.usage || a.dates.submission || '1970-01-01').getTime();
      const dateB = new Date(b.dates.usage || b.dates.submission || '1970-01-01').getTime();

      if (dateA !== dateB) {
        return dateA - dateB; // Ascending order (oldest first)
      }

      // If dates are the same, sort by ID to maintain creation order
      // This ensures entries created at the same time appear in the order they were saved
      const idA = typeof a.id === 'number' ? a.id : parseInt(a.id || '0');
      const idB = typeof b.id === 'number' ? b.id : parseInt(b.id || '0');
      return idA - idB;
    });

    console.log(`✅ Filtered entries for ${this.selectedHologramType}: ${this.filteredEntries.length} (from ${this.entries.length} total)`);
    if (this.filteredEntries.length > 0) {
      console.log(`📋 Filtered entries:`, this.filteredEntries.map(e => ({ ref: e.referenceNo, type: e.hologramType, isFixed: e.isFixed })));
    }
  }

  getMonthNumber(month: string): string {
    const months: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    return months[month] || '01';
  }

  onMonthYearChange(): void {
    this.loadFilteredData();
    this.currentPage = 1;
  }

  onDateFilterChange(): void {
    this.loadFilteredData();
    this.currentPage = 1;
  }

  onHologramTypeChange(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): void {
    this.selectedHologramType = type;
    // Type switch must reset currently opened roll panel to prevent cross-type carry-over.
    this.selectedEntryForRollsView = null;
    this.liquorBrands = [];
    this.availableBottleSizesMap.clear();
    this.loadLiquorBrandsData();
    this.loadFilteredData();
    this.currentPage = 1;
  }

  clearAllFilters(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.selectedMonth = new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    this.selectedYear = new Date().getFullYear().toString();
    this.loadFilteredData();
    this.currentPage = 1;
  }

  hasActiveFilters(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const currentYear = new Date().getFullYear().toString();
    return this.selectedDate !== today || this.selectedMonth !== currentMonth || this.selectedYear !== currentYear;
  }

  /**
   * View rolls for a specific entry
   */
  viewRollsForEntry(entry: RegisterEntry): void {
    const entryType = this.normalizeHologramTypeToken(entry.hologramType || 'LOCAL');
    const selectedType = this.normalizeHologramTypeToken(this.selectedHologramType || 'LOCAL');
    if (entryType !== selectedType) {
      this.selectedEntryForRollsView = null;
      this.liquorBrands = [];
      this.availableBottleSizesMap.clear();
      return;
    }

    console.log('📦 Viewing rolls for entry:', entry);
    console.log('📦 Locked rolls:', this.getLockedRollsForEntry(entry));
    console.log('📦 Current selected roll:', this.getCurrentSelectedRoll(entry));
    console.log('📦 Available rolls:', this.getAvailableRollsForEntry(entry));

	    this.selectedEntryForRollsView = entry;
	    this.loadLiquorBrandsData(entry.licenseId);
	    this.cdr.detectChanges();

    // Scroll to the rolls section
    setTimeout(() => {
      const rollsSection = document.querySelector('.rolls-assigned-section');
      if (rollsSection) {
        rollsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  /**
   * Update rolls view when roll selection changes
   */
  updateRollsView(entry: RegisterEntry): void {
    if (this.selectedEntryForRollsView?.id === entry.id) {
      this.selectedEntryForRollsView = entry;
      this.cdr.detectChanges();
    }
  }

  /**
   * Clear the rolls view
   */
  clearRollsView(): void {
    this.selectedEntryForRollsView = null;
  }

  /**
   * Clear the current roll selection (used when canceling leftover range usage)
   */
  clearCurrentRollSelection(entry: RegisterEntry): void {
    entry.currentRollSelection = undefined;
    this.cdr.detectChanges();
  }

  calculateQuantityFromSerials(fromSerial: string, toSerial: string): number {
    if (!fromSerial || !toSerial) return 0;
    const from = parseInt(fromSerial.replace(/\D/g, ''), 10);
    const to = parseInt(toSerial.replace(/\D/g, ''), 10);
    return to - from + 1;
  }

  onSerialChange(entry: RegisterEntry): void {
    entry.issuedQty = this.calculateQuantityFromSerials(entry.issuedFrom, entry.issuedTo);
    entry.wastageQty = this.calculateQuantityFromSerials(entry.wastageFrom, entry.wastageTo);
    entry.leftOver = entry.hologramQty - (entry.issuedQty + entry.wastageQty);
    entry.total = entry.issuedQty + entry.wastageQty + entry.leftOver;
    this.cdr.detectChanges();
  }



  refreshData(): void {
    this.loadApprovedEntries();
    this.loadLiquorBrandsData();
    this.loadFilteredData();
  }

  getPagedEntries(): RegisterEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredEntries.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPendingEntriesCount(): number {
    return this.filteredEntries.filter(e => !e.isFixed).length;
  }

  getTotalIssuedQty(): number {
    return this.filteredEntries.reduce((sum, e) => sum + e.issuedQty, 0);
  }

  getTotalWastageQty(): number {
    return this.filteredEntries.reduce((sum, e) => sum + e.wastageQty, 0);
  }

  // Roll selection methods
  // CRITICAL: Create SEPARATE dropdown entries for each allocated range
  // Example: If roll "test1" has 2 ranges, create:
  //   - "test1 - Range 1 (1-30): 30 units"
  //   - "test1 - Range 2 (010001-010003): 3 units"
  getAvailableRollsForEntry(entry: RegisterEntry): any[] {
    console.log('🎯 Getting available rolls for entry:', entry.id);

    const availableRolls: any[] = [];

    console.log('🔍🔍🔍 getAvailableRollsForEntry - Entry data:', {
      referenceNo: entry.referenceNo,
      hasRollsAssigned: !!(entry as any).rollsAssigned,
      hasAllocatedRanges: !!(entry as any).allocatedRanges,
      rollsAssignedLength: ((entry as any).rollsAssigned || []).length,
      allocatedRangesLength: ((entry as any).allocatedRanges || []).length
    });

    // CRITICAL FIX: Use rollsAssigned from entry (contains the actual allocated ranges from backend)
    // rollsAssigned is populated by the backend with the exact ranges that were allocated (e.g., 4-4, 7-7)
    // allocatedRanges comes from procurement carton_details and contains full roll ranges (e.g., 101-101, 102-102)
    const rollsAssigned = (entry as any).rollsAssigned || [];
    const allocatedRanges = (entry as any).allocatedRanges || [];

    // CRITICAL FIX: Prioritize rollsAssigned over allocatedRanges to show correct allocated ranges
    // rollsAssigned contains the TRUE allocated ranges sent from frontend during allocation (e.g., 4-4, 7-7)
    // allocatedRanges contains full roll ranges from procurement (e.g., 101-101, 102-102) - WRONG!
    let allAllocations: any[] = [];
    if (rollsAssigned && rollsAssigned.length > 0) {
      allAllocations = rollsAssigned;
      console.log('✅ Using rollsAssigned for available rolls (Priority 1 - TRUE ALLOCATED RANGES FROM BACKEND)');
      console.log('📦 rollsAssigned data:', JSON.stringify(rollsAssigned, null, 2));
    } else if (allocatedRanges && allocatedRanges.length > 0) {
      allAllocations = allocatedRanges;
      console.log('⚠️ Using allocatedRanges for available rolls (Priority 2 - FALLBACK FROM PROCUREMENT)');
      console.log('📦 allocatedRanges data:', JSON.stringify(allocatedRanges, null, 2));
    } else {
      allAllocations = [];
      console.log('❌ No allocation data found');
    }

    console.log('📦 Final allAllocations to use:', JSON.stringify(allAllocations, null, 2));

    // Track added cartons to avoid duplicates from pool
    const addedCartons = new Set<string>();

    if (allAllocations && allAllocations.length > 0) {
      console.log('✅ Using API allocation data (NOT localStorage):', allAllocations);

      // CRITICAL FIX: Create SEPARATE dropdown entries for each range
      // Instead of grouping multiple ranges into one roll, each range gets its own entry
      const rangeCountPerRoll = new Map<string, number>(); // Track how many ranges each roll has

      allAllocations.forEach((allocation: any) => {
        const cartoonNumber = allocation.cartoonNumber || allocation.cartoon_number || '';
        const quantity = allocation.quantity || allocation.count || 0;
        const fromSerial = allocation.fromSerial || allocation.from_serial || allocation.from || '';
        const toSerial = allocation.toSerial || allocation.to_serial || allocation.to || '';
        const serialRange = allocation.serialRange || allocation.range || `${fromSerial} - ${toSerial}`;

        if (!cartoonNumber) return;

        // Increment range count for this roll
        const currentRangeCount = rangeCountPerRoll.get(cartoonNumber) || 0;
        rangeCountPerRoll.set(cartoonNumber, currentRangeCount + 1);
        const rangeIndex = currentRangeCount + 1;

        // Create a unique identifier for this specific range
        const rangeId = `${cartoonNumber}_RANGE_${rangeIndex}`;

        // Check if this roll is LOCKED
        const lockedRolls = this.getLockedRollsForEntry(entry);
        const isLocked = lockedRolls.some((lr: RollInput) => {
          // Check for exact rangeId match (if available)
          if (lr.rangeId === rangeId) return true;

          // If rangeId doesn't match/exist, check if it's the same carton AND same serial range
          // This prevents locking ALL ranges of a carton when only one is used
          if (lr.cartoonNumber === cartoonNumber) {
            // Strict check: serials must match if they exist
            if (fromSerial && toSerial && lr.allocatedFromSerial && lr.allocatedToSerial) {
              return lr.allocatedFromSerial === fromSerial && lr.allocatedToSerial === toSerial;
            }
            // If we can't match serials, fallback to rangeId or skip locking to avoid false positives
            return false;
          }
          return false;
        });

        // Determine display name
        // NO leftover info as requested by user
        let displayName = `${cartoonNumber} - ${serialRange}`;
        if (isLocked) {
          displayName += ' (Locked)';
        }

        // Create separate entry for this range
        availableRolls.push({
          cartoonNumber: cartoonNumber, // Original cartoon number (for grouping if needed)
          rangeId: rangeId, // Unique ID for this specific range
          rangeIndex: rangeIndex, // Which range number (1, 2, 3, etc.)
          displayName: displayName, // Show range in dropdown without leftover info, plus locked status
          allocatedQuantity: quantity,
          availableCount: quantity,
          serialRange: serialRange,
          fromSerial: fromSerial,
          toSerial: toSerial,
          isSingleRange: true, // Mark as single range entry
          originalCartoonNumber: cartoonNumber, // Store original cartoon number for reference
          isLocked: isLocked // Add locked flag for potential UI styling (though text handles it now)
        });

        addedCartons.add(cartoonNumber);
      });

      console.log('✅ Separate range entries (each range is independent):', availableRolls);
      console.log('📊 Ranges per roll:', Array.from(rangeCountPerRoll.entries()));
    }


    // CRITICAL FIX: ONLY add stock pool if NO allocations were found
    // If rolls are explicitly assigned (allAllocations > 0), show ONLY those rolls
    if (allAllocations.length === 0) {
      console.log(`🏊 NO ALLOCATIONS FOUND - Checking Stock Pool and localStorage fallback`);

      // Try procurement cache first
      if (this.procurementCache && this.procurementCache.length > 0) {
        console.log(`📦 Accessing Stock Pool (Cache: ${this.procurementCache.length}) for Type: ${entry.hologramType}`);

        this.procurementCache.forEach(proc => {
          // 1. Check Matching Type
          let pType = (proc.type || '').toUpperCase();
          if (!pType) {
            // Infer type if missing
            if (proc.localQty > 0 || proc.local_qty > 0) pType = 'LOCAL';
            else if (proc.exportQty > 0 || proc.export_qty > 0) pType = 'EXPORT';
            else if (proc.defenceQty > 0 || proc.defence_qty > 0) pType = 'DEFENCE';
            else pType = 'LOCAL';
          }

          if (pType !== entry.hologramType) return;

          // 2. Extract Cartons
          const cartons = proc.carton_details || proc.cartonDetails || proc.cartoons || proc.cartoon_details || [];

          cartons.forEach((c: any) => {
            const cNo = c.cartoonNumber || c.cartoon_number || c.carton_number;

            // 3. Skip if already added via strict allocation
            if (addedCartons.has(cNo)) return;

            // 4. Add to availableRolls
            let qty = c.quantity || c.totalCount || 0;
            const fromSerial = c.fromSerial || c.from_serial || '';
            const toSerial = c.toSerial || c.to_serial || '';
            const serialRange = c.serialRange || (fromSerial && toSerial ? `${fromSerial} - ${toSerial}` : 'N/A');

            if (!qty && fromSerial && toSerial) {
              // Recalculate quantity if missing
              const start = parseInt(fromSerial, 10);
              const end = parseInt(toSerial, 10);
              if (!isNaN(start) && !isNaN(end)) qty = end - start + 1;
            }

            if (cNo && qty > 0) {
              availableRolls.push({
                cartoonNumber: cNo,
                rangeId: cNo, // Use carton number as ID for full rolls
                rangeIndex: 1,
                displayName: `${cNo} - ${serialRange} (${qty} units)`, // Format for pool items
                allocatedQuantity: qty,
                availableCount: qty,
                serialRange: serialRange,
                fromSerial: fromSerial,
                toSerial: toSerial,
                isSingleRange: true,
                originalCartoonNumber: cNo,
              });
              addedCartons.add(cNo); // Prevent duplicates from other procurements
            }
          });
        });
        console.log(`✅ Final available rolls count from Stock Pool: ${availableRolls.length}`);
      }

      // Fallback to localStorage ONLY if no rolls found yet
      if (availableRolls.length === 0) {
        console.log(`⚠️ No rolls from cache, trying localStorage fallback`);
        const allOverviewRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
        const fallbackRolls = allOverviewRolls.filter((r: any) => r.type === entry.hologramType && r.availableCount > 0 && !addedCartons.has(r.cartoonNumber));

        if (fallbackRolls.length > 0) {
          console.log(`✅ Using localStorage fallback, found ${fallbackRolls.length} rolls`);
          availableRolls.push(...fallbackRolls.map((r: any) => ({
            cartoonNumber: r.cartoonNumber,
            rangeId: r.cartoonNumber,
            displayName: `${r.cartoonNumber} - ${r.serialRange || r.fromSerial + '-' + r.toSerial} (${r.availableCount} units)`,
            availableCount: r.availableCount,
            serialRange: r.serialRange || `${r.fromSerial} - ${r.toSerial}`,
            fromSerial: r.fromSerial,
            toSerial: r.toSerial,
          })));
        }
      }
    } else {
      console.log(`✅ Using ONLY allocated rolls (${allAllocations.length}), skipping stock pool and localStorage`);
    }

    // NOTE: We no longer add leftover ranges as separate dropdown entries
    // Leftover ranges are only shown in the Usage section with "Use" buttons
    // The dropdown only shows originally assigned rolls with leftover info appended

    return availableRolls;
  }

  selectRollForEntry(entry: RegisterEntry, cartoonNumberOrRangeId: string): void {
    if (!cartoonNumberOrRangeId) return;

    // Find the roll details (could be a rangeId like "test1_RANGE_1" or just cartoon number)
    const roll = this.getAvailableRollsForEntry(entry).find(r =>
      r.rangeId === cartoonNumberOrRangeId || r.cartoonNumber === cartoonNumberOrRangeId
    );
    if (!roll) return;

    // Check if this specific range is already locked
    const lockedRolls = this.getLockedRollsForEntry(entry);
    const rangeIdToCheck = roll.rangeId || roll.cartoonNumber;
    const lockedRoll = lockedRolls.find((lr: any) => (lr.rangeId || lr.cartoonNumber) === rangeIdToCheck);

    if (lockedRoll) {
      // Instead of showing alert, display the locked roll in read-only mode
      console.log('📌 Viewing locked roll in read-only mode:', lockedRoll);
      console.log('📝 Usage history:', lockedRoll.leftoverUsageHistory);

      // CRITICAL FIX: Create a COPY of the locked roll to avoid modifying the original
      // This ensures each entry shows only its own usage without affecting other entries
      const rollCopy = { ...lockedRoll };

      // CRITICAL FIX: Recalculate leftOver from actual leftover ranges
      // This ensures the displayed leftOver matches the sum of available ranges
      const leftoverRanges = this.getLeftoverRanges(entry, rollCopy);
      const calculatedLeftOver = leftoverRanges.reduce((sum, r) => sum + r.quantity, 0);

      console.log('🔄 Recalculating leftOver for locked roll:');
      console.log('  - Old leftOver:', rollCopy.leftOver);
      console.log('  - Calculated from ranges:', calculatedLeftOver);
      console.log('  - Leftover ranges:', leftoverRanges);

      // Update the copy's leftOver to match the calculated value
      rollCopy.leftOver = calculatedLeftOver;

      // CRITICAL FIX: Recalculate issuedQty and wastageQty to include leftover reuses
      // The original issuedQty/wastageQty only includes the first lock, not subsequent leftover uses
      let totalIssuedQty = 0;
      let totalWastageQty = 0;

      // Add original issued and wastage quantities
      if (rollCopy.issuedRanges && Array.isArray(rollCopy.issuedRanges)) {
        totalIssuedQty += rollCopy.issuedRanges.reduce((sum: number, range: any) => sum + (range.quantity || 0), 0);
      }

      if (rollCopy.wastageRanges && Array.isArray(rollCopy.wastageRanges)) {
        totalWastageQty += rollCopy.wastageRanges.reduce((sum: number, range: any) => sum + (range.quantity || 0), 0);
      }

      // Add quantities from leftover usage history
      if (rollCopy.leftoverUsageHistory && rollCopy.leftoverUsageHistory.length > 0) {
        rollCopy.leftoverUsageHistory.forEach((history: LeftoverUsageHistory) => {
          totalIssuedQty += history.usedQty || 0;
          totalWastageQty += history.damagedQty || 0;
        });
      }

      console.log('🔄 Recalculating usage quantities for locked roll:');
      console.log('  - Old issuedQty:', rollCopy.issuedQty);
      console.log('  - New issuedQty (including leftover reuses):', totalIssuedQty);
      console.log('  - Old wastageQty:', rollCopy.wastageQty);
      console.log('  - New wastageQty (including leftover reuses):', totalWastageQty);

      // Update the copy's quantities (NOT the original locked roll)
      rollCopy.issuedQty = totalIssuedQty;
      rollCopy.wastageQty = totalWastageQty;

      // CRITICAL: Use the COPY so we don't modify the original locked roll
      // This ensures each entry shows only its own usage
      entry.currentRollSelection = {
        selectedRoll: rangeIdToCheck,
        rollInput: rollCopy, // Use the copy with recalculated values
        isLocked: true // Mark as locked (read-only)
      };

      this.cdr.detectChanges();
      return;
    }

    // Store the rangeId (or cartoonNumber if no rangeId) as the selectedRoll
    const selectedRollId = roll.rangeId || roll.cartoonNumber;

    entry.currentRollSelection = {
      selectedRoll: selectedRollId, // Use rangeId for specific range tracking
      rollInput: {
        cartoonNumber: roll.originalCartoonNumber || roll.cartoonNumber, // Store original cartoon number
        rangeId: roll.rangeId, // Store range ID for tracking
        displayName: roll.displayName || roll.cartoonNumber, // Store display name for UI
        rangeIndex: roll.rangeIndex, // Store which range this is (1, 2, 3, etc.)
        availableCount: roll.availableCount,
        serialRange: roll.serialRange,
        fromSerial: roll.fromSerial, // Store the specific range's from serial
        toSerial: roll.toSerial, // Store the specific range's to serial
        issuedRanges: [{ fromSerial: '', toSerial: '', quantity: 0 }],
        wastageRanges: [{ fromSerial: '', toSerial: '', quantity: 0 }],
        issuedQty: 0,
        wastageQty: 0,
        leftOver: roll.availableCount,
        damageReason: '',
        brandDetails: '',
        bottleSize: ''
      },
      isLocked: false
    };

    this.cdr.detectChanges();

    console.log(`🎯 Selected range ${roll.displayName} (${selectedRollId}), serial range: ${roll.serialRange}`);

    // Save input state after selecting a roll
    this.saveInputState();
  }



  /**
   * Validate if a serial range is within ANY of the allocated ranges for a roll
   * CRITICAL FIX: Ensures the ENTIRE range (from-to) is within a SINGLE allocated range
   * This prevents users from entering ranges that span across multiple non-contiguous slots
   */
  validateSerialRangeInAllocatedRanges(
    fromSerial: string,
    toSerial: string,
    allocatedRanges: Array<{ fromSerial: string; toSerial: string }>
  ): { isValid: boolean; errorMessage: string } {
    if (!fromSerial || !toSerial) {
      return { isValid: true, errorMessage: '' }; // Empty is valid (not required yet)
    }

    if (!allocatedRanges || allocatedRanges.length === 0) {
      return { isValid: false, errorMessage: 'Allocated ranges not found for this roll' };
    }

    // Extract numeric parts
    const extractNumber = (s: string): number => {
      const match = s.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const fromNum = extractNumber(fromSerial);
    const toNum = extractNumber(toSerial);

    // Check if range is valid (from <= to)
    if (fromNum > toNum) {
      return { isValid: false, errorMessage: 'From serial must be less than or equal to To serial' };
    }

    // CRITICAL FIX: Check if the ENTIRE range (both from AND to) is within a SINGLE allocated range
    // This prevents spanning across multiple non-contiguous ranges
    for (const allocatedRange of allocatedRanges) {
      const allocatedFromNum = extractNumber(allocatedRange.fromSerial);
      const allocatedToNum = extractNumber(allocatedRange.toSerial);

      // Both fromNum AND toNum must be within the SAME allocated range
      if (fromNum >= allocatedFromNum && toNum <= allocatedToNum) {
        return { isValid: true, errorMessage: '' };
      }
    }

    // Range is not within any single allocated range
    const rangesStr = allocatedRanges.map(r => `${r.fromSerial}-${r.toSerial}`).join(', ');
    return {
      isValid: false,
      errorMessage: `Serial range must be entirely within ONE of the allocated ranges: ${rangesStr}`
    };
  }

  /**
   * Check if two serial ranges overlap
   */
  private checkRangeOverlap(
    range1From: string,
    range1To: string,
    range2From: string,
    range2To: string
  ): boolean {
    if (!range1From || !range1To || !range2From || !range2To) {
      return false; // Empty ranges don't overlap
    }

    const extractNumber = (s: string): number => {
      const match = s.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const r1From = extractNumber(range1From);
    const r1To = extractNumber(range1To);
    const r2From = extractNumber(range2From);
    const r2To = extractNumber(range2To);

    // Check if ranges overlap: range1 overlaps range2 if:
    // - range1 starts within range2, OR
    // - range1 ends within range2, OR
    // - range1 completely contains range2
    return (
      (r1From >= r2From && r1From <= r2To) || // range1 starts within range2
      (r1To >= r2From && r1To <= r2To) ||     // range1 ends within range2
      (r1From <= r2From && r1To >= r2To)      // range1 contains range2
    );
  }

  /**
   * Validate that ranges within the same category don't overlap
   */
  private validateNoOverlapWithinCategory(ranges: RollRange[]): { isValid: boolean; overlappingRanges: string[] } {
    const overlappingRanges: string[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const range1 = ranges[i];
      if (!range1.fromSerial || !range1.toSerial) continue;

      for (let j = i + 1; j < ranges.length; j++) {
        const range2 = ranges[j];
        if (!range2.fromSerial || !range2.toSerial) continue;

        if (this.checkRangeOverlap(
          range1.fromSerial,
          range1.toSerial,
          range2.fromSerial,
          range2.toSerial
        )) {
          overlappingRanges.push(
            `Range ${i + 1} (${range1.fromSerial}-${range1.toSerial}) overlaps with Range ${j + 1} (${range2.fromSerial}-${range2.toSerial})`
          );
        }
      }
    }

    return {
      isValid: overlappingRanges.length === 0,
      overlappingRanges
    };
  }

  /**
   * Validate that issued and wastage ranges don't overlap
   */
  private validateNoOverlapBetweenIssuedAndWastage(
    issuedRanges: RollRange[],
    wastageRanges: RollRange[]
  ): { isValid: boolean; overlappingRanges: string[] } {
    const overlappingRanges: string[] = [];

    // Check each issued range against all wastage ranges
    for (let i = 0; i < issuedRanges.length; i++) {
      const issued = issuedRanges[i];
      if (!issued.fromSerial || !issued.toSerial) continue;

      for (let j = 0; j < wastageRanges.length; j++) {
        const wastage = wastageRanges[j];
        if (!wastage.fromSerial || !wastage.toSerial) continue;

        if (this.checkRangeOverlap(
          issued.fromSerial,
          issued.toSerial,
          wastage.fromSerial,
          wastage.toSerial
        )) {
          overlappingRanges.push(
            `Issued (${issued.fromSerial}-${issued.toSerial}) overlaps with Wastage (${wastage.fromSerial}-${wastage.toSerial})`
          );
        }
      }
    }

    return {
      isValid: overlappingRanges.length === 0,
      overlappingRanges
    };
  }

  /**
   * Get all used ranges from locked rolls (for cross-roll validation)
   * CRITICAL FIX: Only get ranges from OTHER rolls, not the current roll being edited
   * Each roll should only validate against its own allocated ranges, not other rolls' ranges
   */
  private getAllUsedRangesFromLockedRolls(entry: RegisterEntry, currentRollCartoonNumber?: string): Array<{ fromSerial: string; toSerial: string; rollName: string; type: 'issued' | 'wastage' }> {
    const lockedRolls = this.getLockedRollsForEntry(entry);
    const usedRanges: Array<{ fromSerial: string; toSerial: string; rollName: string; type: 'issued' | 'wastage' }> = [];

    lockedRolls.forEach((roll) => {
      // CRITICAL FIX: Skip the current roll being edited
      // Each roll has its own allocated ranges and should not interfere with other rolls
      if (currentRollCartoonNumber && roll.cartoonNumber === currentRollCartoonNumber) {
        console.log(`⏭️ Skipping current roll ${currentRollCartoonNumber} from cross-roll validation`);
        return; // Skip this roll
      }

      // Collect issued ranges from locked roll
      if (roll.issuedRanges && Array.isArray(roll.issuedRanges)) {
        roll.issuedRanges.forEach((range: any) => {
          if (range.fromSerial && range.toSerial) {
            usedRanges.push({
              fromSerial: range.fromSerial,
              toSerial: range.toSerial,
              rollName: roll.displayName || roll.cartoonNumber,
              type: 'issued'
            });
          }
        });
      }

      // Collect wastage ranges from locked roll
      if (roll.wastageRanges && Array.isArray(roll.wastageRanges)) {
        roll.wastageRanges.forEach((range: any) => {
          if (range.fromSerial && range.toSerial) {
            usedRanges.push({
              fromSerial: range.fromSerial,
              toSerial: range.toSerial,
              rollName: roll.displayName || roll.cartoonNumber,
              type: 'wastage'
            });
          }
        });
      }
    });

    return usedRanges;
  }

  /**
   * Validate that current roll ranges don't overlap with locked rolls
   */
  private validateNoOverlapWithLockedRolls(
    currentRanges: RollRange[],
    lockedRanges: Array<{ fromSerial: string; toSerial: string; rollName: string; type: 'issued' | 'wastage' }>
  ): { isValid: boolean; conflicts: Array<{ currentRange: RollRange; lockedRange: any }> } {
    const conflicts: Array<{ currentRange: RollRange; lockedRange: any }> = [];

    currentRanges.forEach((currentRange) => {
      if (!currentRange.fromSerial || !currentRange.toSerial) return;

      lockedRanges.forEach((lockedRange) => {
        if (this.checkRangeOverlap(
          currentRange.fromSerial,
          currentRange.toSerial,
          lockedRange.fromSerial,
          lockedRange.toSerial
        )) {
          conflicts.push({
            currentRange,
            lockedRange
          });
        }
      });
    });

    return {
      isValid: conflicts.length === 0,
      conflicts
    };
  }

  onRollInputChange(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return;

    const cartoonNumber = rollInput.cartoonNumber;

    // CRITICAL FIX: If a specific range was selected (rangeId exists), validate against ONLY that range
    // Otherwise, validate against all ranges for backward compatibility
    let allocatedRanges: Array<{ fromSerial: string; toSerial: string }>;

    if (rollInput.fromSerial && rollInput.toSerial) {
      // Use the SPECIFIC range that was selected (stored in rollInput)
      allocatedRanges = [{
        fromSerial: rollInput.fromSerial,
        toSerial: rollInput.toSerial
      }];
      console.log(`🎯 Validating against SELECTED range only: ${rollInput.fromSerial}-${rollInput.toSerial}`);
    } else {
      // Fallback: get all ranges for this roll (for backward compatibility)
      allocatedRanges = this.getAllocatedRangesForRoll(entry, cartoonNumber).map(r => ({
        fromSerial: r.fromSerial,
        toSerial: r.toSerial
      }));
      console.log(`⚠️ Validating against ALL ranges for ${cartoonNumber}:`, allocatedRanges);
    }

    // Validate and calculate issued ranges
    rollInput.issuedQty = rollInput.issuedRanges.reduce((sum, range) => {
      range.quantity = this.calculateQuantityFromSerials(range.fromSerial, range.toSerial);

      // Validate range against the allocated range(s)
      if (allocatedRanges.length > 0) {
        const validation = this.validateSerialRangeInAllocatedRanges(
          range.fromSerial,
          range.toSerial,
          allocatedRanges
        );
        range.isValid = validation.isValid;
        range.errorMessage = validation.errorMessage;
      } else {
        range.isValid = true; // No allocated ranges found, skip validation
        range.errorMessage = '';
      }

      return sum + range.quantity;
    }, 0);

    // Validate and calculate wastage ranges
    rollInput.wastageQty = rollInput.wastageRanges.reduce((sum, range) => {
      range.quantity = this.calculateQuantityFromSerials(range.fromSerial, range.toSerial);

      // Validate range against the allocated range(s)
      if (allocatedRanges.length > 0) {
        const validation = this.validateSerialRangeInAllocatedRanges(
          range.fromSerial,
          range.toSerial,
          allocatedRanges
        );
        range.isValid = validation.isValid;
        range.errorMessage = validation.errorMessage;
      } else {
        range.isValid = true; // No allocated ranges found, skip validation
        range.errorMessage = '';
      }

      return sum + range.quantity;
    }, 0);

    // NEW: Validate that issued ranges don't overlap with each other (within current roll)
    const issuedOverlapCheck = this.validateNoOverlapWithinCategory(rollInput.issuedRanges);
    if (!issuedOverlapCheck.isValid) {
      // Mark all issued ranges as invalid if there's overlap
      rollInput.issuedRanges.forEach((range, index) => {
        if (range.fromSerial && range.toSerial) {
          range.isValid = false;
          range.errorMessage = `Issued ranges overlap within this roll: ${issuedOverlapCheck.overlappingRanges[0]}`;
        }
      });
    }

    // NEW: Validate that wastage ranges don't overlap with each other (within current roll)
    const wastageOverlapCheck = this.validateNoOverlapWithinCategory(rollInput.wastageRanges);
    if (!wastageOverlapCheck.isValid) {
      // Mark all wastage ranges as invalid if there's overlap
      rollInput.wastageRanges.forEach((range, index) => {
        if (range.fromSerial && range.toSerial) {
          range.isValid = false;
          range.errorMessage = `Wastage ranges overlap within this roll: ${wastageOverlapCheck.overlappingRanges[0]}`;
        }
      });
    }

    // NEW: Validate that issued and wastage ranges don't overlap (within current roll)
    const crossOverlapCheck = this.validateNoOverlapBetweenIssuedAndWastage(
      rollInput.issuedRanges,
      rollInput.wastageRanges
    );

    if (!crossOverlapCheck.isValid) {
      // Mark overlapping ranges as invalid
      rollInput.issuedRanges.forEach((issued) => {
        if (!issued.fromSerial || !issued.toSerial) return;

        rollInput.wastageRanges.forEach((wastage) => {
          if (!wastage.fromSerial || !wastage.toSerial) return;

          if (this.checkRangeOverlap(
            issued.fromSerial,
            issued.toSerial,
            wastage.fromSerial,
            wastage.toSerial
          )) {
            issued.isValid = false;
            issued.errorMessage = `Overlaps with wastage range (${wastage.fromSerial}-${wastage.toSerial}) in this roll`;
            wastage.isValid = false;
            wastage.errorMessage = `Overlaps with issued range (${issued.fromSerial}-${issued.toSerial}) in this roll`;
          }
        });
      });
    }

    // CRITICAL FIX: REMOVED CROSS-ROLL VALIDATION
    // Each roll has its own independent allocated ranges
    // Ranges from "test1" should NOT affect ranges from "test2" or any other roll
    // Only validate within the current roll's own allocated ranges (already done above)
    // 
    // Example:
    // - Roll "test1" has ranges: 000001-100000
    // - Roll "test2" has ranges: 000001-050000
    // - These are INDEPENDENT and should NOT validate against each other
    // - Each roll only validates against its OWN allocated ranges
    console.log(`✅ Skipping cross-roll validation - each roll is independent with its own allocated ranges`);

    // CRITICAL FIX: Calculate leftOver correctly
    // For leftover reuse ranges, availableCount represents the leftover quantity being reused
    // For original ranges, availableCount represents the full allocated quantity
    // The formula should always be: leftOver = availableCount - (issuedQty + wastageQty)
    rollInput.leftOver = rollInput.availableCount - (rollInput.issuedQty + rollInput.wastageQty);

    // Ensure leftOver is never negative
    if (rollInput.leftOver < 0) {
      rollInput.leftOver = 0;
    }

    // Recalculate entry totals from all rolls (locked + current)
    this.recalculateEntryFromLockedRolls(entry);
    this.cdr.detectChanges();

    // Save input state after any change
    this.saveInputState();
  }

  addIssuedRange(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return;

    rollInput.issuedRanges.push({ fromSerial: '', toSerial: '', quantity: 0 });
    this.cdr.detectChanges();
  }

  removeIssuedRange(entry: RegisterEntry, index: number): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput || rollInput.issuedRanges.length <= 1) return;

    rollInput.issuedRanges.splice(index, 1);
    this.onRollInputChange(entry);
  }

  addWastageRange(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return;

    rollInput.wastageRanges.push({ fromSerial: '', toSerial: '', quantity: 0 });
    this.cdr.detectChanges();
  }

  removeWastageRange(entry: RegisterEntry, index: number): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput || rollInput.wastageRanges.length <= 1) return;

    rollInput.wastageRanges.splice(index, 1);
    this.onRollInputChange(entry);
  }

  canLockRoll(entry: RegisterEntry): boolean {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return false;

    // CRITICAL: If the roll is already locked (read-only mode), cannot lock again
    if (this.isCurrentRollLocked(entry)) {
      return false;
    }

    // CRITICAL FIX: Handle both single-brand and multi-brand modes
    const isMultiBrand = this.isMultiBrandMode(rollInput);

    if (isMultiBrand) {
      // Multi-brand mode validation
      if (!rollInput.brands || rollInput.brands.length === 0) return false;

      // Check if all brands have brand name and bottle size filled
      const allBrandsHaveDetails = rollInput.brands.every((brand) => {
        const hasBrandName = !!brand.brandName && brand.brandName.trim() !== '';
        const hasBottleSize = !!brand.bottleSize && brand.bottleSize.trim() !== '';
        return hasBrandName && hasBottleSize;
      });

      if (!allBrandsHaveDetails) return false;

      // Check if at least ONE brand has valid ranges
      let hasValidRangeInAnyBrand = false;

      for (const brand of rollInput.brands) {
        // Check issued ranges for this brand
        if (brand.issuedRanges && brand.issuedRanges.length > 0) {
          const hasValidIssued = brand.issuedRanges.some((range) => {
            const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
            const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
            return hasFrom && hasTo && range.quantity > 0 && range.isValid !== false;
          });
          if (hasValidIssued) {
            hasValidRangeInAnyBrand = true;
            break;
          }
        }

        // Check wastage ranges for this brand
        if (brand.wastageRanges && brand.wastageRanges.length > 0) {
          const hasValidWastage = brand.wastageRanges.some((range) => {
            const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
            const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
            return hasFrom && hasTo && range.quantity > 0 && range.isValid !== false;
          });
          if (hasValidWastage) {
            hasValidRangeInAnyBrand = true;
            break;
          }
        }
      }

      if (!hasValidRangeInAnyBrand) return false;
    } else {
      // Single-brand mode validation (legacy)
      // Check if brand details and bottle size are filled
      if (!rollInput.brandDetails || rollInput.brandDetails.trim() === '') return false;
      if (!rollInput.bottleSize || rollInput.bottleSize.trim() === '') return false;
    }

    // CRITICAL: Check if ANY data is entered (issued OR wastage)
    // It's valid to have ONLY wastage (no issued) or ONLY issued (no wastage)
    let hasValidIssuedRange = false;
    let hasValidWastageRange = false;

    // CRITICAL FIX: Only do legacy range validation if NOT in multi-brand mode
    // In multi-brand mode, we already validated ranges above
    if (!isMultiBrand) {
      // Check ISSUED ranges: Both FROM and TO must be filled for any range that has started
      if (rollInput.issuedRanges && rollInput.issuedRanges.length > 0) {
        // Check if any issued range has only one field filled (incomplete)
        const hasIncompleteIssuedRange = rollInput.issuedRanges.some((range) => {
          const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
          const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
          // If either FROM or TO is filled, both must be filled
          return (hasFrom && !hasTo) || (!hasFrom && hasTo);
        });

        if (hasIncompleteIssuedRange) return false;

        // Check if there's at least one complete issued range with valid serials
        hasValidIssuedRange = rollInput.issuedRanges.some((range) => {
          const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
          const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
          return hasFrom && hasTo && range.quantity > 0;
        });

        // If there are issued ranges, check if all complete ones are valid (within allocated range)
        if (hasValidIssuedRange) {
          const allIssuedRangesValid = rollInput.issuedRanges.every((range) => {
            const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
            const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
            // If range is incomplete (empty), skip validation
            if (!hasFrom && !hasTo) return true;
            // If range is complete, check if it's valid
            return range.isValid !== false;
          });

          if (!allIssuedRangesValid) return false;
        }
      }

      // Check WASTAGE ranges: Both FROM and TO must be filled for any range that has started
      if (rollInput.wastageRanges && rollInput.wastageRanges.length > 0) {
        // Check if any wastage range has only one field filled (incomplete)
        const hasIncompleteWastageRange = rollInput.wastageRanges.some((range) => {
          const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
          const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
          // If either FROM or TO is filled, both must be filled
          return (hasFrom && !hasTo) || (!hasFrom && hasTo);
        });

        if (hasIncompleteWastageRange) return false;

        // Check if there's at least one complete wastage range with valid serials
        hasValidWastageRange = rollInput.wastageRanges.some((range) => {
          const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
          const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
          return hasFrom && hasTo && range.quantity > 0;
        });

        // If there are wastage ranges, check if all complete ones are valid (within allocated range)
        if (hasValidWastageRange) {
          const allWastageRangesValid = rollInput.wastageRanges.every((range) => {
            const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
            const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
            // If range is incomplete (empty), skip validation
            if (!hasFrom && !hasTo) return true;
            // If range is complete, check if it's valid
            return range.isValid !== false;
          });

          if (!allWastageRangesValid) return false;
        }
      }

      // CRITICAL FIX: Must have at least ONE valid range (either issued OR wastage) in single-brand mode
      // This allows locking with ONLY wastage (no issued) or ONLY issued (no wastage)
      if (!hasValidIssuedRange && !hasValidWastageRange) {
        return false;
      }
    }

    // Left over must not be negative
    if (rollInput.leftOver < 0) return false;

    return true;
  }

  lockRollForEntry(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) {
      alert('Please select a roll first.');
      return;
    }

    // CRITICAL: Prevent locking if this is a read-only (already locked) roll
    if (this.isCurrentRollLocked(entry)) {
      alert('This roll is already locked and cannot be locked again.\n\nYou are viewing it in read-only mode.');
      return;
    }

    // CRITICAL: Check if this roll is already in the locked rolls list
    const lockedRolls = entry.lockedRolls || [];
    const rangeIdToCheck = rollInput.rangeId || rollInput.cartoonNumber;
    const alreadyLocked = lockedRolls.some((lr: any) => (lr.rangeId || lr.cartoonNumber) === rangeIdToCheck);

    if (alreadyLocked) {
      alert('This roll has already been locked.\n\nPlease select a different roll.');
      return;
    }

    // Check if this is a leftover reuse - if so, record usage history in parent roll
    const isLeftoverReuse = rollInput.rangeId?.includes('_LEFTOVER_');
    if (isLeftoverReuse && rollInput.parentRollId) {
      this.recordLeftoverUsageHistory(entry, rollInput);
    }

    if (!this.canLockRoll(entry)) {
      // Check for validation errors
      const invalidIssuedRanges = rollInput.issuedRanges?.filter((r) => r.isValid === false && r.errorMessage);
      const invalidWastageRanges = rollInput.wastageRanges?.filter((r) => r.isValid === false && r.errorMessage);

      // Check for incomplete ranges
      const incompleteIssuedRanges = rollInput.issuedRanges?.filter((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return (hasFrom && !hasTo) || (!hasFrom && hasTo);
      });

      const incompleteWastageRanges = rollInput.wastageRanges?.filter((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return (hasFrom && !hasTo) || (!hasFrom && hasTo);
      });

      let errorMessage = 'Cannot lock roll. Please fix the following errors:\n\n';

      // Check for brand details and bottle size
      if (!rollInput.brandDetails || rollInput.brandDetails.trim() === '') {
        errorMessage += 'Brand Details - Required:\n';
        errorMessage += 'Please enter brand details for this roll.\n\n';
      }

      if (!rollInput.bottleSize || rollInput.bottleSize.trim() === '') {
        errorMessage += 'Bottle Size - Required:\n';
        errorMessage += 'Please enter bottle size for this roll (e.g., 750ml).\n\n';
      }

      if (incompleteIssuedRanges && incompleteIssuedRanges.length > 0) {
        errorMessage += 'Issued Ranges - Incomplete:\n';
        errorMessage += 'Both "ISSUED FROM" and "ISSUED TO" must be filled for each range.\n';
        errorMessage += 'Please complete all started ranges or remove them.\n\n';
      }

      if (incompleteWastageRanges && incompleteWastageRanges.length > 0) {
        errorMessage += 'Wastage Ranges - Incomplete:\n';
        errorMessage += 'Both "WASTAGE FROM" and "WASTAGE TO" must be filled for each range.\n';
        errorMessage += 'Please complete all started ranges or remove them.\n\n';
      }

      if (invalidIssuedRanges && invalidIssuedRanges.length > 0) {
        errorMessage += 'Issued Ranges - Validation Errors:\n';
        invalidIssuedRanges.forEach((r, i) => {
          errorMessage += `${i + 1}. ${r.errorMessage}\n`;
        });
        errorMessage += '\n';
      }

      if (invalidWastageRanges && invalidWastageRanges.length > 0) {
        errorMessage += 'Wastage Ranges - Validation Errors:\n';
        invalidWastageRanges.forEach((r, i) => {
          errorMessage += `${i + 1}. ${r.errorMessage}\n`;
        });
        errorMessage += '\n';
      }

      if (rollInput.leftOver < 0) {
        errorMessage += `Left Over is negative: ${rollInput.leftOver}. Please adjust quantities.\n`;
      }

      // Check if at least one range (issued OR wastage) is filled
      const hasValidIssuedRange = rollInput.issuedRanges?.some((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return hasFrom && hasTo && r.quantity > 0;
      });

      const hasValidWastageRange = rollInput.wastageRanges?.some((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return hasFrom && hasTo && r.quantity > 0;
      });

      if (!hasValidIssuedRange && !hasValidWastageRange) {
        errorMessage += 'Please enter at least one complete range:\n';
        errorMessage += '- Either ISSUED (FROM and TO), OR\n';
        errorMessage += '- WASTAGE (FROM and TO), OR\n';
        errorMessage += '- Both ISSUED and WASTAGE\n';
      }

      alert(errorMessage);
      return;
    }

    if (!entry.lockedRolls) {
      entry.lockedRolls = [];
    }

    // Store the roll input with all its data
    // explicit isNotInUse: false because if we are locking via this method,
    // it adheres to validation rules requiring usage/wastage > 0, so it is definitely IN USE.
    entry.lockedRolls.push({ ...rollInput, isNotInUse: false });

    // Clear current selection to allow selecting next roll
    entry.currentRollSelection = undefined;

    // Recalculate totals from all locked rolls
    this.recalculateEntryFromLockedRolls(entry);

    // Update the rolls view if this entry is currently being viewed
    this.updateRollsView(entry);

    // Force change detection to update the UI (including usage box)
    this.cdr.detectChanges();

    console.log('✅ Roll locked successfully:', {
      cartoonNumber: rollInput.cartoonNumber,
      issuedQty: rollInput.issuedQty,
      wastageQty: rollInput.wastageQty,
      leftOver: rollInput.leftOver,
      totalLockedRolls: entry.lockedRolls.length
    });

    alert(`Roll ${rollInput.displayName || rollInput.cartoonNumber} locked successfully!\n\nUsage: ${rollInput.issuedQty}\nDamaged: ${rollInput.wastageQty}\nLeftover: ${rollInput.leftOver}`);
  }

  unlockRollForEntry(entry: RegisterEntry, cartoonNumber: string): void {
    console.log('🔓 Unlocking roll:', cartoonNumber);

    const lockedRolls = entry.lockedRolls || [];

    // Find the roll to unlock - check both cartoonNumber and rangeId
    const index = lockedRolls.findIndex(r =>
      r.cartoonNumber === cartoonNumber ||
      r.rangeId === cartoonNumber
    );

    if (index !== -1) {
      // Get the roll data before removing it
      const rollToUnlock = lockedRolls[index];

      console.log('📦 Roll to unlock:', rollToUnlock);

      // Remove from locked rolls
      lockedRolls.splice(index, 1);

      // Restore it as the current roll selection for editing
      entry.currentRollSelection = {
        selectedRoll: rollToUnlock.rangeId || rollToUnlock.cartoonNumber,
        rollInput: rollToUnlock,
        isLocked: false // CRITICAL: Set to false to allow editing
      };

      // Recalculate entry totals from remaining locked rolls
      this.recalculateEntryFromLockedRolls(entry);

      // Update the rolls view if this entry is currently being viewed
      if (this.selectedEntryForRollsView?.id === entry.id) {
        this.updateRollsView(entry);
      }

      this.cdr.detectChanges();

      console.log('✅ Roll unlocked successfully! You can now edit the data.');

      alert(`Roll ${rollToUnlock.displayName || rollToUnlock.cartoonNumber} has been unlocked!

You can now edit:
- Brand details
- Bottle size  
- Usage ranges (Issued From/To)
- Wastage ranges (Damaged From/To)
- Damage reason

After editing, click "Lock" to save your changes.`);
    } else {
      console.warn('⚠️ Roll not found in locked rolls:', cartoonNumber);
    }
  }

  /**
   * Mark a roll as "Not In Use"
   * This locks the roll with 0 usage/wastage and full leftover
   */
  markRollAsNotInUse(entry: RegisterEntry, rollInput: RollInput): void {
    if (!confirm('Are you sure you want to mark this roll as NOT IN USE?\n\nThis will set usage and wastage to 0 and keep the entire roll available.')) {
      return;
    }

    // 1. Reset inputs to "Not Used" state
    rollInput.brandDetails = 'Not Used';
    rollInput.bottleSize = 'N/A';

    // 2. Clear usages
    rollInput.issuedRanges = [{ fromSerial: '', toSerial: '', quantity: 0 }];
    rollInput.wastageRanges = [{ fromSerial: '', toSerial: '', quantity: 0 }];
    rollInput.issuedQty = 0;
    rollInput.wastageQty = 0;
    rollInput.damageReason = 'Not Used';

    // 3. Set Leftover to Full Available Count
    rollInput.leftOver = rollInput.availableCount;

    // 4. Mark as Not In Use
    rollInput.isNotInUse = true;

    // 5. Create Locked Roll Entry
    const lockedRollIndex = entry.lockedRolls ? entry.lockedRolls.findIndex(r => r.rangeId === rollInput.rangeId) : -1;
    const lockedRollEntry = { ...rollInput }; // Clone it

    if (!entry.lockedRolls) {
      entry.lockedRolls = [];
    }

    if (lockedRollIndex >= 0) {
      entry.lockedRolls[lockedRollIndex] = lockedRollEntry;
    } else {
      entry.lockedRolls.push(lockedRollEntry);
    }

    // 6. Update Entry Totals
    this.recalculateEntryFromLockedRolls(entry);

    // 7. Clear Selection (Lock it)
    entry.currentRollSelection = {
      selectedRoll: rollInput.rangeId || rollInput.cartoonNumber,
      rollInput: lockedRollEntry,
      isLocked: true
    };

    // 8. Update View
    this.updateRollsView(entry);
    this.cdr.detectChanges(); // Force update

    console.log('✅ Roll marked as Not In Use:', lockedRollEntry);
  }

  recalculateEntryFromLockedRolls(entry: RegisterEntry): void {
    const lockedRolls = entry.lockedRolls || [];

    let totalIssued = 0;
    let totalWastage = 0;
    let totalLeftOver = 0;
    let totalAllocated = 0;

    lockedRolls.forEach(roll => {
      totalIssued += roll.issuedQty || 0;
      totalWastage += roll.wastageQty || 0;
      totalLeftOver += roll.leftOver || 0;

      // CRITICAL FIX: Only add availableCount to totalAllocated if this is NOT a leftover reuse
      // Leftover reuses are already counted in their parent roll's allocation
      if (!roll.isLeftoverReuse) {
        totalAllocated += roll.availableCount || 0;
      }
    });

    // Also add current roll's allocated quantity if it exists
    const currentRoll = this.getCurrentRollInput(entry);
    if (currentRoll) {
      totalIssued += currentRoll.issuedQty || 0;
      totalWastage += currentRoll.wastageQty || 0;
      totalLeftOver += currentRoll.leftOver || 0;

      // CRITICAL FIX: Only add availableCount if this is NOT a leftover reuse
      if (!currentRoll.isLeftoverReuse) {
        totalAllocated += currentRoll.availableCount || 0;
      }
    }

    entry.issuedQty = totalIssued;
    entry.wastageQty = totalWastage;
    entry.leftOver = totalLeftOver;
    // CRITICAL FIX: hologramQty should be the TOTAL ALLOCATED quantity from ORIGINAL rolls only
    // Leftover reuses are NOT counted here because they're already part of the original allocation
    entry.hologramQty = totalAllocated;
    entry.total = totalIssued + totalWastage + totalLeftOver;
  }

  /**
   * Brand Management Methods for Multi-Brand Support
   */

  // Initialize brands array if it doesn't exist and ensure at least one brand
  initializeBrands(rollInput: RollInput): void {
    if (!rollInput.brands || rollInput.brands.length === 0) {
      console.log('🎨 Initializing brands from existing single-brand data');
      console.log('  - Existing issuedRanges:', rollInput.issuedRanges);
      console.log('  - Existing wastageRanges:', rollInput.wastageRanges);
      console.log('  - Existing brandDetails:', rollInput.brandDetails);
      console.log('  - Existing bottleSize:', rollInput.bottleSize);

      // CRITICAL: Preserve existing data from single-brand mode
      // Deep copy the ranges to avoid reference issues
      const existingIssuedRanges = rollInput.issuedRanges && rollInput.issuedRanges.length > 0
        ? JSON.parse(JSON.stringify(rollInput.issuedRanges))
        : [{ fromSerial: '', toSerial: '', quantity: 0 }];

      const existingWastageRanges = rollInput.wastageRanges && rollInput.wastageRanges.length > 0
        ? JSON.parse(JSON.stringify(rollInput.wastageRanges))
        : [{ fromSerial: '', toSerial: '', quantity: 0 }];

      // Create first brand from existing data
      rollInput.brands = [{
        id: this.generateBrandId(),
        brandName: typeof rollInput.brandDetails === 'string' ? rollInput.brandDetails : '',
        bottleSize: rollInput.bottleSize || '',
        issuedRanges: existingIssuedRanges,
        wastageRanges: existingWastageRanges,
        issuedQty: rollInput.issuedQty || 0,
        wastageQty: rollInput.wastageQty || 0,
        damageReason: rollInput.damageReason || '',
        colorIndex: 0
      }];

      console.log('✅ Created Brand 1 with existing data:', rollInput.brands[0]);
    }
  }

  // Add a new brand to the roll
  addBrandToRoll(entry: RegisterEntry, rollInput: RollInput): void {
    console.log('🎯 ADD BRAND BUTTON CLICKED!');
    console.log('  Entry:', entry.referenceNo);
    console.log('  Roll Input:', rollInput);
    console.log('  Current brands array:', rollInput.brands);
    console.log('  Is locked?', entry.currentRollSelection?.isLocked);

    // CRITICAL: Initialize brands first if not already done
    // This preserves existing single-brand data as Brand 1
    if (!rollInput.brands || rollInput.brands.length === 0) {
      console.log('🔄 Converting from single-brand to multi-brand mode');
      this.initializeBrands(rollInput);
    }

    // Now add the new brand (Brand 2, 3, etc.)
    const newBrand: BrandEntry = {
      id: this.generateBrandId(),
      brandName: '',
      bottleSize: '',
      issuedRanges: [{ fromSerial: '', toSerial: '', quantity: 0 }],
      wastageRanges: [{ fromSerial: '', toSerial: '', quantity: 0 }],
      issuedQty: 0,
      wastageQty: 0,
      damageReason: '',
      colorIndex: rollInput.brands!.length // Use array length as color index
    };

    rollInput.brands!.push(newBrand);

    // Recalculate totals to ensure everything is in sync
    this.recalculateBrandTotals(rollInput);

    this.cdr.detectChanges();

    console.log(`✅ Added Brand ${rollInput.brands!.length} to roll`);
    console.log('📊 Current brands:', rollInput.brands);
    console.log('🎨 UI should now show', rollInput.brands!.length, 'brand cards');
  }

  // Remove a brand from the roll
  removeBrandFromRoll(entry: RegisterEntry, rollInput: RollInput, brandId: string): void {
    if (!rollInput.brands || rollInput.brands.length <= 1) {
      alert('Cannot remove the last brand. At least one brand is required.');
      return;
    }

    const index = rollInput.brands.findIndex(b => b.id === brandId);
    if (index !== -1) {
      rollInput.brands.splice(index, 1);

      // Recalculate total quantities from remaining brands
      this.recalculateBrandTotals(rollInput);
      this.cdr.detectChanges();

      console.log('✅ Removed brand from roll');
    }
  }

  // Get color for a brand based on its index
  getBrandColor(colorIndex: number): string {
    const colors = [
      '#4CAF50', // Green
      '#2196F3', // Blue
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#F44336', // Red
      '#00BCD4', // Cyan
      '#FFEB3B', // Yellow
      '#795548', // Brown
      '#607D8B', // Blue Grey
      '#E91E63'  // Pink
    ];
    return colors[colorIndex % colors.length];
  }

  // Get background color (lighter version) for a brand
  getBrandBackgroundColor(colorIndex: number): string {
    const baseColor = this.getBrandColor(colorIndex);
    // Add transparency to create lighter version
    return baseColor + '20'; // 20 is hex for ~12% opacity
  }

  // Recalculate total issued and wastage quantities from all brands
  recalculateBrandTotals(rollInput: RollInput): void {
    if (!rollInput.brands || rollInput.brands.length === 0) {
      rollInput.issuedQty = 0;
      rollInput.wastageQty = 0;
      rollInput.leftOver = rollInput.availableCount;
      return;
    }

    // Find the entry that contains this rollInput
    const entry = this.entries.find(e => e.currentRollSelection?.rollInput === rollInput);
    if (!entry) {
      console.warn('⚠️ Could not find entry for rollInput, skipping validation');
      // Still calculate quantities without validation
      let totalIssued = 0;
      let totalWastage = 0;

      rollInput.brands.forEach(brand => {
        brand.issuedQty = brand.issuedRanges.reduce((sum, r) => {
          r.quantity = this.calculateQuantityFromSerials(r.fromSerial, r.toSerial);
          return sum + r.quantity;
        }, 0);

        brand.wastageQty = brand.wastageRanges.reduce((sum, r) => {
          r.quantity = this.calculateQuantityFromSerials(r.fromSerial, r.toSerial);
          return sum + r.quantity;
        }, 0);

        totalIssued += brand.issuedQty;
        totalWastage += brand.wastageQty;
      });

      rollInput.issuedQty = totalIssued;
      rollInput.wastageQty = totalWastage;
      rollInput.leftOver = rollInput.availableCount - totalIssued - totalWastage;
      this.cdr.detectChanges();
      return;
    }

    // Get allocated ranges for validation
    const allocatedRanges = this.getAllocatedRangesForRoll(
      entry,
      rollInput.rangeId || rollInput.cartoonNumber
    );

    let totalIssued = 0;
    let totalWastage = 0;

    rollInput.brands.forEach(brand => {
      // Validate and calculate issued ranges for this brand
      brand.issuedQty = brand.issuedRanges.reduce((sum, range) => {
        range.quantity = this.calculateQuantityFromSerials(range.fromSerial, range.toSerial);

        // Validate range against the allocated range(s)
        if (allocatedRanges.length > 0) {
          const validation = this.validateSerialRangeInAllocatedRanges(
            range.fromSerial,
            range.toSerial,
            allocatedRanges
          );
          range.isValid = validation.isValid;
          range.errorMessage = validation.errorMessage;
        } else {
          range.isValid = true;
          range.errorMessage = '';
        }

        return sum + range.quantity;
      }, 0);

      // Validate and calculate wastage ranges for this brand
      brand.wastageQty = brand.wastageRanges.reduce((sum, range) => {
        range.quantity = this.calculateQuantityFromSerials(range.fromSerial, range.toSerial);

        // Validate range against the allocated range(s)
        if (allocatedRanges.length > 0) {
          const validation = this.validateSerialRangeInAllocatedRanges(
            range.fromSerial,
            range.toSerial,
            allocatedRanges
          );
          range.isValid = validation.isValid;
          range.errorMessage = validation.errorMessage;
        } else {
          range.isValid = true;
          range.errorMessage = '';
        }

        return sum + range.quantity;
      }, 0);

      totalIssued += brand.issuedQty;
      totalWastage += brand.wastageQty;
    });

    // Validate that issued ranges don't overlap within each brand
    rollInput.brands.forEach(brand => {
      const issuedOverlapCheck = this.validateNoOverlapWithinCategory(brand.issuedRanges);
      if (!issuedOverlapCheck.isValid) {
        brand.issuedRanges.forEach((range) => {
          if (range.fromSerial && range.toSerial) {
            range.isValid = false;
            range.errorMessage = `Issued ranges overlap within this brand: ${issuedOverlapCheck.overlappingRanges[0]}`;
          }
        });
      }

      const wastageOverlapCheck = this.validateNoOverlapWithinCategory(brand.wastageRanges);
      if (!wastageOverlapCheck.isValid) {
        brand.wastageRanges.forEach((range) => {
          if (range.fromSerial && range.toSerial) {
            range.isValid = false;
            range.errorMessage = `Wastage ranges overlap within this brand: ${wastageOverlapCheck.overlappingRanges[0]}`;
          }
        });
      }

      const crossOverlapCheck = this.validateNoOverlapBetweenIssuedAndWastage(
        brand.issuedRanges,
        brand.wastageRanges
      );
      if (!crossOverlapCheck.isValid) {
        brand.issuedRanges.forEach((issued) => {
          if (!issued.fromSerial || !issued.toSerial) return;
          brand.wastageRanges.forEach((wastage) => {
            if (!wastage.fromSerial || !wastage.toSerial) return;
            if (this.checkRangeOverlap(issued.fromSerial, issued.toSerial, wastage.fromSerial, wastage.toSerial)) {
              issued.isValid = false;
              issued.errorMessage = `Overlaps with wastage range (${wastage.fromSerial}-${wastage.toSerial}) in this brand`;
              wastage.isValid = false;
              wastage.errorMessage = `Overlaps with issued range (${issued.fromSerial}-${issued.toSerial}) in this brand`;
            }
          });
        });
      }
    });

    // Validate that ranges don't overlap across different brands
    for (let i = 0; i < rollInput.brands.length; i++) {
      for (let j = i + 1; j < rollInput.brands.length; j++) {
        const brand1 = rollInput.brands[i];
        const brand2 = rollInput.brands[j];

        // Check issued ranges across brands
        brand1.issuedRanges.forEach((range1) => {
          if (!range1.fromSerial || !range1.toSerial) return;
          brand2.issuedRanges.forEach((range2) => {
            if (!range2.fromSerial || !range2.toSerial) return;
            if (this.checkRangeOverlap(range1.fromSerial, range1.toSerial, range2.fromSerial, range2.toSerial)) {
              range1.isValid = false;
              range1.errorMessage = `Overlaps with Brand ${j + 1} issued range (${range2.fromSerial}-${range2.toSerial})`;
              range2.isValid = false;
              range2.errorMessage = `Overlaps with Brand ${i + 1} issued range (${range1.fromSerial}-${range1.toSerial})`;
            }
          });
        });

        // Check wastage ranges across brands
        brand1.wastageRanges.forEach((range1) => {
          if (!range1.fromSerial || !range1.toSerial) return;
          brand2.wastageRanges.forEach((range2) => {
            if (!range2.fromSerial || !range2.toSerial) return;
            if (this.checkRangeOverlap(range1.fromSerial, range1.toSerial, range2.fromSerial, range2.toSerial)) {
              range1.isValid = false;
              range1.errorMessage = `Overlaps with Brand ${j + 1} wastage range (${range2.fromSerial}-${range2.toSerial})`;
              range2.isValid = false;
              range2.errorMessage = `Overlaps with Brand ${i + 1} wastage range (${range1.fromSerial}-${range1.toSerial})`;
            }
          });
        });

        // Check issued vs wastage across brands
        brand1.issuedRanges.forEach((range1) => {
          if (!range1.fromSerial || !range1.toSerial) return;
          brand2.wastageRanges.forEach((range2) => {
            if (!range2.fromSerial || !range2.toSerial) return;
            if (this.checkRangeOverlap(range1.fromSerial, range1.toSerial, range2.fromSerial, range2.toSerial)) {
              range1.isValid = false;
              range1.errorMessage = `Overlaps with Brand ${j + 1} wastage range (${range2.fromSerial}-${range2.toSerial})`;
              range2.isValid = false;
              range2.errorMessage = `Overlaps with Brand ${i + 1} issued range (${range1.fromSerial}-${range1.toSerial})`;
            }
          });
        });

        brand2.issuedRanges.forEach((range2) => {
          if (!range2.fromSerial || !range2.toSerial) return;
          brand1.wastageRanges.forEach((range1) => {
            if (!range1.fromSerial || !range1.toSerial) return;
            if (this.checkRangeOverlap(range1.fromSerial, range1.toSerial, range2.fromSerial, range2.toSerial)) {
              range1.isValid = false;
              range1.errorMessage = `Overlaps with Brand ${i + 1} issued range (${range2.fromSerial}-${range2.toSerial})`;
              range2.isValid = false;
              range2.errorMessage = `Overlaps with Brand ${j + 1} wastage range (${range1.fromSerial}-${range1.toSerial})`;
            }
          });
        });
      }
    }

    rollInput.issuedQty = totalIssued;
    rollInput.wastageQty = totalWastage;
    rollInput.leftOver = rollInput.availableCount - totalIssued - totalWastage;

    // Trigger change detection
    this.cdr.detectChanges();

    // Save input state after brand changes
    this.saveInputState();
  }

  // Validate that total brand quantities don't exceed available count
  validateBrandQuantities(rollInput: RollInput): { isValid: boolean; errorMessage: string } {
    if (!rollInput.brands || rollInput.brands.length === 0) {
      return { isValid: true, errorMessage: '' };
    }

    const totalUsed = rollInput.issuedQty + rollInput.wastageQty;

    if (totalUsed > rollInput.availableCount) {
      return {
        isValid: false,
        errorMessage: `Total quantity (${totalUsed}) exceeds available count (${rollInput.availableCount})`
      };
    }

    return { isValid: true, errorMessage: '' };
  }

  // Generate unique ID for brand
  private generateBrandId(): string {
    return `brand_${Date.now()}_${secureRandomToken(9)}`;
  }

  // Check if roll is using multi-brand mode
  isMultiBrandMode(rollInput: RollInput): boolean {
    return !!(rollInput.brands && rollInput.brands.length > 0);
  }

  // Remove issued range from a specific brand
  removeIssuedRangeFromBrand(entry: RegisterEntry, brand: BrandEntry, index: number): void {
    if (brand.issuedRanges.length > 1) {
      brand.issuedRanges.splice(index, 1);
      const rollInput = this.getCurrentRollInput(entry);
      if (rollInput) {
        this.recalculateBrandTotals(rollInput);
      }
      this.cdr.detectChanges();
    }
    const rollInput = this.getCurrentRollInput(entry);
    if (rollInput) {
      this.recalculateBrandTotals(rollInput);
    }
    this.cdr.detectChanges();
  }

  // Remove wastage range from a specific brand
  removeWastageRangeFromBrand(entry: RegisterEntry, brand: BrandEntry, index: number): void {
    if (brand.wastageRanges.length <= 1) {
      // Clear the values if it's the last range
      brand.wastageRanges[0] = { fromSerial: '', toSerial: '', quantity: 0 };
    } else {
      brand.wastageRanges.splice(index, 1);
    }

    // Recalculate recalculateBrandTotals to update main rollInput
    if (this.getCurrentSelectedRoll(entry) && this.getCurrentRollInput(entry)) {
      this.recalculateBrandTotals(this.getCurrentRollInput(entry)!);
    }
    this.cdr.detectChanges();
  }

  // Add a new issued range to a specific brand
  addIssuedRangeToBrand(entry: RegisterEntry, brand: BrandEntry): void {
    brand.issuedRanges.push({ fromSerial: '', toSerial: '', quantity: 0 });
    this.cdr.detectChanges();
  }

  // Add a new wastage range to a specific brand
  addWastageRangeToBrand(entry: RegisterEntry, brand: BrandEntry): void {
    brand.wastageRanges.push({ fromSerial: '', toSerial: '', quantity: 0 });
    this.cdr.detectChanges();
  }

  /**
   * Calculate total (Issued + Wastage + Left Over) for validation
   */
  getTotalCalculation(entry: RegisterEntry): number {
    return (entry.issuedQty || 0) + (entry.wastageQty || 0) + (entry.leftOver || 0);
  }

  // Check if all ranges are locked and entry can be saved
  canSaveEntry(entry: RegisterEntry): boolean {
    if (entry.isFixed) return false; // Already saved

    // Must have at least one locked roll
    const lockedRolls = entry.lockedRolls || [];
    if (lockedRolls.length === 0) return false;

    // CRITICAL FIX: Cannot have an ACTIVE (unlocked) current roll selection
    // If the current roll selection is locked (read-only mode), it's OK to save
    // This allows saving when user is just viewing a locked roll without editing
    if (entry.currentRollSelection && !entry.currentRollSelection.isLocked) {
      return false; // There's an active roll being edited, can't save yet
    }

    // Check if all allocated ranges are locked
    const allocationData = this.getHologramAllocationForEntry(entry);
    if (allocationData && allocationData.allocatedCartoons) {
      const totalAllocatedRanges = allocationData.allocatedCartoons.length;

      // CRITICAL FIX: Count only NON-leftover-reuse locked rolls
      // Leftover reuses don't count toward the total allocated ranges
      // Also ensure 'Not In Use' rolls are counted (they are regular locked rolls with a flag)
      const nonLeftoverLockedRolls = lockedRolls.filter((roll: RollInput) => !roll.isLeftoverReuse);
      const lockedRangesCount = nonLeftoverLockedRolls.length;

      // All ranges must be locked
      if (lockedRangesCount < totalAllocatedRanges) {
        return false;
      }
    }

    // Validate quantities
    if (entry.leftOver < 0) return false;

    return true;
  }

  // Save the entry
  saveEntry(entry: RegisterEntry): void {
    if (!this.canSaveEntry(entry)) {
      return;
    }

    // Prevent double-click submissions
    if (this.isSaving) {
      console.warn('⚠️ Save already in progress, ignoring duplicate click');
      return;
    }

    const lockedRolls = entry.lockedRolls || [];
    if (lockedRolls.length === 0) return;

    // Set loading state
    this.isSaving = true;
    this.savingEntryId = entry.id;
    console.log('🔒 Save started, button disabled to prevent double-click');

    // CRITICAL FIX: Handle multi-brand rolls by creating separate entries for each brand
    const payloads: any[] = [];

    lockedRolls.forEach((roll: any) => {
      // Check if this roll has multiple brands
      const isMultiBrand = roll.brands && roll.brands.length > 0;

      if (isMultiBrand) {
        // Multi-brand mode: Create separate payload for each brand
        console.log(`🎨 Multi-brand roll detected: ${roll.cartoonNumber} with ${roll.brands.length} brands`);

        roll.brands.forEach((brand: BrandEntry, brandIndex: number) => {
          // Only save brands that have actual usage (issued or wastage)
          const hasUsage = brand.issuedQty > 0 || brand.wastageQty > 0;

          if (hasUsage) {
            // FIXED: Keep original assigned roll information in roll_range
            // Use brand_index to differentiate brands from same roll
            const originalRollRange = roll.displayName || roll.cartoonNumber;

            const payload = {
              reference_no: entry.referenceNo || 'N/A',
              hologram_request: entry.requestId || null,
              roll_range: originalRollRange, // Keep original assigned roll info
              submission_date: entry.dates.submission || new Date().toISOString().split('T')[0],
              usage_date: entry.dates.usage || new Date().toISOString().split('T')[0],

              brand_details: brand.brandName || '',
              bottle_size: brand.bottleSize || '',

              hologram_qty: roll.availableCount || 0, // Total allocated for this roll

              issued_from: brand.issuedRanges?.[0]?.fromSerial || '',
              issued_to: brand.issuedRanges?.[brand.issuedRanges.length - 1]?.toSerial || '',
              issued_qty: brand.issuedQty || 0,
              issued_ranges: brand.issuedRanges || [],

              wastage_from: brand.wastageRanges?.[0]?.fromSerial || '',
              wastage_to: brand.wastageRanges?.[brand.wastageRanges.length - 1]?.toSerial || '',
              wastage_qty: brand.wastageQty || 0,
              wastage_ranges: brand.wastageRanges || [],

              damage_reason: brand.damageReason || '',
              is_fixed: true,

              // Store original roll info for tracking
              allocated_from_serial: roll.fromSerial || '',
              allocated_to_serial: roll.toSerial || '',

              // CRITICAL: Add brand index for backend tracking
              brand_index: brandIndex + 1,
              total_brands: roll.brands.length
            };

            payloads.push(payload);
            console.log(`  ✅ Created payload for Brand ${brandIndex + 1}:`, payload);
          }
        });
      } else {
        // Single-brand mode: Use existing logic
        let brandName = '';
        const rollBrand = roll.brandDetails;
        const entryBrand = entry.brandDetails;

        if (rollBrand && typeof rollBrand === 'object') {
          brandName = rollBrand.brandName || '';
        } else if (rollBrand) {
          brandName = String(rollBrand);
        } else if (entryBrand && typeof entryBrand === 'object') {
          brandName = entryBrand.brandName || '';
        } else if (entryBrand) {
          brandName = String(entryBrand);
        }

        // CRITICAL FIX: For "Not In Use" entries
        const isNotInUse = roll.isNotInUse === true;
        let allocatedFromSerial = '';
        let allocatedToSerial = '';

        if (isNotInUse) {
          allocatedFromSerial = roll.allocatedFromSerial || roll.fromSerial || '';
          allocatedToSerial = roll.allocatedToSerial || roll.toSerial || '';
          console.log(`📌 Not In Use entry - allocated range: ${allocatedFromSerial}-${allocatedToSerial}`);
        }

        const payload = {
          reference_no: entry.referenceNo || 'N/A',
          hologram_request: entry.requestId || null,
          roll_range: roll.displayName || roll.cartoonNumber,
          submission_date: entry.dates.submission || new Date().toISOString().split('T')[0],
          usage_date: entry.dates.usage || new Date().toISOString().split('T')[0],

          brand_details: brandName,
          bottle_size: roll.bottleSize || entry.bottleSize || '',

          hologram_qty: roll.availableCount || 0,

          issued_from: roll.issuedRanges?.[0]?.fromSerial || '',
          issued_to: roll.issuedRanges?.[roll.issuedRanges.length - 1]?.toSerial || '',
          issued_qty: roll.issuedQty || 0,
          issued_ranges: roll.issuedRanges || [],

          wastage_from: roll.wastageRanges?.[0]?.fromSerial || '',
          wastage_to: roll.wastageRanges?.[roll.wastageRanges.length - 1]?.toSerial || '',
          wastage_qty: roll.wastageQty || 0,
          wastage_ranges: roll.wastageRanges || [],

          damage_reason: roll.damageReason || '',
          is_fixed: true,

          allocated_from_serial: allocatedFromSerial,
          allocated_to_serial: allocatedToSerial
        };

        payloads.push(payload);
      }
    });

    console.log(`🚀 Saving ${payloads.length} entries to backend:`);
    payloads.forEach((p, i) => {
      console.log(`\nPayload ${i + 1}:`, {
        roll_range: p.roll_range,
        brand_details: p.brand_details,
        bottle_size: p.bottle_size,
        issued_qty: p.issued_qty,
        wastage_qty: p.wastage_qty,
        issued_ranges: p.issued_ranges,
        wastage_ranges: p.wastage_ranges
      });
    });

    // CRITICAL FIX: Save entries SEQUENTIALLY to avoid backend race conditions
    // This ensures each brand's data is fully processed before the next one
    let completed = 0;
    const total = payloads.length;
    let errors = 0;

    const saveNextPayload = (index: number) => {
      if (index >= payloads.length) {
        // All done
        return;
      }

      const payload = payloads[index];
      console.log(`\n📤 Sending payload ${index + 1}/${total} to backend...`);
      console.log(`   Roll: ${payload.roll_range}`);
      console.log(`   Brand: ${payload.brand_details}`);
      console.log(`   Issued: ${payload.issued_from}-${payload.issued_to} (${payload.issued_qty})`);
      console.log(`   Wastage: ${payload.wastage_from}-${payload.wastage_to} (${payload.wastage_qty})`);

      this.hologramService.saveDailyRegisterEntry(payload).subscribe({
        next: (res) => {
          console.log(`✅ Payload ${index + 1} saved successfully:`, res);
          completed++;

          // Check if all completed
          if (completed + errors === total) {
            this.checkSaveCompletion(entry, completed, total, errors);
          } else {
            // Save next payload after a small delay to ensure backend processes sequentially
            setTimeout(() => saveNextPayload(index + 1), 500);
          }
        },
        error: (err) => {
          console.error(`❌ Error saving payload ${index + 1}:`, err);
          console.error(`   Payload was:`, payload);
          errors++;

          // Check if all completed
          if (completed + errors === total) {
            this.checkSaveCompletion(entry, completed, total, errors);
          } else {
            // Continue with next payload even if this one failed
            setTimeout(() => saveNextPayload(index + 1), 500);
          }
        }
      });
    };

    // Start saving from first payload
    saveNextPayload(0);
  }

  private checkSaveCompletion(entry: RegisterEntry, completed: number, total: number, errors: number): void {
    if (completed + errors === total) {
      // Clear loading state
      this.isSaving = false;
      this.savingEntryId = null;
      console.log('🔓 Save completed, button re-enabled');

      if (errors === 0) {
        // All successful
        entry.isFixed = true;
        entry.rollsAssigned = (entry.lockedRolls || []).map((r: any) => r.cartoonNumber);

        // CRITICAL FIX: Update Available Hologram Data to release holograms from Not in Use rolls
        this.releaseNotInUseHolograms(entry);

        // Update local stats for immediate display
        this.cdr.detectChanges();

        // Notify other components that daily register has been updated
        this.hologramService.notifyDailyRegisterUpdate();

        // Also notify request update to refresh "Currently Issued Holograms" tab
        // (to remove the request from there since it's now completed)
        this.hologramService.notifyRequestUpdate();

        // CRITICAL FIX: Clear saved input state after successful save
        this.clearInputState();

        // CRITICAL FIX: Reload data from backend to show saved entries
        console.log('🔄 Reloading data from backend after successful save...');
        this.loadApprovedEntries();

        // CRITICAL FIX: Close the rolls view panel after successful save
        console.log('🔒 Closing rolls view panel after successful save...');
        this.clearRollsView();

        alert('✅ All entries saved to database successfully!');
      } else {
        alert(`⚠️ Completed with ${errors} errors. Please check console.`);
      }
    }
  }

  // Legacy method removed or commented out to ensure no local storage usage for saving
  // private saveEntryToLocalStorage(entry: RegisterEntry) { ... }
  // private saveToMonthlyStatement(entry: RegisterEntry) { ... }

  /**
   * Release holograms from "Not in Use" rolls back to Available Hologram Data
   * This ensures that when rolls are marked as not in use, the allocated quantities are returned to the available pool
   */
  private releaseNotInUseHolograms(entry: RegisterEntry): void {
    const notInUseRolls = (entry.lockedRolls || []).filter((roll: any) => roll.isNotInUse);

    if (notInUseRolls.length === 0) {
      console.log('✅ No "Not in Use" rolls to release');
      return;
    }

    console.log(`🔓 Releasing ${notInUseRolls.length} "Not in Use" rolls back to available pool...`);

    // Update Available Hologram Data in localStorage
    const availableData = JSON.parse(localStorage.getItem('hologramOverviewAvailable') || '[]');

    notInUseRolls.forEach((roll: any) => {
      const cartoonNumber = roll.cartoonNumber || roll.rangeId;
      const quantityToRelease = roll.availableCount || 0;

      if (quantityToRelease <= 0) return;

      // Find the corresponding entry in Available Hologram Data
      const availableIndex = availableData.findIndex((item: any) =>
        item.cartoonNumber === cartoonNumber
      );

      if (availableIndex !== -1) {
        const oldAvailable = availableData[availableIndex].availableCount || 0;
        availableData[availableIndex].availableCount = oldAvailable + quantityToRelease;

        console.log(`  ✅ ${cartoonNumber}: Released ${quantityToRelease} units (${oldAvailable} → ${availableData[availableIndex].availableCount})`);

        // Recalculate percentage if we have total count
        if (availableData[availableIndex].totalCount) {
          availableData[availableIndex].percentage = Math.round(
            (availableData[availableIndex].availableCount / availableData[availableIndex].totalCount) * 100
          );
        }
      } else {
        console.warn(`  ⚠️ Cartoon ${cartoonNumber} not found in Available Hologram Data`);
      }
    });

    // Save updated data back to localStorage
    localStorage.setItem('hologramOverviewAvailable', JSON.stringify(availableData));
    console.log('💾 Updated Available Hologram Data in localStorage');
  }


  /**
   * Update entry quantities based on locked rolls and current input
   */  updateEntryQuantitiesFromAllRolls(entry: RegisterEntry): void {
    if (entry.isFixed) return;

    const lockedRolls = entry.lockedRolls || [];
    const currentRoll = this.getCurrentRollInput(entry);

    let totalIssued = lockedRolls.reduce((sum, roll) => sum + (roll.issuedQty || 0), 0);
    let totalWastage = lockedRolls.reduce((sum, roll) => sum + (roll.wastageQty || 0), 0);
    let totalLeftOver = lockedRolls.reduce((sum, roll) => sum + (roll.leftOver || 0), 0);

    if (currentRoll) {
      totalIssued += currentRoll.issuedQty || 0;
      totalWastage += currentRoll.wastageQty || 0;
      totalLeftOver += currentRoll.leftOver || 0;
    }

    entry.issuedQty = totalIssued;
    entry.wastageQty = totalWastage;
    entry.leftOver = totalLeftOver;
    entry.total = totalIssued + totalWastage + totalLeftOver;
  }

  getRollColor(indexOrCartoonNumber: number | string): string {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'];

    if (typeof indexOrCartoonNumber === 'string') {
      // Get consistent color index for cartoon number
      return colors[this.getRollColorIndex(indexOrCartoonNumber) % colors.length];
    }

    return colors[indexOrCartoonNumber % colors.length];
  }

  getRollBackgroundColor(indexOrCartoonNumber: number | string): string {
    const bgColors = ['#e7f3ff', '#e7f5e7', '#fff8e1', '#ffe7e7', '#e0f7fa', '#f3e5f5', '#fff3e0', '#e0f2f1'];

    if (typeof indexOrCartoonNumber === 'string') {
      // Get consistent color index for cartoon number
      return bgColors[this.getRollColorIndex(indexOrCartoonNumber) % bgColors.length];
    }

    return bgColors[indexOrCartoonNumber % bgColors.length];
  }

  // Map to store consistent color indices for cartoon numbers
  private rollColorMap: Map<string, number> = new Map();
  private nextColorIndex = 0;

  /**
   * Get consistent color index for a cartoon number
   */
  getRollColorIndex(cartoonNumber: string): number {
    if (!this.rollColorMap.has(cartoonNumber)) {
      this.rollColorMap.set(cartoonNumber, this.nextColorIndex);
      this.nextColorIndex++;
    }
    return this.rollColorMap.get(cartoonNumber)!;
  }

  /**
   * Get current roll index for color coding
   */
  getCurrentRollIndex(entry: RegisterEntry): number {
    const currentRoll = this.getCurrentSelectedRoll(entry);
    if (!currentRoll) return 0;

    // Extract cartoon number from rangeId if needed
    let cartoonNumber = currentRoll.includes('_RANGE_')
      ? currentRoll.split('_RANGE_')[0]
      : currentRoll;

    // CRITICAL FIX: Remove brand suffix to ensure same color for same roll
    cartoonNumber = cartoonNumber.split('_')[0];

    return this.getRollColorIndex(cartoonNumber);
  }

  /**
   * Check if the current roll is locked (read-only mode)
   */
  isCurrentRollLocked(entry: RegisterEntry): boolean {
    return entry.currentRollSelection?.isLocked || false;
  }

  /**
   * Calculate ALL leftover ranges for the current roll
   * This shows what serial numbers are left after usage and damage
   * Returns an array of ranges to handle gaps
   * CRITICAL: Also considers usage history from leftover reuses
   */
  getLeftoverRanges(entry: RegisterEntry, rollInput: RollInput): Array<{ fromSerial: string; toSerial: string; quantity: number }> {
    if (!rollInput || rollInput.leftOver <= 0) {
      return [];
    }

    try {
      // CRITICAL FIX: Get the allocated range for this roll
      // Use allocatedFromSerial/allocatedToSerial which represent the ORIGINAL full range assigned to this roll
      // NOT the fromSerial/toSerial which may represent only the issued/used portion
      const allocatedFromSerial = rollInput.allocatedFromSerial || rollInput.fromSerial;
      const allocatedToSerial = rollInput.allocatedToSerial || rollInput.toSerial;

      if (!allocatedFromSerial || !allocatedToSerial) {
        console.warn('No allocated range found for roll');
        return [];
      }

      // Extract prefix and numeric parts
      const fromMatch = allocatedFromSerial.match(/^([A-Z]*)(\d+)$/);
      const toMatch = allocatedToSerial.match(/^([A-Z]*)(\d+)$/);

      if (!fromMatch || !toMatch) {
        console.warn('Invalid serial format');
        return [];
      }

      const prefix = fromMatch[1];
      const allocatedFrom = parseInt(fromMatch[2], 10);
      const allocatedTo = parseInt(toMatch[2], 10);

      // Create a Set of all used serial numbers
      const usedSerials = new Set<number>();

      // CRITICAL FIX: Check if this is multi-brand mode
      const isMultiBrand = rollInput.brands && rollInput.brands.length > 0;

      console.log('🔍 DEBUG getLeftoverRanges:', {
        isMultiBrand,
        brandsCount: rollInput.brands?.length || 0,
        allocatedRange: `${allocatedFromSerial}-${allocatedToSerial}`,
        allocatedFrom,
        allocatedTo,
        totalInRange: allocatedTo - allocatedFrom + 1
      });

      if (isMultiBrand) {
        // Multi-brand mode: collect ranges from all brands
        console.log('🎨 Multi-brand mode: collecting used serials from all brands');
        console.log('  📋 Brands:', rollInput.brands);

        rollInput.brands!.forEach((brand: BrandEntry, brandIndex: number) => {
          // Add issued serials from this brand
          if (brand.issuedRanges && Array.isArray(brand.issuedRanges)) {
            brand.issuedRanges.forEach((range: RollRange) => {
              if (range.fromSerial && range.toSerial) {
                const fromMatch = range.fromSerial.match(/^([A-Z]*)(\d+)$/);
                const toMatch = range.toSerial.match(/^([A-Z]*)(\d+)$/);
                if (fromMatch && toMatch) {
                  const from = parseInt(fromMatch[2], 10);
                  const to = parseInt(toMatch[2], 10);
                  for (let i = from; i <= to; i++) {
                    usedSerials.add(i);
                  }
                  console.log(`  ✓ Brand ${brandIndex + 1} issued: ${range.fromSerial}-${range.toSerial}`);
                }
              }
            });
          }

          // Add wastage serials from this brand
          if (brand.wastageRanges && Array.isArray(brand.wastageRanges)) {
            brand.wastageRanges.forEach((range: RollRange) => {
              if (range.fromSerial && range.toSerial) {
                const fromMatch = range.fromSerial.match(/^([A-Z]*)(\d+)$/);
                const toMatch = range.toSerial.match(/^([A-Z]*)(\d+)$/);
                if (fromMatch && toMatch) {
                  const from = parseInt(fromMatch[2], 10);
                  const to = parseInt(toMatch[2], 10);
                  for (let i = from; i <= to; i++) {
                    usedSerials.add(i);
                  }
                  console.log(`  ✓ Brand ${brandIndex + 1} wastage: ${range.fromSerial}-${range.toSerial}`);
                }
              }
            });
          }
        });
      } else {
        // Single-brand mode: use rollInput ranges directly
        console.log('📦 Single-brand mode: collecting used serials from rollInput');

        // Add issued serials to used set (from current roll)
        if (rollInput.issuedRanges && Array.isArray(rollInput.issuedRanges)) {
          rollInput.issuedRanges.forEach((range: RollRange) => {
            if (range.fromSerial && range.toSerial) {
              const fromMatch = range.fromSerial.match(/^([A-Z]*)(\d+)$/);
              const toMatch = range.toSerial.match(/^([A-Z]*)(\d+)$/);
              if (fromMatch && toMatch) {
                const from = parseInt(fromMatch[2], 10);
                const to = parseInt(toMatch[2], 10);
                for (let i = from; i <= to; i++) {
                  usedSerials.add(i);
                }
              }
            }
          });
        }

        // Add wastage serials to used set (from current roll)
        if (rollInput.wastageRanges && Array.isArray(rollInput.wastageRanges)) {
          rollInput.wastageRanges.forEach((range: RollRange) => {
            if (range.fromSerial && range.toSerial) {
              const fromMatch = range.fromSerial.match(/^([A-Z]*)(\d+)$/);
              const toMatch = range.toSerial.match(/^([A-Z]*)(\d+)$/);
              if (fromMatch && toMatch) {
                const from = parseInt(fromMatch[2], 10);
                const to = parseInt(toMatch[2], 10);
                for (let i = from; i <= to; i++) {
                  usedSerials.add(i);
                }
              }
            }
          });
        }
      }

      // CRITICAL: Also add serials used in leftover reuses (from usage history)
      if (rollInput.leftoverUsageHistory && rollInput.leftoverUsageHistory.length > 0) {
        console.log('📝 Processing leftover usage history to exclude used serials');

        rollInput.leftoverUsageHistory.forEach((history: LeftoverUsageHistory) => {
          // Add used serials from history
          if (history.usedRange) {
            const rangeMatch = history.usedRange.match(/^([A-Z]*)(\d+)\s*-\s*([A-Z]*)(\d+)$/);
            if (rangeMatch) {
              const from = parseInt(rangeMatch[2], 10);
              const to = parseInt(rangeMatch[4], 10);
              for (let i = from; i <= to; i++) {
                usedSerials.add(i);
              }
              console.log(`  ✓ Excluded used range: ${history.usedRange}`);
            }
          }

          // Add damaged serials from history
          if (history.damagedRange) {
            const rangeMatch = history.damagedRange.match(/^([A-Z]*)(\d+)\s*-\s*([A-Z]*)(\d+)$/);
            if (rangeMatch) {
              const from = parseInt(rangeMatch[2], 10);
              const to = parseInt(rangeMatch[4], 10);
              for (let i = from; i <= to; i++) {
                usedSerials.add(i);
              }
              console.log(`  ✓ Excluded damaged range: ${history.damagedRange}`);
            }
          }
        });
      }

      console.log(`📊 Total used serials: ${usedSerials.size} out of ${allocatedTo - allocatedFrom + 1}`);

      // Find all leftover ranges (gaps and final range)
      const leftoverRanges: Array<{ fromSerial: string; toSerial: string; quantity: number }> = [];
      let rangeStart: number | null = null;

      for (let i = allocatedFrom; i <= allocatedTo; i++) {
        if (!usedSerials.has(i)) {
          // This serial is available (leftover)
          if (rangeStart === null) {
            rangeStart = i; // Start a new range
          }
        } else {
          // This serial is used
          if (rangeStart !== null) {
            // End the current range
            const fromSerial = `${prefix}${String(rangeStart).padStart(fromMatch[2].length, '0')}`;
            const toSerial = `${prefix}${String(i - 1).padStart(toMatch[2].length, '0')}`;
            const quantity = (i - 1) - rangeStart + 1;
            leftoverRanges.push({ fromSerial, toSerial, quantity });
            rangeStart = null;
          }
        }
      }

      // Handle the final range if it extends to the end
      if (rangeStart !== null) {
        const fromSerial = `${prefix}${String(rangeStart).padStart(fromMatch[2].length, '0')}`;
        const toSerial = `${prefix}${String(allocatedTo).padStart(toMatch[2].length, '0')}`;
        const quantity = allocatedTo - rangeStart + 1;
        leftoverRanges.push({ fromSerial, toSerial, quantity });
      }

      console.log('✅ Calculated leftover ranges (after excluding usage history):', leftoverRanges);
      return leftoverRanges;
    } catch (error) {
      console.error('Error calculating leftover ranges:', error);
      return [];
    }
  }



  /**
   * Check if a roll has leftover usage history
   */
  hasLeftoverUsageHistory(rollInput: RollInput): boolean {
    return !!(rollInput.leftoverUsageHistory && rollInput.leftoverUsageHistory.length > 0);
  }

  /**
   * Get leftover usage history for a roll
   */
  getLeftoverUsageHistory(rollInput: RollInput): LeftoverUsageHistory[] {
    return rollInput.leftoverUsageHistory || [];
  }

  /**
   * Record leftover usage history when a leftover range is locked
   * This updates the parent roll's usage history to show what was used from the leftover
   */
  recordLeftoverUsageHistory(entry: RegisterEntry, leftoverRollInput: RollInput): void {
    console.log('📝 Recording leftover usage history for:', leftoverRollInput.rangeId);

    // Find the parent roll in locked rolls
    const lockedRolls = entry.lockedRolls || [];
    const parentRollId = leftoverRollInput.parentRollId;
    const parentRoll = lockedRolls.find((lr: RollInput) =>
      (lr.rangeId || lr.cartoonNumber) === parentRollId
    );

    if (!parentRoll) {
      console.warn('⚠️ Parent roll not found:', parentRollId);
      return;
    }

    // Calculate what was used from the leftover range
    const originalRange = leftoverRollInput.serialRange;

    // Get used range (issued)
    let usedRange = '';
    let usedQty = 0;
    if (leftoverRollInput.issuedRanges && leftoverRollInput.issuedRanges.length > 0) {
      const firstIssued = leftoverRollInput.issuedRanges[0];
      const lastIssued = leftoverRollInput.issuedRanges[leftoverRollInput.issuedRanges.length - 1];
      if (firstIssued.fromSerial && lastIssued.toSerial) {
        usedRange = `${firstIssued.fromSerial} - ${lastIssued.toSerial}`;
        usedQty = leftoverRollInput.issuedQty;
      }
    }

    // Get damaged range (wastage)
    let damagedRange = '';
    let damagedQty = 0;
    if (leftoverRollInput.wastageRanges && leftoverRollInput.wastageRanges.length > 0) {
      const firstWastage = leftoverRollInput.wastageRanges[0];
      const lastWastage = leftoverRollInput.wastageRanges[leftoverRollInput.wastageRanges.length - 1];
      if (firstWastage.fromSerial && lastWastage.toSerial) {
        damagedRange = `${firstWastage.fromSerial} - ${lastWastage.toSerial}`;
        damagedQty = leftoverRollInput.wastageQty;
      }
    }

    // Calculate remaining range
    let remainingRange = '';
    let remainingQty = leftoverRollInput.leftOver;
    if (remainingQty > 0) {
      const leftoverRanges = this.getLeftoverRanges(entry, leftoverRollInput);
      if (leftoverRanges && leftoverRanges.length > 0) {
        const rangesStr = leftoverRanges.map(r => `${r.fromSerial}-${r.toSerial}`).join(', ');
        remainingRange = rangesStr;
      }
    }

    // Create usage history entry
    const brandNameStr = typeof leftoverRollInput.brandDetails === 'string'
      ? leftoverRollInput.brandDetails
      : (leftoverRollInput.brandDetails?.brandName || 'Unknown Brand');

    const usageHistory: LeftoverUsageHistory = {
      brandDetails: brandNameStr,
      bottleSize: leftoverRollInput.bottleSize,
      originalRange: originalRange,
      usedRange: usedRange,
      usedQty: usedQty,
      damagedRange: damagedRange || undefined,
      damagedQty: damagedQty || undefined,
      remainingRange: remainingRange || undefined,
      remainingQty: remainingQty || undefined,
      timestamp: new Date().toISOString()
    };

    // Add to parent roll's usage history
    if (!parentRoll.leftoverUsageHistory) {
      parentRoll.leftoverUsageHistory = [];
    }
    parentRoll.leftoverUsageHistory.push(usageHistory);

    console.log('✅ Leftover usage history recorded:', usageHistory);
  }

  /**
   * Check if entry has locked rolls
   */
  hasLockedRolls(entry: RegisterEntry): boolean {
    return (entry.lockedRolls && entry.lockedRolls.length > 0) || false;
  }

  /**
   * Get subtotal for a group of entries
   */
  getGroupSubtotal(entries: any[]): number {
    return entries.reduce((sum, e) => sum + (e.quantity || 0), 0);
  }

  /**
   * Group issued entries by roll for display
   */
  groupIssuedEntriesByRoll(entry: RegisterEntry): Array<{ rollIndex: number; rollName: string; entries: any[] }> {
    const groups: Array<{ rollIndex: number; rollName: string; entries: any[] }> = [];
    const lockedRolls = this.getLockedRollsForEntry(entry);

    lockedRolls.forEach((roll: any) => {
      // CRITICAL FIX: Use base roll number (remove brand suffix) for consistent colors
      const baseRollNumber = roll.cartoonNumber.split('_')[0];
      const rollIndex = this.getRollColorIndex(baseRollNumber);
      const entries = (roll.issuedRanges || []).map((range: any) => ({
        fromSerial: range.fromSerial,
        toSerial: range.toSerial,
        quantity: range.quantity
      }));

      if (entries.length > 0) {
        groups.push({
          rollIndex,
          rollName: roll.displayName || roll.cartoonNumber,
          entries
        });
      }
    });

    return groups;
  }

  /**
   * Group wastage entries by roll for display
   */
  groupWastageEntriesByRoll(entry: RegisterEntry): Array<{ rollIndex: number; rollName: string; entries: any[] }> {
    const groups: Array<{ rollIndex: number; rollName: string; entries: any[] }> = [];
    const lockedRolls = this.getLockedRollsForEntry(entry);

    lockedRolls.forEach((roll: any) => {
      // CRITICAL FIX: Use base roll number (remove brand suffix) for consistent colors
      const baseRollNumber = roll.cartoonNumber.split('_')[0];
      const rollIndex = this.getRollColorIndex(baseRollNumber);
      const entries = (roll.wastageRanges || []).map((range: any) => ({
        fromSerial: range.fromSerial,
        toSerial: range.toSerial,
        quantity: range.quantity
      }));

      if (entries.length > 0) {
        groups.push({
          rollIndex,
          rollName: roll.displayName || roll.cartoonNumber,
          entries
        });
      }
    });

    return groups;
  }





  /**
   * Get currently selected roll
   */
  getCurrentSelectedRoll(entry: RegisterEntry): string | null {
    return entry.currentRollSelection?.selectedRoll || null;
  }

  /**
   * Get current roll input data
   */
  getCurrentRollInput(entry: RegisterEntry): RollInput | null {
    return entry.currentRollSelection?.rollInput || null;
  }



  /**
   * Get locked rolls for an entry
   */
  getLockedRollsForEntry(entry: RegisterEntry): any[] {
    return entry.lockedRolls || [];
  }

  /**
   * Get unique locked rolls for an entry (grouped by base cartoon number)
   * This prevents showing duplicate rolls when multiple brands are assigned to the same roll
   */
  getUniqueLockedRollsForEntry(entry: RegisterEntry): Array<{ baseCartoonNumber: string; serialRange: string; brandCount: number }> {
    const lockedRolls = this.getLockedRollsForEntry(entry);
    const rollMap = new Map<string, { serialRange: string; brandCount: number }>();

    // Group rolls by base cartoon number (remove brand suffix like _BRAND_1, _BRAND_2)
    lockedRolls.forEach((roll: any) => {
      const baseCartoonNumber = (roll.cartoonNumber || roll.displayName || 'ROLL').split('_')[0];
      
      // Check if this roll has multiple brands in its brands array
      const hasBrandsArray = roll.brands && Array.isArray(roll.brands) && roll.brands.length > 0;
      const brandCount = hasBrandsArray ? roll.brands.length : 1;
      
      if (!rollMap.has(baseCartoonNumber)) {
        rollMap.set(baseCartoonNumber, {
          serialRange: roll.serialRange || '-',
          brandCount: brandCount
        });
      } else {
        // This shouldn't happen if multi-brand is working correctly,
        // but handle it just in case by incrementing brand count
        const existing = rollMap.get(baseCartoonNumber)!;
        existing.brandCount += brandCount;
      }
    });

    // Convert map to array
    return Array.from(rollMap.entries()).map(([baseCartoonNumber, data]) => ({
      baseCartoonNumber,
      serialRange: data.serialRange,
      brandCount: data.brandCount
    }));
  }

  // Get allocated ranges for a specific roll from entry's allocation data
  // IMPORTANT: This should return ONLY the specific range that was selected, not all ranges for the roll
  getAllocatedRangesForRoll(entry: RegisterEntry, cartoonNumberOrRangeId: string): Array<{ fromSerial: string; toSerial: string; quantity: number }> {
    console.log('🔍 Getting allocated ranges for:', cartoonNumberOrRangeId);

    // Check if this is a rangeId (e.g., "test1_RANGE_1") - if so, return ONLY that specific range
    if (cartoonNumberOrRangeId.includes('_RANGE_')) {
      console.log('📌 This is a specific range selection, returning only that range');

      // Get the current roll input which has the specific range data
      const rollInput = this.getCurrentRollInput(entry);
      if (rollInput && rollInput.rangeId === cartoonNumberOrRangeId) {
        // CRITICAL FIX: Check multiple sources for the allocated range
        // 1. Try fromSerial/toSerial first
        if (rollInput.fromSerial && rollInput.toSerial) {
          return [{
            fromSerial: rollInput.fromSerial,
            toSerial: rollInput.toSerial,
            quantity: rollInput.availableCount
          }];
        }

        // 2. Try parsing serialRange
        if (rollInput.serialRange) {
          const parts = rollInput.serialRange.split('-').map((s: string) => s.trim());
          if (parts.length === 2) {
            return [{
              fromSerial: parts[0],
              toSerial: parts[1],
              quantity: rollInput.availableCount
            }];
          }
        }
      }

      // If not in current roll input, check locked rolls
      const lockedRolls = this.getLockedRollsForEntry(entry);
      const lockedRoll = lockedRolls.find((r: any) => r.rangeId === cartoonNumberOrRangeId);
      if (lockedRoll) {
        // Check multiple sources
        if (lockedRoll.fromSerial && lockedRoll.toSerial) {
          return [{
            fromSerial: lockedRoll.fromSerial,
            toSerial: lockedRoll.toSerial,
            quantity: lockedRoll.availableCount
          }];
        }

        if (lockedRoll.serialRange) {
          const parts = lockedRoll.serialRange.split('-').map((s: string) => s.trim());
          if (parts.length === 2) {
            return [{
              fromSerial: parts[0],
              toSerial: parts[1],
              quantity: lockedRoll.availableCount
            }];
          }
        }
      }
    }

    // CRITICAL FIX: Also check current roll input even if it doesn't have _RANGE_ in the ID
    const rollInput = this.getCurrentRollInput(entry);
    if (rollInput && (rollInput.cartoonNumber === cartoonNumberOrRangeId || rollInput.rangeId === cartoonNumberOrRangeId)) {
      console.log('📦 Found current roll input:', rollInput);

      // Try fromSerial/toSerial
      if (rollInput.fromSerial && rollInput.toSerial) {
        console.log('✅ Using fromSerial/toSerial from rollInput');
        return [{
          fromSerial: rollInput.fromSerial,
          toSerial: rollInput.toSerial,
          quantity: rollInput.availableCount
        }];
      }

      // Try serialRange
      if (rollInput.serialRange) {
        console.log('✅ Parsing serialRange from rollInput:', rollInput.serialRange);
        const parts = rollInput.serialRange.split('-').map((s: string) => s.trim());
        if (parts.length === 2) {
          return [{
            fromSerial: parts[0],
            toSerial: parts[1],
            quantity: rollInput.availableCount
          }];
        }
      }
    }

    // For backward compatibility: if no rangeId, try to get from allocation data
    // But this should ideally not be used anymore since we want specific range selection
    const allocationData = this.getHologramAllocationForEntry(entry);

    if (allocationData && allocationData.allocatedCartoons && allocationData.allocatedCartoons.length > 0) {
      console.log('✅ Found allocation data:', allocationData);

      // Filter cartoons that match the cartoon number
      const matchingCartoons = allocationData.allocatedCartoons.filter((cartoon: any) => {
        return cartoon.cartoonNumber === cartoonNumberOrRangeId;
      });

      console.log('📦 Matching cartoons:', matchingCartoons);

      // Convert to range format
      const ranges = matchingCartoons.map((cartoon: any) => ({
        fromSerial: cartoon.fromSerial || '',
        toSerial: cartoon.toSerial || '',
        quantity: cartoon.quantity || 0
      }));

      console.log('✅ Allocated ranges:', ranges);
      return ranges;
    }

    // PRIORITY 2: Check if entry has allocatedRanges stored directly
    const allocatedRanges = (entry as any).allocatedRanges || [];

    if (allocatedRanges.length > 0) {
      console.log('📋 Using stored allocatedRanges:', allocatedRanges);

      // Filter ranges for this specific cartoon number
      const rollRanges = allocatedRanges.filter((range: any) =>
        range.cartoonNumber === cartoonNumberOrRangeId
      );

      return rollRanges.map((range: any) => ({
        fromSerial: range.fromSerial,
        toSerial: range.toSerial,
        quantity: range.quantity
      }));
    }

    console.log('⚠️ No allocated ranges found');
    return [];
  }

  // Get hologram allocation data for an entry
  getHologramAllocationForEntry(entry: RegisterEntry): any {
    try {
      const referenceNo = entry.referenceNo;

      console.log('🔍 Looking for allocation data for reference:', referenceNo);

      if (!referenceNo) {
        console.warn('⚠️ No reference number found in entry');
        return null;
      }

      // Try multiple localStorage keys where allocation data might be stored
      const possibleKeys = [
        'hologramAllocations',
        'hologramRequests',
        'hologramApplications',
        'approvedHologramEntries'
      ];

      // PRIORITY 1: Check rollsAssigned (from Backend API - contains TRUE allocated ranges from allocation)
      // This contains the actual allocated ranges sent from frontend during allocation (e.g., 4-4, 7-7)
      if (entry.rollsAssigned && entry.rollsAssigned.length > 0) {
        console.log('✅ Found rollsAssigned in entry (TRUE ALLOCATED RANGES):', entry.rollsAssigned);
        return {
          referenceNo: referenceNo,
          totalAllocated: entry.rollsAssigned.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0),
          allocatedCartoons: entry.rollsAssigned.map((r: any) => ({
            cartoonNumber: r.cartoonNumber || r.cartoon_number || '',
            quantity: r.quantity || 0,
            fromSerial: r.fromSerial || r.from_serial || '',
            toSerial: r.toSerial || r.to_serial || '',
            serialRange: `${r.fromSerial || r.from_serial || ''} - ${r.toSerial || r.to_serial || ''}`
          }))
        };
      }

      // PRIORITY 2: Check allocatedRanges (FALLBACK - contains full roll ranges from procurement)
      // This contains full roll ranges from procurement carton_details (e.g., 101-101, 102-102) - NOT what we want
      if (entry.allocatedRanges && entry.allocatedRanges.length > 0) {
        console.log('⚠️ Using allocatedRanges in entry (FALLBACK FROM PROCUREMENT):', entry.allocatedRanges);
        return {
          referenceNo: referenceNo,
          totalAllocated: entry.allocatedRanges.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0),
          allocatedCartoons: entry.allocatedRanges.map((r: any) => ({
            cartoonNumber: r.cartoonNumber || r.cartoon_number || '',
            quantity: r.quantity || 0,
            fromSerial: r.fromSerial || r.from_serial || '',
            toSerial: r.toSerial || r.to_serial || '',
            serialRange: `${r.fromSerial || r.from_serial || ''} - ${r.toSerial || r.to_serial || ''}`
          }))
        };
      }
      if (entry.allocatedRanges && entry.allocatedRanges.length > 0) {
        console.log('✅ Found direct allocatedRanges in entry:', entry.allocatedRanges);
        return {
          referenceNo: referenceNo,
          totalAllocated: entry.allocatedRanges.reduce((sum, r) => sum + r.quantity, 0),
          allocatedCartoons: entry.allocatedRanges.map(r => ({
            cartoonNumber: r.cartoonNumber,
            quantity: r.quantity,
            fromSerial: r.fromSerial,
            toSerial: r.toSerial,
            serialRange: `${r.fromSerial} - ${r.toSerial}`
          }))
        };
      }

      // PRIORITY 3: Check lockedRolls (from restored saved entries)
      if (entry.lockedRolls && entry.lockedRolls.length > 0) {
        console.log('✅ Found lockedRolls in entry (restored from DB):', entry.lockedRolls);
        return {
          referenceNo: referenceNo,
          totalAllocated: entry.lockedRolls.reduce((sum: number, r: any) => sum + (r.availableCount || r.issuedQty || 0), 0),
          allocatedCartoons: entry.lockedRolls.map((r: any) => ({
            cartoonNumber: r.cartoonNumber || '',
            quantity: r.availableCount || r.issuedQty || 0,
            fromSerial: r.fromSerial || '',
            toSerial: r.toSerial || '',
            serialRange: r.serialRange || `${r.fromSerial} - ${r.toSerial}`
          }))
        };
      }

      for (const key of possibleKeys) {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        console.log(`📦 Checking ${key}:`, data.length, 'items');

        // Find matching allocations
        const matchingAllocations = data.filter((a: any) =>
          a.referenceNo === referenceNo ||
          a.ourRefNo === referenceNo ||
          a.id === referenceNo ||
          a.refNumber === referenceNo
        );

        if (matchingAllocations.length > 0) {
          console.log('✅ Found allocations in', key, ':', matchingAllocations);

          // Check if the request has an 'allocations' array directly (from Officer approval)
          const requestWithAllocations = matchingAllocations.find((a: any) =>
            a.allocations && Array.isArray(a.allocations) && a.allocations.length > 0
          );

          if (requestWithAllocations) {
            console.log('✅ Found request with allocations array:', requestWithAllocations.allocations);
            const cartoons = requestWithAllocations.allocations.map((a: any) => ({
              cartoonNumber: a.cartoonNumber || '',
              quantity: a.quantity || 0,
              fromSerial: a.fromSerial || '',
              toSerial: a.toSerial || '',
              serialRange: `${a.fromSerial} - ${a.toSerial}`,
              remainingInCartoon: a.remainingInCartoon || 0
            }));

            const totalQty = cartoons.reduce((sum: number, c: any) => sum + c.quantity, 0);

            return {
              referenceNo: referenceNo,
              totalAllocated: totalQty,
              allocatedCartoons: cartoons
            };
          }

          // Otherwise, normalize the allocation data
          const allocation = matchingAllocations[0];
          let allocatedCartoons = allocation.allocatedCartoons || allocation.cartoons || allocation.cartoonsUsed || [];

          if (Array.isArray(allocatedCartoons) && allocatedCartoons.length > 0) {
            allocatedCartoons = allocatedCartoons.map((c: any) => {
              let fromSerial = c.fromSerial || c.serialFrom || '';
              let toSerial = c.toSerial || c.serialTo || '';

              // If serialRange exists but fromSerial/toSerial don't, try to parse it
              if ((!fromSerial || !toSerial) && c.serialRange) {
                const rangeMatch = c.serialRange.match(/(\d+)\s*-\s*(\d+)/);
                if (rangeMatch) {
                  fromSerial = rangeMatch[1].padStart(6, '0');
                  toSerial = rangeMatch[2].padStart(6, '0');
                }
              }

              return {
                ...c,
                cartoonNumber: c.cartoonNumber || c.number || c.id || '',
                quantity: c.quantity || c.allocatedQuantity || 0,
                fromSerial: fromSerial,
                toSerial: toSerial,
                serialRange: c.serialRange || `${fromSerial} - ${toSerial}`
              };
            });
          }

          return {
            referenceNo: referenceNo,
            totalAllocated: allocation.totalAllocated || allocation.requestedQuantity || 0,
            allocatedCartoons: allocatedCartoons
          };
        }
      }

      console.warn('❌ No allocation found for:', referenceNo);
      return null;
    } catch (error) {
      console.error('Error loading hologram allocation:', error);
      return null;
    }
  }

  // Get the serial range string for a roll
  getSerialRangeForRoll(entry: RegisterEntry, cartoonNumber: string): string {
    const ranges = this.getAllocatedRangesForRoll(entry, cartoonNumber);
    if (ranges.length === 0) return '-';

    // If multiple ranges, show first one with indicator
    if (ranges.length > 1) {
      return `${ranges[0].fromSerial} - ${ranges[0].toSerial} (+${ranges.length - 1} more)`;
    }

    return `${ranges[0].fromSerial} - ${ranges[0].toSerial}`;
  }

  // View state management methods
  private saveViewState(): void {
    try {
      localStorage.setItem(this.VIEW_STATE_KEY, JSON.stringify(this.viewDetailsState));
    } catch (e) {
      console.error('Error saving view state:', e);
    }
  }

  private loadViewState(): void {
    try {
      const savedState = localStorage.getItem(this.VIEW_STATE_KEY);
      if (savedState) {
        this.viewDetailsState = JSON.parse(savedState);
      }
    } catch (e) {
      console.error('Error loading view state:', e);
      this.viewDetailsState = {};
    }
  }

  // Input state management methods - Save and restore current input data
  private saveInputState(): void {
    try {
      const inputState: any = {};

      // Save current input state for each entry
      this.entries.forEach(entry => {
        if (entry.currentRollSelection && !entry.isFixed) {
          inputState[entry.id] = {
            selectedRoll: entry.currentRollSelection.selectedRoll,
            rollInput: {
              ...entry.currentRollSelection.rollInput,
              // Ensure brands are saved if in multi-brand mode
              brands: entry.currentRollSelection.rollInput.brands || []
            },
            isLocked: entry.currentRollSelection.isLocked
          };
        }
      });

      if (Object.keys(inputState).length > 0) {
        localStorage.setItem(this.INPUT_STATE_KEY, JSON.stringify(inputState));
        console.log('💾 Saved input state for', Object.keys(inputState).length, 'entries');
      }
    } catch (e) {
      console.error('Error saving input state:', e);
    }
  }

  private restoreInputState(): void {
    try {
      const savedState = localStorage.getItem(this.INPUT_STATE_KEY);
      if (!savedState) {
        console.log('📭 No saved input state found');
        return;
      }

      const inputState = JSON.parse(savedState);
      let restoredCount = 0;

      // Restore input state for each entry
      this.entries.forEach(entry => {
        if (inputState[entry.id] && !entry.isFixed) {
          entry.currentRollSelection = {
            selectedRoll: inputState[entry.id].selectedRoll,
            rollInput: inputState[entry.id].rollInput,
            isLocked: inputState[entry.id].isLocked
          };
          restoredCount++;
        }
      });

      if (restoredCount > 0) {
        console.log('✅ Restored input state for', restoredCount, 'entries');
        // Clear the saved state after restoring to avoid stale data
        // localStorage.removeItem(this.INPUT_STATE_KEY);
      }
    } catch (e) {
      console.error('Error restoring input state:', e);
    }
  }

  private clearInputState(): void {
    try {
      localStorage.removeItem(this.INPUT_STATE_KEY);
      console.log('🗑️ Cleared input state');
    } catch (e) {
      console.error('Error clearing input state:', e);
    }
  }

  /**
   * View usage details for a saved entry
   */
  viewEntryDetails(entry: RegisterEntry): void {
    this.selectedEntryForDetails = entry;
    this.viewDetailsState[entry.id] = true;
    this.saveViewState();
    this.cdr.detectChanges();
  }

  /**
   * Close the usage details modal
   */
  closeDetailsModal(): void {
    if (this.selectedEntryForDetails) {
      this.viewDetailsState[this.selectedEntryForDetails.id] = false;
      this.saveViewState();
    }
    this.selectedEntryForDetails = null;
    this.cdr.detectChanges();
  }

  /**
   * Select a roll tab in the details modal
   */
  selectRollTab(index: number): void {
    this.selectedRollTabIndex = index;
    this.cdr.detectChanges();
  }

  /**
   * Get the original assigned roll information for display in ROLL/RANGE column
   * This ensures only the originally assigned roll is shown, not brand-specific variations
   */
  getOriginalAssignedRoll(entry: RegisterEntry): { cartoonNumber: string; serialRange: string; brands: Array<{ name: string, index: number, color: string, issuedQty: number, wastageQty: number }> } | null {
    // For saved entries, get from allocatedRanges (original assignment)
    if (entry.isFixed && entry.allocatedRanges && entry.allocatedRanges.length > 0) {
      const firstRange = entry.allocatedRanges[0];
      const brands = this.getBrandsFromSameRoll(entry);
      return {
        cartoonNumber: firstRange.cartoonNumber,
        serialRange: `${firstRange.fromSerial} - ${firstRange.toSerial}`,
        brands: brands
      };
    }

    // For unsaved entries, get from locked rolls or current selection
    const lockedRolls = this.getLockedRollsForEntry(entry);
    if (lockedRolls.length > 0) {
      const firstRoll = lockedRolls[0];
      const brands = this.getBrandsFromSameRoll(entry);
      return {
        cartoonNumber: firstRoll.cartoonNumber.split('_')[0], // Remove brand suffix
        serialRange: firstRoll.serialRange || `${firstRoll.fromSerial} - ${firstRoll.toSerial}`,
        brands: brands
      };
    }

    // Fallback to current selected roll
    const currentRoll = this.getCurrentRollInput(entry);
    if (currentRoll) {
      const brands = this.getBrandsFromSameRoll(entry);
      return {
        cartoonNumber: (this.getCurrentSelectedRoll(entry) || '').split('_')[0],
        serialRange: currentRoll.serialRange || '',
        brands: brands
      };
    }

    return null;
  }

  /**
   * Check if multiple brands are being used from the same roll
   */
  hasMultipleBrandsFromSameRoll(entry: RegisterEntry): boolean {
    const lockedRolls = this.getLockedRollsForEntry(entry);
    if (lockedRolls.length <= 1) return false;

    // Check if multiple rolls have the same base carton number (before _BRAND_ suffix)
    const baseCartoonNumbers = lockedRolls.map(roll => roll.cartoonNumber.split('_')[0]);
    const uniqueBaseNumbers = [...new Set(baseCartoonNumbers)];

    return uniqueBaseNumbers.length < baseCartoonNumbers.length;
  }

  /**
   * Get brands information from the same roll with consistent color coding and quantities
   */
  getBrandsFromSameRoll(entry: RegisterEntry): Array<{ name: string, index: number, color: string, issuedQty: number, wastageQty: number }> {
    const lockedRolls = this.getLockedRollsForEntry(entry);
    const brands: Array<{ name: string, index: number, color: string, issuedQty: number, wastageQty: number }> = [];

    if (lockedRolls.length === 0) return brands;

    // Group rolls by base carton number
    const rollsByCarton = new Map<string, any[]>();
    lockedRolls.forEach(roll => {
      const baseCarton = roll.cartoonNumber.split('_')[0];
      if (!rollsByCarton.has(baseCarton)) {
        rollsByCarton.set(baseCarton, []);
      }
      rollsByCarton.get(baseCarton)!.push(roll);
    });

    // For each carton, create brand entries with consistent colors
    rollsByCarton.forEach((rolls, baseCarton) => {
      // CRITICAL: Use the same color for all brands from the same roll
      const rollColor = this.getRollColor(baseCarton);

      if (rolls.length > 1) {
        // Multiple brands from same roll - all get the SAME color
        rolls.forEach((roll, index) => {
          const brandName = roll.brandDetails || roll.brand_details || `Brand ${index + 1}`;
          brands.push({
            name: brandName,
            index: index + 1,
            color: rollColor, // Same color for all brands from same roll
            issuedQty: roll.issuedQty || 0,
            wastageQty: roll.wastageQty || 0
          });
        });
      } else {
        // Single brand from roll
        const roll = rolls[0];
        const brandName = roll.brandDetails || roll.brand_details || 'Brand 1';
        brands.push({
          name: brandName,
          index: 1,
          color: rollColor,
          issuedQty: roll.issuedQty || 0,
          wastageQty: roll.wastageQty || 0
        });
      }
    });

    return brands;
  }

  /**
   * Get enhanced brand details for display in BRAND DETAILS column
   */
  getEnhancedBrandDetails(entry: RegisterEntry): Array<{ brandLabel: string, brandName: string, color: string, issuedQty: number, wastageQty: number }> {
    const brands = this.getBrandsFromSameRoll(entry);

    return brands.map(brand => ({
      brandLabel: `Brand ${brand.index}`,
      brandName: brand.name,
      color: brand.color,
      issuedQty: brand.issuedQty,
      wastageQty: brand.wastageQty
    }));
  }
}
