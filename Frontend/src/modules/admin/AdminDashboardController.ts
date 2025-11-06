import { httpClient } from '../../core/api/FetchHttpClient.js';

// Chart.js is loaded via CDN, use global Chart object
declare const Chart: any;

/**
 * AdminDashboardController
 * Frontend Controller for Admin Dashboard
 */
export class AdminDashboardController {
  private revenueChart: any = null;
  private orderStatsChart: any = null;
  private currentGroupBy: 'day' | 'month' = 'month';

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.setDefaultDates();
    this.loadDashboardData();
  }

  private setupEventListeners(): void {
    // Apply filter button
    const applyBtn = document.getElementById('applyDashboardFilter');
    applyBtn?.addEventListener('click', () => this.loadDashboardData());

    // Reset filter button
    const resetBtn = document.getElementById('resetDashboardFilter');
    resetBtn?.addEventListener('click', () => {
      this.setDefaultDates();
      this.loadDashboardData();
    });

    // Chart type buttons
    const chartTypeBtns = document.querySelectorAll('[data-type]');
    chartTypeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const type = target.getAttribute('data-type') as 'day' | 'month';
        
        // Update active state
        chartTypeBtns.forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        
        // Update group by select
        const groupBySelect = document.getElementById('dashboardGroupBy') as HTMLSelectElement;
        if (groupBySelect) {
          groupBySelect.value = type;
        }
        
        this.currentGroupBy = type;
        this.loadRevenueChart();
      });
    });
  }

  private setDefaultDates(): void {
    const endDate = new Date();
    // Use 2020-01-01 to capture all historical data
    const startDate = new Date('2020-01-01');

    const startInput = document.getElementById('dashboardStartDate') as HTMLInputElement;
    const endInput = document.getElementById('dashboardEndDate') as HTMLInputElement;

    if (startInput) {
      startInput.value = this.formatDate(startDate);
      console.log('📅 Set default start date:', startInput.value);
    }
    if (endInput) {
      endInput.value = this.formatDate(endDate);
      console.log('📅 Set default end date:', endInput.value);
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getDateRange(): { startDate?: string; endDate?: string } {
    const startInput = document.getElementById('dashboardStartDate') as HTMLInputElement;
    const endInput = document.getElementById('dashboardEndDate') as HTMLInputElement;

    return {
      startDate: startInput?.value || undefined,
      endDate: endInput?.value || undefined
    };
  }

  async loadDashboardData(): Promise<void> {
    const { startDate, endDate } = this.getDateRange();

    console.log('📊 Loading dashboard data...', { startDate, endDate });

    try {
      // Load overview
      console.log('1️⃣ Loading overview...');
      await this.loadOverview(startDate, endDate);

      // Load charts
      console.log('2️⃣ Loading revenue chart...');
      await this.loadRevenueChart();
      
      console.log('3️⃣ Loading order stats chart...');
      await this.loadOrderStatsChart();

      // Load popular categories
      console.log('4️⃣ Loading popular categories...');
      await this.loadPopularCategories(startDate, endDate);

      // Load conversion details
      console.log('5️⃣ Loading conversion details...');
      await this.loadConversionDetails(startDate, endDate);

      console.log('✅ All dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      this.showError('Không thể tải dữ liệu dashboard');
    }
  }

  private async loadOverview(startDate?: string, endDate?: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      console.log('🔍 Fetching overview from API...', params.toString());
      const response = await httpClient.get(`/api/admin/dashboard/overview?${params.toString()}`);

      console.log('📦 Overview response:', response);

      if (response.success && response.data) {
        console.log('✅ Overview data received:', response.data);
        console.log('   💰 Total Revenue:', response.data.totalRevenue);
        console.log('   📦 Order Stats:', response.data.orderStats);
        console.log('   📈 Conversion Rate:', response.data.conversionRate);
        console.log('   🏆 Popular Categories:', response.data.popularCategories);
        this.updateOverviewCards(response.data);
      } else {
        console.warn('⚠️ No overview data or unsuccessful response');
      }
    } catch (error) {
      console.error('❌ Error loading overview:', error);
      throw error;
    }
  }

  private updateOverviewCards(data: any): void {
    console.log('📊 Updating overview cards with data:', data);
    
    // Backend returns camelCase, map to UI
    const totalRevenue = data.totalRevenue || 0;
    const orderStats = data.orderStats || {};
    const conversionRate = data.conversionRate || {};
    
    // Total Revenue
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) {
      totalRevenueEl.textContent = this.formatCurrency(totalRevenue);
    }

    // Success Orders
    const successOrders = document.getElementById('successOrders');
    const successRateEl = document.getElementById('successRate');
    if (successOrders) {
      successOrders.textContent = (orderStats.successCount || 0).toString();
    }
    if (successRateEl) {
      successRateEl.textContent = `${(orderStats.successRate || 0).toFixed(1)}% thành công`;
    }

    // Conversion Rate
    const conversionRateEl = document.getElementById('conversionRate');
    const conversionDetailEl = document.getElementById('conversionDetail');
    if (conversionRateEl) {
      conversionRateEl.textContent = `${(conversionRate.conversionRate || 0).toFixed(1)}%`;
    }
    if (conversionDetailEl) {
      conversionDetailEl.textContent = `${conversionRate.usersWithOrders || 0}/${conversionRate.totalUsers || 0} người dùng`;
    }
  }

  private async loadRevenueChart(): Promise<void> {
    const { startDate, endDate } = this.getDateRange();
    const groupBySelect = document.getElementById('dashboardGroupBy') as HTMLSelectElement;
    const groupBy = groupBySelect?.value || this.currentGroupBy;

    const loader = document.getElementById('revenueChartLoader');
    const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;

    try {
      // Show loader
      if (loader) loader.classList.remove('d-none');
      if (canvas) canvas.style.display = 'none';

      const params = new URLSearchParams({ groupBy });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      console.log('🔍 Fetching revenue API:', `/api/admin/dashboard/revenue?${params.toString()}`);
      const response = await httpClient.get(`/api/admin/dashboard/revenue?${params.toString()}`);
      console.log('📦 Revenue API full response:', response);
      console.log('📊 Revenue API data array:', response.data);
      console.log('📏 Revenue data length:', response.data?.length);

      if (response.success && response.data) {
        this.renderRevenueChart(response.data, groupBy);
      }
    } catch (error) {
      console.error('Error loading revenue chart:', error);
    } finally {
      // Hide loader
      if (loader) loader.classList.add('d-none');
      if (canvas) canvas.style.display = 'block';
    }
  }

  private renderRevenueChart(data: any[], _groupBy: string): void {
    console.log('📈 Rendering revenue chart with data:', data);
    
    const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('❌ Revenue chart canvas not found');
      return;
    }

    // Check if data is empty
    if (!data || data.length === 0) {
      console.warn('⚠️ No revenue data to display');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText('Chưa có dữ liệu doanh thu', canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    // Destroy existing chart
    if (this.revenueChart) {
      this.revenueChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Backend returns camelCase
    this.revenueChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(item => item.period),
        datasets: [{
          label: 'Doanh thu (VND)',
          data: data.map(item => item.totalRevenue || 0),
          backgroundColor: 'rgba(13, 155, 255, 0.8)',
          borderColor: 'rgba(13, 155, 255, 1)',
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                return `Doanh thu: ${this.formatCurrency(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value: any) => {
                return this.formatCurrencyShort(value as number);
              }
            }
          }
        }
      }
    });
  }

  private async loadOrderStatsChart(): Promise<void> {
    const { startDate, endDate } = this.getDateRange();
    const loader = document.getElementById('orderStatsLoader');
    const canvas = document.getElementById('orderStatsChart') as HTMLCanvasElement;

    try {
      // Show loader
      if (loader) loader.classList.remove('d-none');
      if (canvas) canvas.style.display = 'none';

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await httpClient.get(`/api/admin/dashboard/order-stats?${params.toString()}`);

      if (response.success && response.data) {
        this.renderOrderStatsChart(response.data);
      }
    } catch (error) {
      console.error('Error loading order stats chart:', error);
    } finally {
      // Hide loader
      if (loader) loader.classList.add('d-none');
      if (canvas) canvas.style.display = 'block';
    }
  }

  private renderOrderStatsChart(data: any): void {
    console.log('🥧 Rendering order stats chart with data:', data);
    
    const canvas = document.getElementById('orderStatsChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('❌ Order stats chart canvas not found');
      return;
    }

    // Backend returns camelCase
    const successCount = data.successCount || 0;
    const failedCount = data.failedCount || 0;
    const totalCount = data.totalOrders || (successCount + failedCount);

    // Check if data is empty
    if (totalCount === 0) {
      console.warn('⚠️ No order data to display');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText('Chưa có đơn hàng', canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    // Destroy existing chart
    if (this.orderStatsChart) {
      this.orderStatsChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.orderStatsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Thành công', 'Thất bại'],
        datasets: [{
          data: [successCount, failedCount],
          backgroundColor: [
            'rgba(40, 167, 69, 0.8)',
            'rgba(220, 53, 69, 0.8)'
          ],
          borderColor: [
            'rgba(40, 167, 69, 1)',
            'rgba(220, 53, 69, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : '0';
                return `${label}: ${value} đơn (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  private async loadPopularCategories(startDate?: string, endDate?: string): Promise<void> {
    const tbody = document.getElementById('popularCategoriesTable');
    if (!tbody) return;

    try {
      const params = new URLSearchParams({ limit: '10' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await httpClient.get(`/api/admin/dashboard/popular-categories?${params.toString()}`);

      if (response.success && response.data) {
        this.renderPopularCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading popular categories:', error);
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Không thể tải dữ liệu</td></tr>';
    }
  }

  private renderPopularCategories(data: any[]): void {
    console.log('🔥 Rendering popular categories with data:', data);
    
    const tbody = document.getElementById('popularCategoriesTable');
    if (!tbody) {
      console.error('❌ Popular categories table body not found');
      return;
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Chưa có dữ liệu</td></tr>';
      return;
    }

    // Backend returns camelCase
    tbody.innerHTML = data.map((category, index) => `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <span class="badge bg-primary me-2">${index + 1}</span>
            ${category.categoryName || 'N/A'}
          </div>
        </td>
        <td class="text-end">${category.productCount || 0}</td>
        <td class="text-end">${category.totalSold || 0}</td>
        <td class="text-end fw-bold text-primary">${this.formatCurrency(category.totalRevenue || 0)}</td>
      </tr>
    `).join('');
  }

  private async loadConversionDetails(startDate?: string, endDate?: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await httpClient.get(`/api/admin/dashboard/conversion-rate?${params.toString()}`);

      if (response.success && response.data) {
        this.renderConversionDetails(response.data);
      }
    } catch (error) {
      console.error('Error loading conversion details:', error);
    }
  }

  private renderConversionDetails(data: any): void {
    console.log('📊 Rendering conversion details with data:', data);
    
    // Backend returns camelCase
    const totalUsers = data.totalUsers || 0;
    const usersWithOrders = data.usersWithOrders || 0;
    const usersWithCart = data.usersWithCart || 0;
    const totalOrders = data.totalOrders || 0;
    const conversionRate = data.conversionRate || 0;
    const cartToOrderRate = data.cartToOrderRate || 0;
    
    // Total Users
    const totalUsersEl = document.getElementById('totalUsers');
    const totalUsersBar = document.getElementById('totalUsersBar') as HTMLElement;
    if (totalUsersEl) totalUsersEl.textContent = totalUsers.toString();
    if (totalUsersBar) totalUsersBar.style.width = '100%';

    // Users with Orders
    const usersWithOrdersEl = document.getElementById('usersWithOrders');
    const usersWithOrdersBar = document.getElementById('usersWithOrdersBar') as HTMLElement;
    const orderPercentage = totalUsers > 0 ? (usersWithOrders / totalUsers) * 100 : 0;
    if (usersWithOrdersEl) usersWithOrdersEl.textContent = usersWithOrders.toString();
    if (usersWithOrdersBar) usersWithOrdersBar.style.width = `${orderPercentage}%`;

    // Users with Carts
    const usersWithCartsEl = document.getElementById('usersWithCarts');
    const usersWithCartsBar = document.getElementById('usersWithCartsBar') as HTMLElement;
    const cartPercentage = totalUsers > 0 ? (usersWithCart / totalUsers) * 100 : 0;
    if (usersWithCartsEl) usersWithCartsEl.textContent = usersWithCart.toString();
    if (usersWithCartsBar) usersWithCartsBar.style.width = `${cartPercentage}%`;

    // Total Orders
    const totalOrdersConvEl = document.getElementById('totalOrdersConv');
    const totalOrdersBar = document.getElementById('totalOrdersBar') as HTMLElement;
    const ordersPercentage = totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0;
    if (totalOrdersConvEl) totalOrdersConvEl.textContent = totalOrders.toString();
    if (totalOrdersBar) totalOrdersBar.style.width = `${ordersPercentage}%`;

    // Conversion Rates
    const orderConversionRateEl = document.getElementById('orderConversionRate');
    const cartConversionRateEl = document.getElementById('cartConversionRate');
    if (orderConversionRateEl) orderConversionRateEl.textContent = `${conversionRate.toFixed(1)}%`;
    if (cartConversionRateEl) cartConversionRateEl.textContent = `${cartToOrderRate.toFixed(1)}%`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  private formatCurrencyShort(amount: number): string {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  }

  private showError(message: string): void {
    alert(message); // Replace with better error handling (toast, etc.)
  }

  // Public method to refresh dashboard
  public refresh(): void {
    this.loadDashboardData();
  }
}
