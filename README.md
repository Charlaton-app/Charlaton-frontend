# Charlaton Frontend

A modern frontend application built with Vite, React, TypeScript, and SASS.

## Technologies

- **Vite** - Fast build tool and development server
- **React 19** - UI library with latest features
- **TypeScript** - Type-safe JavaScript
- **SASS** - CSS preprocessor with variables, nesting, and more

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Building

Build for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

## Project Structure

```
charlaton-frontend/
├── public/          # Static assets
├── src/
│   ├── assets/      # Images, fonts, etc.
│   ├── App.tsx      # Main App component
│   ├── App.scss     # App styles (SASS)
│   ├── main.tsx     # Application entry point
│   └── index.scss   # Global styles (SASS)
├── index.html       # HTML entry point
├── package.json     # Dependencies and scripts
├── tsconfig.json    # TypeScript configuration
└── vite.config.ts   # Vite configuration
```

## SASS Usage

This project uses SASS for styling. You can use SASS features like:

- **Variables**: Define reusable values
- **Nesting**: Nest selectors for better organization
- **Mixins**: Create reusable style blocks
- **Functions**: Perform calculations and transformations

Example:

```scss
// Variables
$primary-color: #646cff;
$spacing: 1rem;

.component {
  color: $primary-color;
  padding: $spacing;

  &:hover {
    opacity: 0.8;
  }
}
```
