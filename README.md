# Project_Blockify
E-commerce web specify about toy and puzzle

# Project Setting
🔹 Tech Stack
1/ Frontend
Ngôn ngữ & UI: HTML, CSS, SCSS, Bootstrap, TypeScript
Kiến trúc: MVC + OOP
Model: định nghĩa bằng class OOP trong core/models (áp dụng đầy đủ 4 tính chất: Encapsulation, Abstraction, Inheritance, Polymorphism).
View: HTML + Bootstrap, SCSS, các components trong shared/components.
Controller: trong modules, quản lý event/UI, gọi service, cập nhật view.
HTTP:
Ưu tiên Axios cho AJAX/Webservice (có thể dùng Fetch API nếu cần, nhưng không mix với jQuery).
Dữ liệu trao đổi với backend dưới dạng JSON.
Frontend folder structure:
src/
├── core/
│   ├── models/           // OOP Models (User, Product, Article)
│   ├── services/         // API services (Axios client + endpoints)
│   └── utils/            // Helpers
├── modules/              // Feature modules (MVC controllers + views)
│   ├── products/
│   │   ├── ProductController.ts
│   │   ├── product-view.html
│   │   └── product.css
│   └── auth/
├── shared/
│   └── components/       // Reusable UI (navbar, modal, etc.)
└── app.ts                // App initialization

2/ Backend
Ngôn ngữ & Framework: Node.js, TypeScript, Express.js
Kiến trúc: DDD + Clean Architecture (Onion Architecture)
Presentation Layer: controllers, routes, middleware (entry point).
Application Layer: application services (use cases), DTOs.
Domain Layer: entities, value objects, repository interfaces, domain events.
Infrastructure Layer: repository implementations (Supabase), DB client, external adapters.
Database: Supabase (Postgres + SDK).
HTTP: REST API trả về JSON cho frontend.
Backend folder structure:
src/
├── presentation/
│   ├── controllers/
│   ├── routes/
│   └── middleware/
├── application/
│   ├── services/         // Application Services (use cases)
│   └── dto/              // DTOs (Commands, Queries)
├── domain/
│   ├── entities/         // Rich Entities (business logic)
│   ├── value-objects/
│   ├── repository-interfaces/
│   └── events/
└── infrastructure/
    ├── repositories/     // Supabase implementations
    ├── database/         // Supabase client
    └── external/         // Third-party adapters

🔹 Yêu cầu tính năng
1/ Frontend:
Hiển thị danh mục, sản phẩm, bài viết.
Trang quản trị (admin) CRUD danh mục, sản phẩm, bài viết.
Chức năng đăng nhập, đăng ký cơ bản (auth).
...
Tất cả form submission & data fetching qua AJAX/Webservice (Axios/Fetch).

2/ Backend:
REST API cung cấp dữ liệu JSON cho frontend.
Module chính: user, product, article.
Application Services xử lý nghiệp vụ (use cases).
Repository pattern kết nối Supabase.
Entities domain tuân thủ OOP đầy đủ 4 tính chất.

🔹 Ưu tiên
Frontend rõ ràng theo MVC+OOP.
Backend thuần DDD + Clean Architecture (không trộn MVC).
AJAX/Webservice chỉ ở mức sử dụng, không tạo mới service.
Dữ liệu truyền tải luôn ở dạng JSON.