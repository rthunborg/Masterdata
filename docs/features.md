# HR Masterdata Application - Features & Capabilities

**Document Version:** 2.0  
**Last Updated:** 2025-01-30  
**Target Audience:** Stakeholders, Business Users, Management

---

## Overview

This document provides a comprehensive overview of all features and capabilities available in the HR Masterdata application. The application supports seasonal recruitment management for Stena Line, enabling HR administrators and external partners to efficiently manage employee masterdata, training schedules, and operational workflows.

---

## Epic 1: Foundation & Authentication Infrastructure

### User Authentication & Security
- **Secure Login System**: Username and password authentication for all users
- **Role-Based Access Control**: Five distinct user roles with appropriate permissions:
  - HR Admin (full system access)
  - Sodexo (limited access to assigned data)
  - ÖMC (limited access to assigned data)
  - Payroll (limited access to assigned data)
  - Toplux (limited access to assigned data)
- **Session Management**: Secure user sessions with automatic logout capabilities
- **Access Protection**: System automatically restricts access based on user role

### System Infrastructure
- **Health Monitoring**: System health checks to ensure application availability
- **Deployment Readiness**: Production-ready infrastructure with smoke testing
- **Database Foundation**: Secure database setup with proper access controls

---

## Epic 2: HR Masterdata Management Core

### Employee Record Management
- **Employee List View**: Spreadsheet-like table displaying all active employees with key information
- **Create New Employees**: Add new employee records with complete masterdata including:
  - Personal information (name, SSN, email, phone)
  - Employment details (rank, gender, hiring date)
  - Location information (city/town district)
  - Training dates (Stena dates, ÖMC dates, PE3 dates)
- **Edit Employee Information**: Update any employee masterdata field with immediate saving
- **Archive Employees**: Soft-delete employee records (hide from main view while preserving data)
- **Terminate Employees**: Mark employees as terminated with termination date and reason tracking
- **Employee Search**: Quick text search across all employee fields to find specific records
- **Column Sorting**: Click any column header to sort employees (ascending/descending)

### Data Import & Export
- **CSV Import**: Bulk import employees from CSV/Excel files with automatic column mapping
- **CSV Import for Important Dates**: Import training dates and operational dates from CSV files
- **Flexible Export Options**: Export selected employees with customizable field selection
- **Crew Ready Export**: Export employees who have completed all required masterdata fields
- **Export Formatting**: Professional CSV exports with proper formatting and field organization

### Important Dates Calendar
- **Reference Calendar**: View all important operational dates (Stena dates, ÖMC dates, PE3 dates)
- **Date Management**: Create, edit, and manage training dates and operational deadlines
- **Date Assignment**: Assign employees to specific training dates
- **Capacity Tracking**: View maximum spots and remaining availability for each date
- **Visual Indicators**: Color-coded warnings when dates are full or nearly full

---

## Epic 3: Role-Based Column Visibility & External Party Views

### Dynamic Column Display
- **Role-Based Views**: Each user role sees only the columns relevant to their responsibilities
- **Read-Only Masterdata**: External parties can view (but not edit) assigned masterdata fields
- **Visual Indicators**: Clear visual distinction between read-only and editable columns
- **Column Permissions**: HR Admin controls which columns each role can see

### External Party Access
- **Secure External Access**: External partners (Sodexo, ÖMC, Payroll, Toplux) can access the system
- **Data Isolation**: Each external party only sees data assigned to their role
- **Read-Only Reference Data**: External parties can view employee masterdata for reference
- **Custom Data Access**: External parties can view and edit their own custom columns

---

## Epic 4: External Party Custom Columns, Real-Time Sync & Change Notifications

### Custom Column Management
- **Create Custom Columns**: External parties can create their own data columns with:
  - Custom column names
  - Data types (text, number, date, yes/no)
  - Category organization
- **Edit Custom Data**: External parties can edit data in their custom columns
- **Category Organization**: Organize custom columns into logical categories (e.g., "Recruitment Team", "Warehouse Team")
- **Delete Custom Columns**: Remove custom columns when no longer needed
- **Column Isolation**: Each external party's custom columns are completely separate

### Real-Time Data Synchronization
- **Instant Updates**: Changes made by any user appear immediately for all other users (within 2 seconds)
- **No Page Refresh Required**: Data updates automatically without manual page refresh
- **Change Notifications**: Visual indicators when data changes affect your current view
- **Multi-User Collaboration**: Multiple users can work simultaneously without conflicts

---

## Epic 5: Admin Configuration & Role Preview

### User Account Management
- **Create User Accounts**: HR Admin can create new user accounts for all roles
- **Activate/Deactivate Users**: Enable or disable user accounts as needed
- **Role Assignment**: Assign appropriate roles to each user account
- **User Management Interface**: Easy-to-use interface for managing all system users

### Column Permission Configuration
- **Permission Management**: HR Admin controls which columns each role can view or edit
- **Granular Control**: Set permissions at the individual column level
- **Permission Preview**: See exactly what each role sees before saving changes

### Role Preview Mode
- **View As Role**: HR Admin can preview the system exactly as any role sees it
- **Permission Verification**: Verify that column permissions are configured correctly
- **Testing Capability**: Test different role views without switching accounts

---

## Epic 5.5: Post-MVP Polish & Branding

### User Experience Enhancements
- **Improved Navigation**: Enhanced header navigation with better organization
- **Helpful Tooltips**: Contextual help tooltips throughout the application
- **Redirect Improvements**: Fixed login redirects and navigation flows
- **SSN Input Flexibility**: Flexible Social Security Number input with automatic formatting

### Branding & Localization
- **Stena Line Branding**: Complete Stena Line visual identity throughout the application
- **Bilingual Support**: Full Swedish and English language support
- **Language Toggle**: Easy switching between Swedish and English
- **Consistent Branding**: Professional appearance matching Stena Line standards

---

## Epic 6: Employee Form & Data Management Enhancements

### Form Improvements
- **Enhanced Validation**: Improved field validation with clear error messages
- **Data Loss Prevention**: System prevents accidental data loss when editing forms
- **Form Auto-Save**: Automatic saving of form changes
- **User Activity Tracking**: Track when users last accessed the system

### Column Management
- **Improved Column UX**: Better user experience for managing visible columns
- **Column Visibility Preferences**: Save your preferred column visibility settings
- **Date Display Fixes**: Improved date field display and editing

---

## Epic 7: Initial Setup & Production Readiness

### Masterdata Configuration
- **Comprehensive Column Structure**: Complete masterdata column configuration
- **External Party Permissions**: Proper permission setup for all external parties
- **Translation Coverage**: Complete translation support for all features
- **Production Configuration**: All settings configured for production use

### Admin Features
- **Complete Admin Tools**: All administrative features available and functional
- **System Readiness**: Application ready for production deployment

---

## Epic 8: Enhanced Employee Management Features

### Employee Status Management
- **Visual Status Indicators**: Color-coded indicators for employee status:
  - Green tint for employees ready for crew assignment
  - Red tint for terminated employees
  - Grey tint for selected employees
- **Boolean Field Indicators**: Visual indicators for completion status of required fields
- **Status-Based Logic**: System behavior changes based on employee status

### Field Restrictions & Logic
- **Gender/Rank Restrictions**: Enforce business rules for gender and rank combinations
- **Conditional Field Logic**: Fields appear or become editable based on other field values
- **Talmundo Field Logic**: Special logic for Talmundo-related fields
- **Crewing Done Logic**: Automatic determination of crew readiness based on completed fields

### Important Dates Management
- **Capacity Management**: Track and manage capacity for training dates:
  - Maximum spots per date
  - Remaining available spots
  - Visual warnings when dates are full
- **Assigned Employees List**: View all employees assigned to each training date
- **ÖMC Two-Day Dates**: Support for ÖMC dates spanning two days
- **PE3 Time Selection**: Select specific times for PE3 dates
- **Automatic Deadline Calculation**: System automatically calculates PE3 submission and cancellation deadlines

### Room Assignment
- **Automatic Room Assignment**: System automatically assigns hotel rooms to employees based on:
  - Employee rank (CHEF gets private rooms, SEV shares rooms)
  - Employee gender (SEV shares with same gender, max 2 per room)
  - Date assignments
- **Room Recalculation**: Rooms automatically recalculate when employee dates or details change
- **Room Number Display**: View assigned room numbers for each employee

### Termination & Repayment Tracking
- **Termination Date Management**: Track termination dates with automatic spot management
- **Repayment Tracking**: Track repayment information for terminated employees
- **Repayment Fields**: Special fields visible only for terminated employees
- **Termination Workflow**: Complete workflow for managing employee terminations

---

## Epic 11: Comprehensive Test Coverage

### Quality Assurance
- **Complete Test Suite**: Comprehensive testing for all application features
- **Unit Testing**: Individual component and function testing
- **Integration Testing**: End-to-end workflow testing
- **Performance Testing**: System performance and concurrency testing
- **Data Integrity Testing**: Validation of data constraints and business rules

---

## Epic 12: Mobile Experience Enhancement

### Mobile-Optimized Interface
- **Responsive Design**: Application works seamlessly on mobile devices
- **Mobile Card View**: Employee information displayed as cards on mobile devices
- **Touch-Optimized Controls**: All buttons and controls sized for easy touch interaction
- **Mobile Navigation**: Optimized navigation menu for mobile devices

### Mobile Interactions
- **Pull-to-Refresh**: Swipe down to refresh employee data
- **Swipe Gestures**: Swipe left on employee cards to reveal quick actions
- **Long-Press Actions**: Long-press employee cards for context menu
- **Quick Actions**: Fast access to common actions (edit, archive, call, email)

### Mobile Features
- **Offline Support**: View and edit employee data even without internet connection
- **Local Caching**: Data cached locally for faster access
- **Automatic Sync**: Changes sync automatically when connection is restored
- **Progressive Web App (PWA)**: Install the application on your mobile device home screen
- **App-Like Experience**: Native app feel with smooth animations and transitions

### Mobile Performance
- **Fast Loading**: Optimized for quick loading on mobile networks
- **Smooth Scrolling**: 60fps scrolling performance
- **Efficient Data Loading**: Only loads visible data for better performance
- **Optimized Images**: Compressed images for faster mobile loading

### Mobile Accessibility
- **Screen Reader Support**: Full support for VoiceOver (iOS) and TalkBack (Android)
- **Touch Target Sizes**: All interactive elements meet accessibility standards
- **Keyboard Navigation**: Full keyboard navigation support
- **Color Contrast**: Meets accessibility standards for color contrast

### Mobile Employee Cards
- **Always-Visible Fields**: Key fields (name, rank, city, dates) always visible without expanding
- **Expandable Details**: Tap "More" to see all employee information
- **Inline Editing**: Edit fields directly in the card view
- **Mobile Date Pickers**: Native mobile date pickers for date selection

---

## Epic 13: Dashboard Filter, Selection, and Export Enhancements

### Employee Selection
- **Row Selection Checkboxes**: Select individual employees with checkboxes
- **Click-to-Select**: Click anywhere on an employee row to select/deselect
- **Multi-Select**: Select multiple employees at once
- **Visual Selection Indicators**: Selected employees highlighted with grey tint
- **Selection Persistence**: Selected employees remain selected when scrolling

### Advanced Filtering
- **Filter Checkboxes**: Filter employees by status:
  - Show Archived employees
  - Show Terminated employees
  - Show employees with repayments
- **Crew Ready Filter**: Filter to show only employees ready for crew assignment
- **Auto-Selection**: Crew Ready filter automatically selects all matching employees
- **Filter State Management**: Clear visual indication of active filters

### Enhanced Export
- **Selected-Only Export**: Export only selected employees
- **Field Selection**: Choose which fields to include in export
- **Custom Export**: Create exports with exactly the fields you need
- **Export Preview**: See what will be exported before generating file
- **Multiple Export Formats**: Professional CSV exports with proper formatting

### Visual Enhancements
- **Status Color Coding**: 
  - Red tint for terminated employees
  - Green tint for crew-ready employees
  - Grey tint for selected employees
- **Visual Status Indicators**: Quick visual identification of employee status
- **Improved Header**: Updated header with "Säsongsrekrytering 2026" branding

### Performance Optimizations
- **Smart Refresh**: View only refreshes when data actually changes
- **Reduced Unnecessary Updates**: No flickering or unnecessary data reloading
- **Efficient Filtering**: Fast filter application without full page refresh

---

## Epic 14: Automated HR Admin Email Notifications

### ÖMC Masterdata Completion Follow-Up
- **Automated Reminders**: System automatically sends email reminders when employees haven't completed required masterdata 3 days after ÖMC training
- **Detailed Notifications**: Emails include:
  - Employee name and ÖMC completion date
  - List of incomplete or missing fields
  - Clear action items for follow-up
- **Smart Timing**: Notifications sent exactly 3 days after ÖMC completion
- **One-Time Notifications**: Each employee receives reminder only once (unless ÖMC date changes)

### PE3 Deadline Notifications
- **Submission Deadline Alerts**: Email notification on PE3 submission deadline dates
- **Cancellation Deadline Alerts**: Email notification on PE3 cancellation deadline dates
- **Consolidated Emails**: One email per deadline type listing all affected PE3 dates and assigned employees
- **Employee Assignment Information**: Emails show which employees are assigned to each PE3 date
- **Unassigned Spot Alerts**: Clear indication when PE3 dates have unassigned spots

### Notification Features
- **Daily Automated Job**: System runs daily at 7:00 AM (Stockholm time) to check for notifications
- **Idempotent Notifications**: System prevents duplicate notifications
- **Timezone Accuracy**: All date calculations use Stockholm timezone
- **Professional Email Format**: Clear, actionable email templates
- **Multiple Recipients**: All HR Admin users receive notifications

---

## Epic 16: Employee Data Change Notifications

### Change Detection System
- **Column-Level Change Tracking**: System tracks changes to individual masterdata fields at the column level
- **Audit Table**: Database audit table records all masterdata field changes without storing duplicate data (GDPR compliant)
- **Permission-Based Filtering**: Only shows changes for columns the user has view permission for
- **Masterdata Only**: Change tracking applies only to masterdata fields (custom columns excluded)

### Change Notification Banner
- **Login Notifications**: Dismissible banner appears on login showing how many employees have changes since last login
- **Change Summary**: Banner displays count of affected employees and last login timestamp
- **Session-Based Dismissal**: Banner can be dismissed for the current session (stored in sessionStorage)
- **Clear Action Items**: Banner provides clear indication of what has changed

### Visual Field Highlighting
- **Changed Field Indicators**: Changed fields are highlighted with soft yellow/amber background color in the employee table
- **Persistent Highlights**: Highlights persist for the entire session (survive page refreshes, cleared on next login)
- **Column Mapping**: System correctly maps database column names to displayed columns for accurate highlighting
- **Multi-View Support**: Highlights work in both desktop table view and mobile card view
- **Non-Intrusive Design**: Highlights are noticeable but don't interfere with inline editing or readability

### Change Detection Performance
- **Fast Query Performance**: Change detection completes in <500ms on login
- **Efficient Filtering**: Only queries changes for visible masterdata columns and non-archived employees
- **Scalable Architecture**: Audit table handles high change frequency without performance degradation

---

## Epic 17: External User UX Improvements

### Localization Enhancements
- **Swedish Custom Column Management**: All custom column management UI text is localized to Swedish for external users
- **Consistent Language**: External party users see Swedish interface for all custom column operations
- **Translation Coverage**: Complete Swedish translation coverage for create, edit, delete, and category management

### Custom Column Management Improvements
- **Delete Functionality**: External users can delete their own custom columns with dedicated delete button
- **Category Color Editing**: External users can edit category colors when editing custom columns
- **Enhanced Edit Modal**: Improved edit column modal with full category color editing capabilities
- **Column Type Simplification**: Removed unnecessary column type hints for cleaner interface

### Export Functionality for External Users
- **Permission-Based Export**: External users can export employees with field selection limited to their view permissions
- **Field Selection Dialog**: Export dialog shows only fields the user has view access for
- **Selected-Only Export**: Export includes only selected employees (if selection is implemented)
- **Professional CSV Format**: Exports generate properly formatted CSV files with appropriate field names

### UI Simplification
- **Removed Premade Filters**: Premade filter dropdown is hidden for external users (search functionality still available)
- **Removed Navigation Area**: Navigation bar is hidden for external users (they only have dashboard access)
- **Streamlined Interface**: Cleaner, more focused interface for external party users
- **Column Alignment Fix**: Fixed vertical alignment issue for external users with limited viewable fields

### User Experience Benefits
- **Reduced Clutter**: External users see only relevant UI elements for their workflow
- **Improved Focus**: Simplified interface helps external users focus on their core tasks
- **Better Localization**: Swedish interface improves usability for Swedish-speaking external users
- **Enhanced Functionality**: Delete and export capabilities give external users more control

---

## Cross-Epic Features

### Data Management
- **Real-Time Updates**: All data changes appear immediately for all users
- **Data Validation**: Comprehensive validation ensures data quality
- **Audit Trail**: System tracks when data was last modified
- **Data Integrity**: Business rules enforced to maintain data consistency

### User Experience
- **Intuitive Interface**: Easy-to-use interface designed for efficiency
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Fast Performance**: Quick loading and responsive interactions
- **Professional Appearance**: Clean, modern design matching Stena Line branding

### Security & Access
- **Role-Based Security**: Strict access control based on user roles
- **Data Isolation**: External parties can only access their assigned data
- **Secure Authentication**: Industry-standard security practices
- **Session Management**: Secure session handling with automatic timeout

### Reporting & Export
- **Flexible Exports**: Export data in various formats with field selection
- **Bulk Operations**: Perform actions on multiple employees at once
- **Data Analysis**: Search, filter, and sort capabilities for data analysis
- **Professional Reports**: Generate professional reports for stakeholders

---

## Summary

The HR Masterdata application provides a comprehensive solution for managing seasonal recruitment, employee masterdata, training schedules, and operational workflows. The system supports:

- **5 User Roles** with appropriate access levels
- **Complete Employee Lifecycle Management** from creation to termination
- **Real-Time Collaboration** with instant data synchronization
- **Mobile-First Experience** with full mobile support
- **Automated Workflows** including room assignment and email notifications
- **Flexible Data Management** with custom columns and exports
- **Change Notifications** for external users to track masterdata updates
- **Localized External User Experience** with Swedish interface and streamlined UI
- **Professional Branding** matching Stena Line standards

The application is production-ready and designed to scale with your seasonal recruitment needs.

---

**For technical details or implementation questions, please refer to the technical documentation or contact the development team.**

