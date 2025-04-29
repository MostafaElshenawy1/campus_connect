# Campus Connect

A platform for students to buy and sell items within their campus community.

## Features

- Create and manage listings (buy/sell)
- Browse listings with advanced filtering
- User profiles with listings and reviews
- Group creation and management
- Real-time messaging system
- Responsive design for all devices

## Tech Stack

- React 18
- Material-UI
- React Router
- Axios for API calls

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/student-marketplace.git
cd student-marketplace
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=development
```

4. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Deployment

### Building for Production

1. Create a production build:
```bash
npm run build
```

2. The build files will be created in the `build` directory.

### Deploying to a Static Host

1. Build the application:
```bash
npm run build
```

2. Deploy the contents of the `build` directory to your hosting service.

### Environment Variables

- `REACT_APP_API_URL`: The URL of your backend API
- `REACT_APP_ENV`: The environment (development/production)

## Project Structure

```
src/
├── components/
│   ├── common/     # Reusable components
│   ├── forms/      # Form components
│   └── pages/      # Page components
├── styles/         # Global styles
├── App.js          # Main application component
└── index.js        # Application entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
