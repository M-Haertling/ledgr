# Features & Requirements

## 1. Core Transaction Management
- **Account Management:** CRUD operations for bank accounts or credit cards.
- **Category Management:** CRUD operations for user-defined spending categories.
- **Transaction Details:**
    - Date, Description, Amount, Account, Category, Tags.
    - Support for both single-column (signed) and dual-column (split credit/debit) amount formats.
- **CSV Upload Engine:**
    - Mapping of CSV exports from various banks.
    - Persistent mapping per account to avoid re-configuration.
    - Attach uploads to a specific account.
- **Duplicate Prevention:** Support for tracking and preventing duplicate transaction entries during upload.

## 2. Organization & Automation
- **Categorization System:**
    - Apply rules to automatically categorize transactions based on description patterns.
    - Interface to view uncategorized items and easily apply a category.
    - Fast and easy creation of new categorization rules.
- **Tagging System:**
    - Support for multiple tags per transaction (independent of categories).
    - Tags can be applied manually or via automated rules to improve searchability.

## 3. Search & Insights
- **Advanced Search:** Filter transactions by category, tags, description, account, date, and more.
- **Reporting:**
    - Expenses over time visualization.
    - Breakdown of spending by category.

## 4. UI/UX Requirements
- Focused on quick categorization of new data.
- Modern, responsive interface built with Vanilla CSS.
- Visual indicators for transactions requiring attention (e.g., uncategorized).
