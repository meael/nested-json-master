# Nested JSON Master

A powerful tool for visualizing and editing large, nested JSON files with ease.

## Features

- **Flattened View**: Visualize deep JSON structures as a flat list of paths, making it easier to navigate complex data.
- **High Performance**: Built with Web Workers for heavy processing and virtualization for rendering large datasets smoothly.
- **Diff Tracking**: Real-time tracking of added, removed, and modified keys to keep you in control of your changes.
- **Search & Filter**: Instantly filter keys by path or value to find exactly what you need.
- **File System Integration**: Direct file opening and saving using the modern File System Access API.
- **Safe Editing**: Validation and confirmation steps to prevent accidental data loss.

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nested-json-master
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the URL shown in the terminal).

## Usage

1. **Open a File**: Click the "Open" button to select a JSON file from your local system. You can also drag and drop a file into the window.
2. **View & Search**: Use the search bar to filter keys by path or value. The list view uses virtualization to handle large files efficiently.
3. **Edit Values**: Click on the pencil icon next to any item to edit its value.
4. **Add Keys**: Click the "Add Key" button to insert new keys into the JSON structure.
5. **Save Changes**: Click "Save" to write changes back to the file. If you opened a file directly, it will save to that file. Otherwise, it will prompt to download the edited JSON.
