# 🧸 Project Blockify

> **E-commerce platform specialized in toys and puzzles**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Features](#features)
- [Development Guidelines](#development-guidelines)

---

## 🎯 Overview

**Project Blockify** is a modern e-commerce web application dedicated to toys and puzzles. Built with a clean separation of concerns using **MVC + OOP** on the frontend and **DDD + Clean Architecture** on the backend.

---

## 🚀 Tech Stack

### 🎨 Frontend
- **Languages & UI**: HTML, CSS, SCSS, Bootstrap, TypeScript
- **Architecture**: MVC + Object-Oriented Programming
- **HTTP Client**: Native Fetch API (custom wrapper implementation)
- **Data Format**: JSON

### 🔧 Backend  
- **Runtime & Language**: Node.js, TypeScript
- **HTTP Server**: Native Node.js HTTP/HTTPS module (custom implementation)
- **Architecture**: Domain-Driven Design (DDD) + Clean Architecture (Onion Architecture)
- **Database**: Supabase (PostgreSQL + SDK)
- **API Style**: REST API returning JSON

---

## 🏗️ Architecture

### Frontend Architecture (MVC + OOP)

```mermaid
graph TB
    V[View - HTML/Bootstrap/SCSS] --> C[Controller - Event/UI Management]
    C --> M[Model - OOP Classes]
    C --> S[Service - API Communication]
    M --> S
```

- **Model**: OOP classes implementing the 4 core principles (Encapsulation, Abstraction, Inheritance, Polymorphism)
- **View**: HTML templates with Bootstrap styling and SCSS
- **Controller**: Module-based controllers handling events, calling services, and updating views

### Backend Architecture (DDD + Clean Architecture)

```mermaid
graph TB
    P[Presentation Layer<br/>Controllers, Routes, Middleware] --> A[Application Layer<br/>Use Cases, DTOs]
    A --> D[Domain Layer<br/>Entities, Value Objects, Interfaces]
    A --> I[Infrastructure Layer<br/>Repositories, Database, External APIs]
    I --> D
```

- **Presentation**: Entry points (controllers, custom routing, middleware chain)
- **Application**: Business use cases and Data Transfer Objects
- **Domain**: Core business logic and interfaces
- **Infrastructure**: External dependencies and implementations

---

## 📁 Folder Structure

### Frontend Structure
```
src/
├── 📁 core/
│   ├── 📁 models/           # OOP Models (User, Product, Article)
│   ├── 📁 services/         # API services (Custom Fetch wrapper + endpoints)
│   └── 📁 utils/            # Helper functions
├── 📁 modules/              # Feature modules (MVC pattern)
│   ├── 📁 products/
│   │   ├── 📄 ProductController.ts
│   │   ├── 📄 product-view.html
│   │   └── 📄 product.css
│   └── 📁 auth/
│       ├── 📄 AuthController.ts
│       ├── 📄 auth-view.html
│       └── 📄 auth.css
├── 📁 shared/
│   └── 📁 components/       # Reusable UI components
└── 📄 app.ts               # Application initialization
```

### Backend Structure
```
src/
├── 📁 presentation/
│   ├── 📁 controllers/      # HTTP request handlers
│   ├── 📁 routes/          # Custom router implementation
│   └── 📁 middleware/      # Custom middleware chain
├── 📁 application/
│   ├── 📁 services/        # Application services (use cases)
│   └── 📁 dto/             # Data Transfer Objects
├── 📁 domain/
│   ├── 📁 entities/        # Rich domain entities
│   ├── 📁 value-objects/   # Domain value objects
│   ├── 📁 repository-interfaces/ # Repository contracts
│   └── 📁 events/          # Domain events
└── 📁 infrastructure/
    ├── 📁 repositories/    # Supabase implementations
    ├── 📁 database/        # Supabase client configuration
    ├── 📁 http/            # Custom HTTP server & router
    └── 📁 external/        # Third-party service adapters
```

---

## ✨ Features

### 🛍️ Frontend Features
- **Product Catalog**: Browse toys and puzzles by categories
- **Content Management**: Display articles and blog posts
- **Admin Panel**: CRUD operations for categories, products, and articles
- **Authentication**: User registration and login system
- **Responsive Design**: Mobile-first approach with Bootstrap
- **AJAX Integration**: Seamless data fetching without page reloads using native Fetch API

### 🔧 Backend Features
- **RESTful API**: JSON-based API endpoints with custom HTTP server
- **Core Modules**: User management, product catalog, article system
- **Business Logic**: Use cases handled by application services
- **Data Persistence**: Repository pattern with Supabase integration
- **Domain-Rich Models**: Entities following OOP principles
- **Custom Routing**: Hand-written routing system without external frameworks

---

## 📋 Development Guidelines

### 🎯 Frontend Guidelines
- ✅ Follow **MVC + OOP** architecture strictly
- ✅ Implement all **4 OOP principles** in model classes:
  - **Encapsulation**: Private properties with public methods
  - **Abstraction**: Abstract base classes and interfaces
  - **Inheritance**: Extend base classes for specialized behavior
  - **Polymorphism**: Override methods for different implementations
- ✅ Use **native Fetch API** with custom wrapper (no external HTTP libraries)
- ✅ All data exchange in **JSON format**
- ✅ Component-based UI with reusable elements
- ✅ **Bootstrap only** for UI framework (no other CSS frameworks)

### 🏛️ Backend Guidelines
- ✅ Maintain **pure DDD + Clean Architecture** (no MVC mixing)
- ✅ Business logic stays in **Domain Layer**
- ✅ Use cases implemented as **Application Services**
- ✅ Repository pattern for **data access abstraction**
- ✅ **JSON-only** API responses (hand-written parsing)
- ✅ Rich domain entities with proper business rules
- ✅ Custom HTTP server using **Node.js native modules** (no Express.js)
- ✅ Hand-written routing and middleware system
- ✅ **Supabase SDK only** for database operations

### 🔄 Communication Guidelines
- ✅ **AJAX/Webservice**: Custom Fetch API wrapper for all HTTP requests
- ✅ **JSON Format**: All client-server communication
- ✅ **REST Conventions**: Proper HTTP methods and status codes
- ✅ **Error Handling**: Consistent error response format
- ✅ **No External Dependencies**: Except Bootstrap (UI) and Supabase SDK (Database)

---

## 🎮 Getting Started

1. **Clone the repository**
2. **Install dependencies** for both frontend and backend
3. **Configure Supabase** connection
4. **Run development servers**
5. **Start building amazing toy experiences!** 🚀

---

*Built with 💪 using native Node.js and TypeScript 🧩✨*