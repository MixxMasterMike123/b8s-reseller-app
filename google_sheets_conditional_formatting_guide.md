# Google Sheets Conditional Formatting for Translation Status

## How to Add Status-Based Color Coding

### Step 1: Select Status Column
1. Click on column **F** (Status column) header
2. Select the range F2:F116 (all status cells)

### Step 2: Add Conditional Formatting
1. Go to **Format** → **Conditional formatting**
2. Add these rules one by one:

### Rule 1: New Translations (Red)
- **Format cells if**: Custom formula is `=$F2="Ny"`
- **Formatting style**: Light red background (#ffebee), dark red text (#c62828)

### Rule 2: In Progress (Orange)
- **Format cells if**: Custom formula is `=$F2="Pågående"`
- **Formatting style**: Light orange background (#fff3e0), dark orange text (#ef6c00)

### Rule 3: Translated (Yellow)
- **Format cells if**: Custom formula is `=$F2="Översatt"`
- **Formatting style**: Light yellow background (#fffde7), dark yellow text (#f57f17)

### Rule 4: Reviewed (Blue)
- **Format cells if**: Custom formula is `=$F2="Granskad"`
- **Formatting style**: Light blue background (#e3f2fd), dark blue text (#1565c0)

### Rule 5: Approved (Green)
- **Format cells if**: Custom formula is `=$F2="Godkänd"`
- **Formatting style**: Light green background (#e8f5e8), dark green text (#2e7d32)

### Rule 6: Needs Revision (Purple)
- **Format cells if**: Custom formula is `=$F2="Behöver revidering"`
- **Formatting style**: Light purple background (#f3e5f5), dark purple text (#7b1fa2)

## Translation Status Workflow

### Status Progression
1. **Ny** (New) → Ready for translation
2. **Pågående** (In Progress) → Translator working on it
3. **Översatt** (Translated) → First draft complete
4. **Granskad** (Reviewed) → Quality reviewed
5. **Godkänd** (Approved) → Ready for implementation
6. **Behöver revidering** (Needs Revision) → Back to translator

### Color Legend
- 🔴 **Red**: New translations needed
- 🟠 **Orange**: Work in progress
- 🟡 **Yellow**: Translated, awaiting review
- 🔵 **Blue**: Reviewed, awaiting approval
- 🟢 **Green**: Approved, ready to implement
- 🟣 **Purple**: Needs revision

This visual system makes it easy to track translation progress at a glance! 