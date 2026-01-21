
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplyChainProfileService, ManufacturingUnit } from '../../../core/services/supply-chain-profile.service';

@Component({
    selector: 'app-supply-chain-registration',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './supply-chain-registration.component.html',
    styleUrls: ['./supply-chain-registration.component.scss']
})
export class SupplyChainRegistrationComponent implements OnInit {
    private fb = inject(FormBuilder);
    private profileService = inject(SupplyChainProfileService);
    private router = inject(Router);

    registrationForm: FormGroup;
    manufacturingUnits: ManufacturingUnit[] = [];
    loading = false;
    submitting = false;

    constructor() {
        this.registrationForm = this.fb.group({
            selectedUnit: ['', Validators.required],
            address: ['']
        });
    }

    ngOnInit(): void {
        this.loadUnits();
    }

    loadUnits() {
        this.loading = true;
        this.profileService.getManufacturingUnits().subscribe({
            next: (res) => {
                this.manufacturingUnits = res.data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load units', err);
                this.loading = false;
            }
        });
    }

    get selectedLicenseeId(): string | undefined {
        const selectedName = this.registrationForm.get('selectedUnit')?.value;
        if (!selectedName) return undefined;
        return this.manufacturingUnits.find(u => u.name === selectedName)?.licenseeId;
    }

    onSubmit() {
        if (this.registrationForm.invalid) return;

        this.submitting = true;
        const selectedUnitName = this.registrationForm.get('selectedUnit')?.value;
        const selectedUnit = this.manufacturingUnits.find(u => u.name === selectedUnitName);

        if (!selectedUnit) {
            alert('Invalid selection');
            this.submitting = false;
            return;
        }

        const payload = {
            manufacturingUnitName: selectedUnit.name,
            licenseeId: selectedUnit.licenseeId,
            licenseType: selectedUnit.type,
            address: this.registrationForm.get('address')?.value
        };

        this.profileService.createProfile(payload).subscribe({
            next: (res) => {
                alert('Registration Successful! Redirecting to Dashboard...');
                this.router.navigate(['/licensee/supply-chain']);
            },
            error: (err) => {
                console.error('Registration failed full error:', err);
                const errorMsg = err.error?.error ? JSON.stringify(err.error.error) : 'Unknown error';
                alert('Registration failed details: ' + errorMsg);
                this.submitting = false;
            }
        });
    }
}
