# NREGA_Asset_Categorization
This project automates the categorization of works based on predefined rules and keywords. It provides a flexible framework to categorize large datasets efficiently and accurately. The code includes utility functions for data cleaning, keyword-category mapping, and categorization application, making it easy to integrate into various workflows.

# Code README

## Inputs Needed:
- Datasets for analysis (structured in CSV format)
- Initial rules for categorization (stored in a dictionary format)
- Runner section inputs (to specify the dataset and the level of analysis - all, states, or districts)

## Datasets Being Used:
- CSV files containing the data for analysis. Each file should contain the necessary information for categorization.

## Function Descriptions:

### remove_special_chars(line: str) -> str:
- Input: 
    - line: String containing special characters.
- Output: Returns a string with special characters replaced with spaces.
- Description: Removes special characters from the input string.

### remove_short_words(line: str) -> str:
- Input: 
    - line: String containing words to be filtered.
- Output: Returns a string with short and stop words removed.
- Description: Removes short and stop words from the input string.

### clean(string: str) -> str:
- Input: 
    - string: String to be cleaned.
- Output: Returns a cleaned string with special characters and short/stop words removed.
- Description: Applies various cleaning functions to the input string.

### getKeywork2category(category2keyword: dict) -> list:
- Input: 
    - category2keyword: Dictionary containing category-keyword mappings.
- Output: Returns a list of keyword-category pairs.
- Description: Extracts keyword-category pairs from the given dictionary.

### check1(row: pd.Series, keyword: str, category: str, col_name: str) -> str:
- Input: 
    - row: Pandas Series representing a row of data.
    - keyword: Keyword to check for. the keyword contains single word the it is checking whether the word is present in the work or not
    - category: Category associated with the keyword.
    - col_name: Name of the column to check for the keyword.
- Output: Returns the category if the keyword is found in the specified column of the row and not found in other column, otherwise an empty string.
- Description: Checks if the first part of keyword is present in the specified column of the row and the second part is not present in the specified column of the row.

### check2(row: pd.Series, keyword: str, category: str, col_name: str) -> str:
- Input: 
    - row: Pandas Series representing a row of data.
    - keyword: Keyword to check for. if keyword is of two words the both of the words have to be present in the work
    - category: Category associated with the keyword.
    - col_name: Name of the column to check for the keyword.
- Output: Returns the category if both parts of the keyword are found in the specified column of the row, otherwise an empty string.
- Description: Checks if both parts of the keyword are present in the specified column of the row.

### check3(row: pd.Series, keyword: str, category: str, col_name: str) -> str:
- Input: 
    - row: Pandas Series representing a row of data.
    - keyword: Keyword to check for. the keyword is of the form A-B then A have to present in the work and B must not present in the work
    - category: Category associated with the keyword.
    - col_name: Name of the column to check for the keyword.
- Output: Returns the category if the keyword is found in the specified column of the row, otherwise an empty string.
- Description: Checks if the keyword is present in the specified column of the row.

### apply_transformer(category2keyword: dict, data: pd.DataFrame) -> pd.DataFrame:
- Input: 
    - category2keyword: Dictionary containing category-keyword mappings.
    - data: DataFrame containing the data to be transformed.
- Output: Returns a DataFrame with categorization applied.
- Description: Applies the categorization rules to the input data.

### script(ip_file_path: str, op_file_path: str, op_file_path_for_blank_res: str):
- Input: 
    - ip_file_path: File path of the input CSV file.
    - op_file_path: File path for saving the categorized data.
    - op_file_path_for_blank_res: File path for saving the uncategorized data.
- Output: None
- Description: Reads input data, applies categorization, saves categorized and uncategorized data to CSV files.

### find_state_and_districts(path: str) -> dict:
- Input: 
    - path: Path to the directory containing state-wise district data.
- Output: Returns a dictionary mapping states to their respective districts.
- Description: Searches for CSV files in each state directory and creates a mapping of states to districts.

## Outputs of the Code:
- Two files are generated for each run:
    1. Categorized data: Saved to the specified output file path.
    2. Uncategorized data: Saved to the specified output file path for blank results.

## Rules for Categorization:
- Categorization rules are defined in the `category2keyword` dictionary.
- Keywords associated with each category are used to categorize the data.
- Rules are applied iteratively to maximize the number of categorized works.

## Code Execution:
- The code iterates over each district in the state of ODISHA.
- For each district, it categorizes the data and saves the categorized and uncategorized data to respective files in the output directory.
