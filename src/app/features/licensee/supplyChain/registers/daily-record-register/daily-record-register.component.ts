import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-daily-record-register',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid p-3">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h2 class="h5 m-0">Daily Record Register</h2>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-sm table-bordered table-hover">
              <thead class="table-success">
                <tr>
                  <th>Date</th>
                  <th>Opening Balance</th>
                  <th>Production</th>
                  <th>Dispatch</th>
                  <th>Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>22-Sep-2025</td>
                  <td>1000 LPL</td>
                  <td>250 LPL</td>
                  <td>150 LPL</td>
                  <td>1100 LPL</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DailyRecordRegisterComponent {}


