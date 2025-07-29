'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Eye, ShoppingCart, DollarSign, Package, Calendar, Download } from 'lucide-react';

interface AnalyticsData {
  period: string;
  views: number;
  sales: number;
  revenue: number;
  orders: number;
}

interface ProductPerformance {
  name: string;
  views: number;
  sales: number;
  revenue: number;
  conversion: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const mockAnalytics: AnalyticsData[] = [
  { period: 'Jan', views: 1200, sales: 45, revenue: 2250, orders: 42 },
  { period: 'Fev', views: 1450, sales: 52, revenue: 2890, orders: 48 },
  { period: 'Mar', views: 1680, sales: 61, revenue: 3420, orders: 58 },
  { period: 'Abr', views: 1520, sales: 48, revenue: 2980, orders: 45 },
  { period: 'Mai', views: 1890, sales: 67, revenue: 4150, orders: 63 },
  { period: 'Jun', views: 2100, sales: 78, revenue: 4890, orders: 74 }
];

const mockProducts: ProductPerformance[] = [
  { name: 'iPhone 13 Pro', views: 450, sales: 12, revenue: 18000, conversion: 2.67 },
  { name: 'Samsung Galaxy S22', views: 380, sales: 8, revenue: 9600, conversion: 2.11 },
  { name: 'MacBook Air M2', views: 320, sales: 5, revenue: 12500, conversion: 1.56 },
  { name: 'iPad Pro 11"', views: 290, sales: 7, revenue: 8400, conversion: 2.41 },
  { name: 'AirPods Pro', views: 520, sales: 15, revenue: 3750, conversion: 2.88 }
];

const mockCategories: CategoryData[] = [
  { name: 'Eletrônicos', value: 45, color: '#3B82F6' },
  { name: 'Roupas', value: 25, color: '#8B5CF6' },
  { name: 'Casa', value: 20, color: '#10B981' },
  { name: 'Outros', value: 10, color: '#F59E0B' }
];

export default function SellerAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const currentMonth = mockAnalytics[mockAnalytics.length - 1];
  const previousMonth = mockAnalytics[mockAnalytics.length - 2];
  
  const viewsChange = ((currentMonth.views - previousMonth.views) / previousMonth.views) * 100;
  const salesChange = ((currentMonth.sales - previousMonth.sales) / previousMonth.sales) * 100;
  const revenueChange = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100;
  const ordersChange = ((currentMonth.orders - previousMonth.orders) / previousMonth.orders) * 100;

  const totalRevenue = mockAnalytics.reduce((sum, item) => sum + item.revenue, 0);
  const totalSales = mockAnalytics.reduce((sum, item) => sum + item.sales, 0);
  const totalViews = mockAnalytics.reduce((sum, item) => sum + item.views, 0);
  const avgConversion = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

  const getChangeIcon = (change: number) => {
    return change >= 0 ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Relatórios</h1>
            <p className="text-gray-600">Acompanhe o desempenho da sua loja</p>
          </div>
          <div className="flex gap-3">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="3months">Últimos 3 meses</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="1year">Último ano</option>
            </select>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {totalRevenue.toLocaleString('pt-BR')}
                </p>
                <div className={`flex items-center mt-1 ${getChangeColor(revenueChange)}`}>
                  {getChangeIcon(revenueChange)}
                  <span className="text-sm font-medium ml-1">
                    {Math.abs(revenueChange).toFixed(1)}% vs mês anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Vendas</p>
                <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
                <div className={`flex items-center mt-1 ${getChangeColor(salesChange)}`}>
                  {getChangeIcon(salesChange)}
                  <span className="text-sm font-medium ml-1">
                    {Math.abs(salesChange).toFixed(1)}% vs mês anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Visualizações</p>
                <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString('pt-BR')}</p>
                <div className={`flex items-center mt-1 ${getChangeColor(viewsChange)}`}>
                  {getChangeIcon(viewsChange)}
                  <span className="text-sm font-medium ml-1">
                    {Math.abs(viewsChange).toFixed(1)}% vs mês anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-gray-900">{avgConversion.toFixed(2)}%</p>
                <div className="flex items-center mt-1 text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium ml-1">Média do período</span>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Receita por Período</h3>
              <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="revenue">Receita</option>
                <option value="sales">Vendas</option>
                <option value="views">Visualizações</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    selectedMetric === 'revenue' ? `R$ ${value}` : value,
                    selectedMetric === 'revenue' ? 'Receita' : 
                    selectedMetric === 'sales' ? 'Vendas' : 'Visualizações'
                  ]}
                />
                <Bar 
                  dataKey={selectedMetric} 
                  fill={selectedMetric === 'revenue' ? '#10B981' : 
                        selectedMetric === 'sales' ? '#3B82F6' : '#8B5CF6'} 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Participação']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-4">
              {mockCategories.map((category, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {category.name} ({category.value}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendência de Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockAnalytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="views" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                name="Visualizações"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="sales" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Vendas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Produtos</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Produto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Visualizações</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Vendas</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Receita</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {mockProducts.map((product, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                    <td className="py-3 px-4 text-gray-600">{product.views}</td>
                    <td className="py-3 px-4 text-gray-600">{product.sales}</td>
                    <td className="py-3 px-4 text-gray-600">
                      R$ {product.revenue.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.conversion >= 2.5 ? 'bg-green-100 text-green-800' :
                        product.conversion >= 2.0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {product.conversion.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}