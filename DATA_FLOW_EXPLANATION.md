# Complete Data Flow: Supply Chain → Officer in Charge

## Current Implementation (Frontend Only)

### 📋 Step-by-Step Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPPLY CHAIN DASHBOARD                            │
│                     (http://localhost:4200/dev-supply-chain)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOLOGRAM REQUEST FORM                               │
│                (http://localhost:4200/dev-hologramrequestlevel1)            │
│                                                                             │
│  User fills form:                                                           │
│  ├── Usage Date: "2024-11-06"                                              │
│  ├── Brand Name: "himalayan-gold"                                          │
│  ├── Bottle Size: "750ml"                                                  │
│  ├── Total Holograms: 1000                                                 │
│  └── Remarks: "Production requirement"                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼ (User clicks Submit)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA PROCESSING                                   │
│                                                                             │
│  hologramrequestlevel1.component.ts → saveRequest()                        │
│                                                                             │
│  const requestWithMetadata = {                                             │
│    usageDate: "2024-11-06",                                               │
│    brandName: "himalayan-gold",                                           │
│    bottleSize: "750ml",                                                   │
│    totalHolograms: 1000,                                                  │
│    remarks: "Production requirement",                                     │
│    refNumber: "HRQ/241106/123",        // Auto-generated                  │
│    submissionDate: "2024-11-05T10:30:00.000Z",                          │
│    status: "PENDING"                   // Default status                  │
│  };                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                     │
│                         (Currently: localStorage)                          │
│                                                                             │
│  Key: "hologramRequests"                                                   │
│  Value: [                                                                  │
│    {                                                                       │
│      usageDate: "2024-11-06",                                            │
│      brandName: "himalayan-gold",                                        │
│      bottleSize: "750ml",                                                │
│      totalHolograms: 1000,                                               │
│      remarks: "Production requirement",                                  │
│      refNumber: "HRQ/241106/123",                                        │
│      submissionDate: "2024-11-05T10:30:00.000Z",                       │
│      status: "PENDING"                                                   │
│    }                                                                      │
│  ]                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OFFICER IN CHARGE DASHBOARD                           │
│                  (http://localhost:4200/dev-officer-in-charge)             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA RETRIEVAL                                   │
│                                                                             │
│  officerinchargehologramreq.component.ts → loadHologramRequests()          │
│                                                                             │
│  // Load from storage                                                      │
│  const submittedRequests = JSON.parse(                                     │
│    localStorage.getItem('hologramRequests') || '[]'                       │
│  );                                                                        │
│                                                                             │
│  // Convert to officer format                                             │
│  const convertedRequests = submittedRequests.map(request => ({            │
│    id: "HR123456",                                                        │
│    referenceNo: request.refNumber,     // "HRQ/241106/123"               │
│    submissionDate: "2024-11-05",                                         │
│    submittedBy: "Supply Chain User - Sikkim Distilleries Ltd",           │
│    requestType: "NEW_ALLOCATION",                                         │
│    hologramType: "LOCAL",                                                 │
│    requestedQuantity: request.totalHolograms, // 1000                     │
│    brandDetails: {                                                        │
│      brandName: "Himalayan Gold Rum",  // Converted from code            │
│      alcoholPercent: "42.8%",                                            │
│      sizeMl: 750,                      // Converted from "750ml"         │
│      liquorType: "Rum"                 // Derived from brand             │
│    },                                                                     │
│    justification: request.remarks,                                        │
│    urgencyLevel: "HIGH",               // Based on usage date            │
│    status: request.status              // "PENDING"                      │
│  }));                                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OFFICER DASHBOARD DISPLAY                           │
│                                                                             │
│  Request Register Entries Table:                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ REF NO        │ SUBMISSION │ BRAND DETAILS      │ QTY  │ STATUS    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ HRQ/241106/123│ 05/11/2024 │ Himalayan Gold Rum │ 1000 │ PENDING   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Backend Implementation (How to Convert)

### 🔄 Replace localStorage with API Calls

#### 1. Supply Chain Side (Request Submission)

**Current Code:**
```typescript
// hologramrequestlevel1.component.ts
private saveRequest(): void {
  const requestWithMetadata = {
    ...this.requestData,
    refNumber: this.generatedRefNumber,
    submissionDate: new Date().toISOString(),
    status: 'PENDING'
  };

  // CURRENT: Save to localStorage
  const existingRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
  existingRequests.push(requestWithMetadata);
  localStorage.setItem('hologramRequests', JSON.stringify(existingRequests));
}
```

**Backend Version:**
```typescript
// hologramrequestlevel1.component.ts
private saveRequest(): void {
  const requestWithMetadata = {
    ...this.requestData,
    refNumber: this.generatedRefNumber,
    submissionDate: new Date().toISOString(),
    status: 'PENDING'
  };

  // BACKEND: API call
  this.hologramService.submitRequest(requestWithMetadata).subscribe({
    next: (response) => {
      console.log('Request submitted successfully:', response);
      this.showSuccessModal = true;
    },
    error: (error) => {
      console.error('Failed to submit request:', error);
      alert('Failed to submit request. Please try again.');
    }
  });
}
```

#### 2. Officer Side (Request Loading)

**Current Code:**
```typescript
// officerinchargehologramreq.component.ts
loadHologramRequests() {
  // CURRENT: Load from localStorage
  const submittedRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
  
  // Convert and display
  const convertedRequests = submittedRequests.map(request => ({
    // ... conversion logic
  }));
  
  this.hologramRequests = convertedRequests;
  this.applyFilters();
}
```

**Backend Version:**
```typescript
// officerinchargehologramreq.component.ts
loadHologramRequests() {
  // BACKEND: API call
  this.hologramService.getHologramRequests().subscribe({
    next: (submittedRequests) => {
      // Same conversion logic
      const convertedRequests = submittedRequests.map(request => ({
        // ... conversion logic (stays the same)
      }));
      
      this.hologramRequests = convertedRequests;
      this.applyFilters();
    },
    error: (error) => {
      console.error('Failed to load requests:', error);
      // Show error message to user
    }
  });
}
```

### 🌐 Required Backend API Endpoints

```typescript
// Backend API Structure
POST   /api/hologram-requests           // Submit new request
GET    /api/hologram-requests           // Get all requests (for officer)
PUT    /api/hologram-requests/:id       // Update request status
GET    /api/hologram-requests/:id       // Get specific request
```

### 📊 Database Schema (Example)

```sql
-- hologram_requests table
CREATE TABLE hologram_requests (
  id SERIAL PRIMARY KEY,
  ref_number VARCHAR(50) UNIQUE NOT NULL,
  usage_date DATE NOT NULL,
  brand_name VARCHAR(100) NOT NULL,
  bottle_size VARCHAR(20) NOT NULL,
  total_holograms INTEGER NOT NULL,
  remarks TEXT,
  submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'PENDING',
  submitted_by_user_id INTEGER,
  officer_comments TEXT,
  approved_quantity INTEGER,
  approval_date TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🔧 Service Layer (Angular)

```typescript
// hologram.service.ts
@Injectable({
  providedIn: 'root'
})
export class HologramService {
  private apiUrl = '/api/hologram-requests';

  constructor(private http: HttpClient) {}

  // Submit new request (Supply Chain → Backend)
  submitRequest(request: any): Observable<any> {
    return this.http.post(this.apiUrl, request);
  }

  // Get all requests (Backend → Officer)
  getHologramRequests(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Update request status (Officer → Backend)
  updateRequestStatus(id: string, statusData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, statusData);
  }

  // Get specific request
  getRequestById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
}
```

### 🔄 Complete Backend Data Flow

```
Supply Chain User                    Backend API                    Officer Dashboard
      │                                  │                              │
      ├─ Submit Request ────────────────► │                              │
      │  POST /api/hologram-requests     │                              │
      │                                  ├─ Save to Database           │
      │                                  │                              │
      │                                  │ ◄──── Get Requests ─────────┤
      │                                  │       GET /api/hologram-requests
      │                                  │                              │
      │                                  ├─ Return Requests ──────────► │
      │                                  │                              ├─ Display in Table
      │                                  │                              │
      │                                  │ ◄──── Approve/Reject ───────┤
      │                                  │       PUT /api/hologram-requests/:id
      │                                  │                              │
      │                                  ├─ Update Database            │
      │ ◄──── Notification ─────────────┤                              │
      │       (Email/WebSocket)          │                              │
```

## Key Points for Backend Implementation:

1. **Same Business Logic**: All conversion functions (getBrandLabel, etc.) stay the same
2. **Replace Storage**: localStorage → HTTP calls
3. **Add Error Handling**: Network failures, validation errors
4. **Add Authentication**: Secure API endpoints
5. **Add Real-time Updates**: WebSocket or Server-Sent Events
6. **Add Notifications**: Email/SMS when status changes

The core workflow and data transformations remain identical - you're just changing the transport layer from localStorage to HTTP APIs!