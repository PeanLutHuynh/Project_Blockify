# Project Blockify - LEGO E-commerce Platform

A comprehensive LEGO and toy e-commerce platform template built with modern web technologies for academic purposes.

## 🚀 Features

- **Backend**: Node.js + Express.js + TypeScript
- **Frontend**: HTML5 + Bootstrap 5.3 + JavaScript
- **Database**: Supabase (PostgreSQL)
- **Architecture**: MVC Pattern with Object-Oriented Programming
- **API**: RESTful API with 25+ endpoints
- **Authentication**: JWT-based authentication
- **Real-time**: Live updates with Supabase subscriptions
- **Responsive**: Mobile-first design with Bootstrap

## 🛠️ Tech Stack

### Backend
- Node.js >= 18.0.0
- Express.js
- TypeScript
- Supabase (PostgreSQL)
- JWT Authentication
- Bcrypt for password hashing
- Multer for file uploads

### Frontend  
- HTML5 & CSS3
- Bootstrap 5.3
- Vanilla JavaScript (ES6+)
- AJAX with Fetch API
- Responsive design

### Development Tools
- ESLint for code quality
- Prettier for code formatting
- Jest for testing
- Nodemon for development
- TypeScript compiler

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Supabase account

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/PeanLutHuynh/Project_Blockify.git
   cd Project_Blockify
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

## 🏗️ Project Structure

```
Project_Blockify/
├── backend/                    # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── controllers/        # MVC Controllers
│   │   ├── models/            # OOP Models with Supabase
│   │   ├── services/          # Business Logic Layer
│   │   ├── routes/            # API Route Definitions
│   │   ├── middlewares/       # Express Middlewares
│   │   ├── utils/             # Utility Functions
│   │   ├── types/             # TypeScript Definitions
│   │   └── app.ts             # Express App Configuration
│   ├── tests/                 # Unit & Integration Tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/                  # HTML + Bootstrap + JavaScript
│   ├── public/
│   │   ├── css/               # Custom stylesheets
│   │   ├── js/                # JavaScript modules
│   │   ├── images/            # Static images
│   │   └── index.html         # Main page
│   └── package.json
├── .github/workflows/         # GitHub Actions CI/CD
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## 🔧 Development Scripts

### Root Level
- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both backend and frontend for production
- `npm run test` - Run backend tests
- `npm run setup` - Install all dependencies

### Backend
- `npm run backend:dev` - Start backend in development mode
- `npm run backend:build` - Build backend TypeScript
- `npm run backend:test` - Run backend tests
- `npm run backend:lint` - Lint backend code

### Frontend
- `npm run frontend:dev` - Start frontend development server
- `npm run frontend:build` - Build frontend for production
- `npm run frontend:lint` - Lint frontend code

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get category with products
- `POST /api/categories` - Create category (Admin)

### Shopping Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item quantity
- `DELETE /api/cart/remove/:id` - Remove item from cart

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting
- Helmet security headers

## 🧪 Testing

```bash
# Run all backend tests
npm run backend:test

# Run tests with coverage
cd backend && npm run test:coverage

# Run tests in watch mode
cd backend && npm run test:watch
```

## 🚀 Deployment

### Backend Deployment (Railway/Render/Vercel)
1. Set environment variables in your hosting platform
2. Deploy from GitHub repository
3. Ensure NODE_ENV=production

### Frontend Deployment (Vercel/Netlify)
1. Build the frontend: `npm run frontend:build`
2. Deploy the `frontend/dist` folder
3. Configure API URL in environment

### Database (Supabase)
1. Create a new Supabase project
2. Run database migrations from `docs/DATABASE.md`
3. Configure Row Level Security (RLS)

## 📚 Academic Requirements Compliance

✅ **Bootstrap for UI design** (mandatory)
✅ **Object-Oriented Programming in backend** (mandatory)  
✅ **MVC pattern implementation** (high score criteria)
✅ **AJAX/Web services integration** (high score criteria)
✅ **JSON data transfer** (high score criteria)
✅ **Basic admin panel** (category, product, article management)
✅ **Supabase (PostgreSQL) as database choice**

## 🤝 Contributing

This is an academic project template. Feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 👥 Team

Project Blockify Team - Academic Project 2025

## 🙏 Acknowledgments

- Bootstrap team for the excellent CSS framework
- Supabase for the backend-as-a-service platform
- LEGO Group for inspiration (educational use only)

---

**Note**: This is an academic project template. Not affiliated with or endorsed by The LEGO Group.
