import { useState, useEffect } from "react";
import { StarRating } from "./StarRating";
import { Review } from "@/types";
import { Loader2, AlertCircle } from "lucide-react";

interface ReviewFormProps {
  productId: string;
  existingReview?: Review; // Se fornecido, modo edição
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export function ReviewForm({ productId, existingReview, onSubmit, onCancel, loading }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(existingReview?.comment.length || 0);

  const maxChars = 1000;
  const isEditing = !!existingReview;

  useEffect(() => {
    setCharCount(comment.length);
  }, [comment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação
    if (rating === 0) {
      setError("Por favor, selecione uma avaliação de 1 a 5 estrelas");
      return;
    }

    if (comment.trim().length === 0) {
      setError("Por favor, escreva um comentário sobre sua experiência");
      return;
    }

    if (comment.length > maxChars) {
      setError(`Comentário muito longo (máximo ${maxChars} caracteres)`);
      return;
    }

    try {
      await onSubmit({ rating, comment: comment.trim() });

      // Limpar formulário após sucesso (apenas se não estiver editando)
      if (!isEditing) {
        setRating(0);
        setComment("");
        setCharCount(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar avaliação");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {isEditing ? "Editar Avaliação" : "Deixe sua Avaliação"}
      </h3>

      {/* Seleção de Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sua avaliação <span className="text-red-500">*</span>
        </label>
        <StarRating
          rating={rating}
          onChange={setRating}
          size="lg"
          className="justify-center sm:justify-start"
        />
        {rating > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {rating === 1 && "⭐ Muito Ruim"}
            {rating === 2 && "⭐⭐ Ruim"}
            {rating === 3 && "⭐⭐⭐ Regular"}
            {rating === 4 && "⭐⭐⭐⭐ Bom"}
            {rating === 5 && "⭐⭐⭐⭐⭐ Excelente"}
          </p>
        )}
      </div>

      {/* Comentário */}
      <div className="mb-4">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Comentário <span className="text-red-500">*</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={6}
          maxLength={maxChars}
          placeholder="Conte sobre sua experiência com este produto. O que você gostou? O que pode melhorar?"
          className={`
            w-full px-4 py-3 border rounded-lg resize-none
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error && comment.trim().length === 0 ? "border-red-300" : "border-gray-300"}
          `}
          disabled={loading}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            Mínimo 10 caracteres, máximo {maxChars}
          </span>
          <span className={`text-xs ${charCount > maxChars ? "text-red-500" : "text-gray-500"}`}>
            {charCount}/{maxChars}
          </span>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Botões */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || rating === 0 || comment.trim().length === 0}
          className={`
            flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium
            transition-colors
            ${
              loading || rating === 0 || comment.trim().length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }
          `}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Salvar Alterações" : "Publicar Avaliação"}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Nota de privacidade */}
      <p className="text-xs text-gray-500 mt-4">
        Ao publicar sua avaliação, você concorda com nossos{" "}
        <a href="/termos" className="text-blue-600 hover:underline">
          Termos de Uso
        </a>
        . Seu nome será exibido publicamente.
      </p>
    </form>
  );
}
