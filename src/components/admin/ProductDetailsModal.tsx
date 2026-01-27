import React from "react";
import Modal from "../ui/Modal";
import { Package, Store, User, DollarSign, Calendar, Hash, Info } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categoryId?: string;
  category?: string;
  isActive: boolean;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  approvedAt?: string;
  stock: number;
  createdAt: string;
  store?: {
    id?: string;
    name: string;
  };
  seller?: {
    user?: {
      name: string;
      email: string;
    };
  };
}

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!product) return null;

  const getStatusBadge = (isActive: boolean) => {
    const styles = isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
    const label = isActive ? "Ativo" : "Inativo";
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles}`}>
        {label}
      </span>
    );
  };

  const getApprovalBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    const labels = {
      PENDING: "Pendente",
      APPROVED: "Aprovado",
      REJECTED: "Rejeitado",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Produto" size="xl">
      <div className="space-y-6">
        {/* Images */}
        {product.images && product.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {product.images.map((image, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                <img
                  src={image}
                  alt={`${product.name} - ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Basic Info */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Package className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Nome do Produto</p>
                <p className="text-sm font-medium text-gray-900">{product.name}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Hash className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">ID do Produto</p>
                <p className="text-sm font-medium text-gray-900 font-mono">{product.id}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Preço</p>
                <p className="text-sm font-medium text-gray-900">
                  R$ {product.price.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Package className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Estoque</p>
                <p
                  className={`text-sm font-medium ${product.stock <= 0 ? "text-red-600" : "text-gray-900"}`}
                >
                  {product.stock} unidades
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Categoria</p>
                <p className="text-sm font-medium text-gray-900">
                  {product.category || product.categoryId || "Sem categoria"}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Data de Criação</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(product.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{product.description}</p>
        </div>

        {/* Store & Seller Info */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loja e Vendedor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Store className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Nome da Loja</p>
                <p className="text-sm font-medium text-gray-900">
                  {product.store?.name || "Loja não informada"}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Nome do Vendedor</p>
                <p className="text-sm font-medium text-gray-900">
                  {product.seller?.user?.name || "Vendedor não informado"}
                </p>
              </div>
            </div>

            {product.seller?.user?.email && (
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Email do Vendedor</p>
                  <p className="text-sm font-medium text-gray-900">{product.seller.user.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status e Aprovação</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Status do Produto</p>
              {getStatusBadge(product.isActive)}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Status de Aprovação</p>
              {getApprovalBadge(product.approvalStatus || "PENDING")}
            </div>
          </div>

          {product.rejectionReason && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-1">Motivo da Rejeição</p>
              <p className="text-sm text-red-600">{product.rejectionReason}</p>
            </div>
          )}

          {product.approvedAt && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Aprovado em</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(product.approvedAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductDetailsModal;
