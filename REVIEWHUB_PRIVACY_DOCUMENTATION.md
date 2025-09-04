# ReviewHub Privacy and Data Protection Documentation

This document provides comprehensive information about the privacy and data protection features implemented in ReviewHub, covering GDPR compliance, data export tools, and granular privacy controls.

## Table of Contents
1.  [GDPR Compliance Implementation](#gdpr-compliance-implementation)
2.  [Data Export Tools Development](#data-export-tools-development)
3.  [Granular Privacy Controls](#granular-privacy-controls)
4.  [Testing and Validation](#testing-and-validation)
5.  [Privacy Policy Updates](#privacy-policy-updates)

---

## 1. GDPR Compliance Implementation

ReviewHub is designed with General Data Protection Regulation (GDPR) compliance in mind, ensuring users have full control over their personal data. This section details the backend and frontend implementations for GDPR.

### 1.1 Backend Implementation

**Service:** `gdpr_service.py`

This service handles all core GDPR functionalities, including consent management, data deletion requests, and privacy reporting.

**Database Models (`app_enhanced.py`):**

-   **`UserConsent`**: Tracks user consent for various data processing purposes.
    -   `consent_type`: Type of consent (e.g., `essential`, `analytics`, `marketing`, `personalization`, `third_party`).
    -   `granted`: Boolean indicating if consent was given.
    -   `timestamp`: When the consent was recorded/updated.
    -   `ip_address`: IP address from which consent was given.

-   **`DataDeletionRequest`**: Manages user requests for data deletion (Right to be Forgotten).
    -   `user_id`: ID of the user requesting deletion.
    -   `status`: Current status of the request (`pending`, `approved`, `rejected`, `completed`).
    -   `requested_at`: Timestamp of the request.
    -   `processed_at`: Timestamp when the request was processed.
    -   `reason`: Optional reason provided by the user.

-   **`DataExportRequest`**: Manages user requests for data export (Data Portability).
    -   `user_id`: ID of the user requesting export.
    -   `export_format`: Format of the export (`json`, `csv`, `pdf`).
    -   `status`: Current status of the export (`pending`, `processing`, `completed`, `failed`).
    -   `requested_at`: Timestamp of the request.
    -   `completed_at`: Timestamp when the export was completed.
    -   `file_path`: Path to the generated export file.
    -   `expires_at`: Timestamp when the export file expires.
    -   `download_count`: Number of times the export file has been downloaded.

-   **`PrivacySettings`**: Stores granular privacy preferences for each user.
    -   `user_id`: ID of the user.
    -   `profile_public`: Boolean for profile visibility.
    -   `show_real_name`: Boolean to display real name.
    -   `show_location`: Boolean to display location.
    -   `show_review_count`: Boolean to display review count.
    -   `reviews_public`: Boolean for review visibility.
    -   `allow_review_comments`: Boolean to allow comments on reviews.
    -   `show_verified_purchases`: Boolean to display verified purchase badges.
    -   `email_notifications`: Boolean for essential email notifications.
    -   `marketing_emails`: Boolean for marketing email consent.
    -   `review_notifications`: Boolean for review-related notifications.
    -   `recommendation_emails`: Boolean for recommendation emails.
    -   `allow_analytics`: Boolean for analytics data sharing.
    -   `allow_personalization`: Boolean for personalization data sharing.
    -   `third_party_sharing`: Boolean for third-party data sharing.

**API Endpoints (`app_enhanced.py`):**

-   `POST /api/gdpr/consent`: Record user consent for a specific type.
-   `GET /api/gdpr/consent`: Retrieve current consent status for the user.
-   `POST /api/gdpr/consent/withdraw`: Withdraw consent for a specific type.
-   `POST /api/gdpr/deletion-request`: Submit a request for data deletion.
-   `GET /api/gdpr/deletion-requests`: Retrieve the status of user's deletion requests.
-   `GET /api/gdpr/privacy-report`: Generate a summary of user's privacy-related data.
-   `GET /api/gdpr/data-retention`: Provide information on data retention policies.
-   `GET /api/admin/gdpr/deletion-requests`: (Admin) View all pending deletion requests.
-   `POST /api/admin/gdpr/deletion-request/<id>/process`: (Admin) Process a specific deletion request.

### 1.2 Frontend Implementation

**`src/components/privacy/GDPRCompliance.jsx`:**

This component provides the user interface for managing GDPR-related settings:

-   **Consent Management**: Toggle switches for different consent types (essential, analytics, marketing, personalization, third-party sharing). Essential consent is mandatory and cannot be withdrawn.
-   **Right to be Forgotten**: A section allowing users to request the deletion of their personal data. Includes a warning about the irreversible nature of this action and a history of past deletion requests.
-   **Privacy Report**: Displays a summary of the user's data, including review count, interactions, and active consents.
-   **Your Privacy Rights**: Informs users about their rights under GDPR (access, rectification, erasure, portability, object, restrict processing).

**API Service (`src/services/api.js`):**

New methods have been added to interact with the GDPR backend endpoints, enabling the frontend to record consent, request deletion, and retrieve privacy reports.

---

## 2. Data Export Tools Development

ReviewHub provides users with the ability to export their personal data in various machine-readable and human-readable formats, fulfilling the right to data portability under GDPR.

### 2.1 Backend Implementation

**Service:** `data_export_service.py`

This service is responsible for collecting user data, generating export files in specified formats, and managing export requests.

**Supported Export Formats:**

-   **JSON**: A machine-readable format suitable for developers and data analysis, containing the complete data structure.
-   **CSV**: Spreadsheet-compatible format, provided as multiple CSV files within a ZIP archive, ideal for Excel analysis.
-   **PDF**: A human-readable document format with formatted tables and summaries, easy to read and print.

**Data Included in Export:**

-   **Personal Information**: Profile details, account creation/login history, contact information, privacy preferences.
-   **Activity Data**: All reviews, ratings, product interactions, search history, and uploaded images/content metadata.
-   **Consent Records**: Details of all data processing consents given.
-   **Administrative Data**: History of previous export requests and data deletion requests.

**API Endpoints (`app_enhanced.py`):**

-   `POST /api/data-export/request`: Submit a request to export user data in a specified format.
-   `GET /api/data-export/requests`: Retrieve the history and status of user's data export requests.
-   `GET /api/data-export/download/<request_id>`: Download a completed data export file.
-   `POST /api/admin/data-export/cleanup`: (Admin) Clean up expired export files.
-   `GET /api/admin/data-export/stats`: (Admin) Get statistics on data export requests.

### 2.2 Frontend Implementation

**`src/components/privacy/DataExport.jsx`:**

This component provides the user interface for data export functionalities:

-   **Request New Export**: Users can select their preferred export format (JSON, CSV, PDF) and initiate a new export request.
-   **Export History**: Displays a list of all previous export requests, showing their status, format, requested date, completion date, and download count.
-   **Download Functionality**: Allows users to download completed export files directly from the browser. Export files are available for 30 days.
-   **Information Section**: Explains what data is included in the export.

**API Service (`src/services/api.js`):**

New methods have been added to handle data export requests, retrieve export history, and facilitate file downloads.

---

## 3. Granular Privacy Controls

ReviewHub offers granular privacy controls, allowing users to fine-tune their preferences regarding profile visibility, review sharing, communication, and data sharing with third parties.

### 3.1 Backend Implementation

**Database Model (`app_enhanced.py`):**

-   **`PrivacySettings`**: (As detailed in Section 1.1) This model stores all granular privacy preferences.

**API Endpoints (`app_enhanced.py`):**

-   `GET /api/privacy/settings`: Retrieve all privacy settings for the authenticated user.
-   `PUT /api/privacy/settings`: Update specific privacy settings.
-   `POST /api/privacy/settings/reset`: Reset all privacy settings to their default values.
-   `POST /api/privacy/visibility-check`: An internal endpoint to check if certain content (e.g., profile, review) should be visible to another user based on privacy settings.
-   `GET /api/privacy/communication-preferences`: Retrieve communication preferences.
-   `PUT /api/privacy/communication-preferences`: Update communication preferences.
-   `GET /api/privacy/data-sharing`: Retrieve data sharing preferences.
-   `PUT /api/privacy/data-sharing`: Update data sharing preferences.

### 3.2 Frontend Implementation

**`src/components/privacy/PrivacyDashboard.jsx`:**

This is the central component for managing all granular privacy settings:

-   **Privacy Score**: A dynamic score (0-100%) indicating the user's privacy protection level, with color-coded indicators (High, Medium, Low). The score is calculated based on various privacy settings, with higher scores for more restrictive settings.
-   **Tabbed Interface**: Settings are organized into intuitive tabs:
    -   **Profile Privacy**: Controls for `profile_public`, `show_real_name`, `show_location`, `show_review_count`.
    -   **Review Privacy**: Controls for `reviews_public`, `allow_review_comments`, `show_verified_purchases`.
    -   **Communication**: Controls for `email_notifications`, `marketing_emails`, `review_notifications`, `recommendation_emails`.
    -   **Data Sharing**: Controls for `allow_analytics`, `allow_personalization`, `third_party_sharing`.
-   **Real-time Updates**: Changes to settings are immediately reflected in the privacy score and saved to the backend.
-   **Reset to Defaults**: A button to quickly revert all settings to their default, privacy-friendly values.
-   **Privacy Tips**: Contextual tips and advice to help users make informed privacy choices.

**`src/components/privacy/PrivacyPage.jsx`:**

This is the main entry point for all privacy-related features, integrating `PrivacyDashboard`, `GDPRCompliance`, and `DataExport` components into a single, navigable page.

-   **Section Navigation**: Provides a clear overview and easy navigation between the Privacy Dashboard, GDPR Compliance, and Data Export sections.
-   **Privacy Information Footer**: Summarizes data collection, usage, user rights, and security measures, along with links to privacy policies.

**API Service (`src/services/api.js`):**

New methods have been added to interact with the privacy settings backend endpoints, allowing the frontend to fetch, update, and reset privacy preferences.

---

## 4. Testing and Validation

Thorough testing and validation are crucial to ensure the correct functioning and compliance of all privacy and data protection features.

### 4.1 Backend Testing

-   **Unit Tests**: Develop unit tests for `gdpr_service.py` and `data_export_service.py` to ensure individual functions work as expected.
-   **Integration Tests**: Test the API endpoints (`/api/gdpr/*`, `/api/data-export/*`, `/api/privacy/*`) to ensure proper interaction with database models and services.
-   **Security Testing**: Verify that sensitive data is handled securely, access controls are enforced, and potential vulnerabilities (e.g., injection, unauthorized access) are mitigated.
-   **Data Integrity**: Confirm that data deletion and export processes maintain data integrity and consistency.
-   **Edge Cases**: Test scenarios such as concurrent requests, large data volumes, and invalid inputs.

### 4.2 Frontend Testing

-   **Component Tests**: Test `GDPRCompliance.jsx`, `DataExport.jsx`, and `PrivacyDashboard.jsx` components for correct rendering, state management, and user interaction.
-   **End-to-End Tests**: Simulate user flows for consent management, data deletion requests, data export requests, and privacy settings updates.
-   **Usability Testing**: Ensure the privacy controls are intuitive and easy for users to understand and manage.
-   **Cross-Browser/Device Compatibility**: Verify functionality and display across different browsers and mobile devices.

### 4.3 Compliance Validation

-   **GDPR Checklist**: Conduct a thorough review against a GDPR compliance checklist to ensure all requirements are met.
-   **Legal Review**: (Recommended) Consult with legal experts to validate the privacy policy and data handling practices.
-   **Data Mapping**: Verify that all personal data processed is accurately mapped and documented.
-   **Consent Audit**: Regularly audit consent records to ensure they are valid and up-to-date.

---

## 5. Privacy Policy Updates

With the implementation of new privacy and data protection features, the ReviewHub Privacy Policy must be updated to reflect these changes accurately and transparently.

**Key Areas to Update:**

-   **Data Collection**: Clearly state what personal data is collected, including new data points for analytics and personalization if applicable.
-   **Purpose of Processing**: Explain the specific purposes for which data is processed, linking to the consent types (e.g., essential functionality, analytics, marketing).
-   **Legal Basis**: Outline the legal basis for processing each category of data (e.g., consent, legitimate interest, contract performance, legal obligation).
-   **User Rights**: Detail the user's rights under GDPR, including:
    -   Right to Access (data export).
    -   Right to Rectification.
    -   Right to Erasure (data deletion).
    -   Right to Data Portability.
    -   Right to Object.
    -   Right to Restriction of Processing.
-   **Data Retention**: Specify data retention periods for different types of data.
-   **Data Sharing**: Clearly list any third parties with whom data is shared and the purpose of sharing.
-   **Security Measures**: Describe the technical and organizational measures in place to protect user data.
-   **Contact Information**: Provide clear contact details for the Data Protection Officer (DPO) or privacy team.

**Recommendation:**

-   **Version Control**: Maintain version control for the Privacy Policy to track changes over time.
-   **User Notification**: Inform users about significant updates to the Privacy Policy and obtain re-consent if necessary.
-   **Plain Language**: Ensure the policy is written in clear, concise, and easy-to-understand language, avoiding legal jargon where possible.

---

This documentation serves as a comprehensive guide for the privacy and data protection features in ReviewHub, ensuring transparency, compliance, and user control.

