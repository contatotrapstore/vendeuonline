import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "../ui/Modal";
import { User } from "../../store/userStore";
import { getAuthToken } from "@/config/storage-keys";
import { buildApiUrl } from "@/config/api";

const userFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  phone: z.string().optional(),
  type: z.enum(["BUYER", "SELLER", "ADMIN"]),
  planId: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  user?: User | null;
  mode: "create" | "edit";
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  mode,
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<string>(user?.userType || "BUYER");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(
      mode === "edit"
        ? userFormSchema.omit({ password: true }).extend({
            password: z.string().min(6).optional().or(z.literal("")),
          })
        : userFormSchema
    ),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      phone: user?.phone || "",
      type: user?.userType?.toUpperCase() as "BUYER" | "SELLER" | "ADMIN" || "BUYER",
      planId: user?.subscription?.planId || "",
      city: user?.city || "",
      state: user?.state || "",
    },
  });

  // Watch for user type changes
  const watchedType = watch("type");

  useEffect(() => {
    setSelectedUserType(watchedType);
  }, [watchedType]);

  // Fetch plans when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      reset({
        name: user?.name || "",
        email: user?.email || "",
        password: "",
        phone: user?.phone || "",
        type: (user?.userType?.toUpperCase() as "BUYER" | "SELLER" | "ADMIN") || "BUYER",
        planId: user?.subscription?.planId || "",
        city: user?.city || "",
        state: user?.state || "",
      });
    }
  }, [isOpen, user, reset]);

  const fetchPlans = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl("/api/admin/plans"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
    }
  };

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      // Remove password if empty in edit mode
      if (mode === "edit" && !data.password) {
        const { password, ...dataWithoutPassword } = data;
        await onSubmit(dataWithoutPassword);
      } else {
        await onSubmit(data);
      }
      onClose();
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Criar Novo Usuário" : "Editar Usuário"}
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Nome */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nome Completo *
          </label>
          <input
            {...register("name")}
            id="name"
            type="text"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite o nome completo"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            {...register("email")}
            id="email"
            type="email"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="exemplo@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Senha */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Senha {mode === "create" ? "*" : "(deixe em branco para não alterar)"}
          </label>
          <input
            {...register("password")}
            id="password"
            type="password"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={mode === "create" ? "Digite uma senha segura" : "Nova senha (opcional)"}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Tipo de Usuário */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Tipo de Usuário *
          </label>
          <select
            {...register("type")}
            id="type"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="BUYER">Comprador</option>
            <option value="SELLER">Vendedor</option>
            <option value="ADMIN">Administrador</option>
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>

        {/* Plano (apenas para sellers) */}
        {selectedUserType === "SELLER" && (
          <div>
            <label htmlFor="planId" className="block text-sm font-medium text-gray-700">
              Plano de Assinatura
            </label>
            <select
              {...register("planId")}
              id="planId"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sem plano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - R$ {plan.price.toFixed(2)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Selecione um plano para o vendedor (opcional)
            </p>
            {errors.planId && (
              <p className="mt-1 text-sm text-red-600">{errors.planId.message}</p>
            )}
          </div>
        )}

        {/* Telefone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Telefone
          </label>
          <input
            {...register("phone")}
            id="phone"
            type="tel"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="(00) 00000-0000"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        {/* Cidade e Estado */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              Cidade
            </label>
            <input
              {...register("city")}
              id="city"
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Cidade"
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <input
              {...register("state")}
              id="state"
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="UF"
              maxLength={2}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Criar Usuário"
                : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;
