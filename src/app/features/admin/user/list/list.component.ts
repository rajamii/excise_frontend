import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { Account } from '../../../../core/models/accounts';
import { EditComponent } from '../edit/edit.component';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { AddComponent } from '../add/add.component';

@Component({
  selector: 'app-list',
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent extends BaseComponent implements OnInit {
  // Columns displayed in the users list table
  displayedColumns: string[] = ['id', 'firstName', 'middleName', 'lastName', 'username', 'phoneNumber', 'email', 'district', 'subdivision', 'role', 'createdBy', 'actions'];
  
  // MatTableDataSource is used to handle the data for the table
  users = new MatTableDataSource<Account>();

  constructor(
    // Dependency injection for base class and services
    deps: BaseDependency,
    private dialog: MatDialog
  ) {
    super(deps);  // Calls the constructor of the base class
  }

  ngOnInit(): void {
    // Loads users when the component is initialized
    this.loadUsers();
  }

  // Method to load users from the server
  loadUsers(): void {
    this.userService.getUsers().subscribe(
      (data) => {  
        if (data) {
          // If the data is an array, assign it to users.data
          if (Array.isArray(data)) {
            this.users.data = data; 
          } else {
            // If the data is not an array, wrap it in an array
            this.users.data = [data];
          }
        }
      },
      (error) => {
        // Logs error if fetching users fails
        console.error('Error fetching users:', error);
      }
    );
  }

  // Dialog form to add a new user
  onAdd(): void {
    const dialogRef = this.dialog.open(AddComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadUsers();  // Reload after adding
      }
    });
  }

  // Method to handle editing a user
  onEdit(user: Account): void {
    const dialogRef = this.dialog.open(EditComponent, {
      width: '400px', // Sets the width of the dialog
      data: { ...user } // Passes user data to the dialog
    });

    // After the dialog is closed, reload users if there was a change
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers();  // Reloads the users list if the result is true
      }
    });
  }

  // Method to handle deleting a user
  onDelete(user: Account): void {
    // Displays a confirmation prompt before deletion
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you really want to delete ${user.id}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        // Calls the service to delete the user if confirmed
        this.adminService.deleteUser(user.id).subscribe(
          () => {
            // Success: Shows a success message and reloads users
            Swal.fire('Deleted!', 'The user has been deleted.', 'success');
            this.loadUsers();
          },
          (error) => {
            // Error: Shows an error message
            Swal.fire('Error!', 'Failed to delete the user.', 'error');
            console.error('Error deleting user:', error);
          }
        );
      }
    });
  }
}
