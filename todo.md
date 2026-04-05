# Upload
* Enable automatic transaction mapping if exactly one transaction links within 7 days of each other
* Make transaction mapping manually triggerable
* Enable templates to be deleted
* Upload form does not reset on refresh or on selection of upload new
* Enable selection of a column for Category

# Transactions
* When viewing a linked transaction on a transfer, the CURRENT data does not include description, amount, and account - line the fields up between CURRENT and PAIRED - do not show type because it is implied to be a tranfer
* Add the ability to store notes on a transaction
    * Add a notes icon at the end of each row
    * If a note is present, make the icon represent it visually
    * Clicking the icon opens a notes dialog
* Update the search bar to search description and notes
* Update the search bar to support wild-cards `*`, similar to automation rules - indicate the function in a similar way to how it is done in automation
* Add the ability to manually add a transaction

# Reporting
* Do not display transfers in any of the reports
* For category based reporting
    * For standard categories, show the net of credits and debits (this should remove any returns)
    * Do not show net positive/credit categories or report them separately
* Change the category and tag filters in Reports to match how they are done in Transactions
* Add a Previous Month option in the Period selection

# Accounts


# Categories
* Suggest a new random color for each new category - make the color suggestions as distinct as possible so they differenciate on the report
* Make the color picker simpler to use, give a set of pre-defined colors designed to look good in reporting

# Tags


# Rules
* Separate rules for tags vs categories
    * Tags do not need priority - all rules that match should be applied - dedup if any duplicate tags are applied
    * Categories will remain first match based on priority
* Add a new "Apply to Untagged" button to invoke the tag rules
* Add the ability to classify rules
    * Each rule can be assigned a rule type
    * Rules are broken out by rule type
    * Enable filtering on rule type and category assigned

# Other
* Add a Backup/Restore functionality
    * Backup dumps all data to CSVs in a directory of the user's choice
    * Restore loads in all CSVs in a selected directory into the system
