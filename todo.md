# Upload
[] Make upload its own page
[] Allow any pre-defined templates to be selected
[] The upload must support files that have a separate `credit` and `debit` column
    - Force all credits to be positive and debits to be negative
[] When using `amount` if the `is credit` column is not specified, assume that positive numbers are credits and negative numbers are debits

# Transactions
[] Use a table structure where all columns can be filtered and/or sorted
[] Enable categories to be easily set or changed
[] Enable filtering by date range
[] Enable selection of multiple categories, tags, and accounts when filtering
[] Enable filtering to uncategorized transactions
[] Add a field that indicates credit vs debit - this column should be filterable
[] Use pagination

# Reporting
[] Graph spending vs income
[] Graph spending by category
[] Filters
    - Tags
    - Category
[] Add Year-to-date (YTD) options in addition to current month

# Accounts
[] Enable accounts to be renamed

# Categories
[] Enable categories to be renamed
[] Enable category colors to be changed
[] When deleting a category all existing mappings to that category should be cleared

# Tags
[] Enable tags to be renamed

# Rules
[] Enable rules to be optionally tied to specific accounts
[] Enable rules to apply tags in addition to categories
[] Enable rules to accept wildcards `*` - ensure this feature is noted on the UI