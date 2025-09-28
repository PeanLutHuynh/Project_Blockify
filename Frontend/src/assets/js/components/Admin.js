
    // Dữ liệu mẫu sản phẩm
    let products = [
      {
        img: "img/Rectangle 108 (4).png",
        name: "Police Car",
        brand: "LEGO CITY",
        theme: "City",
        pieces: 79,
        stock: 12,
        age: "8+",
        desc: "Join the world of LEGO City with the high-speed police car and brave police minifigure. Perfect for thrilling chases and creative adventures.",
        price: "230,000 VND"
      },
      {
        img: "img/Rectangle 108 (1).png",
        name: "Garage - 34 Cars",
        brand: "LEGO CITY",
        theme: "City",
        pieces: 120,
        stock: 8,
        age: "10+",
        desc: "Build your own garage with 34 cars and enjoy creative play.",
        price: "245,000 VND"
      },
      {
        img: "img/Rectangle 108 (2).png",
        name: "Yellow Construction Vehicle",
        brand: "LEGO TECHNIC",
        theme: "Construction",
        pieces: 1621,
        stock: 3,
        age: "14+",
        desc: "Build and operate this realistic construction vehicle with working features and authentic details.",
        price: "199,000 VND"
      }
    ];
    // Dữ liệu mẫu khách hàng
    let customers = [
      { name: "ChessicaNguyen", email: "chsc@gmail.com", phone: "0972837654", status: "Active" }
    ];
    function renderProducts() {
      const list = document.getElementById('productList');
      list.innerHTML = '';
      products.forEach((p, idx) => {
        list.innerHTML += `
          <div class="col-12 col-md-6 col-lg-4">
            <div class="product-card d-flex flex-column flex-md-row align-items-center gap-3 h-100">
              <img src="${p.img}">
              <div style="width:100%">
                <div class="product-name">${p.name}</div>
                <div class="muted"><b>Brand:</b> ${p.brand}</div>
                <div class="muted"><b>Theme:</b> ${p.theme}</div>
                <div class="muted"><b>Pieces:</b> ${p.pieces}</div>
                <div class="muted"><b>Stock:</b> ${p.stock}</div>
                <div class="muted"><b>Age:</b> ${p.age}</div>
                <div class="muted"><b>Description:</b> ${p.desc}</div>
                <div class="muted"><b>Price:</b> ${p.price}</div>
                <div class="mt-2 d-flex gap-2">
                  <button class="btn btn-sm btn-warning" onclick="editProduct(${idx})">Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteProduct(${idx})">Delete</button>
                </div>
              </div>
            </div>
          </div>`;
      });
    }
    function renderCustomers() {
      const list = document.getElementById('customerList');
      list.innerHTML = '';
      customers.forEach((c, idx) => {
        list.innerHTML += `
          <tr>
            <td><input type="checkbox"></td>
            <td>${c.name}</td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td>${c.status}</td>
            <td>
              <button class="btn btn-sm btn-warning" onclick="editCustomer(${idx})">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${idx})">Delete</button>
            </td>
          </tr>`;
      });
    }
    function deleteProduct(idx) {
      if(confirm('Are you sure you want to delete this product?')) {
        products.splice(idx, 1);
        renderProducts();
      }
    }
    function deleteCustomer(idx) {
      if(confirm('Are you sure you want to delete this customer?')) {
        customers.splice(idx, 1);
        renderCustomers();
      }
    }
    // Sửa sản phẩm
    function editProduct(idx) {
      const p = products[idx];
      document.getElementById('productName').value = p.name;
      document.getElementById('productBrand').value = p.brand;
      document.getElementById('productTheme').value = p.theme;
      document.getElementById('productPieces').value = p.pieces;
      document.getElementById('productStock').value = p.stock;
      document.getElementById('productAge').value = p.age;
      document.getElementById('productDesc').value = p.desc;
      // Không sửa ảnh ở demo này
      document.getElementById('addProductModal').setAttribute('data-edit-idx', idx);
      const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
      modal.show();
    }
    // Sửa khách hàng
    function editCustomer(idx) {
      const c = customers[idx];
      document.getElementById('customerName').value = c.name;
      document.getElementById('customerEmail').value = c.email;
      document.getElementById('customerPhone').value = c.phone;
      document.getElementById('customerStatus').value = c.status;
      document.getElementById('addCustomerModal').setAttribute('data-edit-idx', idx);
      const modal = new bootstrap.Modal(document.getElementById('addCustomerModal'));
      modal.show();
    }
    // Lưu sản phẩm (thêm/sửa)
    document.getElementById('productForm').onsubmit = function(e) {
      e.preventDefault();
      const idx = document.getElementById('addProductModal').getAttribute('data-edit-idx');
      const p = {
        img: 'img/Rectangle 108 (4).png', // demo, không xử lý upload
        name: document.getElementById('productName').value,
        brand: document.getElementById('productBrand').value,
        theme: document.getElementById('productTheme').value,
        pieces: document.getElementById('productPieces').value,
        stock: document.getElementById('productStock').value,
        age: document.getElementById('productAge').value,
        desc: document.getElementById('productDesc').value,
        price: '0 VND'
      };
      if(idx !== null && idx !== '' && !isNaN(idx)) {
        products[idx] = p;
        document.getElementById('addProductModal').removeAttribute('data-edit-idx');
      } else {
        products.push(p);
      }
      renderProducts();
      bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
      this.reset();
    };
    // Lưu khách hàng (thêm/sửa)
    document.getElementById('customerForm').onsubmit = function(e) {
      e.preventDefault();
      const idx = document.getElementById('addCustomerModal').getAttribute('data-edit-idx');
      const c = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        status: document.getElementById('customerStatus').value
      };
      if(idx !== null && idx !== '' && !isNaN(idx)) {
        customers[idx] = c;
        document.getElementById('addCustomerModal').removeAttribute('data-edit-idx');
      } else {
        customers.push(c);
      }
      renderCustomers();
      bootstrap.Modal.getInstance(document.getElementById('addCustomerModal')).hide();
      this.reset();
    };
    // Khởi tạo
    renderProducts();
    renderCustomers();
